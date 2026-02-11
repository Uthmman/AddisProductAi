'use server';
/**
 * @fileOverview An AI flow to analyze Google Search Console data.
 *
 * - analyzeGscDataFlow - A function that takes GSC data and returns an AI-powered analysis.
 */

import { generate } from '@/ai/genkit';
import { z } from 'zod';
import type { GscAnalysisOutput } from '@/lib/types';

// This schema defines the output shape we expect from the AI
const GscAnalysisOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of the search performance, noting any major trends or user interests."),
  keyInsights: z.array(z.string()).describe("A list of 3-5 bullet-point insights discovered from the data."),
  contentOpportunities: z.array(z.string()).describe("A list of 3 specific content ideas (e.g., blog posts, product guides) based on user queries."),
  productSuggestions: z.array(z.string()).describe("A list of 2-3 potential new product ideas based on unmet needs or high-interest search terms."),
});

// The main exported function
export async function analyzeGscDataFlow(gscData: any[]): Promise<GscAnalysisOutput> {
    // Convert the array of GSC data into a formatted string for the prompt
    const gscDataString = JSON.stringify(gscData, null, 2);

    // The prompt that instructs the AI on how to analyze the data
    const prompt = `You are an expert SEO analyst and e-commerce strategist for a furniture company in Addis Ababa, Ethiopia.
Your task is to analyze raw data from Google Search Console and distill it into actionable business intelligence.

Based on the provided user query data (clicks, impressions, position), generate a concise analysis that includes:
1.  **Summary**: A brief overview of the key trends. What are people looking for most?
2.  **Key Insights**: What are the most important takeaways from this data? What does it reveal about customer intent?
3.  **Content Opportunities**: Suggest specific blog post titles or guide ideas that would directly answer these user queries.
4.  **Product Suggestions**: Identify any gaps or strong interests that suggest potential new products the company could create.

The output must be a valid JSON object matching the defined schema.
All text in the summary, insights, opportunities, and suggestions MUST be written in clear, simple, and easy-to-understand English that is accessible to a broad audience.

Raw GSC Data:
${gscDataString}
`;

    // Call the AI using the `generate` wrapper, which supplies the model
    const { output } = await generate({
      prompt: prompt,
      output: { schema: GscAnalysisOutputSchema },
    });
    
    // Return the structured output
    return output!;
}
