
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

import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});

// Define the input schema for the flow
const GenerateSocialMediaPostInputSchema = z.object({
  product: z.any().describe('The full WooCommerce product object.'),
  platform: z.enum(['telegram']).describe('The target social media platform.'),
  topic: z.string().optional().describe('The main topic or angle for the post (e.g., "New Arrival", "Special Offer").'),
  settings: z.any().describe('The application settings object, which includes phoneNumber, telegramUrl, and telegramUsername.'),
  tone: z.enum(['descriptive', 'playful']).describe('The desired tone for the post.'),
  showPrice: z.boolean().optional().describe('Whether to show the price in the post. If false, the price line is omitted entirely. Defaults to false.'),
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

const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async (input) => {
    const prompts = await getPrompts();
    const promptTemplate = prompts.generateSocialMediaPost;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template(input);
    
    const { output } = await generate({
      prompt: renderedPrompt,
      output: { schema: GenerateSocialMediaPostOutputSchema },
    });
    return output!;
  }
);
