import { genkit, type GenerateRequest } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Configure Genkit with the Google AI plugin.
// The apiKey is read from the GOOGLE_API_KEY environment variable.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
});

// Using the model requested by the user.
const model = 'googleai/gemini-3.5-flash';

/**
 * A wrapper for the Genkit generate function that defaults to the preferred model.
 */
export async function generate(request: Omit<GenerateRequest, 'model'>) {
  const newRequest = { ...request, model };
  return ai.generate(newRequest);
}
