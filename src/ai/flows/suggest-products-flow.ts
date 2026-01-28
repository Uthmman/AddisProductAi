import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});

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

export async function suggestProductsFlow(
  input: z.infer<typeof SuggestProductsInputSchema>
): Promise<SuggestProductsOutput> {
    const prompts = await getPrompts();
    const promptTemplate = prompts.suggestProducts;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template(input);
    
    const { output } = await generate({
      prompt: renderedPrompt,
      output: { schema: SuggestProductsOutputSchema },
    });
    return output!;
}
