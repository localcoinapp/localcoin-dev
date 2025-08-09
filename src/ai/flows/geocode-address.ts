'use server';

import { action } from '@genkit-ai/next/action';
import { z } from 'zod';
import { ai } from '../genkit';

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

export const geocodeAddress = action(
  {
    name: 'geocodeAddress',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert geocoder. Given the following address, provide the precise latitude and longitude.
      Street: ${input.street}
      House Number: ${input.houseNumber}
      City: ${input.city}
      ZIP Code: ${input.zipCode}
      Country: ${input.country}
      
      Return ONLY the JSON object with lat and lng.`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        format: 'json',
        schema: GeocodeAddressOutputSchema,
      },
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error('Unable to geocode address. The model did not return valid coordinates.');
    }
    return output;
  }
);
