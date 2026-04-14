import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CouchCode — Browser Retro Gaming",
  description:
    "Play retro games in your browser. Create sessions and use your phone as a wireless controller.",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <Navbar />
          {children}
        </QueryProvider>
        <InstallPrompt />
        <ServiceWorkerRegistration />
        {/* Defer non-critical third-party scripts — AdSense loads after page is interactive */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
