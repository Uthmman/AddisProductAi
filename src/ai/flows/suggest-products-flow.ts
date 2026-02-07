import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';
import { getGscAnalysis } from '@/lib/gsc-analysis-api';

const SuggestProductsInputSchema = z.object({});

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
    const [prompts, gscAnalysis] = await Promise.all([
        getPrompts(),
        getGscAnalysis()
    ]);

    const promptTemplate = prompts.suggestProducts;
    const template = handlebars.compile(promptTemplate);
    const gscAnalysisString = JSON.stringify(gscAnalysis, null, 2);
    const renderedPrompt = template({ gscAnalysisString });
    
    const { output } = await generate({
      prompt: renderedPrompt,
      output: { schema: SuggestProductsOutputSchema },
    });
    return output!;
}
