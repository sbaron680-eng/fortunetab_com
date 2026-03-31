'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { fetchMyOrders } from '@/lib/orders';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';

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

interface MyOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  file_url: string | null;
  access_token: string;
  download_opened_at: string | null;
  created_at: string;
  items: Array<{ product_name: string; price: number; qty: number }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthReady, logout } = useAuthStore();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;  // 인증 초기화 완료 대기
    if (!user) { router.replace('/auth/login'); return; }

    fetchMyOrders().then((data) => {
      setOrders(data as MyOrder[]);
      setFetching(false);
    });
  }, [user, isAuthReady, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!isAuthReady || fetching) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center">
        <svg className="animate-spin w-7 h-7 text-ft-ink" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* 프로필 헤더 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-ft-muted mb-1">로그인 계정</p>
            <p className="font-bold text-ft-ink">{user?.name}</p>
            <p className="text-sm text-ft-muted">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
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
                관리자 대시보드 →
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

        {/* 주문 내역 */}
        <div className="bg-white border border-ft-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-ft-border">
            <h2 className="font-bold text-ft-ink">주문 내역</h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-ft-muted text-sm mb-4">아직 주문 내역이 없습니다.</p>
              <Link
                href="/products"
                className="inline-block px-5 py-2.5 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors"
              >
                플래너 둘러보기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ft-border">
              {orders.map((order) => (
                <div key={order.id} className="p-5">
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

                  {/* 다운로드 버튼 (file_url이 있는 경우) */}
                  {order.status === 'completed' && order.file_url && (
                    <a
                      href={`/download/view?order=${order.id}&token=${order.access_token}`}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-ft-gold text-ft-ink font-bold rounded-xl text-sm hover:bg-ft-gold-h transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      PDF 다운로드
                      {order.download_opened_at && (
                        <span className="text-xs font-normal opacity-70">(열람 완료)</span>
                      )}
                    </a>
                  )}

                  {/* 이메일 발송 완료 안내 (file_url 없이 completed된 자동 생성 주문) */}
                  {order.status === 'completed' && !order.file_url && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 border border-emerald-100 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <div>
                        <p className="font-medium">맞춤 플래너가 이메일로 발송되었습니다</p>
                        <p className="mt-0.5 opacity-80">주문 시 입력하신 이메일의 받은편지함을 확인해 주세요. 스팸함도 함께 확인해 주시기 바랍니다.</p>
                        <p className="mt-1 text-amber-600 opacity-90">PDF 파일은 발송일로부터 30일간 보관됩니다. 수신 후 즉시 다운로드해 주세요.</p>
                      </div>
                    </div>
                  )}

                  {/* 제작 중 안내 */}
                  {(order.status === 'paid' || order.status === 'processing') && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-700 border border-indigo-100">
                      사주 분석 후 맞춤 제작 중입니다. 완료 시 이메일로 PDF가 발송됩니다.
                    </div>
                  )}

                  {/* 대기 중 안내 (pending) */}
                  {order.status === 'pending' && order.total > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-xl text-xs text-yellow-700 border border-yellow-100">
                      결제 확인 후 맞춤 플래너를 자동으로 생성하여 이메일로 발송해 드립니다.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 고객센터 안내 */}
        <p className="text-center text-xs text-ft-muted">
          문의사항:{' '}
          <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">
            sbaron680@gmail.com
          </a>
          &nbsp;·&nbsp; 평일 10:00 – 18:00
        </p>

      </div>
    </div>
  );
}
