
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MerchantAgreementPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Merchant Agreement</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Introduction & Scope</h2>
          <p>
            This Merchant Agreement ("Agreement") governs your use of the LocalCoin Marketplace platform as a "Merchant". By registering as a Merchant, you agree to these terms.
          </p>

          <h2>2. Merchant Obligations</h2>
          <p>
            You agree to provide accurate information about your business and offerings. You are solely responsible for the quality of the goods and services you provide and for fulfilling all orders placed through the platform.
          </p>

          <h2>3. Fees and Payouts</h2>
          <p>
            We will charge a commission fee on all transactions, as specified in your dashboard. Payouts will be processed according to the schedule and method outlined in the cash-out section of the platform.
          </p>
          
          <h2>4. Termination</h2>
          <p>
            Either party may terminate this Agreement at any time. We reserve the right to suspend or terminate your merchant account if you violate these terms or any applicable laws.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
