'use server';
/**
 * @fileOverview A geocoding flow to convert an address to latitude and longitude.
 *
 * - geocodeAddress - A function that takes an address and returns its coordinates.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GeocodeAddressInputSchema = z.object({
  street: z.string(),
  houseNumber: z.string(),
  city: z.string(),
  zipCode: z.string(),
  country: z.string(),
});

export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
  lat: z.number().describe('The latitude of the address.'),
  lng: z.number().describe('The longitude of the address.'),
});

export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

const geocodePrompt = ai.definePrompt({
  name: 'geocodePrompt',
  input: { schema: GeocodeAddressInputSchema },
  output: { schema: GeocodeAddressOutputSchema },
  prompt: `You are an expert geocoder. Given the following address, provide the precise latitude and longitude.
      Street: {{street}}
      House Number: {{houseNumber}}
      City: {{city}}
      ZIP Code: {{zipCode}}
      Country: {{country}}

      Return ONLY the JSON object with lat and lng.`,
});

const geocodeAddressFlow = ai.defineFlow(
  {
    name: 'geocodeAddressFlow',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async (input) => {
    const llmResponse = await geocodePrompt(input);
    const output = llmResponse.output;
    
    if (!output) {
      throw new Error('Unable to geocode address. The model did not return valid coordinates.');
    }
    return output;
  }
);

export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
  return geocodeAddressFlow(input);
}
