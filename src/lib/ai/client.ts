/**
 * Claude API 클라이언트 — 스트리밍 대화
 *
 * Anthropic SDK를 직접 사용하여 SSE 스트리밍 응답을 생성합니다.
 * Cloudflare Pages 배포 호환.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessageRow } from '@/lib/supabase';

// ─── 설정 ────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6-20250514';
const MAX_TOKENS = 1024;

// 컨텍스트 윈도우 관리 — 최근 메시지만 포함
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_TOKENS_ESTIMATE = 8000; // 대략적 토큰 제한

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

// ─── 메시지 히스토리 정리 ────────────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * DB 메시지를 Claude API 형식으로 변환 + 컨텍스트 윈도우 관리
 *
 * - system 메시지 제외 (시스템 프롬프트는 별도 전달)
 * - 최근 MAX_HISTORY_MESSAGES개까지
 * - 대략적 토큰 수 기준으로 오래된 메시지 제거
 */
export function trimHistory(messages: ChatMessageRow[]): ClaudeMessage[] {
  // system 역할 필터 + user/assistant만
  const filtered = messages
    .filter((m): m is ChatMessageRow & { role: 'user' | 'assistant' } =>
      m.role === 'user' || m.role === 'assistant'
    )
    .slice(-MAX_HISTORY_MESSAGES);

  // 토큰 추정 (영어: ~4자/토큰, 한국어: ~2자/토큰 → 평균 ~3자)
  let totalChars = 0;
  const maxChars = MAX_HISTORY_TOKENS_ESTIMATE * 3;

  const result: ClaudeMessage[] = [];
  for (let i = filtered.length - 1; i >= 0; i--) {
    totalChars += filtered[i].content.length;
    if (totalChars > maxChars) break;
    result.unshift({ role: filtered[i].role, content: filtered[i].content });
  }

  // 첫 메시지가 assistant면 제거 (Claude API 요구: user가 먼저)
  if (result.length > 0 && result[0].role === 'assistant') {
    result.shift();
  }

  return result;
}

// ─── 스트리밍 응답 생성 ──────────────────────────────────────────────

export interface StreamChatParams {
  systemPrompt: string;
  messages: ClaudeMessage[];
}

/**
 * Claude API 스트리밍 호출 → ReadableStream 반환
 *
 * SSE 형식으로 텍스트 청크를 전송합니다.
 * API route에서 이 스트림을 Response body로 사용합니다.
 */
export function createChatStream(params: StreamChatParams): ReadableStream<Uint8Array> {
  const { systemPrompt, messages } = params;
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const client = getClient();

        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        // 완료 신호
        const finalMessage = await stream.finalMessage();
        const usage = {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, usage })}\n\n`));
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
        controller.close();
      }
    },
  });
}

// ─── 비스트리밍 (단일 응답) ──────────────────────────────────────────

export async function chatOnce(params: StreamChatParams): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: params.systemPrompt,
    messages: params.messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  return {
    content: text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
