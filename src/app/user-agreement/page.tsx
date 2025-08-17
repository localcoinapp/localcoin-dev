
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserAgreementPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>User Agreement</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Introduction</h2>
          <p>
            Welcome to LocalCoin Marketplace. By using our platform, you agree to be bound by these terms. 
            This is a legally binding agreement. If you do not agree with these terms, you should not use our services.
          </p>

          <h2>2. Use of Service</h2>
          <p>
            You agree to use our service in compliance with all applicable laws and regulations. You are responsible for all activity that occurs under your account.
          </p>

          <h2>3. Disclaimers</h2>
          <p>
            The service is provided "as is" without any warranties, express or implied. We do not guarantee the accuracy, completeness, or usefulness of any information on the service.
          </p>
          
          <h2>4. Limitation of Liability</h2>
          <p>
            In no event shall LocalCoin Marketplace, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages...
            [Your detailed User Agreement content here]
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
