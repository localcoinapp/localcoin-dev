import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    }),
  ],
  logSinks: process.env.GENKIT_ENV === 'dev' ? ['dev'] : [],
  enableTracingAndMetrics: true,
});
