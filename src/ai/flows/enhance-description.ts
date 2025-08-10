
'use server';
/**
 * @fileOverview A flow to enhance a business description using AI.
 *
 * - enhanceDescription - A function that takes a description and returns an improved version.
 * - EnhanceDescriptionInput - The input type for the enhanceDescription function.
 * - EnhanceDescriptionOutput - The return type for the enhanceDescription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const EnhanceDescriptionInputSchema = z.object({
  description: z.string().describe('The business description to enhance.'),
});

export type EnhanceDescriptionInput = z.infer<
  typeof EnhanceDescriptionInputSchema
>;

const EnhanceDescriptionOutputSchema = z.object({
  enhancedDescription: z.string().describe('The AI-enhanced description.'),
});

export type EnhanceDescriptionOutput = z.infer<
  typeof EnhanceDescriptionOutputSchema
>;

const enhancePrompt = ai.definePrompt({
  name: 'enhanceDescriptionPrompt',
  input: { schema: EnhanceDescriptionInputSchema },
  output: { schema: EnhanceDescriptionOutputSchema },
  prompt: `You are an expert marketing copywriter for online startups. Turn the following text into a compelling business description with a sales-pitch tone, with a maximum of 300 characters.

Input Description:
"{{description}}"

Return only the JSON object with the enhanced description.`,
  model: 'googleai/gemini-1.5-flash',
});

const enhanceDescriptionFlow = ai.defineFlow(
  {
    name: 'enhanceDescriptionFlow',
    inputSchema: EnhanceDescriptionInputSchema,
    outputSchema: EnhanceDescriptionOutputSchema,
  },
  async (input) => {
    const llmResponse = await enhancePrompt(input);
    const output = llmResponse.output;

    if (!output) {
      throw new Error(
        'Unable to enhance description. The model did not return a valid output.'
      );
    }
    return output;
  }
);

export async function enhanceDescription(
  input: EnhanceDescriptionInput
): Promise<EnhanceDescriptionOutput> {
  return enhanceDescriptionFlow(input);
}
