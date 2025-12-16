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
import { WooProduct, Settings } from '@/lib/types';
import { z } from 'genkit';

// Define the input schema for the flow
const GenerateSocialMediaPostInputSchema = z.object({
  product: z.any().describe('The full WooCommerce product object.'),
  platform: z.enum(['telegram']).describe('The target social media platform.'),
  topic: z.string().optional().describe('The main topic or angle for the post (e.g., "New Arrival", "Special Offer").'),
  settings: z.any().describe('The application settings object.'),
  tone: z.enum(['descriptive', 'playful']).describe('The desired tone for the post.'),
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
  input: { schema: GenerateSocialMediaPostInputSchema },
  output: { schema: GenerateSocialMediaPostOutputSchema },
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
- Desired Tone: {{{tone}}}

**Instructions for {{platform}}:**

Your output MUST be a single string containing only the post content. Follow the format that matches the desired tone.

---
**IF TONE IS 'descriptive':**
Use a clear, structured format with arrows. Mix English and Amharic for labels.

**Descriptive Example:**
#139
→ Item code: ZF0512
→ Overall Dimension: አልጋው ሚወስደው 200 cm (L) x 130 cm (W)
→ Side Table ኮሞዲኖ: 50 cm (H) x 45 cm (W)
→ mattresses measuring: የፍራሽ ልኬት 120 cm x 190 cm
→ Comfortable and Stylish Design
→ Includes a matching side table
→ Includes metal leg and chipboard
→ Color: Available in different colors
→ Ideal for Home or Apartment Use

    CALL: 0996994690
    📱  telegram (http://t.me/zenbabafurniture1)

#BedroomFurniture #singlebed #bed #sidetable #drawer #ZF0512 #tapeseri

---
**IF TONE IS 'playful':**
Use an engaging, emoji-rich format. Focus on lifestyle and appeal.

**Playful Example:**
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
Now, generate the post based on the provided product information and the desired tone.
`,
});


const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async (input) => {
    const { output } = await generateSocialMediaPostPrompt(input);
    return output!;
  }
);
