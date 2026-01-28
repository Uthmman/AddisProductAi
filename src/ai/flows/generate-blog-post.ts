
/**
 * @fileOverview This file defines a Genkit flow to generate a blog post.
 * The flow takes a topic and generates a title and content for a blog post,
 * optimized for SEO and engagement in the Addis Ababa, Ethiopia market.
 *
 * - generateBlogPost - The main function that triggers the content generation flow.
 * - GenerateBlogPostInput - The input type for the function.
 * - GenerateBlogPostOutput - The output type for the function.
 */

import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});

// Define the input schema for the flow
const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The main topic or title for the blog post.'),
  gscData: z.array(z.object({}).passthrough()).optional().describe('An array of top search queries from Google Search Console.'),
  settings: z.any().optional(),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

// Define the output schema for the flow
const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('A catchy, SEO-friendly title for the blog post.'),
  content: z.string().describe('The full content of the blog post, formatted with HTML tags. It should be engaging, informative, and around 400-500 words.'),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;


// Exported function to trigger the flow
export async function generateBlogPost(
  input: GenerateBlogPostInput
): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input) => {
    const prompts = await getPrompts();
    const promptTemplate = prompts.generateBlogPost;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template(input);
    
    const { output } = await generate({
      prompt: renderedPrompt,
      output: { schema: GenerateBlogPostOutputSchema },
    });
    return output!;
  }
);
