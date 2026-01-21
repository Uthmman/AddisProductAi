'use server';

import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'genkit';

// Schemas for the tool's input and output
const SuggestSeoKeywordsInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  productDescription: z.string().optional().describe('A brief description of the product.'),
  existingKeywords: z.string().optional().describe('Any existing keywords the user has already provided.'),
  gscData: z.array(z.any()).optional().describe('An array of top search queries from Google Search Console, including keys, clicks, and impressions.'),
});

const SuggestSeoKeywordsOutputSchema = z.object({
  focusKeyphrase: z.string().describe('A single, primary focus keyphrase for the product (max 4 words).'),
  tags: z.array(z.string()).describe('A list of 5-10 relevant SEO keywords and tags, including a mix of English and Amharic terms.'),
});

// The prompt that powers the tool's logic
const suggestKeywordsPrompt = ai.definePrompt({
    name: 'suggestKeywordsSubPrompt',
    input: { schema: SuggestSeoKeywordsInputSchema },
    output: { schema: SuggestSeoKeywordsOutputSchema },
    prompt: `
    You are an SEO expert for the e-commerce market in Addis Ababa, Ethiopia.
    Based on the product details below, and prioritizing the provided Google Search Console data, generate a primary "Focus Keyphrase" and a list of SEO tags.

    Product Name: {{{productName}}}
    Product Description: {{{productDescription}}}
    User's Keywords: {{{existingKeywords}}}

    {{#if gscData}}
    Google Search Console Top Queries (prioritize these):
    {{{json gscData}}}
    {{/if}}

    Instructions:
    1.  **Analyze GSC Data**: If Google Search Console data is provided, analyze the queries. Identify terms that are relevant to the product and have high impressions or clicks. These are your most important source for keywords.
    2.  **Focus Keyphrase**: Create one concise, high-impact focus keyphrase (max 4 words). This should ideally be derived from a high-performing GSC query if a relevant one exists.
    3.  **Tags**: Generate a list of 5-10 supplementary keywords. These should be a mix of relevant GSC queries, Amharic terms, local market terms, and variations on the product name.
    4.  Your final output must be a single, valid JSON object.
  `,
});

// Define and export the tool
export const suggestSeoKeywordsTool = ai.defineTool(
  {
    name: 'suggestSeoKeywordsTool',
    description: 'Generates SEO-optimized keywords and a focus keyphrase for a product based on its name and description, tailored for the Ethiopian market. Can be enhanced with Google Search Console data.',
    inputSchema: SuggestSeoKeywordsInputSchema,
    outputSchema: SuggestSeoKeywordsOutputSchema,
  },
  async (input) => {
    const { output } = await runPrompt(suggestKeywordsPrompt, input);
    return output!;
  }
);
