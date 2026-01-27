'use server';
import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});


const SuggestBlogTopicsInputSchema = z.object({
  gscData: z.array(z.object({}).passthrough()).optional().describe('An array of top search queries from Google Search Console.'),
});

const SuggestBlogTopicsOutputSchema = z.object({
  topics: z.array(z.string()).describe('A list of 5 engaging blog post topics.'),
});
export type SuggestBlogTopicsOutput = z.infer<typeof SuggestBlogTopicsOutputSchema>;


export async function suggestBlogTopicsFlow(
  input: z.infer<typeof SuggestBlogTopicsInputSchema>
): Promise<SuggestBlogTopicsOutput> {
    const prompts = await getPrompts();
    const promptTemplate = prompts.suggestBlogTopics;
    const template = handlebars.compile(promptTemplate);
    const renderedPrompt = template(input);
    
    const { output } = await generate({
      prompt: renderedPrompt,
      output: { schema: SuggestBlogTopicsOutputSchema },
    });
    return output!;
}
