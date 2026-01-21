import { genkit, type GenerateRequest, type Prompt } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

// Configure Genkit plugins
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
      apiVersion: ['v1beta', 'v1'], // Prioritize v1beta for newer features
    }),
  ],
});


const model = 'googleai/gemini-1.5-flash-latest';

// Wrapper for direct `ai.generate` calls.
export async function generate(request: Omit<GenerateRequest, 'model'>) {
  const newRequest = { ...request, model };
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
