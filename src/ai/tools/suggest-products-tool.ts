
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { suggestProductsFlow } from '@/ai/flows/suggest-products-flow';
import { getGscAnalysis } from '@/lib/gsc-analysis-api';

export const suggestProductsTool = ai.defineTool(
  {
    name: 'suggestProductsTool',
    description: 'Analyzes Google Search Console data to suggest new product ideas. Call this when the user asks for product suggestions, new ideas, or what they should sell.',
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async () => {
    try {
        const gscAnalysis = await getGscAnalysis();

        if (!gscAnalysis || !gscAnalysis.summary) {
            return "I can't provide product suggestions because the Google Search Console data has not been analyzed yet. Please go to the Content > Search Insights page and run the analysis first.";
        }
        
        const result = await suggestProductsFlow({});
        
        if (!result.suggestions || result.suggestions.length === 0) {
            return "Based on the latest search data analysis, I couldn't come up with any new product suggestions at the moment.";
        }

        const formattedResponse = "Based on the latest search data analysis, here are a few product ideas:\n\n" +
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
