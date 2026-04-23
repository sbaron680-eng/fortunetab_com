'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/client';
import { interpolate } from '@/lib/i18n/client';
import MessageBubble from './MessageBubble';
import StreamingIndicator from './StreamingIndicator';
import ChatInput from './ChatInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWindowProps {
  sessionId: string;
  initialMessages?: Message[];
  maxMessages: number;
}

export default function ChatWindow({ sessionId, initialMessages = [], maxMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentMaxMessages, setCurrentMaxMessages] = useState(maxMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const getToken = async (): Promise<string | null> => {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const handleSend = async (message: string) => {
    setError(null);

    const token = await getToken();
    if (!token) {
      setError('Please log in to continue');
      return;
    }

    // Add user message immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');

    try {
      // Chat 엔드포인트: Supabase Edge Function (Cloudflare Pages output:'export' 제약으로 Route Handler 불가)
      // 2026-04-23 마이그레이션.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        setError('SUPABASE_URL 설정 누락');
        setIsStreaming(false);
        return;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, message }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        if (err.error === 'insufficient_credits') {
          setError(t.chat.needCredits);
        } else {
          setError(err.error || t.common.error);
        }
        setIsStreaming(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let sseBuffer = ''; // SSE line buffer for chunk-boundary safety
      const STREAM_TIMEOUT_MS = 60_000;
      const MAX_CHUNKS = 10_000;
      let chunks = 0;

      while (chunks < MAX_CHUNKS) {
        // 타임아웃 가드: 60초 내 응답 없으면 중단 (타이머 누수 방지)
        let timeoutId: ReturnType<typeof setTimeout>;
        const readPromise = reader.read();
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Stream timeout')), STREAM_TIMEOUT_MS);
        });
        const { done, value } = await Promise.race([readPromise, timeoutPromise]);
        clearTimeout(timeoutId!);
        if (done) break;
        chunks++;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? ''; // keep incomplete last line in buffer

        let shouldBreak = false;
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.maxMessages) {
              setCurrentMaxMessages(data.maxMessages);
            }
            if (data.text) {
              fullText += data.text;
              setStreamingText(fullText);
            }
            if (data.error) {
              setError(data.error);
              shouldBreak = true;
              break;
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // partial JSON — next line
            throw e;
          }
        }
        if (shouldBreak) break;
      }

      // Process any remaining complete line in buffer
      if (sseBuffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(sseBuffer.slice(6));
          if (data.text) {
            fullText += data.text;
            setStreamingText(fullText);
          }
        } catch {
          // ignore trailing partial
        }
      }

      // Add assistant message
      if (fullText) {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullText,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const messagesLeft = currentMaxMessages - userMessageCount;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-ft-muted text-sm">
            {t.chat.placeholder}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {isStreaming && streamingText && (
          <MessageBubble role="assistant" content={streamingText} isStreaming />
        )}
        {isStreaming && !streamingText && <StreamingIndicator />}

        {error && (
          <div className="text-center py-2">
            <p className="text-sm text-ft-red">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Status bar */}
      <div className="px-4 py-1.5 text-center border-t border-ft-border bg-ft-paper-alt">
        <p className="text-xs text-ft-muted">
          {messagesLeft > 0
            ? interpolate(t.chat.messagesLeft, { count: messagesLeft })
            : t.chat.sessionEnded
          }
        </p>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || messagesLeft <= 0}
      />
    </div>
  );
}
