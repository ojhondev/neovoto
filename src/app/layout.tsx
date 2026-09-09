import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import { THEME_COOKIE, isTheme } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://neovoto.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NeoVoto — Inteligência política baseada em evidência",
    template: "%s · NeoVoto",
  },
  description:
    "Plataforma analítica que correlaciona dados abertos oficiais para decisões eleitorais e de governo. LGPD do início ao fim.",
  openGraph: {
    title: "NeoVoto",
    description:
      "Inteligência política baseada em evidência. Somente dados abertos oficiais.",
    url: siteUrl,
    siteName: "NeoVoto",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : undefined;
  return (
    <html lang={locale} data-theme={theme} className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
