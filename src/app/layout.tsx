import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeBridge } from "@/components/theme-bridge";
import { AuroraBackground } from "@/components/aurora-background";
import { AppBootstrap } from "@/components/app-bootstrap";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumen — Liquid Glass Messenger",
  description: "A modern, liquid-glass messaging experience with real-time chat, voice & video calls, daily nutrition tracking, gym planner, and progress photos.",
  applicationName: "Lumen",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumen",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/favicon-32.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0814",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        <ThemeBridge />
        <AuroraBackground />
        <AppBootstrap>{children}</AppBootstrap>
        <InstallPrompt />
        <ServiceWorkerRegistrar />
        <Toaster />
      </body>
    </html>
  );
}
