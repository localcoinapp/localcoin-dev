import { GenkitError, genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logSinks: [process.env.GENKIT_ENV === 'dev' ? 'dev' : 'firebase'],
  enableTracingAndMetrics: true,
  telemetry: {
    instrumentation: {
      client: false,
      server: false,
    },
  },
});
