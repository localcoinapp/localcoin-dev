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
import { Buffer } from 'buffer';

const GenerateImageInputSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .describe('A detailed text prompt to generate an image from.'),
});

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .regex(/^data:[^;]+;base64,/, 'Expected a data: URI (base64)')
    .describe(
      "The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ prompt }) => {
    const result = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `A professional, clean, modern logo or banner for a small business. The prompt is: "${prompt}". The image should be visually appealing and suitable for a company profile.`,
    });

    const m = Array.isArray(result.media) ? result.media[0] : result.media;
    if (!m) {
      throw new Error('No media returned from the image generator.');
    }

    // Prefer inline data for a guaranteed data URI
    if (m.data) {
      const mime = m.mimeType || 'image/png';
      const base64 = Buffer.isBuffer(m.data)
        ? m.data.toString('base64')
        : m.data;
      return { imageDataUri: `data:${mime};base64,${base64}` };
    }

    // If only a URL is returned, we need to fetch it and convert it.
    if (m.url) {
      const response = await fetch(m.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mime = response.headers.get('content-type') || 'image/png';
      return { imageDataUri: `data:${mime};base64,${base64}` };
    }

    throw new Error(
      'The image generation service returned media with neither a URL nor inline data.'
    );
  }
);

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}
