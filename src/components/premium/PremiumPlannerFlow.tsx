'use client';

/**
 * 유료(프리미엄) 플래너 생성 페이지.
 * URL: /premium-planner?order=<ORDER_ID>
 *
 * 대시보드의 OrderCard "즉시 생성" 빠른 경로와 달리, 여기서는 사용자가
 *   연도·테마·방향·플래너 이름·포함 페이지를 자유롭게 조정하여 PDF를 생성할 수 있다.
 * 일간 365p는 유료 권한이 확인된 주문에서 자동 활성화된다.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { fetchMyOrders } from '@/lib/orders';
import { verifyOrderForSaju } from '@/lib/tier-gate';
import {
  generatePlannerPDF,
  type PageType,
  type Orientation,
} from '@/lib/pdf-generator';
import { THEMES } from '@/lib/pdf-themes';
import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';
import { calculateSajuFromBirthData, sajuResultToSajuData } from '@/lib/saju';
import { generatePlannerFortune } from '@/lib/fortune-text';

// ── 타입 ─────────────────────────────────────────────────────────────────────
type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';

interface MyOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  file_url: string | null;
  access_token: string;
  download_opened_at: string | null;
  created_at: string;
  saju_data: Record<string, string> | null;
  items: Array<{ product_id?: string; product_name: string; price: number; qty: number }>;
  report_status?: 'not_applicable' | 'pending' | 'preparing' | 'sent' | 'skipped';
  report_file_url?: string | null;
  report_sent_at?: string | null;
}

function hasSajuPaidItem(items: MyOrder['items']): boolean {
  return items.some((it) => {
    const pid = it.product_id;
    if (pid === 'saju-planner-basic' || pid === 'saju-planner-premium') return true;
    const n = it.product_name ?? '';
    return n.includes('사주 플래너') && (n.includes('기본') || n.includes('프리미엄') || n.toLowerCase().includes('basic') || n.toLowerCase().includes('premium'));
  });
}

// ── 페이지 선택 옵션 ────────────────────────────────────────────────────────
const PAGE_OPTIONS: { type: PageType; label: string; sublabel: string; icon: string }[] = [
  { type: 'cover',      label: '커버',        sublabel: '1 페이지',  icon: '🌙' },
  { type: 'year-index', label: '연간 인덱스',  sublabel: '1 페이지',  icon: '📅' },
  { type: 'monthly',    label: '월간',        sublabel: '12 페이지', icon: '🗓️' },
  { type: 'weekly',     label: '주간',        sublabel: '52 페이지', icon: '📋' },
  { type: 'daily',      label: '일간 스케줄', sublabel: '365 페이지 · 매일 일진·오행 자동', icon: '✏️' },
];

const DEFAULT_PAGES: PageType[] = ['cover', 'year-index', 'monthly', 'weekly', 'daily'];

function getYears(): number[] {
  const now = new Date();
  const cy = now.getFullYear();
  const mo = now.getMonth() + 1;
  return mo >= 11 ? [cy, cy + 1] : [cy];
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PremiumPlannerFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const orderIdParam = params.get('order') ?? '';

  const { user, isAuthReady } = useAuthStore();

  const [loading, setLoading]   = useState(true);
  const [order, setOrder]       = useState<MyOrder | null>(null);
  const [allOrders, setAllOrders] = useState<MyOrder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── 주문 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/premium-planner?order=${orderIdParam}`)}`);
      return;
    }
    (async () => {
      const orders = (await fetchMyOrders()) as MyOrder[];
      setAllOrders(orders);

      const paid = orders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled');
      if (paid.length === 0) {
        setLoadError('결제가 완료된 유료 플래너 주문이 없습니다. 상품을 먼저 구매해 주세요.');
        setLoading(false);
        return;
      }
      const target = orderIdParam
        ? paid.find((o) => o.id === orderIdParam || o.order_number === orderIdParam) ?? paid[0]
        : paid[0];
      setOrder(target ?? null);
      setLoading(false);
    })();
  }, [isAuthReady, user, orderIdParam, router]);

  if (!isAuthReady || loading) return <LoadingView />;

  if (loadError) {
    return (
      <EmptyView
        title="유료 플래너 주문 없음"
        message={loadError}
        cta={{ href: '/products', label: '상품 보러가기 →' }}
      />
    );
  }

  if (!order) {
    return (
      <EmptyView
        title="주문을 찾을 수 없습니다"
        message="요청한 주문번호에 해당하는 유료 플래너 주문이 없습니다."
        cta={{ href: '/dashboard', label: '대시보드로 이동 →' }}
      />
    );
  }

  return <OrderFlow order={order} otherOrders={allOrders.filter((o) => o.id !== order.id)} />;
}

// ── 단일 주문의 생성 플로우 ───────────────────────────────────────────────────
function OrderFlow({ order, otherOrders }: { order: MyOrder; otherOrders: MyOrder[] }) {
  const { user } = useAuthStore();
  const YEARS = getYears();

  // ── 티어 검증 ─────────────────────────────────────────────────────────────
  // 1차: items의 product_id/product_name으로 즉시 판별 (RPC RLS 실패해도 우회)
  // 2차: 서버 verifyOrderForSaju로 백업 검증 (백그라운드)
  const clientTierOk = hasSajuPaidItem(order.items);

  useEffect(() => {
    if (!user?.id) return;
    // 서버 검증은 감사 로그 목적 — 실패해도 client tier 체크를 우선
    verifyOrderForSaju(user.id, order.order_number).catch(() => { /* 무시 */ });
  }, [user?.id, order.order_number]);

  const sajuData = order.saju_data ?? {};
  const defaultName = sajuData.name || user?.name ? `${sajuData.name || user?.name}의 플래너` : '나의 플래너';
  const defaultTheme = sajuData.theme || 'navy';
  const defaultOrientation = (sajuData.orientation as Orientation) || 'portrait';

  const [year, setYear] = useState(YEARS[0]);
  const [name, setName] = useState(defaultName);
  const [theme, setTheme] = useState(defaultTheme);
  const [orientation, setOrientation] = useState<Orientation>(defaultOrientation);
  const [selectedPages, setSelectedPages] = useState<Set<PageType>>(new Set(DEFAULT_PAGES));
  const [advanced, setAdvanced] = useState(false);

  const [isGenerating, setGenerating] = useState(false);
  const [progress, setProgress]       = useState<{ current: number; total: number; label: string } | null>(null);
  const [done, setDone]                = useState(false);
  const [error, setError]              = useState<string | null>(null);

  // 다운로드 경고 모달
  const [showModal, setShowModal] = useState<null | 'planner' | 'report'>(null);
  const [agreed, setAgreed]       = useState(false);

  // 사주 정보 유효성
  const birthDate = sajuData.birthDate || user?.birthDate || '';
  const birthTime = sajuData.birthTime || user?.birthHour || '';
  const canPersonalize = Boolean(birthDate);

  // ── 미리보기용 fortune 계산 ─────────────────────────────────────────────────
  const fortuneData = useMemo(() => {
    if (!birthDate) return undefined;
    try {
      const result = calculateSajuFromBirthData(birthDate, birthTime || '모름');
      return generatePlannerFortune(result, year);
    } catch {
      return undefined;
    }
  }, [birthDate, birthTime, year]);

  // ── 페이지 토글 ─────────────────────────────────────────────────────────────
  const togglePage = useCallback((type: PageType) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setDone(false);
  }, []);

  // ── PDF 생성 ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (selectedPages.size === 0 || !canPersonalize) return;
    setGenerating(true);
    setDone(false);
    setError(null);
    setProgress(null);

    try {
      const sajuResult = calculateSajuFromBirthData(birthDate, birthTime || '모름');
      const savedSaju = sajuResultToSajuData(sajuResult);
      const fortune = generatePlannerFortune(sajuResult, year);

      await generatePlannerPDF({
        orientation,
        year,
        name: name.trim() || '나의 플래너',
        pages: PAGE_OPTIONS.filter((o) => selectedPages.has(o.type)).map((o) => o.type),
        theme,
        mode: 'fortune',
        saju: savedSaju,
        dailyFull: true, // 유료 권한 확인됨 — 항상 365p
        fortuneData: fortune,
        onProgress: (current, total, label) => setProgress({ current, total, label }),
      });
      setDone(true);
    } catch (e) {
      console.error('[premium-planner] 생성 실패:', e);
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Canvas') || msg.includes('memory')) {
        setError('메모리 부족 — 선택한 페이지 수를 줄이거나 브라우저를 새로고침해 주세요.');
      } else if (msg.includes('font')) {
        setError('폰트 로딩 실패 — 새로고침 후 다시 시도해 주세요.');
      } else {
        setError('PDF 생성 중 오류가 발생했습니다. 옵션을 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [birthDate, birthTime, orientation, year, name, selectedPages, theme, canPersonalize]);

  const estimatedPages = [...selectedPages].reduce((acc, t) => {
    if (t === 'monthly') return acc + 12;
    if (t === 'weekly')  return acc + 52;
    if (t === 'daily')   return acc + 365;
    return acc + 1;
  }, 0);

  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  // 티어 검증 실패 — 무료 플래너로 안내
  if (!clientTierOk) {
    return (
      <EmptyView
        title="유료 사주 플래너 주문이 아닙니다"
        message="이 주문은 사주 맞춤 플래너(basic/premium) 상품이 아닙니다. 무료 플래너는 /free-planner에서 바로 생성할 수 있습니다."
        cta={{ href: '/free-planner', label: '무료 플래너로 이동 →' }}
      />
    );
  }

  // 경고 모달 확인 후 실제 다운로드 트리거
  const triggerDownload = () => {
    if (!agreed || !showModal) return;
    if (showModal === 'planner') {
      setShowModal(null);
      setAgreed(false);
      handleGenerate();
    } else if (showModal === 'report' && order.report_file_url) {
      window.open(order.report_file_url, '_blank');
      setShowModal(null);
      setAgreed(false);
    }
  };

  return (
    <main className="min-h-screen bg-ft-paper pb-16 animate-fade-in">
      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <div className="bg-ft-ink px-4 pt-16 pb-12 mb-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ft-gold/10 border border-ft-gold/30 text-ft-gold text-sm font-medium mb-4">
            🔮 프리미엄 플래너 — 맞춤 PDF 생성
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {order.items[0]?.product_name ?? '사주 맞춤 플래너'}
          </h1>
          <p className="text-indigo-300 text-sm">
            주문번호 <span className="font-mono text-white">{order.order_number}</span>
            <span className="mx-2 opacity-50">·</span>
            {new Date(order.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">

        {/* ── 주문 상태 배너 ──────────────────────────────────────────────────── */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div className="flex-1 text-sm text-emerald-800">
            <b>유료 권한 확인됨</b> — 일간 365일 풀 버전·사주 기반 자동 운세가 포함됩니다.
          </div>
        </section>

        {/* ── 사주 정보 카드 ──────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-red rounded-full inline-block" />
            사주 정보
          </h2>
          {canPersonalize ? (
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-ft-muted">이름</dt>
                <dd className="text-ft-ink font-medium">{sajuData.name || user?.name || '(미지정)'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ft-muted">생년월일</dt>
                <dd className="text-ft-ink font-medium font-mono">{birthDate}</dd>
              </div>
              {birthTime && (
                <div className="flex justify-between">
                  <dt className="text-ft-muted">출생 시각</dt>
                  <dd className="text-ft-ink font-medium font-mono">{birthTime}</dd>
                </div>
              )}
              {sajuData.gender && (
                <div className="flex justify-between">
                  <dt className="text-ft-muted">성별</dt>
                  <dd className="text-ft-ink font-medium">{sajuData.gender}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              이 주문에 연결된 사주 정보가 없습니다.
              <Link href="/settings" className="underline ml-1 font-medium">프로필 설정</Link>에서 생년월일을 입력해 주세요.
            </div>
          )}
        </section>

        {/* ── 관리자 프리미엄 리포트 (발송된 경우만) ────────────────────────── */}
        {order.report_status === 'sent' && order.report_file_url && (
          <section className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-5">
            <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              📖 심층 리포트
            </h2>
            <p className="text-sm text-ft-body mb-3">관리자가 발송한 맞춤 사주 심층 리포트가 준비되었습니다.</p>
            <button
              onClick={() => { setAgreed(false); setShowModal('report'); }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors"
            >
              📖 심층 리포트 PDF 다운로드
            </button>
          </section>
        )}

        {/* ── 연도 선택 ──────────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            연도
          </h2>
          <div className={`grid gap-3 ${YEARS.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => { setYear(y); setDone(false); }}
                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  year === y ? 'bg-ft-ink text-white border-ft-ink' : 'bg-white border-ft-border text-ft-body hover:bg-ft-paper-alt'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
        </section>

        {/* ── 플래너 이름 ────────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            플래너 이름
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setDone(false); }}
            maxLength={30}
            placeholder="예: 나의 2026 플래너"
            className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-4 py-3 text-ft-body text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink"
          />
        </section>

        {/* ── 고급 옵션 토글 ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-white border border-ft-border rounded-2xl px-5 py-3">
          <span className="text-sm text-ft-ink font-medium">
            {advanced ? '커스텀 옵션 표시 중' : '기본 설정으로 빠르게 생성'}
          </span>
          <button
            onClick={() => setAdvanced((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-ft-border text-ft-muted hover:text-ft-ink hover:border-ft-ink transition-colors"
          >
            {advanced ? '간소화' : '테마 · 방향 변경 →'}
          </button>
        </div>

        {/* ── 테마 (advanced) ─────────────────────────────────────────────── */}
        {advanced && (
          <section className="bg-white border border-ft-border rounded-2xl p-6">
            <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
              컬러 테마
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setDone(false); }}
                  title={t.name}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    theme === t.id ? 'border-ft-ink bg-ft-paper-alt' : 'border-ft-border bg-white hover:bg-ft-paper-alt'
                  }`}
                >
                  <span className="w-8 h-8 rounded-full border-2 border-ft-border shadow-md" style={{ backgroundColor: t.swatch }} />
                  <span className={`text-xs font-medium ${theme === t.id ? 'text-ft-ink' : 'text-ft-muted'}`}>{t.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── 용지 방향 (advanced) ────────────────────────────────────────── */}
        {advanced && (
          <section className="bg-white border border-ft-border rounded-2xl p-6">
            <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
              용지 방향
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(['portrait', 'landscape'] as Orientation[]).map((ori) => (
                <button
                  key={ori}
                  onClick={() => { setOrientation(ori); setDone(false); }}
                  className={`py-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                    orientation === ori ? 'bg-ft-ink text-white border-ft-ink' : 'bg-white border-ft-border text-ft-body hover:bg-ft-paper-alt'
                  }`}
                >
                  {ori === 'portrait' ? '세로 (A4)' : '가로 (A4)'}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── 템플릿 선택 ────────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            포함할 템플릿
          </h2>
          <div className="space-y-2">
            {PAGE_OPTIONS.map(({ type, label, sublabel, icon }) => {
              const checked = selectedPages.has(type);
              return (
                <label
                  key={type}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked ? 'border-ft-ink bg-ft-paper-alt' : 'border-ft-border bg-white hover:bg-ft-paper-alt'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePage(type)} />
                  <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 ${
                    checked ? 'bg-ft-ink border-ft-ink' : 'border-ft-border bg-transparent'
                  }`}>
                    {checked && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <span className="text-lg leading-none">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-ft-body">{label}</span>
                    <span className="ml-2 text-xs text-ft-muted">{sublabel}</span>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedPages.size > 0 && (
            <div className="mt-3 text-right text-xs text-ft-muted">
              예상 페이지 수: <span className="text-ft-ink font-medium">{estimatedPages}p</span>
            </div>
          )}
        </section>

        {/* ── 미리보기 ───────────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            실시간 미리보기
          </h2>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {[
                { type: 'cover'      as PageType, label: '커버',   idx: 0 },
                { type: 'year-index' as PageType, label: '연간',   idx: 0 },
                { type: 'monthly'    as PageType, label: '월간',   idx: 0 },
                { type: 'weekly'     as PageType, label: '주간',   idx: 1 },
                { type: 'daily'      as PageType, label: '일간',   idx: 0 },
              ].map(({ type, label, idx }) => (
                <div key={type} className="flex flex-col items-center gap-2">
                  <PlannerPreviewCanvas
                    pageType={type}
                    pageIdx={idx}
                    opts={{ orientation, year, name: name.trim() || '나의 플래너', theme, mode: 'fortune', fortuneData }}
                    displayWidth={140}
                  />
                  <span className="text-xs text-ft-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 에러 / 완료 / 진행 ─────────────────────────────────────────────── */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
        {done && !isGenerating && (
          <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
            <span>✅</span> PDF 생성 완료! 다운로드가 시작되었습니다.
          </div>
        )}
        {isGenerating && progress && (
          <div className="px-4 py-3 bg-ft-paper-alt border border-ft-border rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-ft-muted">
              <span className="truncate">{progress.label}</span>
              <span className="flex-shrink-0 ml-2">{progressPct}%</span>
            </div>
            <div className="w-full bg-ft-border rounded-full h-1.5 overflow-hidden">
              <div className="bg-ft-gold h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-xs text-ft-muted text-right">{progress.current} / {progress.total} 페이지</div>
          </div>
        )}

        {/* ── 생성 버튼 ──────────────────────────────────────────────────────── */}
        <button
          onClick={() => { setAgreed(false); setShowModal('planner'); }}
          disabled={isGenerating || selectedPages.size === 0 || !canPersonalize}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all ${
            isGenerating || selectedPages.size === 0 || !canPersonalize
              ? 'bg-ft-border text-ft-muted cursor-not-allowed'
              : 'bg-ft-gold text-ft-ink hover:bg-ft-gold-h active:scale-[0.98] shadow-lg shadow-ft-gold/20'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              PDF 생성 중…
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              맞춤 플래너 PDF 생성 · 즉시 다운로드
            </>
          )}
        </button>
        <p className="text-center text-xs text-ft-muted leading-relaxed">
          🔒 모든 처리는 내 브라우저에서만 이루어집니다. 주간(52p) 포함 시 10~30초 소요될 수 있습니다.
        </p>

        {/* ── 다른 주문 ──────────────────────────────────────────────────────── */}
        {otherOrders.length > 0 && (
          <section className="bg-white border border-ft-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-ft-ink mb-3">다른 주문 ({otherOrders.length})</h3>
            <ul className="space-y-2">
              {otherOrders.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/premium-planner?order=${o.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-ft-border hover:border-ft-ink transition-colors text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-ft-muted">{o.order_number}</div>
                      <div className="text-ft-ink truncate">{o.items[0]?.product_name ?? '플래너'}</div>
                    </div>
                    <span className="text-ft-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/dashboard" className="block mt-3 text-center text-xs text-ft-ink underline">
              전체 주문 내역 보기 →
            </Link>
          </section>
        )}

      </div>

      {/* ── 다운로드 경고 모달 ───────────────────────────────────────────────── */}
      {/* 상위 main/section들의 transform/animate가 fixed containing block을 만들 수 있어 Portal 사용 */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-[100] p-4 overflow-y-auto" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl my-8 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ft-ink mb-3 flex items-center gap-2">⚠️ 다운로드 전 안내</h3>
            <ul className="space-y-2.5 text-sm text-ft-body leading-relaxed mb-4">
              <li className="flex gap-2">
                <span className="text-red-600 font-bold flex-shrink-0">·</span>
                <span>다운로드 후에는 <b className="text-ft-ink">환불·취소가 불가</b>합니다 (디지털 상품 특성상).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 font-bold flex-shrink-0">·</span>
                <span>파일 내용에 문제가 있거나 맞춤 정보가 잘못된 경우, 다운로드하지 마시고 <a className="underline text-ft-ink" href="mailto:sbaron680@gmail.com">sbaron680@gmail.com</a>으로 먼저 문의해 주세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 font-bold flex-shrink-0">·</span>
                <span>본 PDF는 개인 사용 목적으로만 이용 가능하며, 재배포·상업적 이용을 금합니다.</span>
              </li>
              {showModal === 'report' && (
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold flex-shrink-0">·</span>
                  <span>사주 분석은 <b>참고 용도</b>이며 전문 상담을 대체하지 않습니다.</span>
                </li>
              )}
            </ul>
            <label className="flex items-start gap-2 cursor-pointer mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-ft-ink" />
              <span className="text-xs text-ft-ink leading-relaxed">위 내용을 확인했으며, 환불·취소가 불가함에 동의합니다.</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(null)} className="flex-1 py-2.5 bg-white border border-ft-border rounded-xl text-sm text-ft-body hover:bg-gray-50">
                취소
              </button>
              <button
                disabled={!agreed}
                onClick={triggerDownload}
                className="flex-1 py-2.5 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h disabled:opacity-40 disabled:cursor-not-allowed"
              >
                동의하고 다운로드
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

// ── 상태별 뷰 컴포넌트 ───────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-ft-ink" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

function EmptyView({ title, message, cta }: { title: string; message: string; cta: { href: string; label: string } }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center px-4">
      <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📭</div>
        <h2 className="text-xl font-bold font-serif text-ft-ink mb-2">{title}</h2>
        <p className="text-sm text-ft-muted mb-6">{message}</p>
        <Link href={cta.href} className="inline-block px-6 py-3 bg-ft-ink text-white rounded-xl text-sm font-medium hover:bg-ft-ink-mid">
          {cta.label}
        </Link>
      </div>
    </div>
  );
}
