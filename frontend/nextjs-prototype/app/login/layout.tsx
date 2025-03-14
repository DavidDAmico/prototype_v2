"use client";

import { useTheme } from "../components/ThemeProvider";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const themeContext = useTheme();
  console.log("Theme Context:", themeContext); // Debugging

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors">
      {children}
    </div>
  );
}
