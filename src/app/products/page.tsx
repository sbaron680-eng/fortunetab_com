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
        {/* ── 사주 플래너 비교표 ────────────────────────────────── */}
        <div className="mt-12 bg-white rounded-2xl p-6 shadow-sm border border-ft-border">
          <h2 className="text-lg font-bold text-ft-ink mb-1">사주 플래너 비교</h2>
          <p className="text-xs text-ft-muted mb-4">무료 체험 → 기본 → 프리미엄 순서로 업그레이드할 수 있습니다</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ft-border">
                  <th className="text-left py-3 pr-4 font-medium text-ft-muted">항목</th>
                  <th className="py-3 px-3 font-medium text-emerald-600 text-center">무료 공통</th>
                  <th className="py-3 px-3 font-medium text-ft-ink text-center">사주 기본<br /><span className="text-xs font-normal">₩19,000</span></th>
                  <th className="py-3 px-3 font-medium text-amber-600 text-center">사주 + 리포트<br /><span className="text-xs font-normal">₩29,000</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ft-border">
                {[
                  { f: '커버·연간·월간·주간·일간 (약 67p)', v: [true, true, true] },
                  { f: '7가지 컬러 테마', v: [true, true, true] },
                  { f: '세로/가로 선택', v: [true, true, true] },
                  { f: '사주 기반 맞춤 제작', v: [false, true, true] },
                  { f: '월별 운세 가이드 노트', v: [false, true, true] },
                  { f: '부록 28종 포함', v: [false, true, true] },
                  { f: '사주 심층 리포트 (20p)', v: [false, false, true] },
                  { f: '10년 대운 흐름 분석', v: [false, false, true] },
                  { f: '이메일 PDF 자동 발송', v: [false, true, true] },
                ].map(({ f, v }) => (
                  <tr key={f}>
                    <td className="py-2.5 pr-4 text-ft-body">{f}</td>
                    {v.map((ok, i) => (
                      <td key={i} className="py-2.5 px-3 text-center">
                        {ok ? <span className="text-emerald-500">✓</span> : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 부록 플래너 비교표 ────────────────────────────────── */}
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-ft-border">
          <h2 className="text-lg font-bold text-ft-ink mb-1">부록 · 실천 플래너 비교</h2>
          <p className="text-xs text-ft-muted mb-4">기본 플래너에 추가할 수 있는 부록 페이지 세트</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ft-border">
                  <th className="text-left py-3 pr-4 font-medium text-ft-muted">항목</th>
                  <th className="py-3 px-3 font-medium text-emerald-600 text-center">실천 플래너<br /><span className="text-xs font-normal">무료</span></th>
                  <th className="py-3 px-3 font-medium text-blue-600 text-center">부록 맛보기<br /><span className="text-xs font-normal">무료</span></th>
                  <th className="py-3 px-3 font-medium text-amber-600 text-center">올인원<br /><span className="text-xs font-normal">₩4,900</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ft-border">
                {[
                  { f: '커버·연간·월간·주간·일간', v: [true, false, false] },
                  { f: 'OKR 목표 + 월간 리뷰', v: [true, false, false] },
                  { f: '일일 MIT + 습관 체크', v: [true, false, false] },
                  { f: '부록 28종 선택 가능', v: [false, true, true] },
                  { f: '무료 선택 가능 수', v: ['—', '7종', '28종 전체'] },
                  { f: '12개월 반복 페이지', v: [false, false, true] },
                  { f: '7가지 테마 + 가로/세로', v: [true, '3테마·세로만', true] },
                ].map(({ f, v }) => (
                  <tr key={f}>
                    <td className="py-2.5 pr-4 text-ft-body">{f}</td>
                    {v.map((val, i) => (
                      <td key={i} className="py-2.5 px-3 text-center text-xs">
                        {val === true ? <span className="text-emerald-500">✓</span>
                          : val === false ? <span className="text-gray-300">—</span>
                          : <span className="text-ft-body">{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
