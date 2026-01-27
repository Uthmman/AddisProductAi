
'use server';
import { ai, generate } from '@/ai/genkit';
import { z } from 'genkit';

export const ModifyPromptInputSchema = z.object({
  request: z.string().describe("The user's request for how to modify the prompt."),
  originalPrompt: z.string().describe("The original prompt template content."),
  promptKey: z.string().describe("The key or name of the prompt being modified, for context."),
});
export type ModifyPromptInput = z.infer<typeof ModifyPromptInputSchema>;

const ModifyPromptOutputSchema = z.object({
  modifiedPrompt: z.string().describe("The updated prompt template content."),
});
export type ModifyPromptOutput = z.infer<typeof ModifyPromptOutputSchema>;

export async function modifyPromptFlow(input: ModifyPromptInput): Promise<ModifyPromptOutput> {
  const systemPrompt = `
You are an expert in crafting AI prompts for language models like Gemini.
Your task is to modify a given prompt template based on a user's request.
The user's request will specify what changes they want.
You MUST ONLY output the complete, modified prompt content. Do not add any extra explanations, greetings, or surrounding text.
The output should be the raw text of the new prompt, ready to be saved back into a file.
The prompt being modified is for the action: "${input.promptKey}". Keep this context in mind.
For example, if the user says "make it more friendly", you should adjust the tone of the prompt accordingly. If they say "add a step to include a joke", you should add that instruction to the prompt template.

The original prompt is:
---
${input.originalPrompt}
---
  `;

  const { output } = await generate({
    prompt: input.request,
    system: systemPrompt,
    output: { schema: ModifyPromptOutputSchema },
  });

  return output!;
}
