'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  fetchAllOrders, updateOrderStatus, setOrderFileUrl,
  fetchOrderItems, updateOrderMemo,
} from '@/lib/orders';
import { fetchAllUsers, setAdminStatus, fetchUserOrderStats } from '@/lib/users';
import {
  fetchAllPromotions, createPromotion, updatePromotion, deletePromotion, togglePromotion,
  getDaysRemaining, type Promotion,
} from '@/lib/promotions';
import { PRODUCTS } from '@/lib/products';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
type Tab = 'orders' | 'users' | 'promotions';
type DateFilter = 'all' | 'today' | 'week' | 'month' | '3months';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    '대기중',
  paid:       '결제완료',
  processing: '제작중',
  completed:  '발송완료',
  cancelled:  '취소됨',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    'bg-yellow-900/40 text-yellow-300',
  paid:       'bg-blue-900/40 text-blue-300',
  processing: 'bg-indigo-900/40 text-indigo-300',
  completed:  'bg-emerald-900/40 text-emerald-300',
  cancelled:  'bg-red-900/40 text-red-300',
};

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: '전체', today: '오늘', week: '이번 주', month: '이번 달', '3months': '3개월',
};

interface AdminOrder {
  id: string;
  user_id: string;
  user_email: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  file_url: string | null;
  access_token: string;
  download_opened_at: string | null;
  download_count: number;
  created_at: string;
  admin_memo?: string | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

// ── 날짜 필터 유틸 ─────────────────────────────────────────────────────────
function getDateFilterStart(filter: DateFilter): Date | null {
  if (filter === 'all') return null;
  const now = new Date();
  switch (filter) {
    case 'today':   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // Sunday start
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month':   return new Date(now.getFullYear(), now.getMonth(), 1);
    case '3months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
  }
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthReady } = useAuthStore();
  const [tab, setTab] = useState<Tab>('orders');

  // ── 주문 상태 ────────────────────────────────────────────────────────────────
  const [orders, setOrders]       = useState<AdminOrder[]>([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [fileUrlInputs, setFileUrlInputs] = useState<Record<string, string>>({});
  const [savingFileUrl, setSavingFileUrl] = useState<string | null>(null);
  // 주문 검색/필터
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [orderDateFilter, setOrderDateFilter] = useState<DateFilter>('all');
  // 주문 상세 확장
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItemRow[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);
  // 주문 메모
  const [memoInputs, setMemoInputs] = useState<Record<string, string>>({});
  const [savingMemo, setSavingMemo] = useState<string | null>(null);

  // ── 사용자 상태 ──────────────────────────────────────────────────────────────
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userOrderStats, setUserOrderStats] = useState<Record<string, { count: number; total: number }>>({});
  const [userSort, setUserSort] = useState<'date' | 'name' | 'orders' | 'spent'>('date');

  // ── 프로모션 상태 ────────────────────────────────────────────────────────────
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [fetchingPromos, setFetchingPromos] = useState(false);
  const [editingPromo, setEditingPromo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Promotion>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [promoForm, setPromoForm] = useState({
    product_slug: '', discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '', starts_at: '', ends_at: '',
    max_uses: '', per_user_limit: '1', min_order_amount: '0',
    badge_text: '', badge_color: 'red', coupon_code: '',
  });

  // ── 인증 가드 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }

    fetchAllOrders().then((data) => {
      setOrders(data as AdminOrder[]);
      setFetchingOrders(false);
    });
  }, [user, isAuthReady, router]);

  useEffect(() => {
    if (tab !== 'users' || users.length > 0) return;
    setFetchingUsers(true);
    Promise.all([fetchAllUsers(), fetchUserOrderStats()]).then(([userData, stats]) => {
      setUsers(userData);
      setUserOrderStats(stats);
      setFetchingUsers(false);
    });
  }, [tab, users.length]);

  useEffect(() => {
    if (tab !== 'promotions') return;
    setFetchingPromos(true);
    fetchAllPromotions().then(data => { setPromos(data); setFetchingPromos(false); });
  }, [tab]);

  // ── 주문 필터링 ──────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = orders;

    // 상태 필터
    if (orderStatusFilter !== 'all') {
      result = result.filter(o => o.status === orderStatusFilter);
    }

    // 날짜 필터
    const dateStart = getDateFilterStart(orderDateFilter);
    if (dateStart) {
      result = result.filter(o => new Date(o.created_at) >= dateStart);
    }

    // 검색 (주문번호 or 이메일)
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      result = result.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.user_email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, orderStatusFilter, orderDateFilter, orderSearch]);

  // 필터된 주문 통계
  const filteredRevenue = useMemo(() =>
    filteredOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
    [filteredOrders]
  );

  // ── 사용자 필터링/정렬 ───────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = users;

    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      result = result.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      switch (userSort) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'orders': return (userOrderStats[b.id]?.count ?? 0) - (userOrderStats[a.id]?.count ?? 0);
        case 'spent': return (userOrderStats[b.id]?.total ?? 0) - (userOrderStats[a.id]?.total ?? 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [users, userSearch, userSort, userOrderStats]);

  // 사용자 통계
  const userStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
    return {
      total: users.length,
      admins: users.filter(u => u.is_admin).length,
      newWeek: users.filter(u => new Date(u.created_at) >= weekAgo).length,
      newMonth: users.filter(u => new Date(u.created_at) >= monthAgo).length,
    };
  }, [users]);

  // ── 주문 핸들러 ──────────────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    const ok = await updateOrderStatus(orderId, status);
    if (ok) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    setUpdatingId(null);
  };

  const handleSaveFileUrl = async (orderId: string) => {
    const url = fileUrlInputs[orderId]?.trim();
    if (!url) return;
    setSavingFileUrl(orderId);
    const ok = await setOrderFileUrl(orderId, url);
    if (ok) {
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, file_url: url, status: 'completed' } : o)
      );
      setFileUrlInputs(prev => ({ ...prev, [orderId]: '' }));
    }
    setSavingFileUrl(null);
  };

  const handleExpandOrder = useCallback(async (orderId: string) => {
    if (expandedOrder === orderId) { setExpandedOrder(null); return; }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      setLoadingItems(orderId);
      const items = await fetchOrderItems(orderId);
      setOrderItems(prev => ({ ...prev, [orderId]: items as OrderItemRow[] }));
      setLoadingItems(null);
    }
  }, [expandedOrder, orderItems]);

  const handleSaveMemo = async (orderId: string) => {
    const memo = memoInputs[orderId] ?? '';
    setSavingMemo(orderId);
    const ok = await updateOrderMemo(orderId, memo);
    if (ok) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, admin_memo: memo } : o));
    setSavingMemo(null);
  };

  const copyTrackingUrl = (orderId: string, token: string) => {
    const url = `${window.location.origin}/download/view?order=${orderId}&token=${token}`;
    navigator.clipboard.writeText(url);
  };

  // ── 사용자 핸들러 ────────────────────────────────────────────────────────────
  const handleAdminToggle = async (userId: string, currentAdmin: boolean) => {
    setTogglingId(userId);
    const ok = await setAdminStatus(userId, !currentAdmin);
    if (ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
    setTogglingId(null);
  };

  // ── 프로모션 핸들러 ──────────────────────────────────────────────────────────
  const handleCreatePromo = async () => {
    if (!promoForm.discount_value) return;
    try {
      const newPromo = await createPromotion({
        product_slug: promoForm.product_slug || null,
        discount_type: promoForm.discount_type,
        discount_value: Number(promoForm.discount_value),
        starts_at: promoForm.starts_at || new Date().toISOString(),
        ends_at: promoForm.ends_at || null,
        max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
        per_user_limit: Number(promoForm.per_user_limit),
        min_order_amount: Number(promoForm.min_order_amount),
        badge_text: promoForm.badge_text || null,
        badge_color: promoForm.badge_color,
      });
      setPromos(prev => [newPromo, ...prev]);
      setPromoForm({ product_slug: '', discount_type: 'percent', discount_value: '', starts_at: '', ends_at: '', max_uses: '', per_user_limit: '1', min_order_amount: '0', badge_text: '', badge_color: 'red', coupon_code: '' });
    } catch (err) {
      console.error('프로모션 생성 실패:', err);
    }
  };

  const handleTogglePromo = async (id: string, active: boolean) => {
    await togglePromotion(id, active);
    setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('이 프로모션을 삭제하시겠습니까?')) return;
    await deletePromotion(id);
    setPromos(prev => prev.filter(p => p.id !== id));
  };

  const handleStartEdit = (promo: Promotion) => {
    setEditingPromo(promo.id);
    setEditForm({
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      ends_at: promo.ends_at,
      max_uses: promo.max_uses,
      per_user_limit: promo.per_user_limit,
      min_order_amount: promo.min_order_amount,
      badge_text: promo.badge_text,
      badge_color: promo.badge_color,
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const updated = await updatePromotion(id, editForm);
      setPromos(prev => prev.map(p => p.id === id ? updated : p));
      setEditingPromo(null);
    } catch (err) {
      console.error('프로모션 수정 실패:', err);
    }
    setSavingEdit(false);
  };

  const handleDuplicatePromo = async (promo: Promotion) => {
    try {
      const dup = await createPromotion({
        product_slug: promo.product_slug,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        starts_at: new Date().toISOString(),
        ends_at: promo.ends_at,
        max_uses: promo.max_uses,
        per_user_limit: promo.per_user_limit,
        min_order_amount: promo.min_order_amount,
        badge_text: promo.badge_text ? `${promo.badge_text} (복사)` : null,
        badge_color: promo.badge_color,
        is_active: false,
      });
      setPromos(prev => [dup, ...prev]);
    } catch (err) {
      console.error('프로모션 복제 실패:', err);
    }
  };

  // ── 통계 ─────────────────────────────────────────────────────────────────────
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  // ── 로딩 ─────────────────────────────────────────────────────────────────────
  if (!isAuthReady || fetchingOrders) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">관리자 대시보드</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← 사이트로 돌아가기
          </button>
        </div>

        {/* 요약 카드 — 상단 고정 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(status => (
            <div key={status} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-black text-white">
                {orders.filter(o => o.status === status).length}
              </p>
            </div>
          ))}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500 mb-1">총 매출</p>
            <p className="text-2xl font-black text-yellow-400">₩{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit border border-gray-800">
          {(['orders', 'users', 'promotions'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = { orders: '주문 관리', users: '사용자 관리', promotions: '할인 관리' };
            const counts: Record<Tab, number> = {
              orders: orders.length,
              users: users.length,
              promotions: promos.filter(p => p.is_active).length,
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {labels[t]}
                {counts[t] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t ? 'bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {counts[t]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
           주문 관리 탭
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* 검색 + 필터 바 */}
            <div className="flex flex-wrap gap-3 items-center bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="주문번호 또는 이메일 검색..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="w-full bg-gray-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value as OrderStatus | 'all')}
                className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
              >
                <option value="all">전체 상태</option>
                {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <div className="flex gap-1">
                {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map(df => (
                  <button
                    key={df}
                    onClick={() => setOrderDateFilter(df)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      orderDateFilter === df
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {DATE_FILTER_LABELS[df]}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-auto">
                {filteredOrders.length}건 · ₩{filteredRevenue.toLocaleString()}
              </span>
            </div>

            {/* 주문 테이블 */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-gray-600">
                  {orderSearch || orderStatusFilter !== 'all' || orderDateFilter !== 'all'
                    ? '검색 결과가 없습니다.'
                    : '주문이 없습니다.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-500">
                        <th className="text-left p-4 font-medium w-8"></th>
                        <th className="text-left p-4 font-medium">주문번호</th>
                        <th className="text-left p-4 font-medium">고객</th>
                        <th className="text-left p-4 font-medium">상태</th>
                        <th className="text-right p-4 font-medium">금액</th>
                        <th className="text-left p-4 font-medium">다운로드</th>
                        <th className="text-left p-4 font-medium">열람</th>
                        <th className="text-left p-4 font-medium">일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(order => (
                        <>
                          <tr
                            key={order.id}
                            className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer ${
                              expandedOrder === order.id ? 'bg-gray-800/20' : ''
                            }`}
                            onClick={() => handleExpandOrder(order.id)}
                          >
                            {/* 확장 화살표 */}
                            <td className="p-4 text-gray-500">
                              <svg
                                className={`w-4 h-4 transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </td>

                            {/* 주문번호 */}
                            <td className="p-4">
                              <span className="font-mono text-xs text-gray-300">{order.order_number}</span>
                            </td>

                            {/* 고객 */}
                            <td className="p-4 text-xs text-gray-400">{order.user_email}</td>

                            {/* 상태 */}
                            <td className="p-4" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                                  {STATUS_LABELS[order.status]}
                                </span>
                                <select
                                  value={order.status}
                                  disabled={updatingId === order.id}
                                  onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                  className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none disabled:opacity-50"
                                >
                                  {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* 금액 */}
                            <td className="p-4 text-right font-medium text-white">
                              {order.total > 0 ? `₩${order.total.toLocaleString()}` : '무료'}
                            </td>

                            {/* 다운로드 링크 */}
                            <td className="p-4 min-w-[200px]" onClick={e => e.stopPropagation()}>
                              {order.file_url ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-emerald-400">✓ 설정됨</span>
                                  <button
                                    onClick={() => copyTrackingUrl(order.id, order.access_token)}
                                    className="text-xs px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded-lg hover:bg-indigo-900/80 transition-colors"
                                  >
                                    링크 복사
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="url"
                                    placeholder="Google Drive URL"
                                    value={fileUrlInputs[order.id] ?? ''}
                                    onChange={e => setFileUrlInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                    className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 min-w-0"
                                  />
                                  <button
                                    onClick={() => handleSaveFileUrl(order.id)}
                                    disabled={!fileUrlInputs[order.id] || savingFileUrl === order.id}
                                    className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40"
                                  >
                                    {savingFileUrl === order.id ? '…' : '저장'}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* 열람 */}
                            <td className="p-4">
                              {order.download_opened_at ? (
                                <div className="text-xs">
                                  <p className="text-emerald-400">{order.download_count}회</p>
                                  <p className="text-gray-600 mt-0.5">
                                    {new Date(order.download_opened_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600">미열람</span>
                              )}
                            </td>

                            {/* 일시 */}
                            <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(order.created_at).toLocaleDateString('ko-KR', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                          </tr>

                          {/* ── 주문 상세 확장 패널 ──────────────────────────── */}
                          {expandedOrder === order.id && (
                            <tr key={`${order.id}-detail`}>
                              <td colSpan={8} className="bg-gray-800/30 p-0">
                                <div className="p-5 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 주문 아이템 */}
                                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                                      <h4 className="text-xs font-bold text-gray-400 mb-3">주문 상품</h4>
                                      {loadingItems === order.id ? (
                                        <p className="text-xs text-gray-600 animate-pulse">로딩 중…</p>
                                      ) : (orderItems[order.id] ?? []).length === 0 ? (
                                        <p className="text-xs text-gray-600">아이템 없음</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {(orderItems[order.id] ?? []).map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-xs">
                                              <div>
                                                <span className="text-white">{item.product_name}</span>
                                                {item.qty > 1 && <span className="text-gray-500 ml-1">×{item.qty}</span>}
                                              </div>
                                              <span className="text-gray-400">
                                                {item.price > 0 ? `₩${(item.price * item.qty).toLocaleString()}` : '무료'}
                                              </span>
                                            </div>
                                          ))}
                                          <div className="border-t border-gray-700 pt-2 flex justify-between text-xs font-bold">
                                            <span className="text-gray-400">합계</span>
                                            <span className="text-white">
                                              {order.total > 0 ? `₩${order.total.toLocaleString()}` : '무료'}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* 관리자 메모 */}
                                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                                      <h4 className="text-xs font-bold text-gray-400 mb-3">관리자 메모</h4>
                                      <textarea
                                        rows={3}
                                        placeholder="이 주문에 대한 메모를 남겨주세요..."
                                        value={memoInputs[order.id] ?? order.admin_memo ?? ''}
                                        onChange={e => setMemoInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                        className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                      />
                                      <button
                                        onClick={() => handleSaveMemo(order.id)}
                                        disabled={savingMemo === order.id}
                                        className="mt-2 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                                      >
                                        {savingMemo === order.id ? '저장 중…' : '메모 저장'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* 추가 정보 */}
                                  <div className="flex gap-4 text-xs text-gray-500">
                                    <span>ID: <span className="font-mono text-gray-600">{order.id.slice(0, 8)}…</span></span>
                                    <span>User ID: <span className="font-mono text-gray-600">{order.user_id.slice(0, 8)}…</span></span>
                                    <span>Token: <span className="font-mono text-gray-600">{order.access_token.slice(0, 8)}…</span></span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
           사용자 관리 탭
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* 사용자 통계 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">전체 사용자</p>
                <p className="text-2xl font-black text-white">{userStats.total}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">관리자</p>
                <p className="text-2xl font-black text-yellow-400">{userStats.admins}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">이번 주 가입</p>
                <p className="text-2xl font-black text-emerald-400">{userStats.newWeek}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">이번 달 가입</p>
                <p className="text-2xl font-black text-blue-400">{userStats.newMonth}</p>
              </div>
            </div>

            {/* 검색 + 정렬 */}
            <div className="flex flex-wrap gap-3 items-center bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="이메일 또는 이름 검색..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full bg-gray-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-1">
                {([
                  ['date', '최신순'],
                  ['name', '이름순'],
                  ['orders', '주문순'],
                  ['spent', '매출순'],
                ] as [typeof userSort, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setUserSort(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      userSort === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-auto">{filteredUsers.length}명</span>
            </div>

            {/* 사용자 테이블 */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {fetchingUsers ? (
                <div className="p-12 text-center text-gray-600 animate-pulse">불러오는 중…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-500">
                        <th className="text-left p-4 font-medium">이메일</th>
                        <th className="text-left p-4 font-medium">이름</th>
                        <th className="text-right p-4 font-medium">주문</th>
                        <th className="text-right p-4 font-medium">매출</th>
                        <th className="text-left p-4 font-medium">가입일</th>
                        <th className="text-left p-4 font-medium">권한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => {
                        const stats = userOrderStats[u.id];
                        return (
                          <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <td className="p-4 text-gray-300">{u.email}</td>
                            <td className="p-4 text-gray-400">{u.name || '—'}</td>
                            <td className="p-4 text-right">
                              {stats ? (
                                <span className="text-xs font-medium text-indigo-300">{stats.count}건</span>
                              ) : (
                                <span className="text-xs text-gray-600">0건</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {stats && stats.total > 0 ? (
                                <span className="text-xs font-medium text-yellow-300">₩{stats.total.toLocaleString()}</span>
                              ) : (
                                <span className="text-xs text-gray-600">₩0</span>
                              )}
                            </td>
                            <td className="p-4 text-xs text-gray-500">
                              {new Date(u.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric', month: 'short', day: 'numeric',
                              })}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  u.is_admin
                                    ? 'bg-yellow-900/40 text-yellow-300'
                                    : 'bg-gray-800 text-gray-400'
                                }`}>
                                  {u.is_admin ? '관리자' : '일반'}
                                </span>
                                <button
                                  onClick={() => handleAdminToggle(u.id, u.is_admin)}
                                  disabled={togglingId === u.id || u.id === user?.id}
                                  className={`text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-30 ${
                                    u.is_admin
                                      ? 'bg-red-900/50 text-red-300 hover:bg-red-900/80'
                                      : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/80'
                                  }`}
                                >
                                  {togglingId === u.id ? '…' : u.is_admin ? '해제' : '지정'}
                                </button>
                                {u.id === user?.id && (
                                  <span className="text-xs text-gray-600">(본인)</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
           할인 관리 탭
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'promotions' && (
          <div className="space-y-6">
            {/* 프로모션 통계 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">전체 프로모션</p>
                <p className="text-2xl font-black text-white">{promos.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">활성</p>
                <p className="text-2xl font-black text-emerald-400">{promos.filter(p => p.is_active).length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">총 사용 횟수</p>
                <p className="text-2xl font-black text-indigo-400">{promos.reduce((s, p) => s + p.current_uses, 0)}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">만료됨</p>
                <p className="text-2xl font-black text-red-400">
                  {promos.filter(p => { const d = getDaysRemaining(p.ends_at); return d !== null && d <= 0; }).length}
                </p>
              </div>
            </div>

            {/* 생성 폼 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-bold mb-4">새 프로모션 생성</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <select value={promoForm.product_slug} onChange={e => setPromoForm(p => ({...p, product_slug: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="">전체 상품</option>
                  {PRODUCTS.filter(p => p.price > 0).map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
                <select value={promoForm.discount_type} onChange={e => setPromoForm(p => ({...p, discount_type: e.target.value as 'percent'|'fixed'}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="percent">% 할인</option>
                  <option value="fixed">원 할인</option>
                </select>
                <input placeholder="할인값 (예: 34)" value={promoForm.discount_value}
                  onChange={e => setPromoForm(p => ({...p, discount_value: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700" />
                <input type="datetime-local" placeholder="시작일" value={promoForm.starts_at}
                  onChange={e => setPromoForm(p => ({...p, starts_at: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700" />
                <input type="datetime-local" placeholder="종료일 (빈칸=무기한)" value={promoForm.ends_at}
                  onChange={e => setPromoForm(p => ({...p, ends_at: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700" />
                <input placeholder="최대 사용 횟수 (빈칸=무제한)" value={promoForm.max_uses}
                  onChange={e => setPromoForm(p => ({...p, max_uses: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700" />
                <input placeholder="인당 사용 제한 (기본 1)" value={promoForm.per_user_limit}
                  onChange={e => setPromoForm(p => ({...p, per_user_limit: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700" />
                <input placeholder="최소 주문 금액 (기본 0)" value={promoForm.min_order_amount}
                  onChange={e => setPromoForm(p => ({...p, min_order_amount: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700" />
                <select value={promoForm.badge_color} onChange={e => setPromoForm(p => ({...p, badge_color: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="red">빨강</option>
                  <option value="green">초록</option>
                  <option value="blue">파랑</option>
                  <option value="gold">골드</option>
                </select>
                <input placeholder="뱃지 텍스트 (예: 얼리버드 34% OFF)" value={promoForm.badge_text}
                  onChange={e => setPromoForm(p => ({...p, badge_text: e.target.value}))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 col-span-2 md:col-span-3" />
              </div>
              <button onClick={handleCreatePromo}
                disabled={!promoForm.discount_value}
                className="mt-4 px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                프로모션 생성
              </button>
            </div>

            {/* 프로모션 목록 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {fetchingPromos ? (
                <div className="p-8 text-center text-gray-500 animate-pulse">로딩 중...</div>
              ) : promos.length === 0 ? (
                <div className="p-8 text-center text-gray-500">프로모션이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-500">
                        <th className="text-left p-3 font-medium">상품</th>
                        <th className="text-left p-3 font-medium">할인</th>
                        <th className="text-left p-3 font-medium">기간</th>
                        <th className="text-left p-3 font-medium">사용</th>
                        <th className="text-left p-3 font-medium">조건</th>
                        <th className="text-left p-3 font-medium">뱃지</th>
                        <th className="text-left p-3 font-medium">상태</th>
                        <th className="text-left p-3 font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => {
                        const days = getDaysRemaining(p.ends_at);
                        const expired = days !== null && days <= 0;
                        const isEditing = editingPromo === p.id;

                        return (
                          <tr key={p.id} className={`border-b border-gray-800/50 ${expired ? 'opacity-50' : ''} ${isEditing ? 'bg-gray-800/30' : ''}`}>
                            <td className="p-3 text-white text-xs">{p.product_slug || '전체'}</td>
                            <td className="p-3">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <select value={editForm.discount_type} onChange={e => setEditForm(f => ({...f, discount_type: e.target.value as 'percent'|'fixed'}))}
                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-14">
                                    <option value="percent">%</option>
                                    <option value="fixed">₩</option>
                                  </select>
                                  <input type="number" value={editForm.discount_value ?? ''} onChange={e => setEditForm(f => ({...f, discount_value: Number(e.target.value)}))}
                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-16" />
                                </div>
                              ) : (
                                <span className="text-amber-300 font-mono text-xs">
                                  {p.discount_type === 'percent' ? `${p.discount_value}%` : `₩${p.discount_value.toLocaleString()}`}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-gray-400 text-xs">
                              {isEditing ? (
                                <input type="datetime-local" value={editForm.ends_at ?? ''} onChange={e => setEditForm(f => ({...f, ends_at: e.target.value || null}))}
                                  className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-40" />
                              ) : (
                                <>
                                  {new Date(p.starts_at).toLocaleDateString('ko-KR')}
                                  {p.ends_at && ` ~ ${new Date(p.ends_at).toLocaleDateString('ko-KR')}`}
                                  {days !== null && days > 0 && <span className="ml-1 text-amber-400">D-{days}</span>}
                                  {expired && <span className="ml-1 text-red-400">만료</span>}
                                </>
                              )}
                            </td>
                            <td className="p-3 text-gray-400 text-xs">
                              {isEditing ? (
                                <input type="number" placeholder="무제한" value={editForm.max_uses ?? ''} onChange={e => setEditForm(f => ({...f, max_uses: e.target.value ? Number(e.target.value) : null}))}
                                  className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-16" />
                              ) : (
                                <>{p.current_uses}/{p.max_uses ?? '∞'}</>
                              )}
                            </td>
                            <td className="p-3 text-xs text-gray-500">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <input type="number" placeholder="인당" value={editForm.per_user_limit ?? ''} onChange={e => setEditForm(f => ({...f, per_user_limit: Number(e.target.value)}))}
                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-12" title="인당 제한" />
                                  <input type="number" placeholder="최소금액" value={editForm.min_order_amount ?? ''} onChange={e => setEditForm(f => ({...f, min_order_amount: Number(e.target.value)}))}
                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-16" title="최소 주문 금액" />
                                </div>
                              ) : (
                                <>
                                  {p.per_user_limit > 1 && <span>인당 {p.per_user_limit}회</span>}
                                  {p.min_order_amount > 0 && <span className="ml-1">₩{p.min_order_amount.toLocaleString()}↑</span>}
                                  {p.per_user_limit <= 1 && p.min_order_amount === 0 && '—'}
                                </>
                              )}
                            </td>
                            <td className="p-3">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <input placeholder="뱃지" value={editForm.badge_text ?? ''} onChange={e => setEditForm(f => ({...f, badge_text: e.target.value || null}))}
                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-24" />
                                  <select value={editForm.badge_color ?? 'red'} onChange={e => setEditForm(f => ({...f, badge_color: e.target.value}))}
                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-14">
                                    <option value="red">빨강</option>
                                    <option value="green">초록</option>
                                    <option value="blue">파랑</option>
                                    <option value="gold">골드</option>
                                  </select>
                                </div>
                              ) : p.badge_text ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  p.badge_color === 'red' ? 'bg-red-900/40 text-red-300' :
                                  p.badge_color === 'green' ? 'bg-emerald-900/40 text-emerald-300' :
                                  p.badge_color === 'gold' ? 'bg-amber-900/40 text-amber-300' :
                                  'bg-blue-900/40 text-blue-300'
                                }`}>{p.badge_text}</span>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              <button onClick={() => handleTogglePromo(p.id, !p.is_active)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  p.is_active ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/40' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}>
                                {p.is_active ? '활성' : '비활성'}
                              </button>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button onClick={() => handleSaveEdit(p.id)} disabled={savingEdit}
                                      className="text-emerald-400 hover:text-emerald-300 text-xs disabled:opacity-40">
                                      {savingEdit ? '…' : '저장'}
                                    </button>
                                    <button onClick={() => setEditingPromo(null)}
                                      className="text-gray-400 hover:text-gray-300 text-xs ml-1">취소</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleStartEdit(p)}
                                      className="text-indigo-400 hover:text-indigo-300 text-xs">수정</button>
                                    <button onClick={() => handleDuplicatePromo(p)}
                                      className="text-gray-400 hover:text-gray-300 text-xs" title="복제">복제</button>
                                    <button onClick={() => handleDeletePromo(p.id)}
                                      className="text-red-400 hover:text-red-300 text-xs">삭제</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
