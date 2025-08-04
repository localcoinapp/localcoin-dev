import { Wallet } from "lucide-react";

export function Logo({ name }: { name: string }) {
  return (
    <a href="/" className="flex items-center space-x-2">
      <Wallet className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg font-headline">{name}</span>
    </a>
  );
}
