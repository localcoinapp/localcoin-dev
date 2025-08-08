'use server';

/**
 * @fileOverview A flow for converting a street address into geographic coordinates.
 * 
 * - geocodeAddress - A function that takes an address string and returns latitude and longitude.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The full street address to geocode.'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
    lat: z.number().describe('The latitude of the address.'),
    lng: z.number().describe('The longitude of the address.'),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
    return geocodeAddressFlow(input);
}

const prompt = ai.definePrompt({
    name: 'geocodeAddressPrompt',
    input: { schema: GeocodeAddressInputSchema },
    output: { schema: GeocodeAddressOutputSchema },
    prompt: `You are an expert geocoding service. Convert the following address into latitude and longitude coordinates.

Address: {{{address}}}

Return only the coordinates in the specified JSON format.`,
});

const geocodeAddressFlow = ai.defineFlow(
    {
        name: 'geocodeAddressFlow',
        inputSchema: GeocodeAddressInputSchema,
        outputSchema: GeocodeAddressOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
