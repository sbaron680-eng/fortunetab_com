'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { fetchAllOrders, updateOrderStatus, setOrderFileUrl } from '@/lib/orders';
import { fetchAllUsers, setAdminStatus } from '@/lib/users';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
type Tab = 'orders' | 'users';

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
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [tab, setTab] = useState<Tab>('orders');

  // ── 주문 상태 ────────────────────────────────────────────────────────────────
  const [orders, setOrders]       = useState<AdminOrder[]>([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [fileUrlInputs, setFileUrlInputs] = useState<Record<string, string>>({});
  const [savingFileUrl, setSavingFileUrl] = useState<string | null>(null);

  // ── 사용자 상태 ──────────────────────────────────────────────────────────────
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── 인증 가드 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }

    fetchAllOrders().then((data) => {
      setOrders(data as AdminOrder[]);
      setFetchingOrders(false);
    });
  }, [user, isLoading, router]);

  useEffect(() => {
    if (tab !== 'users' || users.length > 0) return;
    setFetchingUsers(true);
    fetchAllUsers().then((data) => {
      setUsers(data);
      setFetchingUsers(false);
    });
  }, [tab, users.length]);

  // ── 핸들러 ───────────────────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    const ok = await updateOrderStatus(orderId, status);
    if (ok) setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    setUpdatingId(null);
  };

  const handleSaveFileUrl = async (orderId: string) => {
    const url = fileUrlInputs[orderId]?.trim();
    if (!url) return;
    setSavingFileUrl(orderId);
    const ok = await setOrderFileUrl(orderId, url);
    if (ok) {
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, file_url: url, status: 'completed' } : o)
      );
      setFileUrlInputs((prev) => ({ ...prev, [orderId]: '' }));
    }
    setSavingFileUrl(null);
  };

  const handleAdminToggle = async (userId: string, currentAdmin: boolean) => {
    setTogglingId(userId);
    const ok = await setAdminStatus(userId, !currentAdmin);
    if (ok) setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
    setTogglingId(null);
  };

  const copyTrackingUrl = (orderId: string, token: string) => {
    const url = `${window.location.origin}/download/view?order=${orderId}&token=${token}`;
    navigator.clipboard.writeText(url);
  };

  // ── 통계 ─────────────────────────────────────────────────────────────────────
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  // ── 로딩 ─────────────────────────────────────────────────────────────────────
  if (isLoading || fetchingOrders) {
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

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) => (
            <div key={status} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-black text-white">
                {orders.filter((o) => o.status === status).length}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">총 매출 (취소 제외)</p>
            <p className="text-3xl font-black text-yellow-400">₩{totalRevenue.toLocaleString()}</p>
          </div>
          <p className="text-sm text-gray-500">전체 {orders.length}건</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit border border-gray-800">
          {(['orders', 'users'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'orders' ? '주문 관리' : '사용자 관리'}
            </button>
          ))}
        </div>

        {/* ── 주문 관리 탭 ─────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800">
              <h2 className="font-bold text-white">주문 목록</h2>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center text-gray-600">주문이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500">
                      <th className="text-left p-4 font-medium">주문번호</th>
                      <th className="text-left p-4 font-medium">고객</th>
                      <th className="text-left p-4 font-medium">상태</th>
                      <th className="text-right p-4 font-medium">금액</th>
                      <th className="text-left p-4 font-medium">다운로드 링크</th>
                      <th className="text-left p-4 font-medium">열람</th>
                      <th className="text-left p-4 font-medium">일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        {/* 주문번호 + 상태 변경 */}
                        <td className="p-4">
                          <span className="font-mono text-xs text-gray-400 block mb-1">
                            {order.order_number}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                            <select
                              value={order.status}
                              disabled={updatingId === order.id}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none disabled:opacity-50"
                            >
                              {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* 고객 이메일 */}
                        <td className="p-4 text-xs text-gray-400">
                          {order.user_email}
                        </td>

                        {/* 금액 (별도 컬럼 제거, 주문번호 밑으로 합침 — 여기선 유지) */}
                        <td className="p-4 text-right font-medium text-white">
                          {order.total > 0 ? `₩${order.total.toLocaleString()}` : '무료'}
                        </td>

                        {/* 금액 컬럼 비움 (헤더와 맞춤) */}
                        <td className="p-4"></td>

                        {/* 파일 URL 설정 + 추적 링크 복사 */}
                        <td className="p-4 min-w-[260px]">
                          {order.file_url ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-400 truncate max-w-[120px]">
                                ✓ 설정됨
                              </span>
                              <button
                                onClick={() => copyTrackingUrl(order.id, order.access_token)}
                                className="text-xs px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded-lg hover:bg-indigo-900/80 transition-colors whitespace-nowrap"
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
                                onChange={(e) =>
                                  setFileUrlInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                                }
                                className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 min-w-0"
                              />
                              <button
                                onClick={() => handleSaveFileUrl(order.id)}
                                disabled={!fileUrlInputs[order.id] || savingFileUrl === order.id}
                                className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40 whitespace-nowrap"
                              >
                                {savingFileUrl === order.id ? '…' : '저장'}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 다운로드 열람 */}
                        <td className="p-4">
                          {order.download_opened_at ? (
                            <div className="text-xs">
                              <p className="text-emerald-400">{order.download_count}회 열람</p>
                              <p className="text-gray-600 mt-0.5">
                                {new Date(order.download_opened_at).toLocaleDateString('ko-KR', {
                                  month: 'short', day: 'numeric',
                                })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">미열람</span>
                          )}
                        </td>

                        {/* 주문 일시 */}
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('ko-KR', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 사용자 관리 탭 ───────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">사용자 목록</h2>
              <span className="text-xs text-gray-500">{users.length}명</span>
            </div>

            {fetchingUsers ? (
              <div className="p-12 text-center text-gray-600 animate-pulse">불러오는 중…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500">
                    <th className="text-left p-4 font-medium">이메일</th>
                    <th className="text-left p-4 font-medium">이름</th>
                    <th className="text-left p-4 font-medium">가입일</th>
                    <th className="text-left p-4 font-medium">권한</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4 text-gray-300">{u.email}</td>
                      <td className="p-4 text-gray-400">{u.name || '—'}</td>
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
                            {togglingId === u.id ? '…' : u.is_admin ? '관리자 해제' : '관리자 지정'}
                          </button>
                          {u.id === user?.id && (
                            <span className="text-xs text-gray-600">(본인)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
