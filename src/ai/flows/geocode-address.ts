
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { action } from 'genkit';

const GeocodeAddressInputSchema = z.object({
  street: z.string().describe("The street name."),
  houseNumber: z.string().describe("The house number."),
  city: z.string().describe("The city."),
  zipCode: z.string().describe("The ZIP or postal code."),
  country: z.string().describe("The country (can be a name or a 2-letter ISO code)."),
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
    const prompt = `You are a highly specialized geocoding API. Your only function is to convert structured address data into geographic coordinates.

You will receive a JSON object containing address components. Your task is to find the precise latitude and longitude for this address.

CRITICAL INSTRUCTIONS:
1.  If the "country" field is a 2-letter ISO 3166-1 alpha-2 country code, you MUST convert it to its full country name before proceeding. For example, "DE" means "Germany", and "US" means "United States".
2.  Your output MUST be a valid JSON object containing only the "lat" and "lng" keys. Do not include any other text, commentary, or explanations.

Input Address Data:
{
  "street": "${input.street}",
  "houseNumber": "${input.houseNumber}",
  "city": "${input.city}",
  "zipCode": "${input.zipCode}",
  "country": "${input.country}"
}
`;
    
    const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemini-1.5-flash',
        output: {
            schema: GeocodeAddressOutputSchema,
        },
    });

    if (!output) {
      throw new Error("Geocoding failed: The AI model did not return a valid output. Please check the address and try again.");
    }
    
    return output;
  }
);
