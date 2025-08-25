import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  logSinks: process.env.GENKIT_ENV === 'dev' ? ['dev'] : [],
  enableTracingAndMetrics: true,
});
