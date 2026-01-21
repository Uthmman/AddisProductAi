'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate WooCommerce product content optimized for the Addis Ababa market.
 *
 * The flow takes raw product details as input and uses the Gemini API to generate
 * SEO-optimized product names, descriptions, meta-data, and tags, incorporating Amharic keywords for local SEO.
 * It can also leverage Google Search Console data for more effective keyword strategies.
 *
 * - generateWooCommerceProductContent - The main function that triggers the content generation flow.
 * - GenerateWooCommerceProductContentInput - The input type for the function.
 * - GenerateWooCommerceProductContentOutput - The output type for the function.
 */

import {ai, runPrompt} from '@/ai/genkit';
import {z} from 'genkit';
import { suggestSeoKeywordsTool } from '../tools/suggest-seo-keywords-tool';

// Define the input schema for the flow
const GenerateWooCommerceProductContentInputSchema = z.object({
  raw_name: z.string().describe('The raw product name provided by the user.'),
  material: z.string().describe('The material of the product.'),
  amharic_name: z.string().describe('The Amharic name of the product.'),
  focus_keywords: z.string().describe('Comma-separated keywords for SEO.'),
  price_etb: z.number().describe('The price of the product in ETB.'),
  images_data: z.array(z.string()).describe(
    "The product images as an array of data URIs that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  availableCategories: z.array(z.object({id: z.number(), name: z.string(), slug: z.string()})).describe('List of available categories the AI can choose from.'),
  fieldToGenerate: z.enum([
      'all',
      'name',
      'slug',
      'description',
      'short_description',
      'tags',
      'meta_data',
      'attributes',
      'images',
      'categories',
      'regular_price',
  ]).optional().describe('The specific field to generate content for. If not provided, all fields will be generated.'),
  existingContent: z.any().optional().describe('Existing product content to provide context for single-field generation.'),
  settings: z.object({
    phoneNumber: z.string().optional(),
    facebookUrl: z.string().optional(),
    instagramUrl: z.string().optional(),
    telegramUrl: z.string().optional(),
    tiktokUrl: z.string().optional(),
  }).optional().describe('General business settings like contact info and social media links.'),
  primaryCategory: z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
  }).optional().describe('The primary category of the product, used for creating inbound links.'),
  gscData: z.array(z.any()).optional().describe('An array of top search queries from Google Search Console.'),
});
export type GenerateWooCommerceProductContentInput = z.infer<typeof GenerateWooCommerceProductContentInputSchema>;

// Define the output schema for the flow
const GenerateWooCommerceProductContentOutputSchema = z.object({
  name: z.string().optional().describe('Refined, SEO-Optimized English Product Title.'),
  slug: z.string().optional().describe('URL-friendly, English slug based on the new name.'),
  description: z.string().optional().describe('SEO-rich description of about 300 words, formatted with HTML tags. It must include inbound and outbound links.'),
  short_description: z.string().optional().describe('Concise bullet-pointed summary.'),
  tags: z.array(z.string()).optional().describe('English and Amharic keywords.'),
  categories: z.array(z.string()).optional().describe('An array of category names, chosen from the provided list or newly created if appropriate.'),
  meta_data: z
    .array(z.object({key: z.string(), value: z.string()}))
    .optional()
    .describe('Meta data for SEO, including _yoast_wpseo_metadesc and _yoast_wpseo_focuskw (the focus keyphrase).'),
  attributes: z
    .array(z.object({name: z.string(), option: z.string()}))
    .optional()
    .describe('Product attributes.'),
  images: z.array(z.object({alt: z.string()})).optional().describe('Image alt texts for each provided image.'),
  regular_price: z.number().optional().describe('The price of the product.'),
});
export type GenerateWooCommerceProductContentOutput = z.infer<typeof GenerateWooCommerceProductContentOutputSchema>;

// Exported function to trigger the flow
export async function generateWooCommerceProductContent(
  input: GenerateWooCommerceProductContentInput
): Promise<GenerateWooCommerceProductContentOutput> {
  return generateWooCommerceProductContentFlow(input);
}

// Define the prompt for the Gemini API
const generateWooCommerceProductContentPrompt = ai.definePrompt({
  name: 'generateWooCommerceProductContentPrompt',
  input: {schema: GenerateWooCommerceProductContentInputSchema},
  output: {schema: GenerateWooCommerceProductContentOutputSchema},
  tools: [suggestSeoKeywordsTool],
  prompt: `You are a specialized e-commerce content optimizer for the **Addis Ababa, Ethiopia** market. Your task is to generate a complete, SEO-optimized JSON object for a WooCommerce product.

**Your process is as follows:**
1.  **Analyze SEO**: First, call the \`suggestSeoKeywordsTool\`. Use the provided 'raw_name' and 'focus_keywords' from the user input to get a strategic list of SEO tags and a primary "Focus Keyphrase". **If available, you MUST also pass the \`gscData\` from your input to the tool to get data-driven SEO insights.**
2.  **Generate Content**: After you have the SEO strategy from the tool, generate all the product fields in the JSON output. All content you create MUST be based on the "Focus Keyphrase" and "Tags" returned by the tool.

**Key Content Requirements (Apply these AFTER using the tool):**
1.  **Description:** Generate a compelling, SEO-rich product description of approximately 300 words. Format it with HTML tags (e.g., <p>, <strong>, <ul>, <li>).
2.  **Amharic Keyword Integration:** Weave relevant Amharic words and phrases naturally into the product description to improve local SEO and connect with customers. For example, use terms like 'የቤት ዕቃዎች' (yebēt ‘əqawoch, for furniture), 'ዋጋ' (waga, for price), 'ዘመናዊ' (zemenawi, for modern), or other descriptive local terms.
3.  **Linking Strategy:**
    *   **Inbound Link:** Naturally weave an inbound link into the description pointing to the product's primary category page. Use the format \`<a href="/product-category/{{{primaryCategory.slug}}}/">Explore more {{{primaryCategory.name}}}</a>\`.
    *   **Outbound Links:** Naturally integrate outbound links to the provided social media pages and a telephone link. For the phone, use the format \`<a href="tel:{{{settings.phoneNumber}}}">call us</a>\`. For social media, link relevant phrases to the URLs provided in the settings.
4.  **Yoast SEO:**
    *   **Focus Keyphrase:** The \`_yoast_wpseo_focuskw\` field MUST be the **exact** "Focus Keyphrase" you received from the tool.
    *   **Meta Description:** Generate a concise meta description for \`_yoast_wpseo_metadesc\`. This description MUST contain the exact Focus Keyphrase.
    *   **Title and Description Integration:** The generated product \`name\` (SEO Title) and the first paragraph of the \`description\` MUST include the exact Focus Keyphrase.
5.  **Image Alt Text:** Create descriptive alt text for each image that includes the Focus Keyphrase, 'zenbaba furniture', 'ethiopia', 'addis ababa', and the product's Amharic name ({{{amharic_name}}}).
6.  **Categories:** Select the most relevant categories from the provided list. Your response for 'categories' should be an array of category NAME strings.
7.  **Tags**: The tags you generate in the output JSON MUST be the list of "Tags" you received from the tool.

**Business & Link Information:**
- Phone Number: {{{settings.phoneNumber}}}
- Facebook: {{{settings.facebookUrl}}}
- Instagram: {{{settings.instagramUrl}}}
- Telegram: {{{settings.telegramUrl}}}
- TikTok: {{{settings.tiktokUrl}}}
- Primary Category: {{{primaryCategory.name}}} (Slug: {{{primaryCategory.slug}}})

**Available Categories for selection:**
{{{json availableCategories}}}

{{#if fieldToGenerate}}
You are being asked to generate a single field: \`{{fieldToGenerate}}\`. 
Base your response on the provided input data and the existing product content below. The generated value for \`{{fieldToGenerate}}\` should be consistent with the other product details.

Existing Content Context:
{{{json existingContent}}}
{{else}}
You are being asked to generate all content fields. For each image provided, generate a descriptive and SEO-optimized alt text. The 'images' array in your output JSON should contain one object with alt text for each image in the input.
{{/if}}

Input Data (text fields):
Raw Name: {{{raw_name}}}
Material: {{{material}}}
Amharic Name: {{{amharic_name}}}
Focus Keywords: {{{focus_keywords}}}
Price (ETB): {{{price_etb}}}
{{#if gscData}}
GSC Data: [Data is available and will be passed to the SEO tool]
{{/if}}

Images:
{{#each images_data}}
{{media url=this}}
{{/each}}
`,
});


const generateWooCommerceProductContentFlow = ai.defineFlow(
  {
    name: 'generateWooCommerceProductContentFlow',
    inputSchema: GenerateWooCommerceProductContentInputSchema,
    outputSchema: GenerateWooCommerceProductContentOutputSchema,
  },
  async (input) => {
    // When generating for a single field (not 'images'), only use the first image for context to save tokens.
    // When generating 'all' or 'images', use all images.
    const contextInput = { ...input };
    if (contextInput.fieldToGenerate && contextInput.fieldToGenerate !== 'all' && contextInput.fieldToGenerate !== 'images' && contextInput.images_data.length > 1) {
        contextInput.images_data = [contextInput.images_data[0]];
    }

    const {output} = await runPrompt(generateWooCommerceProductContentPrompt, contextInput);
    return output!;
  }
);
