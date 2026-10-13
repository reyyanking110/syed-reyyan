import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Poppins, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
});

const siteUrl = "https://nanna-foods-demo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nanna Foods | BBQ, Burgers, Rolls & Broast in North Karachi",
    template: "%s | Nanna Foods",
  },
  description:
    "Nanna Foods — a North Karachi favourite near Nagan Chowrangi serving flame-grilled BBQ, burgers, rolls, sandwiches and crispy broast. Design concept by Reyyan Graphix Designz.",
  keywords: [
    "Nanna Foods",
    "North Karachi restaurant",
    "Nagan Chowrangi food",
    "BBQ Karachi",
    "broast Karachi",
    "burgers Karachi",
    "Karachi fast food",
  ],
  openGraph: {
    title: "Nanna Foods | Flame-Grilled Favourites in North Karachi",
    description:
      "BBQ, burgers, rolls, sandwiches and broast — a North Karachi neighbourhood favourite near Nagan Chowrangi.",
    url: siteUrl,
    siteName: "Nanna Foods",
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nanna Foods | Flame-Grilled Favourites in North Karachi",
    description:
      "BBQ, burgers, rolls, sandwiches and broast near Nagan Chowrangi, North Karachi.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${nastaliq.variable}`}>
      <body className="bg-charcoal-950 text-cream-100 antialiased">{children}</body>
    </html>
  );
}
