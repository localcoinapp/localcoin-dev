'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import type { MainNavItem } from "@/types"

interface MainNavProps {
  items?: MainNavItem[]
}

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname()

  if (!items?.length) {
    return null
  }

  return (
    <div className="hidden md:flex gap-6 md:gap-10 md:ml-10">
      <nav className="hidden gap-6 md:flex">
        {items?.map(
          (item, index) =>
            item.href && (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center text-lg font-medium transition-colors hover:text-primary/80 sm:text-sm",
                  pathname === item.href ? "text-primary" : "text-foreground/60"
                )}
              >
                {item.title}
              </Link>
            )
        )}
      </nav>
    </div>
  )
}
