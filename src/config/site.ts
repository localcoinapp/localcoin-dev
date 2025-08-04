
export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "LocalCoin",
  description: "A crypto wallet and marketplace for local communities.",
  mainNav: [
    {
      title: "Marketplace",
      href: "/",
    },
    {
      title: "Chat",
      href: "/chat",
    },
    {
      title: "Dashboard",
      href: "/dashboard",
    },
  ],
  links: {
    // Add any external links here
  },
  token: {
    name: "LocalCoin",
    symbol: "LCL",
  }
}
