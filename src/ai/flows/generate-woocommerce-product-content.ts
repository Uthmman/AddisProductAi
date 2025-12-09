'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate WooCommerce product content optimized for the Addis Ababa market.
 *
 * The flow takes raw product details as input and uses the Gemini API to generate
 * SEO-optimized product names, descriptions, meta-data, and tags, incorporating Amharic keywords for local SEO.
 *
 * - generateWooCommerceProductContent - The main function that triggers the content generation flow.
 * - GenerateWooCommerceProductContentInput - The input type for the function.
 * - GenerateWooCommerceProductContentOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  ]).optional().describe('The specific field to generate content for. If not provided, all fields will be generated.'),
  existingContent: z.any().optional().describe('Existing product content to provide context for single-field generation.')
});
export type GenerateWooCommerceProductContentInput = z.infer<typeof GenerateWooCommerceProductContentInputSchema>;

// Define the output schema for the flow
const GenerateWooCommerceProductContentOutputSchema = z.object({
  name: z.string().optional().describe('Refined, SEO-Optimized English Product Title.'),
  slug: z.string().optional().describe('URL-friendly, English slug based on the new name.'),
  description: z.string().optional().describe('SEO-rich description formatted with HTML <p> tags.'),
  short_description: z.string().optional().describe('Concise bullet-pointed summary.'),
  tags: z.array(z.string()).optional().describe('English and Amharic keywords.'),
  meta_data: z
    .array(z.object({key: z.string(), value: z.string()}))
    .optional()
    .describe('Meta data for SEO, especially the _yoast_wpseo_metadesc.'),
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
  prompt: `You are a specialized e-commerce content optimizer, focused on high conversion and excellent SEO performance in the **Addis Ababa, Ethiopia** market. Analyze the product images and data to generate a complete, SEO-optimized JSON object for a WooCommerce product update. The name must be refined for specificity, and Amharic input must be leveraged for local search optimization (Amharic keywords are high-value). The output MUST be a single, valid JSON object with NO external text.

{{#if fieldToGenerate}}
You are being asked to generate a single field: \`{{fieldToGenerate}}\`. 
Base your response on the provided input data and the existing product content below. The generated value for \`{{fieldTogenerate}}\` should be consistent with the other product details.

Existing Content Context:
{{{json existingContent}}}
{{else}}
You are being asked to generate all content fields. For each image provided, generate a descriptive and SEO-optimized alt text. The 'images' array in your output JSON should contain one object with alt text for each image in the input.
{{/if}}

Input Data:
{{{json input}}}
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

    const {output} = await generateWooCommerceProductContentPrompt(contextInput);
    return output!;
  }
);
