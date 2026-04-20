'use client';

/**
 * FT-1 "오늘의 음악" 카드.
 *
 * 사용자 사주 + 오늘 일진 5행 기반 1곡 추천 + YouTube 임베드 + Claude 1줄 코멘트.
 * 로그인 필요 (Bearer token 자동 첨부).
 *
 * 사용: <DailyMusicCard /> — 대시보드 상단 섹션에 삽입.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DailyMusicPick {
  track_id: number;
  artist: string;
  title: string;
  youtube_id: string | null;
  themes: string[];
  mood_tags: string[];
  hook_phrase: string | null;
  summary: string | null;
  pick_reason: string | null;
  user_elem: string;
  day_elem: string;
  date: string;
  cached: boolean;
}

const ELEM_EMOJI: Record<string, string> = {
  목: '🌿',
  화: '🔥',
  토: '🪨',
  금: '⚔️',
  수: '💧',
};

export function DailyMusicCard() {
  const [pick, setPick] = useState<DailyMusicPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          if (!cancelled) setError('로그인이 필요합니다.');
          return;
        }
        const r = await fetch('/api/daily-music', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          if (!cancelled)
            setError(body.error === 'no_candidates'
              ? '오늘 매칭 가능한 곡을 찾지 못했어요.'
              : `추천 불러오기 실패 (${r.status})`);
          return;
        }
        const data = (await r.json()) as DailyMusicPick;
        if (!cancelled) setPick(data);
      } catch (e) {
        if (!cancelled) setError('네트워크 오류');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-48 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error || !pick) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <p className="font-medium text-slate-700">🎵 오늘의 음악</p>
        <p className="mt-2">{error ?? '추천을 준비하지 못했어요.'}</p>
      </div>
    );
  }

  const embedUrl = pick.youtube_id
    ? `https://www.youtube.com/embed/${pick.youtube_id}`
    : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            🎵 오늘의 음악
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {pick.artist} — {pick.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span title="본명 최강 오행">
            나 {ELEM_EMOJI[pick.user_elem] ?? ''} {pick.user_elem}
          </span>
          <span className="text-slate-300">·</span>
          <span title="오늘 일진 오행">
            오늘 {ELEM_EMOJI[pick.day_elem] ?? ''} {pick.day_elem}
          </span>
        </div>
      </header>

      {pick.pick_reason && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {pick.pick_reason}
        </p>
      )}

      {embedUrl && (
        <div className="mt-4 aspect-video overflow-hidden rounded-lg bg-slate-900">
          <iframe
            className="h-full w-full"
            src={embedUrl}
            title={`${pick.artist} - ${pick.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {pick.hook_phrase && (
        <blockquote className="mt-4 border-l-4 border-slate-300 pl-3 text-sm italic text-slate-600">
          “{pick.hook_phrase}”
        </blockquote>
      )}

      {(pick.themes.length > 0 || pick.mood_tags.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {pick.themes.slice(0, 3).map((t) => (
            <span
              key={`t-${t}`}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              {t}
            </span>
          ))}
          {pick.mood_tags.slice(0, 3).map((m) => (
            <span
              key={`m-${m}`}
              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] text-slate-400">
        AI 추천은 참고 용도이며 전문 상담을 대체하지 않습니다.
      </p>
    </section>
  );
}
