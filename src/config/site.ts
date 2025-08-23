
export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "LocalCoin",
  description: "A crypto wallet and marketplace for local communities.",
  mainNav: [
    // {
    //   title: "Marketplace",
    //   href: "/",
    // },
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
  bankDetails: {
    EUR: {
        beneficiary: "LocalCoin EU, S.L.",
        iban: "ES85 2100 0000 0000 0000 0000",
        bic: "CAIXESBBXXX",
        bank: "CaixaBank, S.A.",
        accountNumber: "", // Not typically used for SEPA
        achRouting: "", // Not used for SEPA
    },
    USD: {
        beneficiary: "LocalCoin US, Inc.",
        accountNumber: "8901234567",
        achRouting: "021000021",
        bank: "JPMorgan Chase Bank, N.A.",
        iban: "", // Not typically used for ACH
        bic: "", // Swift might be needed for international wires, but this is for ACH
    }
  }
}
