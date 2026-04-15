'use client';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-step-in`}>
      <div
        className={`
          max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-ft-ink text-white rounded-br-md'
            : 'bg-white border border-ft-border text-ft-body rounded-bl-md'
          }
        `}
      >
        <div className="whitespace-pre-wrap break-words">{content}</div>
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-ft-muted/50 ml-0.5 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
