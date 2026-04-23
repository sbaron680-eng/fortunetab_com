/**
 * ChatWindow 429 Retry-After UX regression tests.
 *
 * 목적: 서버가 rate_limit 초과 시 {status: 429, body.retry_after_sec, header 'Retry-After'}
 * 로 응답하는 계약과 클라이언트의 cooldown UX 처리가 일치하는지 보장.
 *
 * 실행:
 *   npx vitest run src/components/chat/ChatWindow.test.tsx
 *
 * 예상 실패 케이스 3가지:
 *   1. Retry-After 헤더가 음수/NaN/Infinity → 60s default 사용 실패
 *   2. 429 아닌 에러에서도 optimistic user message가 사라지는 회귀
 *   3. 카운트다운 종료 후 ChatInput이 재활성화되지 않는 타이머 누수
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWindow from './ChatWindow';

// useI18n / interpolate 스텁 — ChatWindow가 필요로 하는 최소 사전
vi.mock('@/lib/i18n/client', () => ({
  useI18n: () => ({
    t: {
      chat: {
        rateLimited: '요청이 너무 빠릅니다. {seconds}초 후 다시 시도해주세요',
        needCredits: '크레딧이 부족합니다',
        placeholder: '메시지를 입력하세요...',
        send: '전송',
        messagesLeft: '남은 메시지: {count}개',
        sessionEnded: '대화가 완료되었습니다',
      },
      common: { error: '오류가 발생했습니다' },
    },
    locale: 'ko',
  }),
  interpolate: (s: string, vars: Record<string, unknown>) =>
    Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      s,
    ),
}));

// Supabase lazy import 스텁 — getToken() 항상 성공
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

/** 429 응답을 만드는 헬퍼 */
function make429(opts: { retryAfterHeader?: string | null; bodySec?: number | null }) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (opts.retryAfterHeader !== undefined && opts.retryAfterHeader !== null) {
    headers.set('Retry-After', opts.retryAfterHeader);
  }
  const body: Record<string, unknown> = { error: 'rate_limited' };
  if (opts.bodySec !== undefined && opts.bodySec !== null) {
    body.retry_after_sec = opts.bodySec;
  }
  return new Response(JSON.stringify(body), { status: 429, headers });
}

function getInput(): HTMLTextAreaElement {
  return screen.getByRole('textbox') as HTMLTextAreaElement;
}

/**
 * userEvent는 기본적으로 real timer 지연을 사용한다. fake-timer 환경에서는
 * `advanceTimers`를 명시하지 않으면 `user.type`이 정지할 위험이 있음.
 */
async function sendMessage(text: string, opts: { fakeTimers?: boolean } = {}) {
  const user = userEvent.setup(
    opts.fakeTimers ? { advanceTimers: vi.advanceTimersByTime } : undefined,
  );
  await user.type(getInput(), text);
  await user.keyboard('{Enter}');
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  // fetch mock 매 테스트마다 초기화
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('ChatWindow — 429 Retry-After UX', () => {
  it('Retry-After 헤더 값을 cooldown 초로 사용하고, 에러 메시지 + 입력 비활성화 + 낙관적 유저 메시지 롤백', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      make429({ retryAfterHeader: '30', bodySec: 99 /* 헤더 우선 검증 */ }),
    );

    render(<ChatWindow sessionId="s1" maxMessages={10} />);
    await sendMessage('hi');

    // 에러 메시지는 헤더값 30 기반
    expect(await screen.findByText('요청이 너무 빠릅니다. 30초 후 다시 시도해주세요')).toBeInTheDocument();

    // ChatInput disabled
    expect(getInput()).toBeDisabled();

    // 낙관적 유저 메시지(본문 'hi')가 DOM에 없어야 함
    expect(screen.queryByText('hi')).not.toBeInTheDocument();
  });

  it('헤더 없으면 body.retry_after_sec로 fallback', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      make429({ retryAfterHeader: null, bodySec: 45 }),
    );

    render(<ChatWindow sessionId="s1" maxMessages={10} />);
    await sendMessage('hi');

    expect(
      await screen.findByText('요청이 너무 빠릅니다. 45초 후 다시 시도해주세요'),
    ).toBeInTheDocument();
  });

  it('헤더/body 모두 비정상(NaN/음수)이면 60초 default', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      make429({ retryAfterHeader: 'not-a-number', bodySec: -5 }),
    );

    render(<ChatWindow sessionId="s1" maxMessages={10} />);
    await sendMessage('hi');

    expect(
      await screen.findByText('요청이 너무 빠릅니다. 60초 후 다시 시도해주세요'),
    ).toBeInTheDocument();
  });

  it('카운트다운 종료 시 ChatInput 재활성화 + 에러 메시지 제거', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      make429({ retryAfterHeader: '3' }),
    );

    render(<ChatWindow sessionId="s1" maxMessages={10} />);
    await sendMessage('hi', { fakeTimers: true });

    // 3초 cooldown 활성 확인
    expect(
      await screen.findByText('요청이 너무 빠릅니다. 3초 후 다시 시도해주세요'),
    ).toBeInTheDocument();
    expect(getInput()).toBeDisabled();

    // 단일 `advanceTimersByTimeAsync(4000)`은 ChatWindow의 연쇄 setTimeout→setState→재스케줄
    // 사이클을 한 턴 안에 다 flush하지 못해 disabled 해제가 뒤처진다. 1초씩 4회로 분할해
    // 각 React 커밋이 별개 act 안에서 완결되도록 한다.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    expect(getInput()).not.toBeDisabled();
    expect(
      screen.queryByText(/요청이 너무 빠릅니다/),
    ).not.toBeInTheDocument();
  });

  it('insufficient_credits는 rate-limit UX 비활성 + 낙관적 유저 메시지 유지', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'insufficient_credits' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<ChatWindow sessionId="s1" maxMessages={10} />);
    await sendMessage('hi');

    // needCredits 번역 적용
    expect(await screen.findByText('크레딧이 부족합니다')).toBeInTheDocument();

    // 429 아니므로 ChatInput은 정상 (disabled는 isStreaming/ messagesLeft 조건뿐)
    expect(getInput()).not.toBeDisabled();

    // 유저 메시지는 유지 — 재전송 시 컨텍스트 보존
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
});
