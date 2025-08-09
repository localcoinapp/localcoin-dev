
'use server';

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';
import { next } from '@genkit-ai/next';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
    firebase(),
    next(),
  ],
  logSinks: [process.env.GENKIT_ENV === 'dev' ? 'dev' : 'firebase'],
  enableTracingAndMetrics: true,
});
