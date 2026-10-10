"use client";
import { ThemeProvider as NextThemes } from "next-themes";

/** Dark by default; the light theme is opt-in from the sidebar. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
