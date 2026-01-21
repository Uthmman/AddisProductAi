'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { suggestProductsFlow } from '@/ai/flows/suggest-products-flow';
import { getGscTopQueries } from '@/lib/gsc-api';

export const suggestProductsTool = ai.defineTool(
  {
    name: 'suggestProductsTool',
    description: 'Analyzes Google Search Console data to suggest new product ideas. Call this when the user asks for product suggestions, new ideas, or what they should sell.',
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async () => {
    try {
        const gscData = await getGscTopQueries();

        if (gscData === null) {
            return "I can't provide product suggestions because the Google Search Console integration is not configured on the server. Please ask the admin to set it up.";
        }
        if (gscData.length === 0) {
            return "I couldn't find any relevant search data to generate product suggestions right now.";
        }
        
        const result = await suggestProductsFlow({ gscData });
        
        if (!result.suggestions || result.suggestions.length === 0) {
            return "Based on the latest search data, I couldn't come up with any new product suggestions at the moment.";
        }

        const formattedResponse = "Based on recent search data, here are a few product ideas:\n\n" +
            result.suggestions.map(s => 
                `**Product Idea:** ${s.name}\n**Reason:** ${s.reason}\n`
            ).join('\n');
        
        return formattedResponse;
    } catch (error: any) {
        console.error("Error in suggestProductsTool:", error);
        return `I encountered an error while trying to get suggestions: ${error.message}`;
    }
  }
);
