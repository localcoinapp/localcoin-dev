'use server';

import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

configureGenkit({
  plugins: [
    googleAI(),
  ],
  logSinks: process.env.GENKIT_ENV === 'dev' ? ['dev'] : [],
  enableTracingAndMetrics: true,
});

export { genkit as ai };
