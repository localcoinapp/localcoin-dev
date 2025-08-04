'use client'

import * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu, Wallet } from "lucide-react"

export function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="md:hidden">
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="px-2 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Wallet className="mr-2 h-6 w-6 text-primary" />
          <span className="font-bold">{siteConfig.name}</span>
        </Link>
        <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {siteConfig.mainNav.map(
              (item) =>
                item.href && (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.title}
                  </Link>
                )
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </div>
  )
}
