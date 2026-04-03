import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calcFortuneScore } from '@/lib/fortune-score';

export const runtime = 'edge';

/**
 * POST /api/fortune/score
 *
 * Solodesk 등 외부 서비스에서 호출하는 Fortune Score API.
 * 인증: Supabase JWT (Authorization: Bearer <token>)
 * 캐싱: 동일 사용자 + 같은 날짜 → 24시간 캐시 헤더
 *
 * Body: { birth_date: "YYYY-MM-DD", birth_time: "자시"~"모름", gender: "male"|"female" }
 * Response: { fortuneScore, fortunePercent, daunPhase, grade, recommendation }
 */

interface ScoreRequest {
  birth_date: string;
  birth_time: string;
  gender: string;
}

const GRADE_RECOMMENDATIONS: Record<string, string> = {
  optimal: '지금이 가장 좋은 타이밍입니다. 중요한 결정을 내리세요.',
  good: '흐름을 타고 시작하기 좋은 시기입니다.',
  neutral: '차분하게 준비하는 시기입니다. 정보를 모으세요.',
  rest: '에너지를 충전하는 시기입니다. 큰 결정은 미루세요.',
};

export async function POST(request: NextRequest) {
  try {
    // JWT 인증
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ScoreRequest;

    if (!body.birth_date || !body.gender) {
      return NextResponse.json({ error: 'birth_date and gender are required' }, { status: 400 });
    }

    // Fortune Score 계산
    const result = calcFortuneScore(
      body.birth_date,
      body.birth_time ?? '모름',
      body.gender,
    );

    const response = NextResponse.json({
      fortuneScore: result.fortuneScore,
      fortunePercent: result.fortunePercent,
      daunPhase: result.daunPhase,
      daunSipsin: result.daunSipsin,
      grade: result.grade.grade,
      gradeLabel: result.grade.label,
      recommendation: GRADE_RECOMMENDATIONS[result.grade.grade],
      biorhythm: {
        cycles: result.biorhythm.cycles,
        bioScore: result.biorhythm.bioScore,
        bioPercent: result.biorhythm.bioPercent,
      },
    });

    // 24시간 캐시 (같은 사용자+같은 날 요청 시)
    response.headers.set('Cache-Control', 'private, max-age=86400');

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Score calculation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
