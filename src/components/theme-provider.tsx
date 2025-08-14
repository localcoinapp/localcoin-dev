
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
  const [theme, setTheme] = React.useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(storageKey)?.split(':')[0];
      return (stored as Theme) || defaultTheme;
    } catch (e) {
      return defaultTheme;
    }
  });

  const [mode, setMode] = React.useState<Mode>(() => {
    try {
      const stored = localStorage.getItem(storageKey)?.split(':')[1];
      return (stored as Mode) || defaultMode;
    } catch (e) {
      return defaultMode;
    }
  });


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
    try {
      localStorage.setItem(storageKey, `${theme}:${mode}`)
    } catch (e) {
      console.error("Failed to save theme to local storage", e);
    }
  }, [theme, mode, storageKey])

  const value = {
    theme,
    setTheme,
    mode,
    setMode,
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
