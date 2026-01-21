'use server';
import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestProductsInputSchema = z.object({
  gscData: z.array(z.object({}).passthrough()).optional().describe('An array of top search queries from Google Search Console.'),
});

const SuggestProductsOutputSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string().describe('The suggested product name.'),
    reason: z.string().describe('A brief reason why this product is being suggested based on the search data.'),
  })).describe('A list of 3 new product suggestions.'),
});
export type SuggestProductsOutput = z.infer<typeof SuggestProductsOutputSchema>;

const suggestProductsPrompt = ai.definePrompt({
  name: 'suggestProductsPrompt',
  input: { schema: SuggestProductsInputSchema },
  output: { schema: SuggestProductsOutputSchema },
  prompt: `
    You are a product strategist for Zenbaba Furniture, an e-commerce company in Addis Ababa, Ethiopia.
    Your task is to analyze real user search data from Google Search Console and suggest 3 new product ideas that the company should consider creating.

    Analyze the search queries, clicks, and impressions. Identify gaps in the market, user needs, and trending interests.

    For each suggestion, provide a compelling product name and a short, data-driven reason for why it should be created.

    Google Search Console Insights (Top User Queries):
    {{{json gscData}}}

    Your final output must be a single, valid JSON object containing a 'suggestions' array with 3 product suggestion objects.
  `,
});

export async function suggestProductsFlow(
  input: z.infer<typeof SuggestProductsInputSchema>
): Promise<SuggestProductsOutput> {
    const { output } = await runPrompt(suggestProductsPrompt, input);
    return output!;
}
