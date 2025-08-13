
'use server';
/**
 * @fileOverview A flow to generate an image from a text prompt.
 *
 * - generateImage - A function that takes a prompt and returns an image data URI.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateImageInputSchema = z.object({
  prompt: z
    .string()
    .describe('A detailed text prompt to generate an image from.'),
});

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ prompt }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A professional, clean, modern logo or banner for a small business. The prompt is: "${prompt}". The image should be visually appealing and suitable for a company profile.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const imageDataUri = media?.url;

    if (!imageDataUri) {
      throw new Error('Image generation failed to return a valid image.');
    }

    return { imageDataUri };
  }
);
