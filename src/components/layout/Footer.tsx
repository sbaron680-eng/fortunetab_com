import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1e1b4b] text-indigo-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 브랜드 */}
          <div className="lg:col-span-2">
            <Link href="/" className="text-xl font-bold text-[#f0c040]">
              fortunetab
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-indigo-300 max-w-xs">
              사주·운세의 흐름으로 설계하는 나만의 플래너.<br />
              2026년을 전략적으로 살아가는 첫걸음.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://www.instagram.com/fortunetab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-[#f0c040] transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </a>
            </div>
          </div>

          {/* 쇼핑 */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">쇼핑</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white transition-colors">전체 상품</Link></li>
              <li><Link href="/products/common-planner" className="hover:text-white transition-colors">무료 공통 플래너</Link></li>
              <li><Link href="/products/saju-planner-basic" className="hover:text-white transition-colors">사주 플래너 기본</Link></li>
              <li><Link href="/products/saju-planner-premium" className="hover:text-white transition-colors">사주 플래너 + 리포트</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">장바구니</Link></li>
            </ul>
          </div>

          {/* 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">안내</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#how-it-works" className="hover:text-white transition-colors">이용안내</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">자주 묻는 질문</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">로그인</Link></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">회원가입</Link></li>
            </ul>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="mt-8 pt-8 border-t border-indigo-700 text-xs text-indigo-400 space-y-1">
          <p>FortuneTab | 사업자등록번호: 000-00-00000 (준비 중)</p>
          <p>통신판매업신고: 제 0000-서울-0000호 (준비 중)</p>
          <p>고객센터: fortunetab@gmail.com | 운영시간: 평일 10:00 - 18:00</p>
          <p className="pt-2 text-indigo-500">
            © {currentYear} FortuneTab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
