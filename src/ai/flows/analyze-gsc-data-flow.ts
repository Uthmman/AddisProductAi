
'use server';
/**
 * @fileOverview An AI flow to analyze Google Search Console data for Zenbaba Furniture.
 *
 * - analyzeGscDataFlow - A function that takes GSC data and returns an AI-powered analysis focused on furniture.
 */

import { generate } from '@/ai/genkit';
import { z } from 'zod';
import type { GscAnalysisOutput } from '@/lib/types';

// This schema defines the output shape we expect from the AI
const GscAnalysisOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of the furniture search performance in Addis Ababa."),
  keyInsights: z.array(z.string()).describe("A list of 3-5 furniture industry insights discovered from the data."),
  mostWantedProducts: z.array(z.string()).describe("A list of the top searched for furniture items (e.g., sofas, tables)."),
  topKeywords: z.array(z.string()).describe("A list of top furniture SEO keywords for the Addis Ababa market."),
  contentOpportunities: z.array(z.string()).describe("A list of 3 furniture-focused content ideas."),
  productSuggestions: z.array(z.string()).describe("A list of 2-3 potential new furniture or woodworking products."),
});

// The main exported function
export async function analyzeGscDataFlow(gscData: any[]): Promise<GscAnalysisOutput> {
    const gscDataString = JSON.stringify(gscData, null, 2);

    const prompt = `You are the lead SEO analyst for Zenbaba Furniture, the premier woodworking company in Addis Ababa, Ethiopia.
Your task is to analyze data from Google Search Console and distill it into business intelligence for the FURNITURE industry.

**IMPORTANT CONTEXT:**
- Focus exclusively on furniture, woodworking, and interior craftsmanship.
- DO NOT analyze or suggest products related to clothing, fashion, or other unrelated sectors.
- When summarizing trends, emphasize that we are the best furniture provider in Addis Ababa and Ethiopia.

Based on the provided query data, generate a concise analysis that includes:
1.  **Summary**: Overview of furniture search trends in Ethiopia.
2.  **Key Insights**: What furniture buyers in Addis Ababa are looking for.
3.  **Most Wanted Products**: Top 5-10 furniture pieces inferred from queries.
4.  **Top Keywords**: The best furniture SEO keywords to dominate the local market.
5.  **Content Opportunities**: Woodworking or furniture guide ideas.
6.  **Product Suggestions**: New furniture items Zenbaba should manufacture to meet unmet demand.

The output must be a valid JSON object. Use clear, simple English.

Raw GSC Data:
${gscDataString}
`;

    const { output } = await generate({
      prompt: prompt,
      output: { schema: GscAnalysisOutputSchema },
    });
    
    return output!;
}
