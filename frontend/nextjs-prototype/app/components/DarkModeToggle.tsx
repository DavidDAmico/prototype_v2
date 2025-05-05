"use client";

import { useTheme } from "./ThemeProvider";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 p-2 bg-gray-200 dark:bg-gray-800 rounded-full shadow-lg transition-colors"
      aria-label="Toggle Dark Mode"
    >

      {theme === "dark" ? <SunIcon className="w-6 h-6 text-yellow-500" /> : <MoonIcon className="w-6 h-6 text-gray-900" />}
    </button>
  );
}
