import { genkit, type GenerateRequest } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Configure Genkit plugins
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
      apiVersion: 'v1beta', // Use v1beta for newer features and models
    }),
  ],
});


const model = 'googleai/gemini-2.5-flash';

// Wrapper for direct `ai.generate` calls.
export async function generate(request: Omit<GenerateRequest, 'model'>) {
  const newRequest = { ...request, model };
  return ai.generate(newRequest);
}
