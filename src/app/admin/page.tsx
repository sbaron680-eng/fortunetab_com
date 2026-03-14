'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { fetchAllOrders, updateOrderStatus } from '@/lib/orders';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';

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

interface OrderRow {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_items?: Array<{ product_name: string; qty: number; price: number }>;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (!user.isAdmin) {
      router.replace('/');
      return;
    }
    fetchAllOrders().then((data) => {
      setOrders(data as OrderRow[]);
      setFetching(false);
    });
  }, [user, isLoading, router]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    const ok = await updateOrderStatus(orderId, status);
    if (ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    }
    setUpdatingId(null);
  };

  // ── 요약 통계 ────────────────────────────────────────────────────────────────
  const stats = (Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
    total: orders.filter((o) => o.status === status).reduce((sum, o) => sum + o.total, 0),
  }));

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  // ── 로딩 / 접근 제한 ────────────────────────────────────────────────────────
  if (isLoading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">관리자 대시보드</h1>
          <p className="text-sm text-gray-400 mt-1">FortuneTab 주문 관리</p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {stats.map(({ status, count }) => (
            <div key={status} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-black text-white">{count}</p>
            </div>
          ))}
        </div>

        {/* 총 매출 */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-8">
          <p className="text-xs text-gray-500 mb-1">총 매출 (취소 제외)</p>
          <p className="text-3xl font-black text-[#f0c040]">
            ₩{totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">전체 {orders.length}건</p>
        </div>

        {/* 주문 테이블 */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800">
            <h2 className="font-bold text-white">주문 목록</h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-10 text-center text-gray-500">주문이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500">
                    <th className="text-left p-4 font-medium">주문번호</th>
                    <th className="text-left p-4 font-medium">상품</th>
                    <th className="text-right p-4 font-medium">금액</th>
                    <th className="text-left p-4 font-medium">일시</th>
                    <th className="text-left p-4 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-mono text-xs text-gray-300">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          {order.order_items?.map((item, i) => (
                            <p key={i} className="text-xs text-gray-400">
                              {item.product_name}
                              {item.qty > 1 && (
                                <span className="text-gray-600"> ×{item.qty}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium text-white">
                        {order.total > 0 ? `₩${order.total.toLocaleString()}` : '무료'}
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                          >
                            {STATUS_LABELS[order.status]}
                          </span>
                          <select
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          {updatingId === order.id && (
                            <svg
                              className="animate-spin w-3 h-3 text-indigo-400"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
