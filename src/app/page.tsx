import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import PlannerPreviewSection from '@/components/home/PlannerPreviewSection';
import SansuBackground from '@/components/home/SansuBackground';
import SeasonIcons from '@/components/home/SeasonIcons';
import { PRODUCTS, PLANNER_YEAR } from '@/lib/products';

export const metadata: Metadata = {
  title: `사주·운세로 설계한 나만의 ${PLANNER_YEAR} 플래너`,
  description:
    `사주팔자로 맞춤 제작되는 ${PLANNER_YEAR}년 PDF 플래너. 운세 흐름 캘린더 + 월간/주간/일간 플래너. 무료 체험판 다운로드 가능.`,
};

const HOW_IT_WORKS = [
  { step: '01', title: '생년월일시 입력', desc: '결제 시 출생 정보를 입력합니다.', time: '1분' },
  { step: '02', title: 'AI 사주 분석', desc: `${PLANNER_YEAR}년 월별 운세, 길일·주의일을 자동 계산합니다.`, time: '자동' },
  { step: '03', title: '맞춤 플래너 제작', desc: '분석 결과가 반영된 개인 맞춤 PDF를 생성합니다.', time: '자동' },
  { step: '04', title: '이메일 발송', desc: '완성된 플래너가 이메일로 자동 발송됩니다.', time: '평균 5분 이내' },
];

const REVIEWS = [
  { name: '김O연', title: '베타 테스터 · 직장인', product: '사주 플래너 기본', date: '2026.01', rating: 5, text: '운세가 플래너에 그대로 녹아 있어서 신기했어요. 길일에 중요한 약속을 잡게 됐는데 정말 잘 풀렸어요.' },
  { name: '이O준', title: '베타 테스터 · 프리랜서 디자이너', product: '사주 플래너 프리미엄', date: '2026.02', rating: 5, text: '사주 리포트가 정말 상세해서 놀랐습니다. 올해 조심해야 할 시기를 미리 알고 대비할 수 있었어요.' },
  { name: '박O수', title: '베타 테스터 · 자영업자', product: '무료 공통 플래너 → 기본 업그레이드', date: '2026.01', rating: 4, text: '무료 버전 먼저 써봤는데 너무 좋아서 유료 결제했습니다. 디자인도 예쁘고 내용도 알차요!' },
];

const FAQS = [
  {
    q: '무료 플래너와 유료 플래너의 차이가 뭔가요?',
    a: '무료 공통 플래너는 커버·연간·월간·주간·일간 5종 페이지로 구성된 범용 플래너입니다. 유료 사주 플래너는 귀하의 생년월일시를 분석해 운세 흐름이 반영된 맞춤 플래너로 제작됩니다.',
  },
  {
    q: '생년월일만 있으면 되나요? 태어난 시간도 필요한가요?',
    a: '태어난 시간(시주)이 있으면 더 정확한 분석이 가능합니다. 모르시는 경우 생년월일만으로도 제작 가능합니다.',
  },
  {
    q: '결제 후 얼마나 걸리나요?',
    a: '무료 플래너는 브라우저에서 즉시 다운로드됩니다. 유료 사주 플래너는 결제 후 자동으로 PDF가 생성되어 평균 5분 이내 이메일로 발송됩니다.',
  },
  {
    q: 'PDF를 인쇄하거나 태블릿에서 사용해도 되나요?',
    a: 'A4 규격 고화질 PDF로 제공되어 가정용 프린터에서도 선명하게 출력됩니다. GoodNotes, Noteshelf, Apple PDF 앱 등 태블릿에서도 바로 사용 가능합니다.',
  },
  {
    q: '환불이 가능한가요?',
    a: '디지털 콘텐츠 특성상 PDF 발송 이후 환불은 불가합니다. 무료 플래너로 먼저 품질을 확인해 보시길 권장합니다.',
  },
  {
    q: '유료 상품 결제 시 생년월일은 언제 입력하나요?',
    a: '체크아웃 과정에서 사주 정보(생년월일, 시간, 성별)를 입력합니다. 입력한 정보로 AI가 사주를 분석하고 맞춤 플래너를 자동 생성합니다.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — 풀스크린 · 산수화 배경 · 사계절 픽토그램
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative bg-ft-paper min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
        {/* 산수화 SVG — 우측 절반 고정 */}
        <SansuBackground className="absolute right-0 top-0 w-[55%] h-full opacity-100 pointer-events-none hidden md:block" />
        {/* 모바일: 하단 배경으로 */}
        <SansuBackground className="absolute bottom-0 left-0 w-full h-1/2 opacity-40 pointer-events-none md:hidden" />

        <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-8 py-24">
          <div className="max-w-xl">
            {/* 얼리버드 배지 */}
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold border border-ft-red/30 text-ft-red rounded-full mb-10 tracking-widest bg-ft-red/5">
              <span className="w-1.5 h-1.5 rounded-full bg-ft-red animate-pulse" />
              {PLANNER_YEAR}년 얼리버드 특가 — 6월 30일 마감
            </span>

            {/* 메인 헤드라인 */}
            <h1 className="font-serif font-black text-ft-ink leading-[1.15] mb-6">
              <span className="block text-4xl sm:text-5xl lg:text-[3.5rem]">사주·운세로</span>
              <span className="block text-4xl sm:text-5xl lg:text-[3.5rem]">설계한 나만의</span>
              <span className="block text-4xl sm:text-5xl lg:text-[3.5rem]">
                <span className="text-ft-red">{PLANNER_YEAR}</span> 플래너
              </span>
            </h1>

            {/* 수평 구분선 (단청 대들보) */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-ft-ink/15" />
              <span className="text-ft-muted text-xs tracking-widest">FORTUNETAB</span>
              <div className="w-8 h-px bg-ft-ink/15" />
            </div>

            <p className="text-ft-muted text-base sm:text-lg leading-loose mb-10">
              좋은 기운이 강한 달에 중요한 결정을, 조심할 달엔 신중하게.<br />
              12개월 운세 흐름이 반영된 나만의 맞춤 플래너입니다.
            </p>

            {/* CTA 버튼 */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-14">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-ft-red rounded-xl hover:bg-ft-red-h transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                플래너 보러 가기
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/products/common-planner"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-ft-ink border border-ft-ink/20 rounded-xl hover:border-ft-ink/50 hover:bg-ft-ink/5 transition-all"
              >
                무료 체험판 받기
              </Link>
            </div>

            {/* 사계절 픽토그램 */}
            <SeasonIcons showLabel={true} size={48} />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          단청 리듬 — 이용 방법 (상하 대들보 빔 라인)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="how-it-works" className="py-20 px-6 bg-ft-paper-alt">
        <div className="max-w-6xl mx-auto">
          {/* 상단 대들보 라인 */}
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-1 h-px bg-ft-ink/20" />
            <span className="text-xs font-semibold text-ft-muted uppercase tracking-[0.2em]">제작 과정</span>
            <div className="flex-1 h-px bg-ft-ink/20" />
          </div>

          <h2 className="text-center text-2xl sm:text-3xl font-serif font-black text-ft-ink mb-14">
            이렇게 만들어집니다
          </h2>

          {/* 4컬럼 단청 비례 그리드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-ft-ink/10 divide-x divide-ft-ink/10">
            {HOW_IT_WORKS.map(({ step, title, desc, time }, idx) => (
              <div
                key={step}
                className={`p-8 flex flex-col gap-3 ${idx % 2 === 0 && idx < 2 ? 'border-b border-ft-ink/10 lg:border-b-0' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-black text-3xl text-ft-red/20 leading-none">{step}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-ft-red/10 text-ft-red rounded-full">{time}</span>
                </div>
                <h3 className="font-serif font-semibold text-ft-ink text-base leading-snug">{title}</h3>
                <p className="text-sm text-ft-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* 하단 대들보 라인 */}
          <div className="flex items-center gap-4 mt-12">
            <div className="flex-1 h-px bg-ft-ink/20" />
            <span className="text-xs text-ft-muted tracking-widest">四 · 단계</span>
            <div className="flex-1 h-px bg-ft-ink/20" />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          상품 쇼케이스 — 좌측 빨강 보더 목판 카드
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 px-6 bg-ft-paper">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-semibold text-ft-red uppercase tracking-[0.2em] mb-3">플래너 라인업</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-ft-ink mb-2">
              나에게 맞는 플래너를 선택하세요
            </h2>
            <p className="text-ft-muted text-sm">무료 체험 → 베이직 → 프리미엄 순서로 업그레이드할 수 있습니다</p>
          </div>

          {/* 무료 상품 */}
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3">무료 플래너</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {PRODUCTS.filter(p => p.price === 0).map((product) => (
              <ProductCard key={product.id} product={product} priority={true} />
            ))}
          </div>

          {/* 유료 상품 */}
          <p className="text-xs font-semibold text-ft-red uppercase tracking-widest mb-3">프리미엄 플래너</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCTS.filter(p => p.price > 0).map((product) => (
              <ProductCard key={product.id} product={product} priority={true} />
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-ft-ink font-medium border-b border-ft-ink/20 pb-0.5 hover:border-ft-red hover:text-ft-red transition-colors"
            >
              전체 상품 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          플래너 미리보기 — 네이비 배경 프레임
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 px-6 bg-ft-navy text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-ft-red uppercase tracking-[0.2em] mb-3">샘플 미리보기</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black mb-2">플래너 미리보기</h2>
            <p className="text-white/50 text-sm">실제 PDF 플래너 템플릿 일부를 미리 확인하세요</p>
          </div>
          <PlannerPreviewSection />
          <div className="text-center mt-10">
            <Link
              href="/products/common-planner"
              className="inline-flex items-center gap-2 px-8 py-4 font-bold text-white bg-ft-red rounded-xl hover:bg-ft-red-h transition-colors shadow-lg"
            >
              무료로 다운로드 →
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          스토리텔링 — 사주 계산기 소개 (수직 단계)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 px-6 bg-ft-paper-alt">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* 좌측: 설명 */}
            <div>
              <p className="text-xs font-semibold text-ft-red uppercase tracking-[0.2em] mb-3">무료 서비스</p>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-ft-ink mb-6">
                지금 바로<br />사주팔자를 계산해보세요
              </h2>
              <p className="text-ft-muted text-sm leading-loose mb-8">
                생년월일만 입력하면 사주팔자 4기둥, 오행 분포, 용신,
                그리고 <span className="text-ft-ink font-semibold">{PLANNER_YEAR}년 12개월 운세</span>를 무료로 확인하세요.
              </p>
              <Link
                href="/saju"
                className="inline-flex items-center gap-2 px-8 py-4 font-bold text-white bg-ft-red rounded-xl hover:bg-ft-red-h transition-all shadow-lg"
              >
                무료 사주 계산하기
              </Link>
              <p className="text-xs text-ft-muted mt-3">회원가입 없이 즉시 이용 가능</p>
            </div>

            {/* 우측: 기능 카드 4개 (수직 단계) */}
            <div className="flex flex-col gap-0">
              {[
                { num: '一', label: '사주팔자', desc: '4기둥 천간지지' },
                { num: '二', label: '오행분포', desc: '목화토금수 분석' },
                { num: '三', label: '용신', desc: '나를 돕는 기운' },
                { num: '四', label: '월운', desc: `${PLANNER_YEAR} 12개월 운세` },
              ].map(({ num, label, desc }, idx, arr) => (
                <div key={label} className="flex items-stretch gap-4">
                  {/* 수직선 + 한자 번호 */}
                  <div className="flex flex-col items-center">
                    <span className="font-serif text-ft-red font-bold text-lg w-8 text-center">{num}</span>
                    {idx < arr.length - 1 && <div className="flex-1 w-px bg-ft-ink/10 my-1" />}
                  </div>
                  {/* 내용 */}
                  <div className={`flex-1 ${idx < arr.length - 1 ? 'pb-5' : ''}`}>
                    <div className="bg-white border border-ft-border rounded-xl p-4">
                      <div className="font-semibold text-ft-ink text-sm">{label}</div>
                      <div className="text-xs text-ft-muted mt-0.5">{desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          증언 — 서예 인용구 스타일
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 px-6 bg-ft-paper">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-ft-red uppercase tracking-[0.2em] mb-3">베타 테스터 후기</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-ft-ink">사용 후기</h2>
            <p className="text-sm text-ft-muted mt-2">서비스 출시 전 베타 테스터분들의 솔직한 후기입니다</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {REVIEWS.map(({ name, title, product, date, rating, text }) => (
              <div key={name} className="relative">
                {/* 빨강 큰 따옴표 */}
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -left-1 font-serif font-black leading-none select-none text-ft-red"
                  style={{ fontSize: '5rem', lineHeight: 1 }}
                >
                  &ldquo;
                </span>
                <div className="pt-10">
                  {/* 별점 */}
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-ft-red' : 'text-ft-border'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="font-serif text-ft-ink text-base leading-relaxed mb-4">{text}</p>
                  {/* 상품 + 날짜 */}
                  <p className="text-xs text-ft-muted mb-3">{product} · {date} 구매</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-ft-border">
                    <span className="w-8 h-8 rounded-full bg-ft-ink text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {name[0]}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-ft-ink">{name}</span>
                      <span className="text-xs text-ft-muted block">{title}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FAQ
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="py-20 px-6 bg-ft-paper-alt">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-ft-red uppercase tracking-[0.2em] mb-3">자주 묻는 질문</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-ft-ink">FAQ</h2>
          </div>

          <div>
            {FAQS.map(({ q, a }, idx) => (
              <div
                key={q}
                className={`py-7 border-b border-ft-ink/10 ${idx === 0 ? 'border-t border-ft-ink/10' : ''}`}
              >
                <h3 className="font-semibold text-ft-ink mb-3 flex items-start gap-3">
                  <span className="text-ft-red font-serif font-black text-lg leading-none mt-0.5 shrink-0">—</span>
                  <span>{q}</span>
                </h3>
                <p className="text-ft-muted text-sm leading-relaxed pl-7">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          최종 CTA — 네이비 배경 · 빨강 버튼
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-ft-navy text-white relative overflow-hidden">
        {/* 배경 산수화 — 옅게 */}
        <SansuBackground className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center">
          {/* 상단 장식선 */}
          <div className="flex items-center gap-4 mb-10 justify-center">
            <div className="w-12 h-px bg-white/20" />
            <SeasonIcons showLabel={false} size={32} />
            <div className="w-12 h-px bg-white/20" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black mb-4">
            {PLANNER_YEAR}년을 운세와 함께 시작하세요
          </h2>
          <p className="text-white/60 mb-10 leading-loose">
            지금 무료 플래너를 받아보고,<br />내 사주로 맞춤 제작된 플래너를 경험해보세요.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/products/common-planner"
              className="px-8 py-4 font-bold text-white bg-ft-red rounded-xl hover:bg-ft-red-h transition-all shadow-lg"
            >
              무료 플래너 받기
            </Link>
            <Link
              href="/products/saju-planner-premium"
              className="px-8 py-4 font-medium text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all"
            >
              프리미엄 플래너 보기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
