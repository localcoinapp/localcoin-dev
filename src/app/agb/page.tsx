
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgbPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Allgemeine Geschäftsbedingungen (AGB) / Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <h2>1. Scope</h2>
          <p>
            These terms and conditions apply to all purchases and services offered on this platform...
            [Your detailed terms and conditions content here]
          </p>

          <h2>2. Conclusion of Contract</h2>
          <p>
            The presentation of services on our platform does not constitute a legally binding offer, but rather an invitation to place an order...
            [Your detailed terms and conditions content here]
          </p>

          <h2>3. Prices and Payment</h2>
          <p>
            The prices listed are final prices including the applicable statutory value-added tax...
            [Your detailed terms and conditions content here]
          </p>
          
          {/* Add more sections as needed */}
        </CardContent>
      </Card>
    </div>
  );
}
