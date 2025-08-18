'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

export function CookieBanner() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem('cookie_consent');
      if (storedConsent) {
        setConsent(storedConsent === 'true');
      } else {
        setConsent(null); // No consent given yet
      }
    } catch (error) {
        // This can happen in SSR or if localStorage is disabled
        setConsent(false);
    }
  }, []);

  const handleAccept = () => {
    setConsent(true);
    localStorage.setItem('cookie_consent', 'true');
  };

  const handleDecline = () => {
    setConsent(false);
    localStorage.setItem('cookie_consent', 'false');
  };

  if (consent !== null) {
    return null; // Don't show banner if consent has been given (either true or false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="max-w-screen-lg mx-auto shadow-2xl">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
             <Cookie className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
             <div>
                <h3 className="font-semibold text-lg">We use cookies</h3>
                <p className="text-sm text-muted-foreground">
                    This website uses cookies to enhance your browsing experience and analyze our traffic. 
                    By clicking "Accept," you consent to our use of cookies.
                </p>
             </div>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <Button variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button onClick={handleAccept}>Accept</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
