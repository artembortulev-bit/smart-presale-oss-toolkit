import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import { ReactNode } from "react";

import "@/app/globals.css";
import { SiteFooter } from "@/ui/components/layout/site-footer";
import { SiteHeader } from "@/ui/components/layout/site-header";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Smart Presale — Smart Presale Platform",
  description:
    "Каталог, подбор решений, 3D-визуализация и коммерческие предложения для B2B presale Smart Presale.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${jetBrainsMono.variable} ${unbounded.variable}`}>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
