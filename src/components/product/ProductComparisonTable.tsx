/**
 * ProductComparisonTable
 * 6개 플래너 상품을 가로 매트릭스로 비교. 현재 보고 있는 상품은 강조.
 */

import { PRODUCTS, formatPrice } from '@/lib/products';
import type { Product, CompareRow } from '@/types';

interface Row {
  key: keyof CompareRow;
  label: string;
  render: (v: CompareRow[keyof CompareRow]) => React.ReactNode;
}

const yesNo = (v: unknown) =>
  v === true ? (
    <span className="text-emerald-600 font-bold">●</span>
  ) : (
    <span className="text-ft-muted">–</span>
  );

const ROWS: Row[] = [
  {
    key: 'core4',
    label: '메인 4종 (커버·연간·월간·주간)',
    render: (v) =>
      v === '포함' ? (
        <span className="text-emerald-600 font-bold">●</span>
      ) : v === '일부' ? (
        <span className="text-amber-600 text-xs">일부</span>
      ) : (
        <span className="text-ft-muted">–</span>
      ),
  },
  {
    key: 'dailyCount',
    label: '일간 스케줄',
    render: (v) =>
      v === '365p' ? (
        <span className="text-emerald-700 font-bold text-sm">365p</span>
      ) : v === '샘플 1p' ? (
        <span className="text-ft-muted text-xs">샘플 1p</span>
      ) : (
        <span className="text-ft-muted">–</span>
      ),
  },
  { key: 'sajuCustom',  label: '사주 맞춤 분석',       render: yesNo },
  { key: 'sajuReport',  label: '사주 리포트 20p+',    render: yesNo },
  { key: 'practiceKit', label: 'OKR·MIT·습관 트래커',  render: yesNo },
  {
    key: 'extrasCount',
    label: '부록 페이지',
    render: (v) =>
      v === 0 ? (
        <span className="text-ft-muted">–</span>
      ) : (
        <span className="text-ft-ink font-bold text-sm">{v as number}종</span>
      ),
  },
  { key: 'repeat',      label: '12개월·52주 반복',   render: yesNo },
  {
    key: 'delivery',
    label: '배송 방식',
    render: (v) => (
      <span className="text-xs text-ft-body">{v === '즉시' ? '즉시' : '이메일'}</span>
    ),
  },
];

export default function ProductComparisonTable({ currentSlug }: { currentSlug: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ft-border shadow-sm overflow-hidden">
      <div className="p-6 pb-3 border-b border-ft-border">
        <h2 className="text-lg font-bold text-ft-ink">다른 플래너와 비교</h2>
        <p className="text-xs text-ft-muted mt-1">
          현재 보고 있는 상품은 강조됩니다. 업그레이드 경로를 한눈에 확인하세요.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-ft-paper-alt">
            <tr>
              <th className="sticky left-0 bg-ft-paper-alt px-4 py-3 text-xs font-semibold text-ft-muted w-48">
                항목
              </th>
              {PRODUCTS.map((p) => (
                <th
                  key={p.id}
                  className={`px-3 py-3 text-center align-top min-w-[128px] ${
                    p.slug === currentSlug ? 'bg-amber-50' : ''
                  }`}
                >
                  <a
                    href={`/products/${p.slug}`}
                    className="block group"
                  >
                    <p
                      className={`text-xs font-bold leading-tight mb-1 group-hover:text-ft-ink-mid transition-colors ${
                        p.slug === currentSlug ? 'text-ft-ink' : 'text-ft-body'
                      }`}
                    >
                      {p.name}
                    </p>
                    <p
                      className={`text-xs ${
                        p.price === 0
                          ? 'text-emerald-700'
                          : p.slug === currentSlug
                          ? 'text-ft-gold font-bold'
                          : 'text-ft-muted'
                      }`}
                    >
                      {formatPrice(p.price)}
                    </p>
                    {p.slug === currentSlug && (
                      <span className="inline-block mt-1 text-[10px] text-ft-gold font-bold">
                        현재 상품
                      </span>
                    )}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.key}
                className={i % 2 === 0 ? 'bg-white' : 'bg-ft-paper'}
              >
                <td className="sticky left-0 bg-inherit px-4 py-3 text-xs text-ft-body font-medium">
                  {row.label}
                </td>
                {PRODUCTS.map((p: Product) => (
                  <td
                    key={p.id}
                    className={`px-3 py-3 text-center ${
                      p.slug === currentSlug ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    {row.render(p.compareRow[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
