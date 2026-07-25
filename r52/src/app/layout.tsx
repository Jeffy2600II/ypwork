import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatusBanner } from "@/components/framework/network-status-banner";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YP Work · สมองของสภานักเรียน",
  description:
    "แพลตฟอร์มภายในสำหรับจัดตารางรายการ กลุ่มรายการ ฝ่ายงาน และรายการย่อย — สภานักเรียน",
  keywords: ["YP Work", "สภานักเรียน", "จัดตารางรายการ", "student council"],
  authors: [{ name: "YP Work" }],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
  },
  openGraph: {
    title: "YP Work · สมองของสภานักเรียน",
    description: "จัดตารางรายการ กลุ่มรายการ ฝ่ายงาน และรายการย่อย ในที่เดียว",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
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
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${notoSansThai.variable} ${inter.variable} antialiased`}
        style={{
          fontFamily: "var(--yp-font-stack)",
          background: "var(--yp-bg-page)",
          color: "var(--yp-text-body)",
        }}
      >
        {/* v3.0.0: Network status banner — shown when offline */}
        <NetworkStatusBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
