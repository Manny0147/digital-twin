import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Digital Twin — Own Your Digital Identity",
  description:
    "A personal digital twin with full ownership, editable memories, transparent AI, and revocable consent.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Digital Twin",
  },
  applicationName: "Digital Twin",
};

export const viewport: Viewport = {
  themeColor: "#4c3a9e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen bg-background font-sans antialiased pb-safe">
          {children}
          <InstallPrompt />
          <Toaster position="top-center" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
