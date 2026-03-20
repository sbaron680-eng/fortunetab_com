import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ft-ink text-white/50 mt-auto border-t-2 border-ft-gold/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* ── 단일 그리드: 브랜드(2col) + 쇼핑 + 안내 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* 브랜드 + 사업자 정보 */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* 상단: 로고 + 소개 + SNS */}
            <div>
              <Link href="/" className="inline-flex items-center group">
                <span className="text-xl font-serif font-bold text-ft-gold group-hover:opacity-80 transition-opacity">
                  FortuneTab
                </span>
              </Link>
              <p className="mt-2 text-sm leading-relaxed max-w-xs">
                사주·운세의 흐름으로 설계하는 나만의 플래너.<br />
                2026년을 전략적으로 살아가는 첫걸음.
              </p>
              <a
                href="https://www.instagram.com/fortunetab"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-white/30 hover:text-ft-gold transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </a>
            </div>

            {/* 하단: 사업자 정보 (브랜드와 같은 컬럼에 자연스럽게 배치) */}
            <div className="text-xs space-y-1.5 text-white/35">
              <p>상호: 비포에이 &nbsp;|&nbsp; 서비스명: FortuneTab &nbsp;|&nbsp; 사업자등록번호: 238-18-00745</p>
              <p>통신판매업신고: 제 2019-울산울주-0053호</p>
              <p>
                고객센터:{' '}
                <a href="mailto:sbaron680@gmail.com" className="hover:text-white/60 transition-colors">
                  sbaron680@gmail.com
                </a>
                &nbsp;|&nbsp; 운영시간: 평일 10:00 – 18:00
              </p>
            </div>
          </div>

          {/* 쇼핑 */}
          <div>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-5">쇼핑</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/products" className="hover:text-white transition-colors">전체 상품</Link></li>
              <li><Link href="/products/common-planner" className="hover:text-white transition-colors">무료 공통 플래너</Link></li>
              <li><Link href="/products/saju-planner-basic" className="hover:text-white transition-colors">사주 플래너 기본</Link></li>
              <li><Link href="/products/saju-planner-premium" className="hover:text-white transition-colors">사주 플래너 + 리포트</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">장바구니</Link></li>
            </ul>
          </div>

          {/* 안내 */}
          <div>
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-5">안내</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#how-it-works" className="hover:text-white transition-colors">이용안내</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">자주 묻는 질문</Link></li>
              <li><Link href="/refund" className="hover:text-white transition-colors">환불정책</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">이용약관</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">개인정보 처리방침</Link></li>
            </ul>
          </div>
        </div>

        {/* ── 카피라이트 ── */}
        <p className="mt-12 text-xs text-white/20">
          © {currentYear} FortuneTab · 비포에이. All rights reserved.
        </p>

      </div>
    </footer>
  );
}
