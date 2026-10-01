import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../../public/fonts/Inter-Regular.ttf", weight: "400" },
    { path: "../../public/fonts/Inter-Medium.ttf", weight: "500" },
    { path: "../../public/fonts/Inter-SemiBold.ttf", weight: "600" },
    { path: "../../public/fonts/Inter-Bold.ttf", weight: "700" },
    { path: "../../public/fonts/Inter-ExtraBold.ttf", weight: "800" },
  ],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Screeny",
  description: "Store screenshots, generated.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
