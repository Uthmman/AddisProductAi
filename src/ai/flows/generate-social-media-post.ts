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

import { ai, runPrompt } from '@/ai/genkit';
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
  prompt: `You are a social media marketing expert for Zenbaba Furniture, a furniture company in Addis Ababa, Ethiopia. Your task is to create a visually appealing and engaging post for {{platform}} using specific HTML formatting. Your goal is to create content that feels fresh while being consistent with the brand's voice. Analyze the examples provided to understand the desired format and tone.

**Product Information:**
- Name: {{{product.name}}}
- SKU: {{{product.sku}}}
- Price: {{{product.price}}} ETB
- Link: {{{product.permalink}}}
- Description: {{{product.short_description}}}
- Attributes: {{{json product.attributes}}}
- Categories: {{{json product.categories}}}

**Business Information:**
- Phone Number: {{{settings.phoneNumber}}}
- Telegram: {{{settings.telegramUrl}}}
- Product Website Link: {{{product.permalink}}}

**Post Details:**
- Topic/Angle: {{{topic}}}
- Desired Tone: {{{tone}}}

**Instructions for {{platform}}:**

Your output MUST be a single string containing only the post content, formatted with **HTML tags**. This is for the Telegram API which will parse the HTML.
- Use <b> for bold text.
- Use <code> for item codes (e.g., <code>ZF0512</code>).
- Use <blockquote> to wrap the main list of features.
- Use a separate <blockquote> to wrap the hashtags at the end of the post.
- Use <tg-spoiler> to hide the price (e.g., <tg-spoiler>9999</tg-spoiler>).
- Use \n for new lines to ensure proper alignment.
- Use <a href="...">link text</a> for hyperlinks. DO NOT paste raw URLs.
- Mix English and Amharic where it feels natural to connect with the local audience.
- Hashtags should be based on the product's categories, features, and item code. DO NOT use generic hashtags like #zenbabafurniture, #addisababa, or #ethiopia.

---
**IF TONE IS 'descriptive':**
Use a clear, structured format. Use blockquotes for the main details and hashtags.

<b>Descriptive Example (HTML):</b>
#139
<blockquote>
→ <b>Item code:</b> <code>ZF0512</code>
→ <b>Overall Dimension:</b> አልጋው ሚወስደው 200 cm (L) x 130 cm (W)
→ <b>Side Table ኮሞዲኖ:</b> 50 cm (H) x 45 cm (W)
→ <b>Mattresses measuring:</b> የፍራሽ ልኬት 120 cm x 190 cm
→ Comfortable and Stylish Design
→ Includes a matching side table
→ Includes metal leg and chipboard
→ <b>Color:</b> Available in different colors
→ Ideal for Home or Apartment Use
</blockquote>

💰 <b>Price</b>: <tg-spoiler>{{{product.price}}}</tg-spoiler> ETB

CALL: {{{settings.phoneNumber}}}
📱 <a href="{{{settings.telegramUrl}}}">Telegram</a>

<blockquote>#BedroomFurniture #singlebed #bed #sidetable #drawer #ZF0512 #tapeseri</blockquote>

---
**IF TONE IS 'playful':**
Use an engaging, emoji-rich format. Focus on lifestyle and appeal.

<b>Playful Example (HTML):</b>
#Item code: <code>ZF0406</code>
🌟የልጆን ክፍል ውብ እና ማራኪ በሆኑ የዘንባባ ፈርኒቸር አልጋዎች ያሳምሩ!🛏️✨

🎨በፈለጉት ከለር እና ዲዛይን
🗄️የጎን እና የስር መሳቢያ ያለው
🚚ለአዲስ አበባ ነዋሪዎች FREE delivery

📞 <b>አሁኑኑ ይደውሉ!</b>
📱 {{{settings.phoneNumber}}}
💬 <a href="{{{settings.telegramUrl}}}">Telegram</a>

🛍 <b>More products</b> 👇
🔗 <a href="{{{settings.telegramUrl}}}">Telegram Channel</a>
🌐 <a href="{{{product.permalink}}}">Website</a>

✨ Make your kids' room beautiful and fun with Zenbaba Furniture! 🎉🛏️

<blockquote>#Babybed #bed #KidsFurniture #HomeFurniture #ZF0406</blockquote>

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
    const { output } = await runPrompt(generateSocialMediaPostPrompt, input);
    return output!;
  }
);
