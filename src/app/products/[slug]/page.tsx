import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProductBySlug, formatPrice, PLANNER_YEAR } from '@/lib/products';
import PlannerProductPreview from '@/components/product/PlannerProductPreview';
import ProductComparisonTable from '@/components/product/ProductComparisonTable';
import AddToCartButton from './AddToCartButton';
import ProductPrice from './ProductPrice';
import type { SajuData } from '@/lib/pdf-utils';

// 사주 상품 프리뷰 — 실제 고객 사주 자리를 보여주는 샘플 데이터
const SAMPLE_SAJU: SajuData = {
  ganzhi: '丙午',
  dayElem: '丙火',
  yongsin: '水',
  yearPillar: '丙午',
  monthPillar: '甲辰',
  dayPillar: '戊寅',
  hourPillar: '壬子',
  elemSummary: '화2 목1 토1 수1 금0',
};

// 정적 사이트 내보내기: 빌드 시 모든 slug를 사전 렌더링
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: '상품을 찾을 수 없습니다' };

  return {
    title: product.seo.title,
    description: product.seo.description,
    keywords: product.seo.keywords,
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      images: [{ url: product.thumbnailImage, alt: product.name }],
      type: 'website',
      locale: 'ko_KR',
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-ft-paper py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 브레드크럼 */}
        <nav className="text-xs text-ft-muted mb-6 flex items-center gap-2">
          <a href="/" className="hover:text-ft-ink-mid transition-colors">홈</a>
          <span>›</span>
          <a href="/products" className="hover:text-ft-ink-mid transition-colors">플래너 상품</a>
          <span>›</span>
          <span className="text-ft-body">{product.name}</span>
        </nav>

        {/* 메인 컨텐츠: 갤러리 + 구매 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* 갤러리 — 실시간 캔버스 미리보기 (상품별 특성 반영) */}
          <div>
            <PlannerProductPreview
              year={PLANNER_YEAR}
              theme={product.previewTheme ?? 'rose'}
              coverStyle={product.coverStyle}
              saju={product.slug.startsWith('saju-') ? SAMPLE_SAJU : undefined}
              pages={product.previewPages}
              mode={product.coverStyle === 'practice' ? 'practice' : 'fortune'}
            />
          </div>

          {/* 구매 영역 */}
          <div className="flex flex-col">
            {/* 배지 */}
            {product.badge && (
              <span
                className={`self-start mb-3 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  product.badgeColor === 'green'
                    ? 'bg-ft-ink text-white'
                    : product.badgeColor === 'gold'
                    ? 'bg-ft-gold text-ft-ink'
                    : product.badgeColor === 'red'
                    ? 'bg-ft-ink text-white'
                    : 'bg-ft-ink text-white'
                }`}
              >
                {product.badge}
              </span>
            )}

            {/* 상품명 */}
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-ft-ink leading-tight">
              {product.name}
            </h1>
            <p className="mt-2 text-ft-body">{product.subtitle}</p>

            {/* 가격 (DB 프로모션 동적 적용) */}
            <ProductPrice slug={product.slug} basePrice={product.price} />

            {/* 짧은 설명 */}
            <p className="mt-4 text-sm text-ft-body leading-relaxed border-l-2 border-ft-border pl-4">
              {product.shortDescription}
            </p>

            {/* 차별점 배지 — 이 상품이 다른 상품과 구별되는 핵심 3~4개 */}
            <div className="mt-5">
              <p className="text-[11px] font-bold text-ft-muted tracking-wider uppercase mb-2">
                이 상품만의 가치
              </p>
              <ul className="space-y-1.5">
                {product.differentiators.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-ft-ink">
                    <span className="text-ft-gold font-bold mt-[2px] flex-shrink-0">◆</span>
                    <span className="leading-snug">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 주요 스펙 요약 */}
            <div className="mt-6 bg-white rounded-xl p-6 border border-ft-border space-y-2">
              {product.specs.slice(0, 3).map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <span className="w-20 flex-shrink-0 text-ft-muted">{label}</span>
                  <span className="text-ft-body font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* 구매 버튼 */}
            <div className="mt-6">
              <AddToCartButton product={product} />
            </div>

            {/* 배송 안내 */}
            <div className="mt-4 flex items-center gap-2 text-xs text-ft-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {product.price === 0
                ? '브라우저에서 즉시 PDF 생성 — 이메일 불필요'
                : '결제 완료 후 이메일로 PDF 자동 발송 (평균 5분 이내)'}
            </div>
            {product.price > 0 && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                * PDF 파일은 발송일로부터 30일간 보관됩니다. 수신 후 즉시 다운로드해 주세요.
              </p>
            )}
          </div>
        </div>

        {/* 포함 페이지 체크리스트 — 이 상품에 정확히 무엇이 들어가는지 */}
        <section className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-ft-border">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-bold text-ft-ink">이 상품에 포함된 것</h2>
            <span className="text-xs text-ft-muted">
              {product.includedPages.length}종 · {product.includedPages.filter((p) => p.highlight).length}개 고유 페이지
            </span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {product.includedPages.map((page) => (
              <li
                key={page.label}
                className={`flex items-start gap-3 rounded-xl p-4 border ${
                  page.highlight
                    ? 'border-ft-gold bg-amber-50/50'
                    : 'border-ft-border bg-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">{page.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className={`text-sm font-bold truncate ${page.highlight ? 'text-ft-ink' : 'text-ft-body'}`}>
                      {page.label}
                    </p>
                    <span className="text-xs text-ft-muted flex-shrink-0">{page.count}</span>
                  </div>
                  {page.note && (
                    <p className="text-xs text-ft-muted mt-0.5 leading-snug">{page.note}</p>
                  )}
                </div>
                {page.highlight && (
                  <span className="text-[10px] font-bold text-ft-gold flex-shrink-0 mt-1">
                    고유
                  </span>
                )}
              </li>
            ))}
          </ul>

          {product.notIncluded && product.notIncluded.length > 0 && (
            <div className="mt-5 pt-5 border-t border-ft-border">
              <p className="text-[11px] font-bold text-ft-muted tracking-wider uppercase mb-2">
                이 상품에 없는 것
              </p>
              <div className="flex flex-wrap gap-2">
                {product.notIncluded.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 text-xs text-ft-muted bg-ft-paper-alt px-2.5 py-1 rounded-full border border-ft-border"
                  >
                    <span className="text-ft-muted">×</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 상품 비교표 */}
        <section className="mb-8">
          <ProductComparisonTable currentSlug={product.slug} />
        </section>

        {/* 탭 섹션: 상세설명 / 특징 / 스펙 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 상세 설명 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-ft-border">
            <h2 className="text-lg font-bold text-ft-ink mb-4">상품 설명</h2>
            <div className="text-ft-body text-sm leading-8 whitespace-pre-line">
              {product.description}
            </div>

            {/* AI 사주 분석 고지 — 사주 관련 상품에만 표시 */}
            {product.slug.includes('saju') && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-lg flex-shrink-0">🤖</span>
                <div>
                  <p className="text-sm font-medium text-blue-900">AI 기반 사주 분석</p>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    본 서비스의 사주 분석은 AI(인공지능)를 통해 제공됩니다.
                    AI 분석은 참고 용도이며 전문 상담을 대체하지 않습니다.
                  </p>
                </div>
              </div>
            )}

            {/* 특징 */}
            <h2 className="text-lg font-bold text-ft-ink mt-8 mb-4">주요 특징</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.features.map(({ icon, title, description }) => (
                <div key={title} className="flex gap-3 p-6 rounded-xl bg-white border border-ft-border hover-lift">
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <div>
                    <p className="font-bold text-ft-ink text-sm">{title}</p>
                    <p className="text-xs text-ft-body mt-1 leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상품 사양 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-ft-border h-fit">
            <h2 className="text-lg font-bold text-ft-ink mb-4">상품 사양</h2>
            <div className="space-y-3">
              {product.specs.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-ft-muted">{label}</span>
                  <span className="text-sm font-medium text-ft-body">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 다른 상품 */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-ft-ink mb-6">다른 플래너도 살펴보세요</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.filter((p) => p.id !== product.id)
              .sort((a, b) => {
                // 현재 상품보다 비싼 상품(업그레이드)을 먼저 추천
                const aUp = a.price > product.price ? -1 : 1;
                const bUp = b.price > product.price ? -1 : 1;
                return aUp - bUp;
              })
              .slice(0, 4)
              .map((p) => (
              <a
                key={p.id}
                href={`/products/${p.slug}`}
                className="flex items-center gap-4 bg-white p-6 rounded-xl border border-ft-border hover:shadow-md transition-shadow group hover-lift"
              >
                <div className="w-12 h-12 rounded-lg bg-ft-paper-alt flex items-center justify-center text-xl flex-shrink-0">
                  {p.badge === '무료' ? '🎁' : p.badge === 'BEST' ? '🏆' : '⭐'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ft-ink truncate group-hover:text-ft-ink-mid transition-colors">
                    {p.name}
                  </p>
                  <p className="text-xs text-ft-muted">{formatPrice(p.price)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
