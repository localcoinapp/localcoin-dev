import { Wallet } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Logo({ name }: { name?: string }) {
  const brandName = name || siteConfig.name;
  return (
    <a href="/" className="flex items-center space-x-2">
      <Wallet className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg font-headline">{brandName}</span>
    </a>
  );
}
