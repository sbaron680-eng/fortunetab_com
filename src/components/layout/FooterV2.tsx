import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/server';

interface FooterV2Props {
  locale: Locale;
  t: Dictionary;
}

export default function FooterV2({ locale, t }: FooterV2Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ft-ink text-white/60 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <Link href={`/${locale}`} className="inline-block">
              <span className="text-lg font-serif font-bold text-white/90">FortuneTab</span>
            </Link>
            <p className="mt-2 text-sm leading-relaxed max-w-xs">
              {t.common.tagline}
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">
              {locale === 'ko' ? '서비스' : 'Services'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={`/${locale}/chat`} className="hover:text-white transition-colors">{t.nav.chat}</Link></li>
              <li><Link href={`/${locale}/credits`} className="hover:text-white transition-colors">{t.nav.credits}</Link></li>
              <li><Link href={`/${locale}/pricing`} className="hover:text-white transition-colors">{t.nav.pricing}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">
              {locale === 'ko' ? '안내' : 'Legal'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={`/${locale}/terms`} className="hover:text-white transition-colors">{t.legal.terms}</Link></li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">{t.legal.privacy}</Link></li>
              <li><Link href={`/${locale}/refund`} className="hover:text-white transition-colors">{t.legal.refund}</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer + Copyright */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40 mb-3">{t.legal.disclaimer}</p>
          <p className="text-xs text-white/30">
            &copy; {year} FortuneTab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
