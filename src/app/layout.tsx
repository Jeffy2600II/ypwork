// Path:    src/app/layout.tsx
// Purpose: Root layout — wraps every page with AuthProvider + ToastProvider.
//          Loads Noto Sans Thai font (same as yplabs) via next/font.

import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-noto-sans-thai',
});

export const metadata: Metadata = {
  title: 'ypwork — สภานักเรียน โรงเรียนคำยางพิทยา',
  description: 'ระบบจัดการงานสภานักเรียน โรงเรียนคำยางพิทยา — ทุกงานของสภา อยู่ในที่เดียว',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ypwork',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className={notoSansThai.className}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
