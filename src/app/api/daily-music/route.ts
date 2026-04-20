/**
 * FT-1 "오늘의 음악" API Route.
 *
 * GET /api/daily-music
 *   Headers: Authorization: Bearer <user-token>
 *   Response: DailyMusicPick JSON
 *
 * 흐름:
 *   1. 사용자 인증 (Project 1 token)
 *   2. 캐시 조회 (ft_daily_music_cache where user_id+date=today)
 *   3. miss면 → fortune_profiles에서 saju → 5행 추출
 *              → Project 2 후보 쿼리 → 결정적 pick
 *              → Claude 1줄 코멘트 → cache upsert
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createUserClient } from '@/lib/supabase-server';
import {
  strongestElem,
  todayDayElem,
  ELEM_TO_MOODS,
  createMusicClient,
  fetchCandidates,
  pickDeterministic,
  type Elem,
} from '@/lib/music-matching';

export const runtime = 'nodejs';   // Cloudflare Pages: Node compat 필요 (anthropic fetch)

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
  user_elem: Elem;
  day_elem: Elem;
  date: string;
  cached: boolean;
}

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

async function generatePickReason(
  userElem: Elem,
  dayElem: Elem,
  artist: string,
  title: string,
  summary: string | null,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const prompt =
    `사용자의 본명 최강 오행은 "${userElem}", 오늘 일진 오행은 "${dayElem}"입니다. ` +
    `오늘의 추천곡은 "${artist} — ${title}"이고 가사 요약은 "${summary ?? ''}". ` +
    `왜 이 오행 조합에게 이 곡이 어울리는지 1-2문장(80자 이내)으로 담백하게 써주세요. ` +
    `JSON·따옴표·영어 단어 섞지 말고 한국어 평문만.`;

  try {
    const r = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { content?: Array<{ text?: string }> };
    return body.content?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ftClient = createUserClient(req);
  if (!ftClient) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 현재 로그인 사용자
  const { data: userData } = await ftClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const admin = createServiceClient();

  // 1. 캐시 확인
  const { data: cached } = await admin
    .from('ft_daily_music_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({
      track_id: cached.track_id,
      artist: cached.artist_name,
      title: cached.track_title,
      youtube_id: cached.youtube_id,
      themes: cached.themes ?? [],
      mood_tags: cached.mood_tags ?? [],
      hook_phrase: cached.hook_phrase,
      summary: cached.summary,
      pick_reason: cached.pick_reason,
      user_elem: cached.user_elem,
      day_elem: cached.day_elem,
      date: cached.date,
      cached: true,
    } as DailyMusicPick);
  }

  // 2. 사주 프로필에서 최강 5행 추출 (없으면 '토' 기본)
  const { data: profile } = await admin
    .from('fortune_profiles')
    .select('saju_data')
    .eq('user_id', userId)
    .maybeSingle();

  const userElem: Elem = profile?.saju_data
    ? strongestElem(profile.saju_data as any)
    : '토';
  const dayElem = todayDayElem(today);

  // 3. Project 2 후보 쿼리 → 결정적 pick
  const music = createMusicClient();
  const candidates = await fetchCandidates(music, userElem, dayElem, 200);
  const pick = pickDeterministic(candidates, userId, today);

  if (!pick) {
    return NextResponse.json(
      { error: 'no_candidates', user_elem: userElem, day_elem: dayElem },
      { status: 503 },
    );
  }

  // 4. Claude 1줄 코멘트 (실패해도 null로 진행)
  const pickReason = await generatePickReason(
    userElem,
    dayElem,
    pick.artist,
    pick.title,
    pick.summary,
  );

  // 5. 캐시 저장
  await admin.from('ft_daily_music_cache').upsert(
    {
      user_id: userId,
      date: dateStr,
      track_id: pick.track_id,
      youtube_id: pick.youtube_id,
      artist_name: pick.artist,
      track_title: pick.title,
      themes: pick.themes,
      mood_tags: pick.mood_tags,
      hook_phrase: pick.hook_phrase,
      summary: pick.summary,
      user_elem: userElem,
      day_elem: dayElem,
      pick_reason: pickReason,
    },
    { onConflict: 'user_id,date' },
  );

  const response: DailyMusicPick = {
    track_id: pick.track_id,
    artist: pick.artist,
    title: pick.title,
    youtube_id: pick.youtube_id,
    themes: pick.themes,
    mood_tags: pick.mood_tags,
    hook_phrase: pick.hook_phrase,
    summary: pick.summary,
    pick_reason: pickReason,
    user_elem: userElem,
    day_elem: dayElem,
    date: dateStr,
    cached: false,
  };
  return NextResponse.json(response);
}
