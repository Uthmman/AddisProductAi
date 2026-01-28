
import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

const GenerateTagSeoInputSchema = z.object({
  tagName: z.string().describe('The name of the product tag.'),
  settings: z.any().optional(),
});

const GenerateTagSeoOutputSchema = z.object({
  title: z.string().describe('An SEO-optimized title for the tag archive page (around 60 characters).'),
  description: z.string().describe('A 200-300 word SEO-optimized description for the tag archive page, formatted with HTML. It should introduce the category of products and be engaging for customers.'),
  focusKeyphrase: z.string().describe('A primary SEO focus keyphrase for the tag page.'),
  metaDescription: z.string().describe('A concise meta description (under 156 characters) for the tag page that includes the focus keyphrase.'),
});
export type GenerateTagSeoOutput = z.infer<typeof GenerateTagSeoOutputSchema>;


export async function generateTagSeoFlow(
  input: z.infer<typeof GenerateTagSeoInputSchema>
): Promise<GenerateTagSeoOutput> {
  const prompts = await getPrompts();
  const promptTemplate = prompts.generateTagSeo;
  const template = handlebars.compile(promptTemplate);
  const renderedPrompt = template(input);

  const { output } = await generate({
    prompt: renderedPrompt,
    output: { schema: GenerateTagSeoOutputSchema },
  });
  return output!;
}
