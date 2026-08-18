import type { Metadata } from "next";
import type { Viewport } from "next";
import { PWAUpdateHandler } from "../components/PWAUpdateHandler";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud Code Editor",
  description: "A cloud-synced code editor MVP.",
  applicationName: "Cloud Code Editor",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Cloud Code Editor",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101010",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PWAUpdateHandler />
        {children}
      </body>
    </html>
  );
}
