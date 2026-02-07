'use server';
/**
 * @fileOverview An AI flow to analyze Google Search Console data.
 *
 * - analyzeGscDataFlow - A function that takes GSC data and returns an AI-powered analysis.
 * - GscAnalysisInput - The input type for the analysis flow.
 * - GscAnalysisOutput - The return type for the analysis flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GscAnalysisInputSchema = z.object({
  gscData: z.array(z.object({}).passthrough()).describe('An array of top search queries from Google Search Console.'),
});
export type GscAnalysisInput = z.infer<typeof GscAnalysisInputSchema>;

export const GscAnalysisOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of the search performance, noting any major trends or user interests."),
  keyInsights: z.array(z.string()).describe("A list of 3-5 bullet-point insights discovered from the data."),
  contentOpportunities: z.array(z.string()).describe("A list of 3 specific content ideas (e.g., blog posts, product guides) based on user queries."),
  productSuggestions: z.array(z.string()).describe("A list of 2-3 potential new product ideas based on unmet needs or high-interest search terms."),
});
export type GscAnalysisOutput = z.infer<typeof GscAnalysisOutputSchema>;


export async function analyzeGscDataFlow(input: GscAnalysisInput): Promise<GscAnalysisOutput> {
    return analysisFlow(input);
}


const analysisPrompt = ai.definePrompt({
    name: 'gscAnalysisPrompt',
    input: { schema: GscAnalysisInputSchema },
    output: { schema: GscAnalysisOutputSchema },
    prompt: `You are an expert SEO analyst and e-commerce strategist for a furniture company in Addis Ababa, Ethiopia.
Your task is to analyze raw data from Google Search Console and distill it into actionable business intelligence.

Based on the provided user query data (clicks, impressions, position), generate a concise analysis that includes:
1.  **Summary**: A brief overview of the key trends. What are people looking for most?
2.  **Key Insights**: What are the most important takeaways from this data? What does it reveal about customer intent?
3.  **Content Opportunities**: Suggest specific blog post titles or guide ideas that would directly answer these user queries.
4.  **Product Suggestions**: Identify any gaps or strong interests that suggest potential new products the company could create.

The output must be a valid JSON object matching the defined schema.

Raw GSC Data:
{{{json gscData}}}
`,
});


const analysisFlow = ai.defineFlow(
    {
        name: 'gscAnalysisFlow',
        inputSchema: GscAnalysisInputSchema,
        outputSchema: GscAnalysisOutputSchema,
    },
    async (input) => {
        const { output } = await analysisPrompt(input);
        return output!;
    }
);
