'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { supabase, type FtSessionRow } from '@/lib/supabase';
import Link from 'next/link';

const PHASE_COLORS: Record<string, string> = {
  '상승기': 'text-emerald-600',
  '안정기': 'text-blue-600',
  '전환기': 'text-amber-600',
  '하강기': 'text-red-600',
};

export default function HistoryPage() {
  const router = useRouter();
  const { user, isAuthReady } = useAuthStore();
  const [sessions, setSessions] = useState<FtSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    async function loadSessions() {
      const { data } = await supabase
        .from('ft_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setSessions((data as FtSessionRow[]) ?? []);
      setIsLoading(false);
    }

    loadSessions();
  }, [user, isAuthReady, router]);

  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-ft-muted" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-20 px-6">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ft-ink">세션 히스토리</h1>
            <p className="text-sm text-ft-muted mt-1">지난 발굴 세션 기록</p>
          </div>
          <Link
            href="/session"
            className="px-4 py-2 rounded-xl bg-ft-ink text-white text-sm font-medium hover:bg-ft-ink/90 btn-press transition-colors"
          >
            새 세션
          </Link>
        </div>

        {/* 빈 상태 */}
        {sessions.length === 0 && (
          <div className="bg-white border border-ft-border rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <p className="text-ft-muted mb-4">아직 완료된 세션이 없습니다</p>
            <Link
              href="/session"
              className="inline-block px-6 py-2 rounded-xl bg-ft-ink text-white text-sm font-medium btn-press hover:bg-ft-ink/90 transition-colors"
            >
              첫 세션 시작하기
            </Link>
          </div>
        )}

        {/* 세션 리스트 */}
        <div className="space-y-3">
          {sessions.map((s) => {
            const result = s.result as Record<string, unknown> | null;
            const answers = s.answers as Record<string, string>;
            const firstSprout = answers?.firstSprout ?? '';
            const createdDate = new Date(s.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <div
                key={s.id}
                className="bg-white border border-ft-border rounded-2xl p-5 hover-lift transition-all"
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
                    <p className="text-xs text-ft-muted">{createdDate}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-ft-ink">
                      {s.fortune_score != null ? Math.round(((s.fortune_score + 1) / 2) * 100) : '–'}
                    </div>
                    <div className="text-xs text-ft-muted">Score</div>
                  </div>
                </div>

                {/* 첫 싹 선언 미리보기 */}
                {firstSprout && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-emerald-700 line-clamp-2">
                      🌱 {firstSprout}
                    </p>
                  </div>
                )}

                {/* 결과 존재 여부 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ft-muted">
                    {result ? '✓ 분석 완료' : '미완료'}
                  </span>
                  <Link
                    href={`/session/result?id=${s.id}`}
                    className="text-xs font-medium text-ft-ink underline"
                  >
                    결과 보기
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
