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
import { getProduct } from '@/lib/woocommerce-api';
import { z } from 'genkit';
import { getSettings } from '@/lib/woocommerce-api';

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
  prompt: `You are a social media marketing expert for a furniture company in Addis Ababa, Ethiopia. Your task is to create an engaging post for {{platform}}.

**Product Information:**
- Name: {{{product.name}}}
- Price: {{{product.price}}} ETB
- Link: {{{product.permalink}}}
- Description: {{{product.short_description}}}

**Business Information:**
- Phone Number: {{{settings.phoneNumber}}}
- Telegram: {{{settings.telegramUrl}}}

**Post Details:**
- Topic/Angle: {{{topic}}}

**Instructions for {{platform}}:**

- **Engaging Intro:** Start with a hook that grabs attention.
- **Key Features:** Highlight 2-3 key benefits or features of the product. Use emojis to make it visually appealing.
- **Amharic & English:** Mix English and Amharic naturally. Use Amharic for prices and key local phrases.
- **Formatting:** Use bold for the product name and price. Use bullet points or numbered lists for features.
- **Call to Action (CTA):** Include a strong CTA. Encourage users to order via Telegram or call the provided phone number. Include the product link.
- **Hashtags:** Include 5-7 relevant hashtags in both English and Amharic.

**Output:** Your final output must be a single string containing only the post content.
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
