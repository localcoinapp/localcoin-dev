
import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logSinks: [process.env.GENKIT_ENV === 'dev' ? 'dev' : 'firebase'],
  enableTracingAndMetrics: true,
});
