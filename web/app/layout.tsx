import type { Metadata, Viewport } from "next";
import { Baloo_2, Mukta } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700", "800"],
});

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bahar Khelo | When can kids play outside?",
  description:
    "Chiku the sparrow reads the hourly air quality and heat forecast for your neighbourhood and tells Indian parents and schools the safest time for children to play outdoors.",
};

export const viewport: Viewport = {
  themeColor: "#fbf4e6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${baloo.variable} ${mukta.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
