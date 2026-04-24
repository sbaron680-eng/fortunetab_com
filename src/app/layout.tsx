/**
 * Root layout — Header / Footer / CartDrawer 포함
 */

import type { Metadata } from 'next';
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google';
import Script from 'next/script';
import AuthProvider from '@/components/layout/AuthProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Disclaimer from '@/components/layout/Disclaimer';
import SentryMount from '@/components/layout/SentryMount';
import CartDrawer from '@/components/cart/CartDrawer';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://fortunetab.com'),
  title: {
    default: 'FortuneTab — AI Reads Your Destiny Story',
    template: '%s | FortuneTab',
  },
  description:
    'An AI that fuses Eastern Four Pillars of Destiny with Western Astrology explores life\'s direction through conversation.',
  authors: [{ name: 'FortuneTab' }],
  openGraph: {
    type: 'website',
    siteName: 'FortuneTab',
    url: 'https://fortunetab.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const notoSans = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const notoSerif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-noto-serif',
  display: 'swap',
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <head />
      <body className={`${notoSans.variable} ${notoSerif.variable}`}>
        {/* GA4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}

        <SentryMount />
        <AuthProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Disclaimer />
          <Footer />
          <CartDrawer />
        </AuthProvider>
      </body>
    </html>
  );
}
