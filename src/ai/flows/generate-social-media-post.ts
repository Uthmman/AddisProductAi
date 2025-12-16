'use server';

/**
 * @fileOverview Defines a Genkit flow to generate social media posts for products.
 *
 * This flow takes a product ID, a target social media platform, and a topic,
 * then generates compelling post content tailored to that platform.
 *
 * - generateSocialMediaPost - The main function that triggers the flow.
 * - GenerateSocialMediaPostInput - The input type.
 * - GenerateSocialMediaPostOutput - The output type.
 */

import { ai } from '@/ai/genkit';
import { getProduct, getSettings } from '@/lib/woocommerce-api';
import { z } from 'genkit';

// Define the input schema for the flow
const GenerateSocialMediaPostInputSchema = z.object({
  productId: z.string().describe('The ID of the WooCommerce product.'),
  platform: z.enum(['telegram']).describe('The target social media platform.'),
  topic: z.string().describe('The main topic or angle for the post (e.g., "New Arrival", "Special Offer").'),
});
export type GenerateSocialMediaPostInput = z.infer<typeof GenerateSocialMediaPostInputSchema>;

// Define the output schema for the flow
const GenerateSocialMediaPostOutputSchema = z.object({
  content: z.string().describe('The formatted content for the social media post.'),
});
export type GenerateSocialMediaPostOutput = z.infer<typeof GenerateSocialMediaPostOutputSchema>;

// Exported function to trigger the flow
export async function generateSocialMediaPost(
  input: GenerateSocialMediaPostInput
): Promise<GenerateSocialMediaPostOutput> {
  return generateSocialMediaPostFlow(input);
}

// Define the prompt for the Gemini API
const generateSocialMediaPostPrompt = ai.definePrompt({
  name: 'generateSocialMediaPostPrompt',
  prompt: `You are a social media marketing expert for Zenbaba Furniture, a furniture company in Addis Ababa, Ethiopia. Your task is to create an engaging post for {{platform}}.

**Product Information:**
- Name: {{{product.name}}}
- SKU: {{{product.sku}}}
- Price: {{{product.price}}} ETB
- Link: {{{product.permalink}}}
- Description: {{{product.short_description}}}
- Dimensions: {{{json product.attributes}}}

**Business Information:**
- Phone Number: {{{settings.phoneNumber}}}
- Telegram: {{{settings.telegramUrl}}}
- Website: (The website URL can be derived from the product permalink)

**Post Details:**
- Topic/Angle: {{{topic}}}

**Instructions for {{platform}}:**

Your output MUST strictly follow this format. Use a mix of English and Amharic. Use emojis to make it visually appealing.

- Start with the Product ID (e.g., "#{{product.id}}").
- Item Code: Use the format "→ Item code: {{{product.sku}}}".
- List key product details and dimensions using the "→" prefix. Include Amharic translations for labels like "Dimension" (ልኬት) where appropriate.
- Include key features like "Comfortable and Stylish Design".
- Mention color availability.
- The Call to Action section should be clear: "CALL: {{{settings.phoneNumber}}}" and a link to the Telegram profile.
- Finish with a list of relevant hashtags in both English and Amharic.

**Example 1 Format:**
#139
→ Item code: ZF0512
→ Overall Dimension: አልጋው ሚወስደው 200 cm (L) x 130 cm (W)
→ mattresses measuring: የፍራሽ ልኬት 120 cm x 190 cm
→ Comfortable and Stylish Design
→ Includes a matching side table
→ Color: Available in different colors

CALL: 0996994690
📱 telegram (http://t.me/zenbabafurniture1)

#BedroomFurniture #singlebed #bed #ZF0512

**Example 2 Format:**
#Item code: ZF0406
🌟የልጆን ክፍል ውብ እና ማራኪ በሆኑ የዘንባባ ፈርኒቸር አልጋዎች ያሳምሩ!🛏️✨

🎨በፈለጉት ከለር እና ዲዛይን
🗄️የጎን እና የስር መሳቢያ ያለው
🚚ለአዲስ አበባ ነዋሪዎች FREE delivery

📞 አሁኑኑ ይደውሉ!
📱 0996994690
💬 Telegram

🛍 More products 👇
🔗 Telegram Channel
🌐 Website

✨ Make your kids' room beautiful and fun with Zenbaba Furniture! 🎉🛏️

#Babybed #bed
#KidsFurniture #HomeFurniture
#ZenbabaFurniture

---
Now, generate the post based on the provided product information. Your final output must be a single string containing only the post content, adhering to one of the example formats.
`,
});


const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async (input) => {
    const productIdNum = parseInt(input.productId, 10);
    if (isNaN(productIdNum)) {
      throw new Error('Invalid Product ID');
    }
    
    const [product, settings] = await Promise.all([
      getProduct(productIdNum),
      getSettings(),
    ]);

    if (!product) {
      throw new Error(`Product with ID ${input.productId} not found.`);
    }

    const { output } = await generateSocialMediaPostPrompt({
      ...input,
      product,
      settings,
    });
    
    return output!;
  }
);
