'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a blog post.
 * The flow takes a topic and generates a title and content for a blog post,
 * optimized for SEO and engagement in the Addis Ababa, Ethiopia market.
 *
 * - generateBlogPost - The main function that triggers the content generation flow.
 * - GenerateBlogPostInput - The input type for the function.
 * - GenerateBlogPostOutput - The output type for the function.
 */

import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the flow
const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The main topic or title for the blog post.'),
  gscData: z.array(z.any()).optional().describe('An array of top search queries from Google Search Console.'),
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

// Define the prompt for the Gemini API
const generateBlogPostPrompt = ai.definePrompt({
  name: 'generateBlogPostPrompt',
  input: { schema: GenerateBlogPostInputSchema },
  output: { schema: GenerateBlogPostOutputSchema },
  prompt: `You are an expert content creator and SEO specialist for a furniture company based in Addis Ababa, Ethiopia. Your goal is to write a blog post that will attract local customers and drive traffic to the website.

Topic: {{{topic}}}

{{#if gscData}}
**Google Search Console Insights (Top User Queries):**
Use this data as your primary source of inspiration. Analyze what users are searching for and write a blog post that directly addresses one of their problems or provides information they would find valuable. The user-provided "Topic" above should be considered a secondary suggestion if the GSC data isn't relevant.

{{{json gscData}}}
{{/if}}

Instructions:
1.  **Title:** Write a catchy, SEO-friendly title for the blog post based on the topic and any relevant GSC queries.
2.  **Content:** Write an engaging and informative blog post of about 400-500 words. If GSC data is present, make sure the content is highly relevant to those user searches.
3.  **Formatting:** Structure the content using HTML tags like <p>, <h2>, <h3>, <ul>, and <li> for readability.
4.  **Local SEO:** Naturally incorporate keywords relevant to the Ethiopian and Addis Ababa market. Mention places, local customs, or trends if applicable. Use Amharic words where it feels natural (e.g., 'Habesha home', 'injera table').
5.  **Call to Action:** End the post with a compelling call to action, encouraging readers to visit the website, check out products, or contact the company.
6.  **Output:** Your final output must be a single, valid JSON object containing the 'title' and 'content' fields.

Example Keywords to consider: 'modern furniture Ethiopia', 'furniture price in Addis Ababa', 'Zenbaba Furniture', 'Ethiopian home decor', 'quality furniture Addis'.
`,
});


const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input) => {
    const { output } = await runPrompt(generateBlogPostPrompt, input);
    return output!;
  }
);
