
"use client"

import * as React from "react"

type Theme = "theme-default-eco" | "theme-tropics" | "theme-berlin";
type Mode = "light" | "dark" | "system";

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  mode: Mode
  setMode: (mode: Mode) => void
}

const initialState: ThemeProviderState = {
  theme: "theme-default-eco",
  setTheme: () => null,
  mode: "system",
  setMode: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "theme-default-eco",
  defaultMode = "system",
  storageKey = "vite-ui-theme",
  ...props
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultMode?: Mode
  storageKey?: string
}) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme)
  const [mode, setMode] = React.useState<Mode>(defaultMode)

  React.useEffect(() => {
    const storedThemeValue = localStorage.getItem(storageKey);
    if (storedThemeValue) {
      const [storedTheme, storedMode] = storedThemeValue.split(':');
      if (storedTheme) setTheme(storedTheme as Theme);
      if (storedMode) setMode(storedMode as Mode);
    }
  }, [storageKey]);

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("theme-default-eco", "theme-tropics", "theme-berlin", "light", "dark")

    if (mode === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
        root.classList.add(mode)
    }

    root.classList.add(theme)
    localStorage.setItem(storageKey, `${theme}:${mode}`)
  }, [theme, mode, storageKey])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme)
    },
    mode,
    setMode: (newMode: Mode) => {
      setMode(newMode)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
