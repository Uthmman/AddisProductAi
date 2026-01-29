
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

import {ai, generate} from '@/ai/genkit';
import {z} from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});

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
      'sku',
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
    telegramUsername: z.string().optional(),
    tiktokUrl: z.string().optional(),
  }).optional().describe('General business settings like contact info and social media links.'),
  primaryCategory: z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
  }).optional().describe('The primary category of the product, used for creating inbound links.'),
  gscData: z.array(z.object({}).passthrough()).optional().describe('An array of top search queries from Google Search Console.'),
});
export type GenerateWooCommerceProductContentInput = z.infer<typeof GenerateWooCommerceProductContentInputSchema>;

// Define the output schema for the flow
const GenerateWooCommerceProductContentOutputSchema = z.object({
  name: z.string().optional().describe('Refined, SEO-Optimized English Product Title.'),
  sku: z.string().optional().describe("A unique product SKU, e.g., 'ZF' + 2 category digits + 2 random digits."),
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


const generateWooCommerceProductContentFlow = ai.defineFlow(
  {
    name: 'generateWooCommerceProductContentFlow',
    inputSchema: GenerateWooCommerceProductContentInputSchema,
    outputSchema: GenerateWooCommerceProductContentOutputSchema,
  },
  async (input) => {
    // For most generations, use only the first image to save tokens and avoid request size limits.
    // Only send all images when specifically generating image alt texts.
    const contextInput = { ...input };
    if (contextInput.fieldToGenerate !== 'images' && contextInput.images_data.length > 1) {
        contextInput.images_data = [contextInput.images_data[0]];
    }

    const prompts = await getPrompts();
    const promptTemplate = prompts.generateWooCommerceProductContent;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template(contextInput);
    
    const {output} = await generate({
      prompt: renderedPrompt,
      output: { schema: GenerateWooCommerceProductContentOutputSchema },
    });

    if (!output) {
      throw new Error("The AI model failed to generate a valid response. This may be due to a safety filter or other content restriction.");
    }
    
    return output;
  }
);
