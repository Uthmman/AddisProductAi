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
    const aiOptimizeProductTool = ai.defineTool(
        {
            name: 'aiOptimizeProductTool',
            description: 'MUST be called when enough details (name, price, at least one image) are gathered. This tool runs AI optimization to generate all product fields.',
            inputSchema: z.object({}),
            outputSchema: z.any(),
        },
        async () => {
            console.log("Running AI Optimization Tool with data:", data);
            if (!data.raw_name || !data.price_etb || data.image_srcs.length === 0) {
                return "I still need more information before I can optimize. Please provide the product name, price, and at least one image.";
            }

            const primaryCategory = availableCategories.length > 0 ? availableCategories[0] : undefined;

            const aiContent = await generateWooCommerceProductContent({
                raw_name: data.raw_name,
                price_etb: data.price_etb,
                material: data.material || '',
                amharic_name: data.amharic_name || '',
                focus_keywords: data.focus_keywords || '',
                images_data: data.image_srcs,
                availableCategories,
                settings,
                primaryCategory,
                fieldToGenerate: 'all',
            });
            
            data.aiContent = aiContent;
            setState(chatId, data);
            
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
            console.log(`Running Create Product Tool with status: ${status}`);
            if (!data.aiContent) {
                return "I can't create the product because the AI content hasn't been generated yet. Please provide more details first.";
            }

            try {
                 const finalImages = data.image_ids.map((id, index) => ({
                    id,
                    alt: data.aiContent?.images?.[index]?.alt || data.aiContent?.name,
                }));

                const finalCategories = data.aiContent.categories?.map(c => {
                    const existing = availableCategories.find(cat => cat.name.toLowerCase() === c.toLowerCase());
                    return existing ? { id: existing.id } : { name: c };
                }) || [];

                const finalData = {
                    name: data.aiContent.name,
                    slug: data.aiContent.slug,
                    regular_price: (data.aiContent.regular_price || data.price_etb)?.toString(),
                    description: data.aiContent.description,
                    short_description: data.aiContent.short_description,
                    categories: finalCategories,
                    tags: data.aiContent.tags?.map(tag => ({ name: tag })),
                    images: finalImages,
                    attributes: data.aiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
                    meta_data: data.aiContent.meta_data,
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

    // Update the current state based on the user's message
    data.raw_name = ai.embed("name", data.raw_name);
    data.price_etb = ai.embed("price", data.price_etb);
    data.material = ai.embed("material", data.material);
    // Persist changes from embeddings if any
    setState(chatId, data);


    // The AI's main prompt
    const systemPrompt = `
You are an advanced conversational assistant for creating products. Your goal is to guide the user to create a product by gathering information, running an AI optimization, showing a preview, and then creating the product based on their confirmation.

This is the current information you have for the product being created:
${JSON.stringify(data, null, 2)}

Your task is to respond to the user's latest message based on the current product information.

- If you don't have a 'raw_name', 'price_etb', or any images, your main goal is to ask the user for the missing information. Be conversational and clear.
- Once you have the name, price, AND at least one image, you MUST call the 'aiOptimizeProductTool' to generate the full product content.
- After 'aiOptimizeProductTool' runs, it will return a preview. Your response to the user MUST be exactly that preview text.
- If the user's message is a confirmation like "create it", "save as draft", or "yes", you MUST call the 'createProductTool' with the correct status ('publish' for create, 'draft' for save draft).
- If an image has just been uploaded (the user message will be empty but the data will show a new image), acknowledge it and ask for any other missing details (like name or price).
- Keep your questions short and to the point.
    `;
    
    try {
        const response = await ai.generate({
            prompt: newMessage || "An image was just uploaded.", // Provide context if message is empty
            system: systemPrompt,
            tools: [aiOptimizeProductTool, createProductTool],
            model: 'googleai/gemini-2.5-flash',
        });

        const responseText = response.text;
        
        // If AI asks a question, update state before returning
        setState(chatId, data);

        return { text: responseText };

    } catch (error: any) {
        console.error("Genkit Flow Error:", error);
        return { text: `I'm sorry, an internal error occurred: ${error.message}` };
    }
}
