
'use server';

import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTagSeoInputSchema = z.object({
  tagName: z.string().describe('The name of the product tag.'),
  settings: z.any().optional(),
});

const GenerateTagSeoOutputSchema = z.object({
  title: z.string().describe('An SEO-optimized title for the tag archive page (around 60 characters).'),
  description: z.string().describe('A 200-300 word SEO-optimized description for the tag archive page, formatted with HTML. It should introduce the category of products and be engaging for customers.'),
  focusKeyphrase: z.string().describe('A primary SEO focus keyphrase for the tag page.'),
  metaDescription: z.string().describe('A concise meta description (under 156 characters) for the tag page that includes the focus keyphrase.'),
});
export type GenerateTagSeoOutput = z.infer<typeof GenerateTagSeoOutputSchema>;

const generateTagSeoPrompt = ai.definePrompt({
  name: 'generateTagSeoPrompt',
  input: { schema: GenerateTagSeoInputSchema },
  output: { schema: GenerateTagSeoOutputSchema },
  prompt: `You are an SEO expert for an e-commerce store in Ethiopia. Your task is to generate SEO content for a product tag page to satisfy Yoast SEO analysis requirements.

{{#if settings.aiPromptInstruction}}
**General Content Guide from Store Owner:**
You MUST follow these general instructions for all content you generate:
"{{{settings.aiPromptInstruction}}}"
{{/if}}

Product Tag: "{{tagName}}"

Your goal is to address all Yoast SEO problems by generating the following content:

1.  **SEO Title**: Create a concise and compelling SEO title (around 60 characters) for this tag page. It should include the focus keyphrase.
    *   *This will solve: "SEO title width"*

2.  **Focus Keyphrase**: Determine the best focus keyphrase for this tag page. This keyphrase is the most important part of the SEO strategy. It should be concise, relevant, and something a user would search for.
    *   *This will solve: "Keyphrase length", "Previously used keyphrase"*

3.  **Meta Description**: Write an engaging meta description (between 120 and 156 characters) that includes the exact focus keyphrase.
    *   *This will solve: "Keyphrase in meta description", "Meta description length"*

4.  **Page Description**: Write a full, SEO-optimized description of 200-300 words for the tag archive page.
    *   The description **MUST** start with a paragraph that includes the exact focus keyphrase.
    *   The keyphrase should appear a few times naturally throughout the text.
    *   The content should be well-structured with HTML tags like <p>, <h2>, and <ul>.
    *   It should be informative and helpful for a user landing on this page, explaining what kinds of products they can expect to find under the "{{tagName}}" tag.
    *   Incorporate relevant Amharic terms naturally to connect with the local market.
    *   *This will solve: "Keyphrase in introduction", "Keyphrase density", "Text length"*

Your final output must be a single, valid JSON object containing the 'title', 'description', 'focusKeyphrase', and 'metaDescription' fields. The content you generate for these fields will be used to fix the Yoast SEO analysis results.
`,
});

export async function generateTagSeoFlow(
  input: z.infer<typeof GenerateTagSeoInputSchema>
): Promise<GenerateTagSeoOutput> {
  const { output } = await runPrompt(generateTagSeoPrompt, input);
  return output!;
}
