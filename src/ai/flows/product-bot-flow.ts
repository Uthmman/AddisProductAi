'use server';

/**
 * @fileOverview Defines a Genkit flow that acts as a conversational product creation bot.
 * This version is stateful, using a cache to manage the conversation state for each user.
 *
 * - productBotFlow - The main conversational flow.
 * - ProductBotInput - The input type, containing the chatId, message, and image data.
 * - ProductBotOutput - The output type, containing the bot's response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { appCache } from '@/lib/cache';
import { generateWooCommerceProductContent } from './generate-woocommerce-product-content';
import { createProduct, getSettings, getAllProductCategories } from '@/lib/woocommerce-api';
import { AIProductContent, Settings, WooCategory } from '@/lib/types';


// Define the input schema for the flow
const ProductBotInputSchema = z.object({
  chatId: z.string(),
  newMessage: z.string().optional(),
  imageId: z.number().optional().nullable(),
  imageSrc: z.string().optional().nullable(),
});
export type ProductBotInput = z.infer<typeof ProductBotInputSchema>;

// Define the output schema for the flow
const ProductBotOutputSchema = z.object({
  text: z.string(),
});
export type ProductBotOutput = z.infer<typeof ProductBotOutputSchema>;


// Define the structure for our conversation state
interface ProductCreationData {
    raw_name?: string;
    price_etb?: number;
    material?: string;
    focus_keywords?: string;
    amharic_name?: string;
    image_ids: number[];
    image_srcs: string[];
    aiContent?: Partial<AIProductContent>;
}

// State management helpers
function getState(chatId: string): ProductCreationData {
    return appCache.get<ProductCreationData>(chatId) || { image_ids: [], image_srcs: [] };
}
function setState(chatId: string, data: ProductCreationData) {
    appCache.set(chatId, data);
}

// The main flow function
export async function productBotFlow(input: ProductBotInput): Promise<ProductBotOutput> {
    const { chatId, newMessage, imageId, imageSrc } = input;

    let data = getState(chatId);

    // Handle image upload immediately
    if (imageId && imageSrc) {
        if (!data.image_ids.includes(imageId)) {
            data.image_ids.push(imageId);
            data.image_srcs.push(imageSrc);
        }
    }
    
    // On a completely new chat with no message, send a welcome message.
    if (!newMessage && !imageId && Object.keys(data).length <= 2) {
        setState(chatId, data); // Save initial empty state
        return { text: "Hi there! I can help you create a new product. What's the name, price, and Amharic name? You can also upload a photo." };
    }

    const [settings, availableCategories] = await Promise.all([
        getSettings(),
        getAllProductCategories(),
    ]);

    // Define tools for the AI to interact with the system
    const updateProductDetailsTool = ai.defineTool(
        {
            name: 'updateProductDetailsTool',
            description: "Updates the product details in the current session based on the user's message. Call this if the user provides new information like a name, price, material, or Amharic name.",
            inputSchema: z.object({
                raw_name: z.string().optional().describe("The name of the product."),
                price_etb: z.number().optional().describe("The price of the product."),
                material: z.string().optional().describe("The material of the product."),
                amharic_name: z.string().optional().describe("The Amharic name for the product."),
            }),
            outputSchema: z.string(),
        },
        async (details) => {
            if (details.raw_name) data.raw_name = details.raw_name;
            if (details.price_etb) data.price_etb = details.price_etb;
            if (details.material) data.material = details.material;
            if (details.amharic_name) data.amharic_name = details.amharic_name;
            return "Product details updated.";
        }
    );

    const aiOptimizeProductTool = ai.defineTool(
        {
            name: 'aiOptimizeProductTool',
            description: 'MUST be called ONLY when the user confirms to proceed with AI optimization after you have shown them the data summary. This tool runs AI optimization to generate all product fields.',
            inputSchema: z.object({}),
            outputSchema: z.any(),
        },
        async () => {
            const currentData = data; // Use local data from closure
            console.log("Running AI Optimization Tool with data:", currentData);
            if (!currentData.raw_name || !currentData.price_etb || currentData.image_srcs.length === 0) {
                return "I can't optimize yet. I'm still missing the product name, price, or an image. Please provide the missing details.";
            }

            const primaryCategory = availableCategories.length > 0 ? availableCategories[0] : undefined;

            const aiContent = await generateWooCommerceProductContent({
                raw_name: currentData.raw_name,
                price_etb: currentData.price_etb,
                material: currentData.material || '',
                amharic_name: currentData.amharic_name || '',
                focus_keywords: currentData.focus_keywords || '',
                images_data: currentData.image_srcs,
                availableCategories,
                settings,
                primaryCategory,
                fieldToGenerate: 'all',
            });
            
            data.aiContent = aiContent; // Update data in the outer scope
            
            // Return a preview for the AI to relay to the user
            const preview = `
Here's a preview of the product content I generated:
**Name**: ${aiContent.name || ''}
**Description**: ${aiContent.short_description || aiContent.description?.substring(0, 100) + '...'}

Do you want me to create the product, or save it as a draft?
            `.trim();

            return preview;
        }
    );

    const createProductTool = ai.defineTool(
        {
            name: 'createProductTool',
            description: 'Creates the product in WooCommerce. MUST be called after the user confirms the preview.',
            inputSchema: z.object({
                status: z.enum(['publish', 'draft']),
            }),
            outputSchema: z.any(),
        },
        async ({ status }) => {
            const currentData = data; // Use local data from closure
            console.log(`Running Create Product Tool with status: ${status}`);
            if (!currentData.aiContent) {
                return "I can't create the product because the AI content hasn't been generated yet. Please provide more details first.";
            }

            try {
                 const finalImages = currentData.image_ids.map((id, index) => ({
                    id,
                    alt: currentData.aiContent?.images?.[index]?.alt || currentData.aiContent?.name,
                }));

                const finalCategories = currentData.aiContent.categories?.map(c => {
                    const existing = availableCategories.find(cat => cat.name.toLowerCase() === c.toLowerCase());
                    return existing ? { id: existing.id } : { name: c };
                }) || [];

                const finalData = {
                    name: currentData.aiContent.name,
                    slug: currentData.aiContent.slug,
                    regular_price: (currentData.aiContent.regular_price || currentData.price_etb)?.toString(),
                    description: currentData.aiContent.description,
                    short_description: currentData.aiContent.short_description,
                    categories: finalCategories,
                    tags: currentData.aiContent.tags?.map(tag => ({ name: tag })),
                    images: finalImages,
                    attributes: currentData.aiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
                    meta_data: currentData.aiContent.meta_data,
                    status: status,
                };

                const product = await createProduct(finalData);
                appCache.del(chatId); // Clear state after successful creation
                return `Success! I've created the product '${product.name}' as a ${status}.`;

            } catch (error: any) {
                console.error("Tool Error: Failed to create product:", error);
                return `I'm sorry, I failed to create the product. The system reported an error: ${error.message}`;
            }
        }
    );

    // The AI's main prompt
    const systemPrompt = `
You are an advanced conversational assistant for creating products. Your goal is to guide the user through a clear, step-by-step process.

This is the current information you have for the product being created:
${JSON.stringify(data, null, 2)}

Your process is as follows:
1.  **Gather Information**: Your primary goal is to collect the product's **Name**, **Price**, **Amharic Name**, and at least one **Image**.
    - When the user provides any of these details, you MUST call 'updateProductDetailsTool' to save them.
    - If any of these core details are missing, ask the user for them clearly. (e.g., "What is the price?", "Please provide the Amharic name.").

2.  **Confirm and Summarize**: Once you have gathered at least the Name, Price, and one Image, your response MUST STOP asking for information. Instead, you MUST present a summary of the collected data and ask the user if you should proceed with AI optimization.
    - **Your response MUST follow this structure:**
      "Great! I have the following details:
      - Name: [The name you have]
      - Price: [The price you have] ETB
      - Amharic Name: [The Amharic name you have, or 'Not set']
      - Material: [The material you have, or 'Not set']
      - Images: [Number of images] uploaded

      Should I go ahead and AI-optimize this content?"
    - Refer to the JSON data at the top of this prompt to get the values for your summary.

3.  **AI Optimize**: Only when the user replies "yes" or gives a positive confirmation to your summary question, you MUST then call the 'aiOptimizeProductTool'.

4.  **Show Preview**: After 'aiOptimizeProductTool' runs, it will return a preview of the AI content. Your response to the user MUST be exactly that preview text.

5.  **Create Product**: If the user's message is a confirmation to the preview, like "create it", "save as draft", or "yes", you MUST call the 'createProductTool' with the correct status ('publish' for create, 'draft' for save draft).

**Important:**
- If an image is uploaded (user message is empty), just acknowledge it and ask for any other missing details.
- Be concise.
    `;
    
    try {
        const response = await ai.generate({
            prompt: newMessage || "An image was just uploaded.", // Provide context if message is empty
            system: systemPrompt,
            tools: [updateProductDetailsTool, aiOptimizeProductTool, createProductTool],
            model: 'googleai/gemini-2.5-flash',
        });

        // After the model runs (and potentially calls tools that update state), save the final state.
        setState(chatId, data);

        const responseText = response.text;
        
        return { text: responseText };

    } catch (error: any) {
        console.error("Genkit Flow Error:", error);
        return { text: `I'm sorry, an internal error occurred: ${error.message}` };
    }
}
