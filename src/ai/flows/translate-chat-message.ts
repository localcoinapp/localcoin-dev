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

const TranslateChatMessageInputSchema = z.object({
  message: z.string().describe('The message to translate.'),
  targetLanguage: z.string().describe('The language to translate the message to.'),
});

export type TranslateChatMessageInput = z.infer<typeof TranslateChatMessageInputSchema>;

const TranslateChatMessageOutputSchema = z.object({
  translatedMessage: z.string().describe('The translated message.'),
});

export type TranslateChatMessageOutput = z.infer<typeof TranslateChatMessageOutputSchema>;

export async function translateChatMessage(
  input: TranslateChatMessageInput
): Promise<TranslateChatMessageOutput> {
  return translateChatMessageFlow(input);
}

const translateChatMessagePrompt = ai.definePrompt({
  name: 'translateChatMessagePrompt',
  input: {schema: TranslateChatMessageInputSchema},
  output: {schema: TranslateChatMessageOutputSchema},
  prompt: `Translate the following message to {{targetLanguage}}:\n\n{{message}}`,
});

const translateChatMessageFlow = ai.defineFlow(
  {
    name: 'translateChatMessageFlow',
    inputSchema: TranslateChatMessageInputSchema,
    outputSchema: TranslateChatMessageOutputSchema,
  },
  async input => {
    const {output} = await translateChatMessagePrompt(input);
    return output!;
  }
);
