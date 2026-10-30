import type { Metadata, Viewport } from "next";
import { Playfair_Display, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const headingFont = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const bodyFont = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Monito-Monita | Christmas Exchange Gift",
  description:
    "Christ-centered Monito-Monita exchange gift organizer para sa Christmas party — registration, secret wishlist, at fair random assignment.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Monito-Monita", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b4332",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
