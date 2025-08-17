
import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-primary">Impressum</Link>
            <Link href="/agb" className="hover:text-primary">AGB</Link>
            <Link href="/kontakt" className="hover:text-primary">Kontakt</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LocalCoin. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
