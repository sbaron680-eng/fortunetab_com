import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProductBySlug, formatPrice } from '@/lib/products';
import PlannerProductPreview from '@/components/product/PlannerProductPreview';
import AddToCartButton from './AddToCartButton';

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

  const discountRate =
    product.originalPrice && product.originalPrice > 0
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 브레드크럼 */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-2">
          <a href="/" className="hover:text-indigo-600 transition-colors">홈</a>
          <span>›</span>
          <a href="/products" className="hover:text-indigo-600 transition-colors">플래너 상품</a>
          <span>›</span>
          <span className="text-gray-600">{product.name}</span>
        </nav>

        {/* 메인 컨텐츠: 갤러리 + 구매 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* 갤러리 — 실시간 캔버스 미리보기 */}
          <div>
            <PlannerProductPreview
              year={2026}
              theme={
                slug === 'common-planner'
                  ? 'blue'
                  : slug === 'saju-planner-basic'
                  ? 'rose'
                  : slug === 'saju-planner-premium'
                  ? 'gold'
                  : 'rose'
              }
            />
          </div>

          {/* 구매 영역 */}
          <div className="flex flex-col">
            {/* 배지 */}
            {product.badge && (
              <span
                className={`self-start mb-3 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  product.badgeColor === 'green'
                    ? 'bg-emerald-100 text-emerald-700'
                    : product.badgeColor === 'gold'
                    ? 'bg-amber-100 text-amber-700'
                    : product.badgeColor === 'red'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {product.badge}
              </span>
            )}

            {/* 상품명 */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#1e1b4b] leading-tight">
              {product.name}
            </h1>
            <p className="mt-2 text-gray-500">{product.subtitle}</p>

            {/* 가격 */}
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-black text-[#1e1b4b]">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > 0 && (
                <>
                  <span className="text-base text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  {discountRate && (
                    <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                      {discountRate}% OFF
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 짧은 설명 */}
            <p className="mt-4 text-sm text-gray-600 leading-relaxed border-l-2 border-indigo-200 pl-4">
              {product.shortDescription}
            </p>

            {/* 주요 스펙 요약 */}
            <div className="mt-6 bg-white rounded-xl p-4 border border-gray-100 space-y-2">
              {product.specs.slice(0, 3).map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <span className="w-20 flex-shrink-0 text-gray-400">{label}</span>
                  <span className="text-gray-700 font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* 구매 버튼 */}
            <div className="mt-6">
              <AddToCartButton product={product} />
            </div>

            {/* 배송 안내 */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {product.price === 0
                ? '이메일 주소 입력 후 즉시 다운로드 링크 발송'
                : '결제 완료 후 이메일로 PDF 발송 (3~7 영업일)'}
            </div>
          </div>
        </div>

        {/* 탭 섹션: 상세설명 / 특징 / 스펙 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 상세 설명 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-[#1e1b4b] mb-4">상품 설명</h2>
            <div className="text-gray-700 text-sm leading-8 whitespace-pre-line">
              {product.description}
            </div>

            {/* 특징 */}
            <h2 className="text-lg font-bold text-[#1e1b4b] mt-8 mb-4">주요 특징</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.features.map(({ icon, title, description }) => (
                <div key={title} className="flex gap-3 p-4 rounded-xl bg-indigo-50">
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <div>
                    <p className="font-bold text-[#1e1b4b] text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상품 사양 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-[#1e1b4b] mb-4">상품 사양</h2>
            <div className="space-y-3">
              {product.specs.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-sm font-medium text-gray-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 다른 상품 */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#1e1b4b] mb-6">다른 플래너도 살펴보세요</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.filter((p) => p.id !== product.id).map((p) => (
              <a
                key={p.id}
                href={`/products/${p.slug}`}
                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0">
                  {p.badge === '무료' ? '🎁' : p.badge === 'BEST' ? '🏆' : '⭐'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1e1b4b] truncate group-hover:text-indigo-700 transition-colors">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-400">{formatPrice(p.price)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
