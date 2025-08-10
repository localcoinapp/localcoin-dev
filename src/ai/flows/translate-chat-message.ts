'use server';

/**
 * @fileOverview Translates chat messages between users and merchants.
 *
 * - translateChatMessage - A function that translates a given message to a target language.
 * - TranslateChatMessageInput - The input type for the translateChatMessage function.
 * - TranslateChatMessageOutput - The return type for the translateChatMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const TranslateChatMessageInputSchema = z.object({
  message: z.string().describe('The message to translate.'),
  targetLanguage: z.string().describe('The language to translate the message to.'),
});

export type TranslateChatMessageInput = z.infer<typeof TranslateChatMessageInputSchema>;

const TranslateChatMessageOutputSchema = z.object({
  translatedMessage: z.string().describe('The translated message.'),
});

export type TranslateChatMessageOutput = z.infer<typeof TranslateChatMessageOutputSchema>;

const translateChatMessagePrompt = ai.definePrompt({
  name: 'translateChatMessagePrompt',
  input: {schema: TranslateChatMessageInputSchema},
  output: {schema: TranslateChatMessageOutputSchema},
  prompt: `Translate the following message to {{targetLanguage}}:\n\n{{message}}`,
  model: 'googleai/gemini-1.5-flash',
});

const translateChatMessageFlow = ai.defineFlow(
  {
    name: 'translateChatMessageFlow',
    inputSchema: TranslateChatMessageInputSchema,
    outputSchema: TranslateChatMessageOutputSchema,
  },
  async input => {
    const {output} = await translateChatMessagePrompt(input);
    if (!output) {
        throw new Error("Translation failed: The AI model did not return an output.");
    }
    return output;
  }
);


export async function translateChatMessage(
  input: TranslateChatMessageInput
): Promise<TranslateChatMessageOutput> {
  return translateChatMessageFlow(input);
}
