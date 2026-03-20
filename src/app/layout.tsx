import type { Metadata } from 'next';
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import Toast from '@/components/ui/Toast';
import AuthProvider from '@/components/layout/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://fortunetab.com'),
  title: {
    default: 'FortuneTab — 사주·운세로 설계한 나만의 2026 플래너',
    template: '%s | FortuneTab',
  },
  description:
    '사주팔자 분석으로 맞춤 제작되는 2026년 PDF 플래너. 운세 흐름 캘린더, 월간·주간·일간 플래너 포함. 지금 무료 체험판을 다운로드하세요.',
  keywords: ['사주 플래너', '운세 플래너', '2026 플래너', 'PDF 플래너', '사주팔자', '다이어리 PDF', '운세 달력'],
  authors: [{ name: 'FortuneTab' }],
  openGraph: {
    title: 'FortuneTab — 사주·운세로 설계한 나만의 2026 플래너',
    description: '사주팔자 분석으로 맞춤 제작되는 2026년 PDF 플래너. 운세 흐름 캘린더 포함.',
    locale: 'ko_KR',
    type: 'website',
    siteName: 'FortuneTab',
    url: 'https://fortunetab.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FortuneTab — 사주·운세 2026 플래너',
    description: '사주팔자 분석으로 맞춤 제작되는 2026년 PDF 플래너.',
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
      <body className={`flex flex-col min-h-screen ${notoSans.variable} ${notoSerif.variable}`}>
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

        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <Toast />
        </AuthProvider>
      </body>
    </html>
  );
}
