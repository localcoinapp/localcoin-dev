'use client'

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Activity, CheckCircle } from "lucide-react"

export default function BecomeMerchantPage() {
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'pending' | 'approved'>('idle');

  const handleApply = () => {
    setApplicationStatus('pending');
    // Simulate an async KYC process
    setTimeout(() => {
        setApplicationStatus('approved');
    }, 2000);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Become a Merchant</CardTitle>
          <CardDescription>
            Join our network of local businesses and start offering your services on the marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applicationStatus === 'idle' && (
              <>
                  <FileText className="h-16 w-16 mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground mb-6">
                      The first step is to submit an application. We require a brief KYC process to ensure the safety of our community.
                  </p>
                  <Button onClick={handleApply}>Apply Now</Button>
              </>
          )}
          {applicationStatus === 'pending' && (
              <div className="flex flex-col items-center">
                  <Activity className="h-16 w-16 mx-auto text-primary mb-4 animate-spin"/>
                  <p className="text-muted-foreground">Your application is under review. This usually takes a moment.</p>
              </div>
          )}
          {applicationStatus === 'approved' && (
              <div className="flex flex-col items-center">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4"/>
                  <p className="text-muted-foreground">Congratulations! Your application is approved. You can now access the merchant dashboard.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
