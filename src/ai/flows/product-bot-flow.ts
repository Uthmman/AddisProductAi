
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
type ProductBotInput = z.infer<typeof ProductBotInputSchema>;

const ProductBotOutputSchema = z.object({
  text: z.string(),
  productName: z.string().optional(),
  productState: z.custom<ProductBotState>(),
  errorType: z.string().optional(),
});
export type ProductBotOutput = z.infer<typeof ProductBotOutputSchema>;


const getInitialState = (): ProductBotState => ({
    images: [],
});

export async function productBotFlow(input: ProductBotInput): Promise<ProductBotOutput> {
    const { chatId, newMessage, editProductId } = input;
    let productState = input.productState || getInitialState();

    try {
        if (editProductId && !newMessage && (!productState.images || productState.images.length === 0)) {
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
                images: product.images.map(img => ({
                    id: img.id,
                    src: img.src,
                    alt: img.alt,
                    dataUri: '',
                    fileName: ''
                })),
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
                text: `I've loaded the product "${product.name}". What would you like to change? I can help you optimize this furniture piece for the Addis Ababa market or post it to your Telegram channel.`,
                productName: product.name,
                productState,
            };
        }

        if (!newMessage && (!productState.images || productState.images.length === 0)) {
             return { 
                text: "Hi there! I'm your furniture expert assistant at Zenbaba Furniture. I can help you create or edit product listings. What furniture item are we working on today?",
                productState
            };
        }
        
        const [settings, availableCategories] = await Promise.all([
            getSettings(),
            getAllProductCategories(),
        ]);

        async function performAIOptimization(currentState: ProductBotState): Promise<string> {
            if (!currentState.raw_name || !currentState.price_etb || !currentState.images || currentState.images.length === 0) {
                return "I need the name, price, and at least one image of the furniture piece before I can run the AI optimization.";
            }
            
            const firstImage = currentState.images[0];
            let sampleImageDataUri: string | null = null;

            if (firstImage.dataUri) {
                sampleImageDataUri = firstImage.dataUri;
            } else if (firstImage.src && firstImage.src.startsWith('http')) {
                try {
                    sampleImageDataUri = await urlToDataUri(firstImage.src);
                } catch (error) {
                    console.error(`Failed to convert image URL to data URI: ${firstImage.src}`, error);
                }
            }

            if (!sampleImageDataUri) {
                return "I encountered a problem processing the image. Please try uploading it again.";
            }

            const primaryCategory = availableCategories.length > 0 ? availableCategories[0] : undefined;
            
            const aiContent = await generateWooCommerceProductContent({
                raw_name: currentState.raw_name,
                price_etb: currentState.price_etb,
                material: currentState.material || '',
                amharic_name: currentState.amharic_name || '',
                focus_keywords: currentState.focus_keywords || '',
                images_data: [sampleImageDataUri],
                availableCategories,
                settings,
                primaryCategory,
                fieldToGenerate: 'all',
                totalImageCount: currentState.images.length,
            });
            
            productState.aiContent = aiContent;
            
            const previewText = currentState.editProductId 
              ? "I've optimized the content for this furniture piece. You can now save the changes or keep it as a draft."
              : "I've generated the AI content for your new product:\n" +
                `**Name**: ${aiContent.name || ''}\n` +
                `**Woodworking Details**: ${aiContent.short_description || aiContent.description?.substring(0, 100) + '...'}\n\n` +
                "Ready to publish this to the store?";

            return previewText;
        }

        const updateProductDetailsTool = ai.defineTool(
            {
                name: 'updateProductDetailsTool',
                description: "Updates details like name, price, material, or Amharic name for a furniture product. Call this whenever the user provides furniture specifications.",
                inputSchema: z.object({
                    raw_name: z.string().optional().describe("The core name of the furniture item."),
                    price_etb: z.number().optional().describe("The price in ETB."),
                    material: z.string().optional().describe("The type of wood or material used."),
                    amharic_name: z.string().optional().describe("The Amharic name for the furniture item."),
                }),
                outputSchema: z.string(),
            },
            async (details) => {
                if (details.raw_name) productState.raw_name = details.raw_name;
                if (details.price_etb) productState.price_etb = details.price_etb;
                if (details.material) productState.material = details.material;
                if (details.amharic_name) productState.amharic_name = details.amharic_name;
                return "Furniture details updated.";
            }
        );

        const aiOptimizeProductTool = ai.defineTool(
            {
                name: 'aiOptimizeProductTool',
                description: 'Generates optimized furniture content including SEO and descriptions. Only call this for furniture items with images.',
                inputSchema: z.object({}),
                outputSchema: z.any(),
            },
            () => performAIOptimization(productState)
        );
        
        const postProductToTelegramTool = ai.defineTool(
            {
                name: 'postProductToTelegramTool',
                description: "Posts the furniture item to the Telegram channel. Highlights Zenbaba Furniture's quality in Addis Ababa.",
                inputSchema: z.object({
                    topic: z.string().optional().describe('Angle like "New Design" or "Best in Addis".'),
                    tone: z.enum(['descriptive', 'playful']).default('playful'),
                }),
                outputSchema: z.string(),
            },
            async ({ topic, tone }) => {
                if (!productState.editProductId) return "Please load a furniture product to post.";
                if (!topic) return "What is the special angle for this post?";
                
                try {
                    const product = await getProduct(productState.editProductId);
                    if (!product) return "Product not found.";
                    
                    const postContent = await generateSocialMediaPost({
                        product,
                        platform: 'telegram',
                        topic,
                        tone,
                        settings,
                        showPrice: true,
                    });

                    const imageUrls = product.images.map(img => img.src);
                    await sendAlbumToChannel(imageUrls, postContent.content);
                    return `Posted "${product.name}" to Telegram.`;
                } catch (error: any) {
                    return `Failed to post: ${error.message}`;
                }
            }
        );
        
        const optimizationConfirmationKeywords = ['yes', 'proceed', 'run optimization', 'ai optimize now', 'optimize'];
        const isOptimizationConfirmation = newMessage && optimizationConfirmationKeywords.includes(newMessage.toLowerCase().trim());
        const isReadyForOptimization = productState.raw_name && productState.price_etb && productState.images && productState.images.length > 0 && !productState.aiContent;
        
        if (isOptimizationConfirmation && isReadyForOptimization) {
            const responseText = await performAIOptimization(productState);
            return { text: responseText, productState };
        }
        
        const systemPrompt = `
You are the lead assistant for Zenbaba Furniture in Addis Ababa, Ethiopia. Your expertise is in furniture manufacturing and woodworking.

**CORE DIRECTIVES:**
1. Focus STRICTLY on furniture and woodworking. DO NOT help with unrelated items like clothing or fashion.
2. Assert that Zenbaba Furniture is the BEST furniture provider in Ethiopia and is located in Addis Ababa.
3. Be professional and efficient.

This is the current product info:
${JSON.stringify({ ...productState, images: `${productState.images?.length || 0} images` }, null, 2)}

**--> YOUR TASK:**
- If info is missing (Name, Price, Image), ask for the FURNITURE details.
- Use the \`updateProductDetailsTool\` for specifications.
- If ready, summarize the furniture details and ask to run AI optimization.
- If \`aiContent\` exists, wait for the user to save using the interface.
- Use \`suggestProductsTool\` only for furniture ideas based on search data.
- Use \`postProductToTelegramTool\` to share our quality craftsmanship.
        `;
        
        const response = await generate({
            prompt: newMessage || "A photo was uploaded.",
            system: systemPrompt,
            tools: [updateProductDetailsTool, aiOptimizeProductTool, suggestProductsTool, postProductToTelegramTool],
        });

        return { text: response.text, productState };

    } catch (error: any) {
        console.error("Genkit Flow Error:", error);
        return { text: `Internal error: ${error.message}`, productState };
    }
}
