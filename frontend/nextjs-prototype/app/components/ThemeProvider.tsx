"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextProps {
  theme: string | null;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<string | null>(null); // Initial NULL, um SSR zu umgehen

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

    const activeTheme = storedTheme || systemTheme;
    setTheme(activeTheme);

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(activeTheme);
    localStorage.setItem("theme", activeTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";

      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(newTheme);
      localStorage.setItem("theme", newTheme);

      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme: theme || "light", toggleTheme }}>
      {theme ? children : null} {/* Verhindert den SSR-Fehler */}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
