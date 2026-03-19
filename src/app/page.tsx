import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import PreviewImageCard from '@/components/home/PreviewImageCard';
import { PRODUCTS } from '@/lib/products';

export const metadata: Metadata = {
  title: '사주·운세로 설계한 나만의 2026 플래너',
  description:
    '사주팔자로 맞춤 제작되는 2026년 PDF 플래너. 운세 흐름 캘린더 + 월간/주간/일간 플래너. 무료 체험판 다운로드 가능.',
};

const HOW_IT_WORKS = [
  { step: '01', icon: '📝', title: '생년월일시 입력', desc: '출생 정보를 입력하면 사주팔자를 분석합니다.' },
  { step: '02', icon: '🔮', title: '운세 분석', desc: '2026년 월별 운세 흐름, 길일·주의일을 계산합니다.' },
  { step: '03', icon: '📄', title: '맞춤 플래너 제작', desc: '분석 결과를 반영한 개인 맞춤 PDF를 제작합니다.' },
  { step: '04', icon: '📧', title: '이메일 발송', desc: '완성된 플래너를 이메일로 바로 받아보세요.' },
];

const REVIEWS = [
  { name: '김O연', rating: 5, text: '운세가 플래너에 그대로 녹아 있어서 신기했어요. 길일에 중요한 약속을 잡게 됐는데 정말 잘 풀렸어요.' },
  { name: '이O준', rating: 5, text: '사주 리포트가 정말 상세해서 놀랐습니다. 올해 조심해야 할 시기를 미리 알고 대비할 수 있었어요.' },
  { name: '박O수', rating: 5, text: '무료 버전 먼저 써봤는데 너무 좋아서 유료 결제했습니다. 디자인도 예쁘고 내용도 알차요!' },
];

const FAQS = [
  {
    q: '무료 플래너와 유료 플래너의 차이가 뭔가요?',
    a: '무료 공통 플래너는 일반적인 5종 플래너 템플릿입니다. 유료 사주 플래너는 귀하의 생년월일시를 분석해 운세 흐름이 반영된 맞춤 플래너로 제작됩니다.',
  },
  {
    q: '생년월일만 있으면 되나요? 태어난 시간도 필요한가요?',
    a: '태어난 시간(시주)이 있으면 더 정확한 분석이 가능합니다. 모르시는 경우 생년월일만으로도 제작 가능합니다.',
  },
  {
    q: '결제 후 얼마나 걸리나요?',
    a: '무료 플래너는 즉시 다운로드 가능합니다. 유료 사주 플래너는 생년월일시를 바탕으로 직접 분석·제작하기 때문에 기본은 3~5 영업일, 프리미엄(리포트 포함)은 5~7 영업일 이내에 이메일로 발송됩니다.',
  },
  {
    q: 'PDF를 인쇄해도 되나요?',
    a: 'A4 규격 고화질 PDF로 제공되어 가정용 프린터에서도 선명하게 출력됩니다. GoodNotes, Noteshelf 등 태블릿 PDF 앱에서도 바로 사용 가능합니다.',
  },
];

const PREVIEW_IMAGES = [
  { src: '/products/planner-cover.png', label: '커버' },
  { src: '/products/planner-year.png', label: '연간' },
  { src: '/products/planner-monthly.png', label: '월간' },
  { src: '/products/planner-weekly.png', label: '주간' },
  { src: '/products/planner-daily.png', label: '일간' },
];

export default function HomePage() {
  return (
    <>
      {/* ── 히어로 섹션 ───────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white py-20 px-4 overflow-hidden">
        {/* 배경 광원 효과 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl" />
        </div>
        {/* 별 장식 */}
        <span aria-hidden="true" className="absolute top-8 left-10 text-[#f0c040]/25 text-3xl select-none">✦</span>
        <span aria-hidden="true" className="absolute top-20 right-16 text-[#f0c040]/20 text-xl select-none">✧</span>
        <span aria-hidden="true" className="absolute bottom-16 left-1/4 text-[#f0c040]/15 text-2xl select-none">✦</span>
        <span aria-hidden="true" className="absolute bottom-24 right-12 text-[#f0c040]/20 text-lg select-none">✧</span>

        <div className="relative max-w-6xl mx-auto text-center">
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-[#f0c040]/20 text-ft-gold rounded-full border border-[#f0c040]/40 mb-6">
            🌙 2026년 얼리버드 특가 진행 중
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-6">
            사주·운세로 설계한<br />
            <span className="text-ft-gold">나만의 2026 플래너</span>
          </h1>
          <p className="text-indigo-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            생년월일시로 분석한 운세 흐름이 플래너에 그대로 녹아듭니다.<br />
            단순한 일정표가 아닌, 내 운의 흐름을 읽는 도구.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/products"
              className="w-full sm:w-auto px-8 py-4 font-bold text-ft-navy bg-ft-gold rounded-2xl hover:bg-ft-gold-h transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              플래너 보러 가기 →
            </Link>
            <Link
              href="/products/common-planner"
              className="w-full sm:w-auto px-8 py-4 font-medium text-white border border-white/40 rounded-2xl hover:bg-white/20 hover:border-white/80 hover:scale-[1.02] transition-all"
            >
              무료 체험판 받기
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-indigo-300">
            <span className="flex items-center gap-2"><span className="text-ft-gold">✓</span> 무료 체험판 즉시 다운로드</span>
            <span className="flex items-center gap-2"><span className="text-ft-gold">✓</span> PDF 고화질 A4 규격</span>
            <span className="flex items-center gap-2"><span className="text-ft-gold">✓</span> 태블릿·인쇄 모두 가능</span>
          </div>
        </div>
      </section>

      {/* ── 상품 섹션 ─────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-b from-ft-card to-ft-base relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">✨ 플래너 라인업</p>
            <h2 className="text-2xl sm:text-3xl font-black text-ft-text">나에게 맞는 플래너를 선택하세요</h2>
            <p className="mt-2 text-ft-text-muted text-sm sm:text-base">무료 체험판부터 사주 맞춤 플래너까지</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} priority={true} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/products" className="inline-flex items-center gap-2 text-indigo-700 font-medium hover:text-indigo-900 transition-colors">
              전체 상품 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 무료 사주 계산기 티저 ─────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-br from-ft-base to-ft-navy relative overflow-hidden">
        {/* 별 장식 */}
        <span aria-hidden="true" className="absolute top-10 right-20 text-[#f0c040]/20 text-3xl select-none">✦</span>
        <span aria-hidden="true" className="absolute bottom-12 left-16 text-[#f0c040]/15 text-2xl select-none">✧</span>
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-[#f0c040]/20 text-ft-gold rounded-full border border-[#f0c040]/40 mb-5">
            ✨ 무료 서비스
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
            지금 바로 사주팔자를 계산해보세요
          </h2>
          <p className="text-indigo-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8">
            생년월일만 입력하면 사주팔자 4기둥, 오행 분포, 용신,
            그리고 <span className="text-ft-gold font-semibold">2026년 12개월 운세</span>를 무료로 확인하세요.
          </p>

          {/* 미리보기 카드들 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-2xl mx-auto">
            {[
              { icon: '🏛', label: '사주팔자', desc: '4기둥 천간지지' },
              { icon: '🌿', label: '오행분포', desc: '목화토금수 분석' },
              { icon: '⭐', label: '용신', desc: '나를 돕는 기운' },
              { icon: '📅', label: '월운', desc: '2026 12개월 운세' },
            ].map(({ icon, label, desc }) => (
              <div key={label}
                   className="rounded-xl p-4 text-center"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-indigo-400 mt-1">{desc}</div>
              </div>
            ))}
          </div>

          <Link
            href="/saju"
            className="inline-flex items-center gap-2 px-8 py-4 font-bold text-ft-navy bg-ft-gold rounded-2xl hover:bg-ft-gold-h transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base"
          >
            🔮 무료 사주 계산하기
          </Link>
          <p className="text-xs text-indigo-500 mt-4">회원가입 없이 즉시 이용 가능</p>
        </div>
      </section>

      {/* ── 이용 방법 ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 px-4 bg-ft-deep relative overflow-hidden">
        {/* 별 장식 */}
        <span aria-hidden="true" className="absolute top-12 left-16 text-[#f0c040]/15 text-4xl select-none">✦</span>
        <span aria-hidden="true" className="absolute top-8 right-24 text-[#f0c040]/10 text-2xl select-none">✧</span>
        <span aria-hidden="true" className="absolute bottom-12 left-1/3 text-[#f0c040]/10 text-3xl select-none">✦</span>
        <span aria-hidden="true" className="absolute bottom-8 right-16 text-[#f0c040]/15 text-xl select-none">✧</span>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#f0c040]/70 uppercase tracking-widest mb-2">🌙 제작 과정</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">이렇게 만들어집니다</h2>
            <p className="mt-2 text-indigo-400 text-sm sm:text-base">간단한 4단계로 나만의 플래너가 완성됩니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ step, icon, title, desc }, idx) => (
              <div key={step} className="text-center relative">
                {/* 연결선 (마지막 제외) */}
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-gradient-to-r from-[#f0c040]/30 to-transparent" />
                )}
                <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-2xl text-2xl relative z-10"
                     style={{ background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.25)' }}>
                  {icon}
                </div>
                <span className="block text-xs font-bold text-[#f0c040]/60 mb-1">STEP {step}</span>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-indigo-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 플래너 미리보기 ──────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-b from-ft-card to-ft-base relative overflow-hidden">
        {/* 별 장식 */}
        <span aria-hidden="true" className="absolute top-8 right-16 text-[#f0c040]/20 text-4xl select-none">✦</span>
        <span aria-hidden="true" className="absolute bottom-16 left-8 text-[#f0c040]/10 text-5xl select-none">✧</span>
        <span aria-hidden="true" className="absolute top-1/2 left-4 text-[#f0c040]/10 text-2xl select-none">✦</span>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#f0c040]/70 uppercase tracking-widest mb-2">📄 샘플 미리보기</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">플래너 미리보기</h2>
            <p className="mt-2 text-indigo-400 text-sm">실제 PDF 플래너 템플릿 일부를 미리 확인하세요</p>
            <span className="inline-block mt-3 px-4 py-1.5 text-xs font-semibold rounded-full border"
                  style={{ background: 'rgba(240,192,64,0.12)', color: '#f0c040', borderColor: 'rgba(240,192,64,0.35)' }}>
              📐 세로형 샘플
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PREVIEW_IMAGES.map(({ src, label }) => (
              <PreviewImageCard key={label} src={src} label={label} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/products/common-planner"
              className="inline-flex items-center px-6 py-3 font-bold text-ft-navy bg-ft-gold rounded-xl hover:bg-ft-gold-h transition-colors shadow"
            >
              무료로 다운로드 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 후기 ──────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-ft-card relative overflow-hidden">
        <span aria-hidden="true" className="absolute top-10 right-12 text-[#f0c040]/15 text-4xl select-none">✦</span>
        <span aria-hidden="true" className="absolute bottom-10 left-12 text-[#f0c040]/10 text-3xl select-none">✧</span>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#f0c040]/70 uppercase tracking-widest mb-2">⭐ 실제 후기</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">사용 후기</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {REVIEWS.map(({ name, rating, text }) => (
              <div key={name} className="rounded-2xl p-6"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: rating }).map((_, i) => (
                    <span key={i} className="text-ft-gold text-sm">★</span>
                  ))}
                </div>
                <p className="text-indigo-200 text-sm leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
                <span className="text-xs font-medium text-indigo-400">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="py-16 px-4 bg-ft-deep">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#f0c040]/70 uppercase tracking-widest mb-2">💬 자주 묻는 질문</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">FAQ</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-2xl p-6"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="font-bold text-white mb-2">Q. {q}</h3>
                <p className="text-indigo-300 text-sm leading-relaxed">A. {a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-r from-ft-navy to-ft-purple text-white text-center relative overflow-hidden">
        <span aria-hidden="true" className="absolute top-8 left-12 text-[#f0c040]/20 text-3xl select-none">✦</span>
        <span aria-hidden="true" className="absolute bottom-8 right-16 text-[#f0c040]/15 text-4xl select-none">✧</span>
        <div className="max-w-2xl mx-auto relative">
          <h2 className="text-2xl sm:text-3xl font-black mb-4">2026년을 운세와 함께 시작하세요</h2>
          <p className="text-indigo-200 mb-8">지금 무료 플래너를 받아보고, 내 사주로 맞춤 제작된 플래너를 경험해보세요.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/products/common-planner"
              className="px-8 py-4 font-bold text-ft-navy bg-ft-gold rounded-2xl hover:bg-ft-gold-h transition-all shadow-lg"
            >
              무료 플래너 받기
            </Link>
            <Link
              href="/products/saju-planner-premium"
              className="px-8 py-4 font-medium text-white border border-white/40 rounded-2xl hover:bg-white/10 transition-all"
            >
              프리미엄 플래너 보기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
