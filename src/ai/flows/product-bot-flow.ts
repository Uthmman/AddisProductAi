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
        return { text: "Hi there! I can help you create a new product. What's the name and price? You can also upload a photo." };
    }

    const [settings, availableCategories] = await Promise.all([
        getSettings(),
        getAllProductCategories(),
    ]);

    // Define tools for the AI to interact with the system
    const updateProductDetailsTool = ai.defineTool(
        {
            name: 'updateProductDetailsTool',
            description: "Updates the product details in the current session based on the user's message. Call this if the user provides new information like a name, price, or material.",
            inputSchema: z.object({
                raw_name: z.string().optional().describe("The name of the product."),
                price_etb: z.number().optional().describe("The price of the product."),
                material: z.string().optional().describe("The material of the product."),
            }),
            outputSchema: z.void(),
        },
        async (details) => {
            if (details.raw_name) data.raw_name = details.raw_name;
            if (details.price_etb) data.price_etb = details.price_etb;
            if (details.material) data.material = details.material;
        }
    );

    const aiOptimizeProductTool = ai.defineTool(
        {
            name: 'aiOptimizeProductTool',
            description: 'MUST be called when enough details (name, price, at least one image) are gathered. This tool runs AI optimization to generate all product fields.',
            inputSchema: z.object({}),
            outputSchema: z.any(),
        },
        async () => {
            const currentData = getState(chatId); // Get fresh data
            console.log("Running AI Optimization Tool with data:", currentData);
            if (!currentData.raw_name || !currentData.price_etb || currentData.image_srcs.length === 0) {
                return "I still need more information before I can optimize. Please provide the product name, price, and at least one image.";
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
            const currentData = getState(chatId); // Get fresh data
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
You are an advanced conversational assistant for creating products. Your goal is to guide the user to create a product by gathering information, running an AI optimization, showing a preview, and then creating the product based on their confirmation.

This is the current information you have for the product being created:
${JSON.stringify(data, null, 2)}

Your task is to respond to the user's latest message based on the current product information.

- First, analyze the user's message. If it contains new product information (like name, price, or material), you MUST call the 'updateProductDetailsTool' to save this new information.
- After potentially updating details, check if you now have the 'raw_name', 'price_etb', AND at least one image. If you do, you MUST call the 'aiOptimizeProductTool' to generate the full product content.
- If you are still missing any of those core details (name, price, image), your main goal is to ask the user for the missing information. Be conversational and clear.
- After 'aiOptimizeProductTool' runs, it will return a preview. Your response to the user MUST be exactly that preview text.
- If the user's message is a confirmation like "create it", "save as draft", or "yes", you MUST call the 'createProductTool' with the correct status ('publish' for create, 'draft' for save draft).
- If an image has just been uploaded (the user message will be empty but the data will show a new image), acknowledge it and ask for any other missing details (like name or price).
- Keep your questions short and to the point.
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
