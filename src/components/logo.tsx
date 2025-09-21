
'use client';

import { Wallet } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useTheme } from "./theme-provider";
import Image from "next/image";

export function Logo({ name }: { name?: string }) {
  const { theme } = useTheme();
  const brandName = name || siteConfig.name;

  if (theme === 'theme-smart') {
    return (
      <a href="/" className="flex items-center space-x-2">
        <Image 
            src="https://smartde.coop/wp-content/uploads/2024/02/Logo.svg" 
            alt="Smart Logo"
            width={100}
            height={24}
            className="h-6 w-auto"
        />
      </a>
    )
  }

  return (
    <a href="/" className="flex items-center space-x-2">
      <Wallet className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg font-headline">{brandName}</span>
    </a>
  );
}
