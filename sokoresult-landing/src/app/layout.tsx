import type { Metadata } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SokoResult — Africa's Prediction Market",
  description:
    "Buy and sell shares in real-world outcomes. Politics. Sports. Entertainment. Fashion. Profit when you're right. Africa's first prediction market, starting in Kenya.",
  keywords: "prediction market, Africa, Kenya, trading, M-Pesa, $OKO, sports betting, political predictions",
  openGraph: {
    title: "SokoResult — Africa's Prediction Market",
    description: "Put your money where your mouth is. Trade on outcomes that matter to Africa.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,800,700,600,500,400&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A0A12" />
      </head>
      <body className="antialiased min-h-screen bg-[#0A0A12]">
          <AuthProvider>{children}</AuthProvider>
        </body>
    </html>
  );
}
