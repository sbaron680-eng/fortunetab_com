'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { fetchMyOrders } from '@/lib/orders';
import { supabase, type FtSessionRow } from '@/lib/supabase';
import type { GenerateResult } from '@/lib/stores/session';
// FT-1 "오늘의 음악" — Supabase Edge Function으로 이전 예정 (정적 export 충돌 임시 보류)
// import { DailyMusicCard } from '@/components/dashboard/DailyMusicCard';

// ── 타입 ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
type DashTab = 'orders' | 'fortune' | 'sessions';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    '대기중',
  paid:       '결제완료',
  processing: '제작중',
  completed:  '발송완료',
  cancelled:  '취소됨',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:       'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
};

const PHASE_COLORS: Record<string, string> = {
  '상승기': 'text-emerald-600',
  '안정기': 'text-blue-600',
  '전환기': 'text-amber-600',
  '하강기': 'text-red-600',
};

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
  items: Array<{ product_name: string; price: number; qty: number }>;
  // 프리미엄 사주 심층 리포트 발송 상태 (Option C 수동 발송 파이프라인)
  report_status?: 'not_applicable' | 'pending' | 'preparing' | 'sent' | 'skipped';
  report_file_url?: string | null;
  report_sent_at?: string | null;
}

interface FortuneRecord {
  id: string;
  type: 'saju' | 'astrology' | 'couple';
  order_id: string;
  used_at: string | null;
  created_at: string;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthReady, logout } = useAuthStore();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [sessions, setSessions] = useState<FtSessionRow[]>([]);
  const [fortuneRecords, setFortuneRecords] = useState<FortuneRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<DashTab>('orders');

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) { router.replace('/auth/login'); return; }

    async function loadAll() {
      const [ordersData, sessionsRes, fortuneRes] = await Promise.all([
        fetchMyOrders(),
        supabase
          .from('ft_sessions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('fortune_purchases')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setOrders(ordersData as MyOrder[]);
      setSessions((sessionsRes.data as FtSessionRow[]) ?? []);
      setFortuneRecords((fortuneRes.data as FortuneRecord[]) ?? []);
      setFetching(false);
    }

    loadAll();
  }, [user, isAuthReady, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 탭별 뱃지 카운트
  const counts = {
    orders: orders.length,
    fortune: fortuneRecords.length,
    sessions: sessions.length,
  };

  if (!isAuthReady || fetching) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white border border-ft-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-5 w-28" />
                <div className="skeleton h-4 w-40" />
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="bg-white border border-ft-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-ft-border"><div className="skeleton h-5 w-24" /></div>
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-10 px-4 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* 프로필 헤더 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-ft-muted mb-1">로그인 계정</p>
            <p className="font-bold text-ft-ink">{user?.name}</p>
            <p className="text-sm text-ft-muted">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Link
              href="/settings"
              className="text-xs px-3 py-1.5 bg-ft-paper-alt border border-ft-border text-ft-body rounded-lg hover:bg-ft-border transition-colors"
            >
              프로필 설정
            </Link>
            {user?.isAdmin && (
              <Link
                href="/admin"
                className="text-xs px-3 py-1.5 bg-ft-ink text-white rounded-lg hover:bg-ft-ink-mid transition-colors"
              >
                관리자 →
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 border border-ft-border text-ft-muted rounded-lg hover:bg-gray-50 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* FT-1: 오늘의 음악 — Supabase Edge Function 이전 후 복구 예정 */}
        {/* <DailyMusicCard /> */}

        {/* 빠른 액션 */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/fortune" className="bg-white border border-ft-border rounded-xl p-4 text-center hover-lift transition-all">
            <div className="text-2xl mb-1">🔮</div>
            <p className="text-xs font-medium text-ft-ink">운세 분석</p>
          </Link>
          <Link href="/session" className="bg-white border border-ft-border rounded-xl p-4 text-center hover-lift transition-all">
            <div className="text-2xl mb-1">🌱</div>
            <p className="text-xs font-medium text-ft-ink">명발굴 세션</p>
          </Link>
          <Link href="/download" className="bg-white border border-ft-border rounded-xl p-4 text-center hover-lift transition-all">
            <div className="text-2xl mb-1">📋</div>
            <p className="text-xs font-medium text-ft-ink">플래너 생성</p>
          </Link>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-ft-border bg-white rounded-t-2xl overflow-hidden">
          {([
            { key: 'orders' as DashTab, label: '주문 내역', icon: '🛒' },
            { key: 'fortune' as DashTab, label: '운세 분석', icon: '🔮' },
            { key: 'sessions' as DashTab, label: '발굴 세션', icon: '🌱' },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                tab === key
                  ? 'text-ft-ink border-b-2 border-ft-ink bg-white'
                  : 'text-ft-muted hover:text-ft-ink hover:bg-gray-50'
              }`}
            >
              {icon} {label}
              {counts[key] > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-ft-ink text-white rounded-full">
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="bg-white border border-ft-border rounded-b-2xl rounded-t-none overflow-hidden -mt-6">
          {tab === 'orders' && <OrdersTab orders={orders} />}
          {tab === 'fortune' && <FortuneTab records={fortuneRecords} />}
          {tab === 'sessions' && <SessionsTab sessions={sessions} />}
        </div>

        {/* 고객센터 */}
        <p className="text-center text-xs text-ft-muted">
          문의사항:{' '}
          <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">sbaron680@gmail.com</a>
          &nbsp;·&nbsp; 평일 10:00 – 18:00
        </p>

      </div>
    </div>
  );
}

// ── 주문 내역 탭 ─────────────────────────────────────────────────────────────

function OrdersTab({ orders }: { orders: MyOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-bold text-ft-ink mb-2">아직 주문 내역이 없습니다</h3>
        <p className="text-sm text-ft-muted mb-6 max-w-xs mx-auto">
          사주 기반 맞춤 플래너로 나만의 한 해를 설계해 보세요.
        </p>
        <Link
          href="/products"
          className="inline-block px-6 py-3 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors btn-press"
        >
          플래너 둘러보기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-ft-border">
      {orders.map((order, index) => (
        <OrderCard key={order.id} order={order} index={index} />
      ))}
    </div>
  );
}

function OrderCard({ order, index }: { order: MyOrder; index: number }) {
  const [generating, setGenerating] = useState(false);
  // 다운로드 경고 모달 (환불·취소 금지 고지 동의) — Option C 관련
  const [showDownloadModal, setShowDownloadModal] = useState<'planner' | 'report' | null>(null);
  const [downloadAgreed, setDownloadAgreed] = useState(false);

  // 사주 데이터가 있는 주문의 클라이언트 PDF 생성
  const handleGeneratePDF = useCallback(async () => {
    if (!order.saju_data) return;
    setGenerating(true);
    try {
      const { generatePlannerPDF } = await import('@/lib/pdf-generator');
      const { calculateSajuFromBirthData, sajuResultToSajuData } = await import('@/lib/saju');
      const { generatePlannerFortune } = await import('@/lib/fortune-text');

      const sd = order.saju_data;
      const year = new Date().getFullYear();
      const sajuResult = calculateSajuFromBirthData(sd.birthDate, sd.birthTime || '모름');
      const sajuData = sajuResultToSajuData(sajuResult);
      const fortuneData = generatePlannerFortune(sajuResult, year);

      await generatePlannerPDF({
        pages: ['cover', 'year-index', 'monthly', 'weekly'],
        theme: sd.theme || 'navy',
        orientation: (sd.orientation as 'portrait' | 'landscape') || 'portrait',
        year,
        name: sd.name || '나의 플래너',
        mode: 'fortune',
        saju: sajuData,
        fortuneData,
      });
    } catch (err) {
      console.error('PDF 생성 실패:', err);
    } finally {
      setGenerating(false);
    }
  }, [order.saju_data]);

  return (
    <div
      className="p-5 hover-lift animate-stagger-in"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* 주문번호 + 상태 + 날짜 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono text-xs text-ft-muted">{order.order_number}</span>
          <p className="text-xs text-ft-muted mt-0.5">
            {new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* 상품 목록 */}
      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-ft-ink">
              {item.product_name}
              {item.qty > 1 && <span className="text-ft-muted"> ×{item.qty}</span>}
            </span>
            <span className="text-ft-muted">
              {item.price > 0 ? `₩${item.price.toLocaleString()}` : '무료'}
            </span>
          </div>
        ))}
      </div>

      {/* 합계 */}
      <div className="flex items-center justify-between pt-2 border-t border-ft-border/60">
        <span className="text-sm text-ft-muted">결제금액</span>
        <span className="font-bold text-ft-ink">
          {order.total > 0 ? `₩${order.total.toLocaleString()}` : '무료'}
        </span>
      </div>

      {/* 다운로드 버튼 (file_url이 있는 completed 주문) — 경고 모달 거쳐서 이동 */}
      {order.status === 'completed' && order.file_url && (
        <button
          onClick={() => { setDownloadAgreed(false); setShowDownloadModal('planner'); }}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors"
        >
          <DownloadIcon />
          PDF 다운로드
          {order.download_opened_at && (
            <span className="text-xs font-normal opacity-70">(열람 완료)</span>
          )}
        </button>
      )}

      {/* 사주 데이터가 있는 주문 → 즉시 맞춤 플래너 PDF 생성·다운로드 */}
      {order.saju_data && order.status !== 'cancelled' && !order.file_url && (
        <div className="mt-3">
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <SpinnerIcon />
                PDF 생성 중... (최대 30초)
              </>
            ) : (
              <>
                <DownloadIcon />
                🗓️ 맞춤 플래너 PDF 생성 · 즉시 다운로드
              </>
            )}
          </button>
          <p className="text-[11px] text-ft-muted mt-1.5 text-center">
            플래너는 브라우저에서 즉시 생성됩니다. 심층 리포트는 관리자 발송(별도 이메일).
          </p>
        </div>
      )}

      {/* 이메일 발송 완료 안내 (file_url 없이 completed) */}
      {order.status === 'completed' && !order.file_url && !order.saju_data && (
        <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 border border-emerald-100 flex items-start gap-2">
          <EmailIcon />
          <div>
            <p className="font-medium">맞춤 플래너가 이메일로 발송되었습니다</p>
            <p className="mt-0.5 opacity-80">받은편지함을 확인해 주세요. 스팸함도 함께 확인해 주시기 바랍니다.</p>
          </div>
        </div>
      )}

      {/* 제작 중 안내 */}
      {(order.status === 'paid' || order.status === 'processing') && !order.saju_data && (
        <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-700 border border-indigo-100">
          사주 분석 후 맞춤 제작 중입니다. 완료 시 이메일로 PDF가 발송됩니다.
        </div>
      )}

      {/* 대기 중 안내 */}
      {order.status === 'pending' && order.total > 0 && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-xl text-xs text-yellow-700 border border-yellow-100">
          결제 확인 중입니다. 잠시 후 자동으로 처리됩니다.
        </div>
      )}

      {/* ── 프리미엄 사주 심층 리포트 (관리자가 연결한 링크로 다운로드) ── */}
      {order.report_status && order.report_status !== 'not_applicable' && (
        <div className="mt-3 p-3 rounded-xl text-xs border flex items-start gap-2 bg-amber-50 text-amber-800 border-amber-200">
          <span className="text-base flex-shrink-0 leading-none">📖</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              사주 심층 리포트{' '}
              {order.report_status === 'sent' && <span className="text-emerald-700">· 발송 완료</span>}
              {order.report_status === 'preparing' && <span>· 제작 중</span>}
              {order.report_status === 'pending' && <span>· 결제 완료, 제작 대기</span>}
              {order.report_status === 'skipped' && <span className="text-gray-500">· 발송 취소</span>}
            </p>
            {order.report_status === 'sent' && order.report_file_url && (
              <button
                onClick={() => { setDownloadAgreed(false); setShowDownloadModal('report'); }}
                className="mt-1 inline-block text-ft-ink underline text-left font-semibold"
              >
                📥 리포트 PDF 다운로드 (관리자 발송 링크) →
              </button>
            )}
            {(order.report_status === 'pending' || order.report_status === 'preparing') && (
              <p className="mt-0.5 opacity-80">
                결제일로부터 14일 이내에 가입 이메일로 별도 발송해드립니다. 완료 시 이곳에도 다운로드 링크가 표시됩니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 다운로드 경고 모달 — 환불·취소 금지 고지 ─────────────────────────── */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDownloadModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-ft-ink mb-3 flex items-center gap-2">
              ⚠️ 다운로드 전 안내
            </h3>
            <div className="space-y-2.5 text-sm text-ft-body leading-relaxed mb-4">
              <p className="flex gap-2">
                <span className="text-red-600 font-bold flex-shrink-0">·</span>
                <span>
                  다운로드 후에는 <b className="text-ft-ink">환불·취소가 불가</b>합니다
                  (디지털 상품 특성상).
                </span>
              </p>
              <p className="flex gap-2">
                <span className="text-red-600 font-bold flex-shrink-0">·</span>
                <span>
                  파일 내용에 문제가 있거나 맞춤 정보가 잘못된 경우,
                  다운로드하지 마시고 <a className="underline text-ft-ink" href="mailto:sbaron680@gmail.com">sbaron680@gmail.com</a>
                  으로 먼저 문의해 주세요.
                </span>
              </p>
              <p className="flex gap-2">
                <span className="text-red-600 font-bold flex-shrink-0">·</span>
                <span>
                  본 PDF는 개인 사용 목적으로만 이용 가능하며, 재배포·상업적 이용을 금합니다.
                </span>
              </p>
              {showDownloadModal === 'report' && (
                <p className="flex gap-2">
                  <span className="text-red-600 font-bold flex-shrink-0">·</span>
                  <span>
                    사주 분석은 <b>참고 용도</b>이며 전문 상담을 대체하지 않습니다.
                  </span>
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <input
                type="checkbox"
                checked={downloadAgreed}
                onChange={e => setDownloadAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-ft-ink"
              />
              <span className="text-xs text-ft-ink leading-relaxed">
                위 내용을 확인했으며, 환불·취소가 불가함에 동의합니다.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDownloadModal(null)}
                className="flex-1 py-2.5 bg-white border border-ft-border rounded-xl text-sm text-ft-body hover:bg-gray-50"
              >
                취소
              </button>
              <button
                disabled={!downloadAgreed}
                onClick={() => {
                  if (!downloadAgreed) return;
                  const url = showDownloadModal === 'planner'
                    ? `/download/view?order=${order.id}&token=${order.access_token}`
                    : order.report_file_url ?? '';
                  if (url) window.open(url, showDownloadModal === 'report' ? '_blank' : '_self');
                  setShowDownloadModal(null);
                }}
                className="flex-1 py-2.5 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h disabled:opacity-40 disabled:cursor-not-allowed"
              >
                동의하고 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 운세 분석 탭 ─────────────────────────────────────────────────────────────

const FORTUNE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  saju:      { label: '사주 분석', icon: '🔮' },
  astrology: { label: '별자리 운세', icon: '⭐' },
  couple:    { label: '궁합 분석', icon: '💕' },
};

function FortuneTab({ records }: { records: FortuneRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="text-5xl mb-4">🔮</div>
        <h3 className="text-lg font-bold text-ft-ink mb-2">운세 분석 기록이 없습니다</h3>
        <p className="text-sm text-ft-muted mb-6 max-w-xs mx-auto">
          사주팔자 기반 맞춤 운세를 확인해 보세요.
        </p>
        <Link
          href="/fortune"
          className="inline-block px-6 py-3 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors btn-press"
        >
          운세 분석하기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-ft-border">
      {records.map((r, i) => {
        const meta = FORTUNE_TYPE_LABELS[r.type] ?? { label: r.type, icon: '📊' };
        return (
          <div
            key={r.id}
            className="p-5 hover-lift animate-stagger-in flex items-center justify-between"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <p className="text-sm font-medium text-ft-ink">{meta.label}</p>
                <p className="text-xs text-ft-muted">
                  {new Date(r.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <Link
              href={`/fortune?type=${r.type}`}
              className="text-xs font-medium text-ft-ink underline hover:text-ft-red transition-colors"
            >
              다시 분석 →
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ── 발굴 세션 탭 ─────────────────────────────────────────────────────────────

function SessionsTab({ sessions }: { sessions: FtSessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="text-5xl mb-4">🌱</div>
        <h3 className="text-lg font-bold text-ft-ink mb-2">완료된 세션이 없습니다</h3>
        <p className="text-sm text-ft-muted mb-6 max-w-xs mx-auto">
          막혔을 때, 내 안의 답을 꺼내는 명발굴 세션을 시작해 보세요.
        </p>
        <Link
          href="/session"
          className="inline-block px-6 py-3 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors btn-press"
        >
          세션 시작하기 →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-ft-border">
      {sessions.map((s, i) => (
        <SessionCard key={s.id} session={s} index={i} />
      ))}
    </div>
  );
}

function SessionCard({ session: s, index }: { session: FtSessionRow; index: number }) {
  const [downloading, setDownloading] = useState(false);
  const result = s.result as GenerateResult | null;
  const answers = s.answers as Record<string, string>;
  const firstSprout = answers?.firstSprout ?? '';

  const handleDownloadSessionPDF = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { default: SessionResultPDF } = await import('@/components/session/SessionResultPDF');

      const blob = await pdf(
        <SessionResultPDF
          mode={s.mode ?? 'gen'}
          fortunePercent={s.fortune_score != null ? Math.round(((s.fortune_score + 1) / 2) * 100) : 0}
          daunPhase={s.daun_phase ?? '안정기'}
          gradeLabel={s.fortune_score != null && s.fortune_score >= 0.4 ? '발굴 최적' : s.fortune_score != null && s.fortune_score >= 0.1 ? '좋은 흐름' : s.fortune_score != null && s.fortune_score >= -0.15 ? '중립' : '충전'}
          result={result}
          firstSprout={firstSprout}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fortunetab-session-${new Date(s.created_at).toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [s, result, firstSprout]);

  return (
    <div
      className="p-5 hover-lift animate-stagger-in"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-ft-paper font-medium text-ft-ink">
              {s.mode === 'biz' ? '💼 사업가' : '🌱 일반'}
            </span>
            {s.daun_phase && (
              <span className={`text-xs font-medium ${PHASE_COLORS[s.daun_phase] ?? 'text-ft-muted'}`}>
                {s.daun_phase}
              </span>
            )}
          </div>
          <p className="text-xs text-ft-muted">
            {new Date(s.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-ft-ink">
            {s.fortune_score != null ? Math.round(((s.fortune_score + 1) / 2) * 100) : '–'}
          </div>
          <div className="text-xs text-ft-muted">Score</div>
        </div>
      </div>

      {/* 첫 싹 선언 */}
      {firstSprout && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-emerald-700 line-clamp-2">🌱 {firstSprout}</p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/session/result?id=${s.id}`}
          className="flex-1 text-center text-xs font-medium py-2 border border-ft-border rounded-lg text-ft-ink hover:bg-ft-paper transition-colors"
        >
          결과 보기
        </Link>
        {result && (
          <button
            onClick={handleDownloadSessionPDF}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 bg-ft-gold text-ft-ink rounded-lg hover:bg-ft-gold-h transition-colors disabled:opacity-50"
          >
            {downloading ? <SpinnerIcon /> : <DownloadIcon />}
            {downloading ? 'PDF 생성 중...' : 'PDF 다운로드'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── 아이콘 ───────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
