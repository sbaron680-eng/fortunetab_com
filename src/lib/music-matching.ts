/**
 * FT-1 "오늘의 음악" — 사주 5행 기반 트랙 매칭 로직.
 *
 * MVP 매핑 규칙 (추후 정식 5행 매핑으로 교체):
 *   - 사용자 본명 최강 5행 + 오늘 일진 5행 → mood_tags 필터
 *   - music_lyrics_analysis.mood_tags overlap 검색
 *   - seed = hash(user_id + day-of-year) → 결정적 선택 (같은 날 같은 사용자 같은 곡)
 */

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SajuResult } from '@/lib/fortune/types';
import { calcDayPillar } from '@/lib/fortune/saju-core';

// ── 상수 ──────────────────────────────────────────────────────────────────

export const ELEM_LIST = ['목', '화', '토', '금', '수'] as const;
export type Elem = (typeof ELEM_LIST)[number];

/**
 * 5행 → 우선 mood_tags (MVP 초안)
 * 정식 규칙은 추후 교체. 각 5행당 3-5개 mood.
 */
export const ELEM_TO_MOODS: Record<Elem, string[]> = {
  목: ['hopeful', 'uplifting', 'euphoric', 'carefree', 'playful'],
  화: ['defiant', 'intense', 'energetic', 'anthemic', 'passionate'],
  토: ['tender', 'serene', 'nostalgic', 'reassuring', 'earnest'],
  금: ['melancholic', 'bitter', 'resigned', 'wounded', 'regretful'],
  수: ['dreamy', 'wistful', 'vulnerable', 'yearning', 'contemplative'],
};

// ── 5행 추출 ──────────────────────────────────────────────────────────────

/**
 * 사주의 5행 카운트 중 가장 높은 원소 반환.
 * 동률이면 ELEM_LIST 순서 우선.
 */
export function strongestElem(saju: SajuResult): Elem {
  const counts = saju.elemCount;
  if (!counts) return '토';
  let best: Elem = '토';
  let bestCount = -1;
  for (const e of ELEM_LIST) {
    const c = counts[e] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = e;
    }
  }
  return best;
}

/**
 * 오늘 일진(日辰)의 천간 오행.
 * fortune/saju-core.ts의 `calcDayPillar`를 재사용 — JDN(율리우스일) 기반 60갑자 계산.
 * 검증: 2000-01-01 → 戊午日(토), 1900-01-01 → 甲戌日(목) 일치.
 */
export function todayDayElem(now: Date = new Date()): Elem {
  const pillar = calcDayPillar(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  return pillar.stemElem as Elem;
}

// ── 매칭 쿼리 ─────────────────────────────────────────────────────────────

export interface MusicMatchCandidate {
  track_id: number;
  title: string;
  artist: string;
  youtube_id: string | null;
  themes: string[];
  mood_tags: string[];
  hook_phrase: string | null;
  summary: string | null;
}

/**
 * Project 2 (music DB) 클라이언트. 서버 전용.
 * 읽기 전용이라 anon key 사용 (민감 데이터 없음).
 */
export function createMusicClient(): SupabaseClient {
  const url = process.env.MUSIC_DB_URL;
  const key = process.env.MUSIC_DB_ANON_KEY;
  if (!url || !key) {
    throw new Error('MUSIC_DB_URL / MUSIC_DB_ANON_KEY 미설정');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * 사용자 5행 + 오늘 일진 → mood 후보 집합 → 매칭 트랙 pool.
 * youtube_id 필수. music_lyrics_analysis에 있는 것만.
 */
export async function fetchCandidates(
  music: SupabaseClient,
  userElem: Elem,
  dayElem: Elem,
  limit = 200,
): Promise<MusicMatchCandidate[]> {
  const moodPool = Array.from(
    new Set([...ELEM_TO_MOODS[userElem], ...ELEM_TO_MOODS[dayElem]]),
  );

  // PostgREST array overlap: mood_tags && {hopeful,...}
  // supabase-js: .overlaps("mood_tags", moodPool)
  const { data, error } = await music
    .from('music_lyrics_analysis')
    .select(
      'track_id, themes, mood_tags, hook_phrase, summary, ' +
        'music_tracks!inner(title, youtube_id, artist_id, music_artists!inner(name))',
    )
    .overlaps('mood_tags', moodPool)
    .not('music_tracks.youtube_id', 'is', null)
    .limit(limit);

  if (error) throw error;

  // Supabase join 결과 펼침
  return (data ?? []).map((row: any) => ({
    track_id: row.track_id,
    title: row.music_tracks.title,
    artist: row.music_tracks.music_artists.name,
    youtube_id: row.music_tracks.youtube_id,
    themes: row.themes ?? [],
    mood_tags: row.mood_tags ?? [],
    hook_phrase: row.hook_phrase,
    summary: row.summary,
  }));
}

// ── 결정적 선택 ───────────────────────────────────────────────────────────

/**
 * 문자열 → 32-bit 해시 (FNV-1a 간이 구현).
 * 같은 (user_id, date) 조합은 항상 같은 인덱스 → 같은 날 같은 곡 보장.
 */
function hashFnv(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function pickDeterministic<T>(
  candidates: T[],
  userId: string,
  date: Date,
): T | null {
  if (candidates.length === 0) return null;
  const key = `${userId}:${date.toISOString().slice(0, 10)}`;
  const idx = hashFnv(key) % candidates.length;
  return candidates[idx];
}
