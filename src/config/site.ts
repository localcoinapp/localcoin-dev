
export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "LocalCoin",
  description: "A crypto wallet and marketplace for local communities.",
  mainNav: [
    {
      title: "Marketplace",
      href: "/",
    },
  ],
  links: {
    // Add any external links here
  },
  token: {
    name: "LocalCoin",
    symbol: "LCL",
    mintAddress: "5hfFxuvUvjLzmzpRha2MtpCsTZnGSzqrjAbG7faHvL6u",
    decimals: 0,
  },
  fiatCurrency: {
    symbol: "EUR",
    name: "Euro",
  },
  commissionRate: 0.20,
}
