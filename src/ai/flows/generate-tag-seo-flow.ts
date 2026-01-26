'use server';

import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTagSeoInputSchema = z.object({
  tagName: z.string().describe('The name of the product tag.'),
});

const GenerateTagSeoOutputSchema = z.object({
  description: z.string().describe('A 200-300 word SEO-optimized description for the tag archive page, formatted with HTML. It should introduce the category of products and be engaging for customers.'),
  focusKeyphrase: z.string().describe('A primary SEO focus keyphrase for the tag page.'),
  metaDescription: z.string().describe('A concise meta description (under 156 characters) for the tag page that includes the focus keyphrase.'),
  slug: z.string().optional().describe('A URL-friendly slug based on the focus keyphrase (e.g., "ethiopian-bookshelf").'),
});
export type GenerateTagSeoOutput = z.infer<typeof GenerateTagSeoOutputSchema>;

const generateTagSeoPrompt = ai.definePrompt({
  name: 'generateTagSeoPrompt',
  input: { schema: GenerateTagSeoInputSchema },
  output: { schema: GenerateTagSeoOutputSchema },
  prompt: `You are an SEO expert for an e-commerce store in Ethiopia. Your task is to generate SEO content for a product tag page.

Product Tag: "{{tagName}}"

Instructions:
1.  **Focus Keyphrase**: First, determine the best focus keyphrase for this tag page. It should be concise and relevant.
2.  **Slug**: Based on the focus keyphrase, create a URL-friendly slug (e.g., "ethiopian-bookshelf"). It should be all lowercase with hyphens instead of spaces.
3.  **Meta Description**: Write a meta description (under 156 characters) that is engaging and includes the exact focus keyphrase.
4.  **Page Description**: Write a full, SEO-optimized description of 200-300 words for the tag archive page.
    *   The description MUST start with a paragraph that includes the exact focus keyphrase.
    *   It should be well-structured with HTML tags like <p>, <h2>, and <ul>.
    *   It should be informative and helpful for a user landing on this page, explaining what kinds of products they can expect to find.
    *   Incorporate relevant Amharic terms naturally.
    *   This description will be used to address Yoast SEO issues like "Keyphrase in introduction", "Keyphrase density", and "Text length".

Your final output must be a single, valid JSON object with the 'description', 'slug', 'focusKeyphrase', and 'metaDescription' fields.
`,
});

export async function generateTagSeoFlow(
  input: z.infer<typeof GenerateTagSeoInputSchema>
): Promise<GenerateTagSeoOutput> {
  const { output } = await runPrompt(generateTagSeoPrompt, input);
  return output!;
}
