'use client';

/**
 * /chat?session=<uuid>
 *
 * AI Chat Session 진입점. `output: 'export'` 제약으로 dynamic segment 대신
 * search param으로 sessionId를 받는다 (`/chat/[id]`는 generateStaticParams
 * 없이 빌드 불가).
 *
 * 진입 전제: /session 에서 create-session Edge Function 호출 후 리다이렉트.
 * 인증 안 된 유저: /auth/login?next=/session 으로 돌려보냄.
 *
 * 테스트법:
 *   - 정상: /chat?session=<valid-uuid> → ChatWindow 렌더
 *   - session 없음: 세션 시작 안내 + /session 링크
 *   - 비로그인: /auth/login 리다이렉트
 *
 * 예상 오류 3:
 *   1. useSearchParams를 Suspense 없이 사용 → Next 16에서 빌드 경고
 *   2. sessionId가 UUID가 아닌 경우 → 서버 측 chat Edge Function에서 404
 *   3. 네트워크 장애 → ChatWindow가 에러 메시지 표시
 */

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import ChatWindow from '@/components/chat/ChatWindow';

const DEFAULT_MAX_MESSAGES = 30;

function ChatPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const router = useRouter();
  // NOTE: `isLoading`은 로그인 액션 진행 플래그. auth 초기화 완료 게이트는 `isAuthReady`.
  // isLoading로 가드하면 새로고침 시 세션 rehydrate 전에 로그인 리다이렉트가 발생.
  const { user, isAuthReady } = useAuthStore();

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth/login?next=/session');
    }
  }, [user, isAuthReady, router]);

  // 인증 초기화 대기
  if (!isAuthReady) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-ft-muted text-sm">
        로딩 중…
      </div>
    );
  }

  // 비로그인 (리다이렉트 pending)
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-ft-muted text-sm">
        로그인 페이지로 이동 중…
      </div>
    );
  }

  // sessionId 누락 — 직접 진입 시 /session으로 유도
  if (!sessionId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="font-serif text-xl font-semibold text-ft-ink">세션이 필요합니다</h1>
          <p className="text-sm text-ft-muted">
            명발굴 세션을 시작하려면 출생 정보 입력부터 시작하세요.
          </p>
          <Link
            href="/session"
            className="inline-block btn-press px-6 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm hover:bg-ft-ink/90"
          >
            세션 시작하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-ft-paper">
      <ChatWindow sessionId={sessionId} maxMessages={DEFAULT_MAX_MESSAGES} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-ft-muted text-sm">
          로딩 중…
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
