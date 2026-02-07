import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';
import { getGscAnalysis } from '@/lib/gsc-analysis-api';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});


const SuggestBlogTopicsInputSchema = z.object({});

const SuggestBlogTopicsOutputSchema = z.object({
  topics: z.array(z.string()).describe('A list of 5 engaging blog post topics.'),
});
export type SuggestBlogTopicsOutput = z.infer<typeof SuggestBlogTopicsOutputSchema>;


export async function suggestBlogTopicsFlow(
  input: z.infer<typeof SuggestBlogTopicsInputSchema>
): Promise<SuggestBlogTopicsOutput> {
    const [prompts, gscAnalysis] = await Promise.all([
        getPrompts(),
        getGscAnalysis()
    ]);
    
    const promptTemplate = prompts.suggestBlogTopics;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template({ gscAnalysis });
    
    const { output } = await generate({
      prompt: renderedPrompt,
      output: { schema: SuggestBlogTopicsOutputSchema },
    });
    return output!;
}
