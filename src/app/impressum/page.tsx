
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImpressumPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Impressum / Legal Notice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            [Your Company Name]
            <br />
            [Street Address]
            <br />
            [City, Postal Code]
            <br />
            [Country]
          </p>
          <p>
            <strong>Represented by:</strong>
            <br />
            [Your Name]
          </p>
          <p>
            <strong>Contact:</strong>
            <br />
            Telephone: [Your Phone Number]
            <br />
            Email: [Your Email Address]
          </p>
          <p>
            <strong>Register entry:</strong>
            <br />
            Entry in the Handelsregister.
            <br />
            Registering court: [Amtsgericht Name]
            <br />
            Registration number: [Registration Number]
          </p>
          <p>
            <strong>VAT ID:</strong>
            <br />
            VAT identification number according to §27a German Value Added Tax Act:
            <br />
            [Your VAT ID]
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
