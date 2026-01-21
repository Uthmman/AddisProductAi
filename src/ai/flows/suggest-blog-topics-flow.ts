'use server';
import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestBlogTopicsInputSchema = z.object({
  gscData: z.array(z.any()).optional().describe('An array of top search queries from Google Search Console.'),
});

const SuggestBlogTopicsOutputSchema = z.object({
  topics: z.array(z.string()).describe('A list of 5 engaging blog post topics.'),
});
export type SuggestBlogTopicsOutput = z.infer<typeof SuggestBlogTopicsOutputSchema>;

const suggestBlogTopicsPrompt = ai.definePrompt({
  name: 'suggestBlogTopicsPrompt',
  input: { schema: SuggestBlogTopicsInputSchema },
  output: { schema: SuggestBlogTopicsOutputSchema },
  prompt: `
    You are an expert content strategist and SEO specialist for a furniture company in Addis Ababa, Ethiopia.
    Based on the following Google Search Console data (top user queries), generate a list of 5 creative and engaging blog post topics.
    These topics should address user problems, answer their questions, or align with their interests as indicated by their search queries.
    Focus on topics that are highly relevant to the Ethiopian market and have the potential to drive organic traffic.

    Google Search Console Insights (Top User Queries):
    {{{json gscData}}}

    Your final output must be a single, valid JSON object containing a 'topics' array with 5 topic strings.
  `,
});

export async function suggestBlogTopicsFlow(
  input: z.infer<typeof SuggestBlogTopicsInputSchema>
): Promise<SuggestBlogTopicsOutput> {
    const { output } = await runPrompt(suggestBlogTopicsPrompt, input);
    return output!;
}
