import {genkit, type GenerateRequest, type Prompt} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'zod';

// Configure the Gemini plugin.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
      apiVersion: 'v1', // Use v1 for stable models
    }),
  ],
});

const model = 'googleai/gemini-pro';

// Wrapper for direct `ai.generate` calls.
export async function generate(request: GenerateRequest) {
  const newRequest = {...request, model };
  return ai.generate(newRequest);
}

// Wrapper for prompt calls.
export async function runPrompt<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
>(prompt: Prompt<I, O>, input: z.infer<I>) {
  // Pass the model in the options object to the prompt function
  return prompt(input, { model });
}
