
import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});

// Schemas for the tool's input and output
const SuggestSeoKeywordsInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  productDescription: z.string().optional().describe('A brief description of the product.'),
  existingKeywords: z.string().optional().describe('Any existing keywords the user has already provided.'),
  gscData: z.array(z.object({}).passthrough()).optional().describe('An array of top search queries from Google Search Console, including keys, clicks, and impressions.'),
});

const SuggestSeoKeywordsOutputSchema = z.object({
  focusKeyphrase: z.string().describe('A single, primary focus keyphrase for the product (max 4 words).'),
  tags: z.array(z.string()).describe('A list of 5-10 relevant SEO keywords and tags, including a mix of English and Amharic terms.'),
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
    const prompts = await getPrompts();
    const promptTemplate = prompts.suggestSeoKeywords;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template(input);
    
    const { output } = await generate({
        prompt: renderedPrompt,
        output: { schema: SuggestSeoKeywordsOutputSchema }
    });
    return output!;
  }
);
