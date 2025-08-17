
'use server';
/**
 * @fileOverview A flow to enhance an email body using AI.
 *
 * - enhanceEmailBody - A function that takes email content and returns an improved version.
 * - EnhanceEmailBodyInput - The input type for the enhanceEmailBody function.
 * - EnhanceEmailBodyOutput - The return type for the enhanceEmailBody function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const EnhanceEmailBodyInputSchema = z.object({
  body: z.string().describe('The email body content to enhance.'),
});

export type EnhanceEmailBodyInput = z.infer<
  typeof EnhanceEmailBodyInputSchema
>;

const EnhanceEmailBodyOutputSchema = z.object({
  enhancedBody: z.string().describe('The AI-enhanced email body.'),
});

export type EnhanceEmailBodyOutput = z.infer<
  typeof EnhanceEmailBodyOutputSchema
>;

const enhancePrompt = ai.definePrompt({
  name: 'enhanceEmailBodyPrompt',
  input: { schema: EnhanceEmailBodyInputSchema },
  output: { schema: EnhanceEmailBodyOutputSchema },
  prompt: `You are an expert marketing copywriter. Rewrite the following text to be more engaging and professional for a marketing or notification email. Retain the core message but improve the tone, clarity, and impact.

Input Body:
"{{body}}"

Return only the JSON object with the enhanced body.`,
  model: 'googleai/gemini-1.5-flash',
});

const enhanceEmailBodyFlow = ai.defineFlow(
  {
    name: 'enhanceEmailBodyFlow',
    inputSchema: EnhanceEmailBodyInputSchema,
    outputSchema: EnhanceEmailBodyOutputSchema,
  },
  async (input) => {
    const llmResponse = await enhancePrompt(input);
    const output = llmResponse.output;

    if (!output) {
      throw new Error(
        'Unable to enhance email body. The model did not return a valid output.'
      );
    }
    return output;
  }
);

export async function enhanceEmailBody(
  input: EnhanceEmailBodyInput
): Promise<EnhanceEmailBodyOutput> {
  return enhanceEmailBodyFlow(input);
}
