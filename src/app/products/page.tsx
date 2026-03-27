import type { Metadata } from 'next';
import ProductFilterGrid from '@/components/product/ProductFilterGrid';
import { PLANNER_YEAR } from '@/lib/products';

export const metadata: Metadata = {
  title: '플래너 상품 목록',
  description:
    `사주팔자로 맞춤 제작되는 ${PLANNER_YEAR}년 PDF 플래너 상품 목록. 무료 공통 플래너부터 사주 분석 리포트 포함 프리미엄까지. 지금 선택하세요.`,
  keywords: ['사주 플래너', '운세 플래너', 'PDF 플래너', `${PLANNER_YEAR} 다이어리`, '사주팔자 플래너'],
};

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-ft-paper py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-ft-ink">플래너 상품</h1>
          <p className="mt-2 text-ft-muted text-sm">
            나에게 맞는 플래너를 선택하세요. 무료 체험 후 업그레이드하실 수 있습니다.
          </p>
        </div>

        {/* 카테고리 탭 + 상품 그리드 (클라이언트 컴포넌트) */}
        <ProductFilterGrid />

        {/* 비교 안내 */}
        <div className="mt-12 bg-white rounded-2xl p-6 shadow-sm border border-ft-border">
          <h2 className="text-lg font-bold text-ft-ink mb-4">플래너 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ft-border">
                  <th className="text-left py-3 pr-4 font-medium text-ft-muted">항목</th>
                  <th className="py-3 px-4 font-medium text-emerald-600">무료</th>
                  <th className="py-3 px-4 font-medium text-ft-ink-mid">기본</th>
                  <th className="py-3 px-4 font-medium text-amber-600">프리미엄</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ft-border">
                {[
                  { feature: '5종 플래너 템플릿', free: true, basic: true, premium: true },
                  { feature: '사주 기반 맞춤 제작', free: false, basic: true, premium: true },
                  { feature: '연간 운세 흐름 캘린더', free: false, basic: true, premium: true },
                  { feature: '월별 운세 가이드', free: false, basic: true, premium: true },
                  { feature: '개인 사주 심층 리포트 (20p+)', free: false, basic: false, premium: true },
                  { feature: '10년 대운 흐름 분석', free: false, basic: false, premium: true },
                ].map(({ feature, free, basic, premium }) => (
                  <tr key={feature}>
                    <td className="py-3 pr-4 text-ft-body">{feature}</td>
                    <td className="py-3 px-4 text-center">{free ? '✓' : '—'}</td>
                    <td className="py-3 px-4 text-center">{basic ? '✓' : '—'}</td>
                    <td className="py-3 px-4 text-center">{premium ? '✓' : '—'}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-3 pr-4 text-ft-ink">가격</td>
                  <td className="py-3 px-4 text-center text-emerald-600">무료</td>
                  <td className="py-3 px-4 text-center text-ft-ink-mid">₩19,000</td>
                  <td className="py-3 px-4 text-center text-amber-600">₩29,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
