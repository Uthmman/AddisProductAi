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

// Priority models: gemini-2.5-flash is stable and currently active; gemini-3.5-flash is secondary fallback
const MODELS = [
  'googleai/gemini-2.5-flash',
  'googleai/gemini-3.5-flash',
];

/**
 * A wrapper for the Genkit generate function with automatic retry on 503/429
 * and automatic fallback to stable alternative models when a model suffers high demand.
 */
export async function generate(request: Omit<GenerateRequest, 'model'>) {
  let lastError: any;

  for (const candidateModel of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.generate({ ...request, model: candidateModel });
        return response;
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || '');
        const isDemandOrRateLimit = msg.includes('503') || msg.includes('high demand') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');

        if (!isDemandOrRateLimit) {
          // Non-transient errors (like schema mismatch) should throw immediately
          throw error;
        }

        console.warn(`[AI Generate] Model ${candidateModel} high demand/rate-limit (attempt ${attempt + 1}). Retrying...`);
        // Jittered backoff (1s - 2s)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    console.warn(`[AI Generate] Failing over from ${candidateModel} to next available model...`);
  }

  throw lastError;
}
