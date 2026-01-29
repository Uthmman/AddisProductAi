
'use server';

import { ai, generate } from '@/ai/genkit';
import { z } from 'zod';
import { generateWooCommerceProductContent } from './generate-woocommerce-product-content';
import { createProduct, getProduct, updateProduct, getAllProductCategories } from '@/lib/woocommerce-api';
import { getSettings } from '@/lib/settings-api';
import { AIProductContent, Settings, WooCategory, ProductBotState } from '@/lib/types';
import { suggestProductsTool } from '../tools/suggest-products-tool';
import { getGscTopQueries } from '@/lib/gsc-api';
import { generateSocialMediaPost } from './generate-social-media-post';
import { sendAlbumToChannel } from '@/lib/telegram-api';
import { appCache } from '@/lib/cache';
import { urlToDataUri } from '@/lib/utils';

const ProductBotInputSchema = z.object({
  chatId: z.string(),
  newMessage: z.string().optional(),
  productState: z.custom<ProductBotState>(),
  editProductId: z.string().optional(),
});
export type ProductBotInput = z.infer<typeof ProductBotInputSchema>;

const ProductBotOutputSchema = z.object({
  text: z.string(),
  productName: z.string().optional(),
  productState: z.custom<ProductBotState>(),
});
export type ProductBotOutput = z.infer<typeof ProductBotOutputSchema>;


const getInitialState = (): ProductBotState => ({
    image_ids: [],
    image_srcs: [],
    original_image_data_uris: {},
});

export async function productBotFlow(input: ProductBotInput): Promise<ProductBotOutput> {
    const { chatId, newMessage, editProductId } = input;
    let productState = input.productState || getInitialState();

    try {
        // This is the initial message when loading an existing product for editing.
        if (editProductId && !newMessage && (!productState.image_ids || productState.image_ids.length === 0)) {
            const product = await getProduct(parseInt(editProductId, 10));
            if (!product) {
                return { 
                    text: `Sorry, I couldn't find a product with ID ${editProductId}.`,
                    productState
                };
            }

            const editData: ProductBotState = {
                editProductId: product.id,
                raw_name: product.name,
                price_etb: parseFloat(product.regular_price),
                material: product.attributes.find(a => a.name === "Material")?.options[0] || "",
                focus_keywords: product.meta_data.find(m => m.key === '_yoast_wpseo_focuskw')?.value || product.tags.map(t => t.name).join(', ') || "",
                amharic_name: product.meta_data.find(m => m.key === 'amharic_name')?.value || "",
                image_ids: product.images.map(img => img.id),
                image_srcs: product.images.map(img => img.src),
                original_image_data_uris: {}, // This will be populated by the fallback if needed
                aiContent: {
                    name: product.name,
                    sku: product.sku,
                    slug: product.slug,
                    regular_price: parseFloat(product.regular_price),
                    description: product.description,
                    short_description: product.short_description,
                    categories: product.categories.map(c => c.name),
                    tags: product.tags.map(t => t.name),
                    images: product.images.map(img => ({ alt: img.alt })),
                    meta_data: product.meta_data,
                    attributes: product.attributes.map(attr => ({ name: attr.name, option: attr.options[0] })),
                }
            };
            productState = editData;
            
            return { 
                text: `I've loaded the product "${product.name}". What would you like to change? You can ask me to update the name, price, description, run AI optimization on it, or post it to Telegram.`,
                productName: product.name,
                productState,
            };
        }

        if (!newMessage && (!productState.image_ids || productState.image_ids.length === 0)) {
             return { 
                text: "Hi there! I can help you create a new product. What's the name, price, and Amharic name? You can also upload photos or ask me for product suggestions based on search data.",
                productState
            };
        }
        
        const [settings, availableCategories] = await Promise.all([
            getSettings(),
            getAllProductCategories(),
        ]);

        // This is the core logic for optimization. It's extracted so it can be called directly or by the tool.
        async function performAIOptimization(): Promise<string> {
            if (!productState.raw_name || !productState.price_etb || !productState.image_srcs || productState.image_srcs.length === 0) {
                return "I can't optimize yet. I'm still missing the product name, price, or an image. Please provide the missing details.";
            }
            
            let images_data: string[] = [];
            // Primary method: Use original data URIs stored in the state.
            if (productState.original_image_data_uris && Object.keys(productState.original_image_data_uris).length > 0) {
                 images_data = (productState.image_ids || [])
                    .map(id => productState.original_image_data_uris?.[id])
                    .filter(Boolean) as string[];
            }
            // Fallback method: If original data is missing (e.g., in an "edit" flow), fetch from the public URLs.
            if (images_data.length === 0 && productState.image_ids && productState.image_ids.length > 0) {
                const imagePromises = productState.image_srcs.map(async (url) => {
                     if (url && url.startsWith('http')) {
                        try {
                            return await urlToDataUri(url);
                        } catch (error) {
                            console.error(`Failed to convert image URL to data URI: ${url}`, error);
                            return null;
                        }
                    }
                    return null;
                });
                images_data = (await Promise.all(imagePromises)).filter(Boolean) as string[];
            }
            if (images_data.length === 0) {
                return "I can't optimize because there are no valid images for this product. Please try uploading them again.";
            }

            const primaryCategory = availableCategories.length > 0 ? availableCategories[0] : undefined;
            const gscData = await getGscTopQueries();

            const aiContent = await generateWooCommerceProductContent({
                raw_name: productState.raw_name,
                price_etb: productState.price_etb,
                material: productState.material || '',
                amharic_name: productState.amharic_name || '',
                focus_keywords: productState.focus_keywords || '',
                images_data: images_data,
                availableCategories,
                settings,
                primaryCategory,
                fieldToGenerate: 'all',
                gscData: gscData ?? undefined,
            });
            
            productState.aiContent = aiContent;
            
            const previewText = productState.editProductId 
              ? "I've generated the AI content. Do you want to save the changes, or save it as a draft?"
              : "Here's a preview of the product content I generated:\n" +
                `**Name**: ${aiContent.name || ''}\n` +
                `**Description**: ${aiContent.short_description || aiContent.description?.substring(0, 100) + '...'}\n\n` +
                "Do you want me to create the product, or save it as a draft?";

            return previewText;
        }

        const updateProductDetailsTool = ai.defineTool(
            {
                name: 'updateProductDetailsTool',
                description: "Parses the user's message to extract and update product details like name, price, material, or Amharic name. Call this whenever the user provides new product information.",
                inputSchema: z.object({
                    raw_name: z.string().optional().describe("The core name of the product. If the user provides a long description, extract the essential product name from it (e.g., from 'a beautiful handmade cotton dress for kids', extract 'handmade cotton dress for kids')."),
                    price_etb: z.number().optional().describe("The price of the product in Ethiopian Birr."),
                    material: z.string().optional().describe("The material of the product (e.g., 'Cotton', 'Wood')."),
                    amharic_name: z.string().optional().describe("The Amharic name for the product."),
                }),
                outputSchema: z.string(),
            },
            async (details) => {
                if (details.raw_name) productState.raw_name = details.raw_name;
                if (details.price_etb) productState.price_etb = details.price_etb;
                if (details.material) productState.material = details.material;
                if (details.amharic_name) productState.amharic_name = details.amharic_name;
                return "Product details updated.";
            }
        );

        const aiOptimizeProductTool = ai.defineTool(
            {
                name: 'aiOptimizeProductTool',
                description: 'MUST be called when the user asks to "run AI optimization" or "AI Optimize Now". This tool generates all product fields. Only call this if the name, price, and image are already provided.',
                inputSchema: z.object({}),
                outputSchema: z.any(),
            },
            performAIOptimization
        );
        
        const postProductToTelegramTool = ai.defineTool(
            {
                name: 'postProductToTelegramTool',
                description: "Generates and posts a social media update for the current product to the public Telegram channel. Call this when the user asks to post, share, or publish the product to Telegram.",
                inputSchema: z.object({
                    topic: z.string().optional().describe('The main topic or angle for the post (e.g., "New Arrival", "Special Offer").'),
                    tone: z.enum(['descriptive', 'playful']).default('playful').describe("The desired tone for the post."),
                }),
                outputSchema: z.string(),
            },
            async ({ topic, tone }) => {
                if (!productState.editProductId) {
                    return "Please load a product to edit before you can post it to Telegram.";
                }
                if (!topic) {
                    return "What should be the topic for the post (like 'New Arrival' or 'Special Offer')?";
                }
                
                try {
                    const product = await getProduct(productState.editProductId);
                    if (!product) {
                        return `I couldn't find the product with ID ${productState.editProductId} to post.`;
                    }
                    if (!product.images || product.images.length === 0) {
                        return "The product needs at least one image before I can post it to Telegram.";
                    }

                    const postContent = await generateSocialMediaPost({
                        product,
                        platform: 'telegram',
                        topic,
                        tone,
                        settings,
                    });

                    const imageUrls = product.images.map(img => img.src);

                    await sendAlbumToChannel(imageUrls, postContent.content);
                    
                    return `Successfully posted "${product.name}" to the Telegram channel.`;

                } catch (error: any) {
                    console.error("Tool Error: Failed to post to Telegram:", error);
                    return `I'm sorry, I failed to post to the Telegram channel. The system reported an error: ${error.message}`;
                }
            }
        );

        const saveOrUpdateProductTool = ai.defineTool(
            {
                name: 'saveOrUpdateProductTool',
                description: 'Saves or updates the product in WooCommerce. MUST be called after the user confirms the action. The user will confirm by sending "Create Product", "Save as Draft", or "Save Changes".',
                inputSchema: z.object({
                    status: z.enum(['publish', 'draft']).describe('Use "publish" if the user says "Create Product" or "Save Changes". Use "draft" if the user says "Save as Draft".'),
                }),
                outputSchema: z.any(),
            },
            async ({ status }) => {
                if (!productState.aiContent && !productState.editProductId) {
                    return "I can't create the product because the AI content hasn't been generated yet. Please provide more details first.";
                }

                try {
                    const finalAiContent = productState.aiContent || {};

                    const finalImages = productState.image_ids.map((id, index) => ({
                        id,
                        alt: finalAiContent.images?.[index]?.alt || finalAiContent.name,
                    }));

                    const finalCategories = finalAiContent.categories?.map(c => {
                        const existing = availableCategories.find(cat => cat.name.toLowerCase() === c.toLowerCase());
                        return existing ? { id: existing.id } : { name: c };
                    }) || [];

                    const finalData = {
                        name: finalAiContent.name || productState.raw_name,
                        sku: finalAiContent.sku,
                        slug: finalAiContent.slug,
                        regular_price: (finalAiContent.regular_price || productState.price_etb)?.toString(),
                        description: finalAiContent.description,
                        short_description: finalAiContent.short_description,
                        categories: finalCategories,
                        tags: finalAiContent.tags?.map(tag => ({ name: tag })),
                        images: finalImages,
                        attributes: finalAiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
                        meta_data: finalAiContent.meta_data,
                        status: status,
                    };
                    
                    if (productState.editProductId) {
                        const product = await updateProduct(productState.editProductId, finalData);
                        productState = getInitialState(); // Reset state after success
                        return `Success! I've updated the product '${product.name}'.`;
                    } else {
                        const product = await createProduct(finalData);
                        productState = getInitialState(); // Reset state after success
                        return `Success! I've created the product '${product.name}' as a ${status}.`;
                    }

                } catch (error: any) {
                    console.error("Tool Error: Failed to save/update product:", error);
                    return `I'm sorry, I failed to save the product. The system reported an error: ${error.message}`;
                }
            }
        );
        
        // NEW LOGIC: Check for optimization confirmation before calling the main LLM to save an API call.
        const optimizationConfirmationKeywords = ['yes', 'proceed', 'run optimization', 'ai optimize now', 'optimize'];
        const isOptimizationConfirmation = newMessage && optimizationConfirmationKeywords.includes(newMessage.toLowerCase().trim());
        
        // This is a confirmation only if the bot is expecting it (all data present, but no AI content yet).
        const isReadyForOptimization = productState.raw_name && productState.price_etb && productState.image_srcs && productState.image_srcs.length > 0 && !productState.aiContent;
        
        if (isOptimizationConfirmation && isReadyForOptimization) {
            const responseText = await performAIOptimization();
            return { text: responseText, productState };
        }
        
        const systemPrompt = `
    You are an advanced conversational assistant for creating and editing products. Your goal is to be extremely efficient and clear.

    This is the current information you have for the product:
    ${JSON.stringify(productState, null, 2)}

    **--> SCENARIO 0: AI content is generated (\`aiContent\` is present):**
    Your ONLY job is to wait for the user to confirm saving. They will say "Create Product", "Save as Draft", or "Save Changes".
    When they do, you MUST call \`saveOrUpdateProductTool\` with the correct status ('publish' or 'draft').
    Do not ask any other questions or re-summarize. Just call the tool.

    **--> SCENARIO 1: Core details are present, but AI content is NOT (\`raw_name\`, \`price_etb\`, and \`image_srcs\` are present, but \`aiContent\` is empty):**
    1.  Your response MUST be a summary of the details. Example: "Here is a summary:\\n- Name: ${productState.raw_name || 'N/A'}\\n- Price: ${productState.price_etb || 'N/A'} ETB\\n- Images: ${productState.image_srcs.length} uploaded".
    2.  You MUST then ask the user to confirm optimization. Example: "Ready to run AI optimization?"
    3.  If the user agrees (e.g., "yes", "optimize", "proceed", "AI Optimize Now"), you MUST call the \`aiOptimizeProductTool\`.

    **--> SCENARIO 2: Core information is MISSING:**
    1.  Politely ask for the specific missing details (e.g., Name, Price, Amharic Name, or Image).
    2.  If the user provides details (e.g., 'a beautiful handmade cotton dress for kids, price is 1500 birr'), use the \`updateProductDetailsTool\` to capture them.
    3.  Acknowledge image uploads ("[Image Uploaded]") and then re-evaluate if you now have all core information. If so, switch to SCENARIO 1.
    
    **Special Cases & Tools:**
    -   **Editing a Product (\`editProductId\` is present):** Your goal is to assist with changes. Use tools as needed.
    -   **Suggestions:** If the user asks for new product ideas, you MUST call the \`suggestProductsTool\`.

    **Important:**
    - Be concise and efficient. Always follow the scenario that best fits the current state.
        `;
        
        const response = await generate({
            prompt: newMessage || "An image was just uploaded.",
            system: systemPrompt,
            tools: [updateProductDetailsTool, aiOptimizeProductTool, saveOrUpdateProductTool, suggestProductsTool, postProductToTelegramTool],
        });

        const responseText = response.text;
        
        return { text: responseText, productState };

    } catch (error: any) {
        console.error("Genkit Flow Error:", error);
        return { 
            text: `I'm sorry, an internal error occurred: ${error.message}`,
            productState 
        };
    }
}
