
'use server';
/**
 * @fileOverview A flow to enhance an item description using AI.
 *
 * - enhanceItemDescription - A function that takes a description and returns an improved version.
 * - EnhanceItemDescriptionInput - The input type for the enhanceItemDescription function.
 * - EnhanceItemDescriptionOutput - The return type for the enhanceItemDescription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const EnhanceItemDescriptionInputSchema = z.object({
  description: z.string().describe('The item description to enhance.'),
});

export type EnhanceItemDescriptionInput = z.infer<
  typeof EnhanceItemDescriptionInputSchema
>;

const EnhanceItemDescriptionOutputSchema = z.object({
  enhancedDescription: z.string().describe('The AI-enhanced description.'),
});

export type EnhanceItemDescriptionOutput = z.infer<
  typeof EnhanceItemDescriptionOutputSchema
>;

const enhancePrompt = ai.definePrompt({
  name: 'enhanceItemDescriptionPrompt',
  input: { schema: EnhanceItemDescriptionInputSchema },
  output: { schema: EnhanceItemDescriptionOutputSchema },
  prompt: `You are an expert copywriter specializing in creating catchy menu item descriptions. Turn the following text into a compelling and short description for a menu item, with a maximum of 200 characters.

Input Description:
"{{description}}"

Return only the JSON object with the enhanced description.`,
  model: 'googleai/gemini-1.5-flash',
});

const enhanceItemDescriptionFlow = ai.defineFlow(
  {
    name: 'enhanceItemDescriptionFlow',
    inputSchema: EnhanceItemDescriptionInputSchema,
    outputSchema: EnhanceItemDescriptionOutputSchema,
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

export async function enhanceItemDescription(
  input: EnhanceItemDescriptionInput
): Promise<EnhanceItemDescriptionOutput> {
  return enhanceItemDescriptionFlow(input);
}
