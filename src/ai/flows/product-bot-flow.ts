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
                description: 'MUST be called ONLY when the user confirms to proceed with AI optimization by sending the message "AI Optimize Now". This tool runs the AI optimization to generate all product fields.',
                inputSchema: z.object({}),
                outputSchema: z.any(),
            },
            async () => {
                if (!productState.raw_name || !productState.price_etb || !productState.image_srcs || productState.image_srcs.length === 0) {
                    return "I can't optimize yet. I'm still missing the product name, price, or an image. Please provide the missing details.";
                }

                // Construct the image data for the AI. Prioritize original, clean images from cache,
                // otherwise fall back to fetching the public URL.
                const imagePromises = (productState.image_ids || []).map(async (id, index) => {
                    const originalDataUri = appCache.get<string>(`original_image_${chatId}_${id}`);
                    if (originalDataUri) {
                        return originalDataUri;
                    }
                    const imageUrl = (productState.image_srcs || [])[index];
                    if (imageUrl && imageUrl.startsWith('http')) {
                        try {
                            // Fetch the public URL and convert it to a data URI for the AI
                            return await urlToDataUri(imageUrl);
                        } catch (error) {
                            console.error(`Failed to convert image URL to data URI: ${imageUrl}`, error);
                            return null;
                        }
                    }
                    return null;
                });

                const images_data = (await Promise.all(imagePromises)).filter(Boolean) as string[];


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

        const systemPrompt = `
    You are an advanced conversational assistant for creating and editing products. Your goal is to guide the user through a clear, step-by-step process.

    This is the current information you have for the product:
    ${JSON.stringify(productState, null, 2)}

    Your process depends on whether you are creating a new product or editing an existing one (indicated by 'editProductId').

    **IF CREATING A NEW PRODUCT (no 'editProductId'):**
    1.  **Gather Information / Suggest Products**: Your primary goal is to collect the product's **Name**, **Price**, **Amharic Name**, and at least one **Image**.
        - If the user uploads an image, the message will be "[Image Uploaded]". Acknowledge it and ask for the remaining details.
        - The user might provide multiple details in one message (e.g., 'a beautiful handmade cotton dress for kids, price is 1500 birr'). You must analyze the message and call 'updateProductDetailsTool' with all the information you can extract.
        - If any of these core details are missing, ask the user for them clearly.
        - **Product Suggestions**: If the user asks for new product ideas, what to sell, or for suggestions based on search data, you MUST call the 'suggestProductsTool'. After providing suggestions, return to the product creation flow.
    2.  **Confirm and Summarize**: Once you have gathered at least the Name, Price, and one Image, your response MUST present a summary and ask the user if you should proceed with AI optimization.
    3.  **AI Optimize**: Only when the user's message is exactly "AI Optimize Now", you MUST then call the 'aiOptimizeProductTool'.
    4.  **Show Preview & Save**: After 'aiOptimizeProductTool' runs, it will return a preview. Your response MUST be that preview, which asks the user to "Create Product" or "Save as Draft". When they respond, call 'saveOrUpdateProductTool'.

    **IF EDITING AN EXISTING PRODUCT (has 'editProductId'):**
    1.  **Assist with Changes**: You have already loaded the product. Your goal is to help the user modify it. They can provide new details (e.g., "change the price to 2000 birr"), and you must use 'updateProductDetailsTool' to update the state.
    2.  **Run Optimization**: If the user asks to optimize, or says "AI Optimize Now", you MUST call 'aiOptimizeProductTool'.
    3.  **Post to Telegram**: If the user asks to "post to Telegram", "share on Telegram", or similar, you MUST use the 'postProductToTelegramTool'. The tool will default to a 'playful' tone, but it will ask for a topic if one is not provided.
    4.  **Confirm Save**: After 'aiOptimizeProductTool' runs, it will return a confirmation. Your response MUST be that text. It will ask the user to "Save Changes" or "Save as Draft".
    5.  **Save Changes**: If the user says "Save Changes" or "Save as Draft", you MUST call 'saveOrUpdateProductTool' with the correct status.

    **Important:**
    - Be concise.
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

    
    