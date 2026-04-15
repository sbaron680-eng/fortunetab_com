'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
// AI 서비스는 향후 프리미엄 분석에서 활용 (현재는 로컬 엔진 사용)
// import { analyzeSaju, analyzeCompatibility, analyzeCareer } from '@/lib/ai-service';
import {
  calculateSaju, getSipsinMap, detectSinsal, calcDaeun,
  detectZodiac, getYearGanzhi, elemCountToPercent,
  ELEM_KO, ELEM_HJ, ELEM_COLOR, ELEM_EMOJI,
  TIME_TO_BRANCH, ZODIAC_LIST, ZODIAC_SYMBOL,
  type SajuResult, type ElemKo, type SipsinName, type Sinsal, type DaeunPeriod,
} from '@/lib/saju';
import { generatePersonalizedFortune, type GeneratedFortuneResult } from '@/lib/fortune-generator';

// ── 타입 ──────────────────────────────────────────────────────
type FortuneTab = 'saju' | 'zodiac' | 'couple';

interface SajuFormState {
  name: string; year: string; month: string; day: string; time: string; gender: 'male' | 'female';
}

interface ZodiacFormState {
  name: string; birthDate: string;
}

interface CoupleFormState {
  name1: string; birthDate1: string; gender1: 'male' | 'female';
  name2: string; birthDate2: string; gender2: 'male' | 'female';
}

interface FortuneResult {
  summary: string;
  yearly_fortune: string;
  relationships: string;
  career: string;
  wealth: string;
  health: string;
  lucky_colors: string[];
  lucky_numbers: number[];
  lucky_directions?: string[];
  ohhaeng_balance?: Record<string, number>;
  shinsal?: string[];
  caution_months?: number[];
  saju_advice?: string;
  day_master?: string;
  compatibility_score?: number;
  compatibility_summary?: string;
  couple_advice?: string;
  couple_caution?: string;
  zodiac?: string;
  monthly_fortunes: Array<{ month: number; fortune: string; score: number; keywords: string[] }>;
  // 교차 분석 추가 필드
  today_fortune?: { score: number; grade: string; message: string };
  this_month?: { score: number; keywords: string[]; deepDive: string };
  fortune_score?: { percent: number; biorhythm: number; phase: string };
}

const TIME_OPTIONS = Object.keys(TIME_TO_BRANCH);

// ── Suspense 래퍼 (useSearchParams 필요) ─────────────────────
export default function FortunePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ft-paper" />}>
      <FortunePage />
    </Suspense>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
function FortunePage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<FortuneTab>('saju');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hasPurchase, setHasPurchase] = useState<boolean | null>(null);

  // URL ?type= 파라미터로 탭 설정
  useEffect(() => {
    const urlType = searchParams.get('type') as FortuneTab | null;
    if (urlType && ['saju', 'zodiac', 'couple'].includes(urlType)) {
      setTab(urlType);
    }
  }, [searchParams]);

  // 구매 확인
  useEffect(() => {
    if (!user) { setHasPurchase(false); return; }
    supabase
      .from('fortune_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', tab)
      .is('used_at', null)
      .maybeSingle()
      .then(({ data }) => setHasPurchase(!!data));
  }, [user, tab]);

  // 사주 폼
  const [sajuForm, setSajuForm] = useState<SajuFormState>({
    name: '', year: '1990', month: '1', day: '1', time: '모름', gender: 'male',
  });

  // 별자리 폼
  const [zodiacForm, setZodiacForm] = useState({ name: '', birthDate: '' });

  // 궁합 폼
  const [coupleForm, setCoupleForm] = useState<CoupleFormState>({
    name1: '', birthDate1: '', gender1: 'female',
    name2: '', birthDate2: '', gender2: 'male',
  });

  // 프로필 생년월일 자동 채움 (3개 탭 모두)
  useEffect(() => {
    if (!user?.birthDate) return;
    const [y, m, d] = user.birthDate.split('-').map(String);
    setSajuForm(prev => ({
      ...prev,
      name: user.name || prev.name,
      year: y, month: String(Number(m)), day: String(Number(d)),
      time: user.birthHour ?? '모름',
      gender: (user.gender as 'male' | 'female') ?? prev.gender,
    }));
    setZodiacForm(prev => ({
      ...prev,
      name: user.name || prev.name,
      birthDate: user.birthDate!,
    }));
    setCoupleForm(prev => ({
      ...prev,
      name1: user.name || prev.name1,
      birthDate1: user.birthDate!,
      gender1: (user.gender as 'male' | 'female') ?? prev.gender1,
    }));
    setProfileLoaded(true);
  }, [user?.birthDate, user?.birthHour, user?.gender, user?.name]);

  // 사주 엔진 결과 (로컬 계산)
  const [localSaju, setLocalSaju] = useState<{
    saju: SajuResult;
    sipsin: ReturnType<typeof getSipsinMap>;
    sinsal: Sinsal[];
    daeun: DaeunPeriod[];
  } | null>(null);

  // AI 해석 진행 상태
  const [aiLoading, setAiLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setError('');
    setResult(null);
    setLocalSaju(null);

    try {
      if (tab === 'saju') {
        const { name, year, month, day, time, gender } = sajuForm;
        const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        // ① 즉시: 로컬 사주 계산 + 교차 분석 결과 표시
        const saju = calculateSaju(Number(year), Number(month), Number(day), time);
        setLocalSaju({
          saju,
          sipsin: getSipsinMap(saju),
          sinsal: detectSinsal(saju),
          daeun: calcDaeun(saju, gender),
        });
        const targetYear = new Date().getFullYear();
        const localResult = generatePersonalizedFortune(saju, gender, Number(year), targetYear);
        setResult(localResult);
        setLoading(false);

        // ② 비동기: AI 해석 요청 (로그인 유저만)
        if (user) {
          setAiLoading(true);
          try {
            const aiData = await callSupabaseFortuneStructured({
              type: 'saju',
              input: { name: name || '사용자', birth_date: birthDate, birth_time: time, gender, year: targetYear },
            });
            if (aiData) {
              // AI 구조화 결과로 업그레이드 (로컬 교차 분석 필드는 유지)
              setResult(prev => prev ? {
                ...prev,
                summary: aiData.summary || prev.summary,
                yearly_fortune: aiData.yearly_fortune || prev.yearly_fortune,
                relationships: aiData.relationships || prev.relationships,
                career: aiData.career || prev.career,
                wealth: aiData.wealth || prev.wealth,
                health: aiData.health || prev.health,
                saju_advice: aiData.saju_advice || prev.saju_advice,
                lucky_colors: aiData.lucky_colors?.length ? aiData.lucky_colors : prev.lucky_colors,
                lucky_numbers: aiData.lucky_numbers?.length ? aiData.lucky_numbers : prev.lucky_numbers,
                lucky_directions: aiData.lucky_directions?.length ? aiData.lucky_directions : prev.lucky_directions,
                caution_months: aiData.caution_months?.length ? aiData.caution_months : prev.caution_months,
                monthly_fortunes: aiData.monthly_fortunes?.length ? aiData.monthly_fortunes : prev.monthly_fortunes,
              } : prev);
            }
          } catch (aiErr) {
            console.warn('AI 해석 실패 (로컬 결과 유지):', aiErr);
          } finally {
            setAiLoading(false);
          }
        }
        return; // early return — setLoading(false) already called above

      } else if (tab === 'zodiac') {
        const [y, m, d] = zodiacForm.birthDate.split('-').map(Number);
        const zodiac = detectZodiac(m, d);

        if (y && m && d) {
          // 로컬 교차 분석
          const saju = calculateSaju(y, m, d, '모름');
          const targetYear = new Date().getFullYear();
          const generated = generatePersonalizedFortune(saju, 'male', y, targetYear);
          setResult({
            ...generated,
            zodiac,
            summary: `⭐ ${zodiac} — ${generated.summary}`,
          });
          setLoading(false);

          // AI 향상 (로그인 유저)
          if (user) {
            setAiLoading(true);
            try {
              const aiData = await callSupabaseFortuneStructured({
                type: 'astrology',
                input: { name: zodiacForm.name || '사용자', birth_date: zodiacForm.birthDate, zodiac, year: targetYear },
              });
              if (aiData) {
                setResult(prev => prev ? {
                  ...prev,
                  summary: aiData.summary || prev.summary,
                  yearly_fortune: aiData.yearly_fortune || prev.yearly_fortune,
                  relationships: aiData.relationships || prev.relationships,
                  career: aiData.career || prev.career,
                  wealth: aiData.wealth || prev.wealth,
                  health: aiData.health || prev.health,
                  monthly_fortunes: aiData.monthly_fortunes?.length ? aiData.monthly_fortunes : prev.monthly_fortunes,
                } : prev);
              }
            } catch { /* 로컬 결과 유지 */ }
            finally { setAiLoading(false); }
          }
          return;
        }
      } else {
        // 궁합
        const [y1, m1, d1] = coupleForm.birthDate1.split('-').map(Number);
        const [y2, m2, d2] = coupleForm.birthDate2.split('-').map(Number);

        if (y1 && m1 && d1 && y2 && m2 && d2) {
          const saju1 = calculateSaju(y1, m1, d1, '모름');
          const saju2 = calculateSaju(y2, m2, d2, '모름');
          const generated = generateCoupleResult(saju1, saju2, coupleForm);
          setResult(generated);
          setLoading(false);

          // AI 향상 (로그인 유저)
          if (user) {
            setAiLoading(true);
            try {
              const aiData = await callSupabaseFortuneStructured({
                type: 'couple',
                input: {
                  person1: { name: coupleForm.name1, birth_date: coupleForm.birthDate1, gender: coupleForm.gender1 },
                  person2: { name: coupleForm.name2, birth_date: coupleForm.birthDate2, gender: coupleForm.gender2 },
                  year: new Date().getFullYear(),
                },
              });
              if (aiData) {
                setResult(prev => prev ? {
                  ...prev,
                  summary: aiData.summary || prev.summary,
                  compatibility_score: aiData.compatibility_score ?? prev.compatibility_score,
                  compatibility_summary: aiData.compatibility_summary || prev.compatibility_summary,
                  couple_advice: aiData.couple_advice || prev.couple_advice,
                  couple_caution: aiData.couple_caution || prev.couple_caution,
                  relationships: aiData.relationships || prev.relationships,
                  monthly_fortunes: aiData.monthly_fortunes?.length ? aiData.monthly_fortunes : prev.monthly_fortunes,
                } : prev);
              }
            } catch { /* 로컬 결과 유지 */ }
            finally { setAiLoading(false); }
          }
          return;
        } else {
          setError('두 사람의 생년월일을 모두 입력해 주세요.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 궁합 분석 로컬 생성
  function generateCoupleResult(
    saju1: SajuResult, saju2: SajuResult,
    form: { name1: string; name2: string; gender1: string; gender2: string },
  ): FortuneResult {
    const elem1 = saju1.dayElem;
    const elem2 = saju2.dayElem;
    const GEN: ElemKo[] = ['목','화','토','금','수'];
    const idx1 = GEN.indexOf(elem1);
    const idx2 = GEN.indexOf(elem2);
    const diff = (idx2 - idx1 + 5) % 5;

    let score: number;
    let relType: string;
    if (diff === 0) { score = 75; relType = '비화(比和) — 같은 오행'; }
    else if (diff === 4) { score = 92; relType = '상생(相生) — 상대가 나를 돕는 관계'; }
    else if (diff === 1) { score = 85; relType = '상생(相生) — 내가 상대를 돕는 관계'; }
    else if (diff === 2) { score = 55; relType = '상극(相剋) — 긴장감이 있는 관계'; }
    else { score = 60; relType = '상극(相剋) — 갈등 가능성이 있는 관계'; }

    // 용신 보너스
    if (saju1.yongsin === elem2 || saju2.yongsin === elem1) score = Math.min(100, score + 8);

    const name1 = form.name1 || '본인';
    const name2 = form.name2 || '상대';
    const emoji1 = ELEM_EMOJI[ELEM_KO.indexOf(elem1)];
    const emoji2 = ELEM_EMOJI[ELEM_KO.indexOf(elem2)];

    return {
      summary: `${emoji1} ${name1}(${elem1}행) × ${emoji2} ${name2}(${elem2}행)\n\n두 분의 오행 관계는 "${relType}"입니다.`,
      yearly_fortune: '',
      relationships: score >= 80
        ? `서로의 장점을 살려주는 좋은 조합입니다. ${name1}의 ${elem1}행 기운과 ${name2}의 ${elem2}행 기운이 시너지를 만듭니다.`
        : `서로 다른 성향이 때로 갈등을 만들 수 있지만, 이해와 배려가 있으면 보완적인 관계로 발전합니다.`,
      career: '', wealth: '', health: '',
      lucky_colors: [], lucky_numbers: [],
      monthly_fortunes: [],
      compatibility_score: score,
      compatibility_summary: relType,
      couple_advice: score >= 80
        ? `두 분은 자연스러운 조화를 이루는 관계입니다. 서로의 강점을 인정하고 약점을 보완하면 더욱 좋은 관계가 됩니다.`
        : `서로 다른 에너지가 때로는 마찰을 만들지만, 이것이 성장의 원동력이 됩니다. ${name1}은(는) ${saju1.yongsin}행의, ${name2}은(는) ${saju2.yongsin}행의 활동을 함께 하면 좋습니다.`,
      couple_caution: score < 70
        ? `감정적 충돌 시 시간을 두고 냉정하게 대화하세요. 상대의 관점에서 생각해보는 연습이 필요합니다.`
        : undefined,
    };
  }

  // Supabase Fortune Edge Function 호출
  async function callSupabaseFortune(body: { type: string; input: Record<string, unknown> }): Promise<string> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/fortune`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      throw new Error(errText || `서버 오류 (${res.status})`);
    }

    const responseText = await res.text();
    if (!responseText) throw new Error('서버로부터 빈 응답을 받았습니다. 다시 시도해 주세요.');

    const data = JSON.parse(responseText);
    if (!data?.ok) throw new Error(data?.error || '분석 실패');
      return data.data?.summary || JSON.stringify(data.data);
  }

  // Supabase Fortune Edge Function — 구조화된 전체 데이터 반환
  async function callSupabaseFortuneStructured(
    body: { type: string; input: Record<string, unknown> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/fortune`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;

    const responseText = await res.text();
    if (!responseText) return null;

    const parsed = JSON.parse(responseText);
    if (!parsed?.ok || !parsed.data) return null;

    return parsed.data as Record<string, unknown>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-20 px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">

        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-serif text-ft-ink tracking-tight">맞춤 운세 분석</h1>
          <p className="text-sm text-ft-muted mt-2">사주팔자 엔진이 당신만의 운세를 즉시 분석합니다</p>
          <p className="text-xs text-ft-muted mt-1">사주 원국만 보시려면 <a href="/saju" className="text-ft-ink underline hover:text-ft-red transition-colors">사주 계산기</a>를 이용해 보세요</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-ft-paper-alt border border-ft-border rounded-xl p-1">
          {([
            ['saju', '사주 분석'],
            ['zodiac', '별자리 운세'],
            ['couple', '궁합 분석'],
          ] as [FortuneTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setResult(null); setLocalSaju(null); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === key
                  ? 'bg-white text-ft-ink shadow-sm font-semibold'
                  : 'text-ft-muted hover:text-ft-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 프로필 자동 입력 안내 */}
        {profileLoaded && (
          <div className="bg-ft-paper-alt border border-ft-border rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-ft-body">&#10003; 프로필 생년월일이 자동 입력되었습니다.</span>
            <Link href="/settings" className="text-xs text-ft-muted hover:text-ft-ink transition-colors">설정에서 수정 →</Link>
          </div>
        )}

        {/* 입력 폼 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 space-y-4 shadow-sm">
          {tab === 'saju' && <SajuForm form={sajuForm} setForm={setSajuForm} />}
          {tab === 'zodiac' && <ZodiacForm form={zodiacForm} setForm={setZodiacForm} />}
          {tab === 'couple' && <CoupleForm form={coupleForm} setForm={setCoupleForm} />}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-3.5 font-bold rounded-xl transition-all btn-press disabled:opacity-50 bg-ft-gold text-ft-ink hover:bg-ft-gold-h shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                분석 중...
              </span>
            ) : (
              tab === 'couple' ? '💑 궁합 분석하기' : tab === 'zodiac' ? '⭐ 별자리 운세 보기' : '🔮 사주 분석하기'
            )}
          </button>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {/* 분석 결과 안내 (결과 없을 때만 표시) */}
        {!result && !localSaju && !loading && (
          <div className="bg-white border border-ft-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold font-serif text-ft-ink mb-3">
              {tab === 'saju' && '사주 분석에서 확인할 수 있는 내용'}
              {tab === 'zodiac' && '별자리 운세에서 확인할 수 있는 내용'}
              {tab === 'couple' && '궁합 분석에서 확인할 수 있는 내용'}
            </h3>
            <ul className="space-y-2 text-xs text-ft-muted">
              {tab === 'saju' && (
                <>
                  <li className="flex items-start gap-2"><span>🔮</span><span>사주 원국 (4주 8자) 즉시 계산 + 오행 분포</span></li>
                  <li className="flex items-start gap-2"><span>📊</span><span>올해 월별 운세 흐름 그래프</span></li>
                  <li className="flex items-start gap-2"><span>💼</span><span>AI 심층 분석: 직업운, 재물운, 건강운, 대인관계</span></li>
                  <li className="flex items-start gap-2"><span>🍀</span><span>행운의 색상, 숫자, 방위</span></li>
                </>
              )}
              {tab === 'zodiac' && (
                <>
                  <li className="flex items-start gap-2"><span>⭐</span><span>별자리별 올해 총운 분석</span></li>
                  <li className="flex items-start gap-2"><span>💕</span><span>연애운 & 궁합 좋은 별자리</span></li>
                  <li className="flex items-start gap-2"><span>💰</span><span>재물운 & 투자 시기 조언</span></li>
                  <li className="flex items-start gap-2"><span>🎯</span><span>월별 행운 포인트 & 주의 사항</span></li>
                </>
              )}
              {tab === 'couple' && (
                <>
                  <li className="flex items-start gap-2"><span>💑</span><span>두 사람의 사주 오행 궁합 점수</span></li>
                  <li className="flex items-start gap-2"><span>🔥</span><span>성격 궁합 & 갈등 포인트 분석</span></li>
                  <li className="flex items-start gap-2"><span>📅</span><span>함께하기 좋은 시기 & 주의할 시기</span></li>
                  <li className="flex items-start gap-2"><span>💡</span><span>관계 발전을 위한 AI 맞춤 조언</span></li>
                </>
              )}
            </ul>
          </div>
        )}

        {/* 로컬 사주 결과 (사주 탭에서 즉시 표시) */}
        {localSaju && <LocalSajuCard data={localSaju} />}

        {/* AI 해석 로딩 배지 */}
        {aiLoading && result && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-pulse">
            <svg className="animate-spin w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-indigo-600">AI 맞춤 해석 생성 중...</span>
          </div>
        )}

        {/* AI 분석 결과 */}
        {result && <FortuneResultCard result={result} tab={tab} />}

        {/* 면책 */}
        <p className="text-center text-xs text-ft-muted">
          {tab === 'zodiac'
            ? '이 분석은 서양 점성술의 관점에서 참고용으로 제공됩니다.'
            : '이 분석은 사주명리학의 학문적 관점에서 참고용으로 제공됩니다.'}
        </p>
      </div>
    </div>
  );
}

// ── 사주 폼 ───────────────────────────────────────────────────
function SajuForm({ form, setForm }: { form: SajuFormState; setForm: (f: SajuFormState) => void }) {
  const u = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <>
      <input placeholder="이름 (선택)" value={form.name} onChange={e => u('name', e.target.value)}
        className="w-full px-4 py-2.5 border border-ft-border rounded-xl text-sm focus:ring-2 focus:ring-ft-gold/50 outline-none" />
      <p className="text-xs text-ft-muted -mb-1">생년월일 (양력)</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] text-ft-muted mb-0.5">년도</label>
          <input type="number" placeholder="1990" onWheel={e => (e.target as HTMLInputElement).blur()} value={form.year} onChange={e => u('year', e.target.value)}
            className="w-full px-3 py-2.5 border border-ft-border rounded-xl text-sm text-center" min="1920" max="2020" />
        </div>
        <div>
          <label className="block text-[10px] text-ft-muted mb-0.5">월</label>
          <input type="number" placeholder="1" onWheel={e => (e.target as HTMLInputElement).blur()} value={form.month} onChange={e => u('month', e.target.value)}
            className="w-full px-3 py-2.5 border border-ft-border rounded-xl text-sm text-center" min="1" max="12" />
        </div>
        <div>
          <label className="block text-[10px] text-ft-muted mb-0.5">일</label>
          <input type="number" placeholder="1" onWheel={e => (e.target as HTMLInputElement).blur()} value={form.day} onChange={e => u('day', e.target.value)}
            className="w-full px-3 py-2.5 border border-ft-border rounded-xl text-sm text-center" min="1" max="31" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select value={form.time} onChange={e => u('time', e.target.value)}
          className="px-3 py-2.5 border border-ft-border rounded-xl text-sm">
          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={form.gender} onChange={e => u('gender', e.target.value)}
          className="px-3 py-2.5 border border-ft-border rounded-xl text-sm">
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
      </div>
    </>
  );
}

// ── 별자리 폼 ─────────────────────────────────────────────────
function ZodiacForm({ form, setForm }: { form: ZodiacFormState; setForm: (f: ZodiacFormState) => void }) {
  const u = (k: string, v: string) => setForm({ ...form, [k]: v });
  const detected = form.birthDate ? (() => {
    const [, m, d] = form.birthDate.split('-').map(Number);
    return m && d ? detectZodiac(m, d) : null;
  })() : null;

  return (
    <>
      <input placeholder="이름 (선택)" value={form.name} onChange={e => u('name', e.target.value)}
        className="w-full px-4 py-2.5 border border-ft-border rounded-xl text-sm focus:ring-2 focus:ring-ft-gold/50 outline-none" />
      <input type="date" value={form.birthDate} onChange={e => u('birthDate', e.target.value)}
        className="w-full px-4 py-2.5 border border-ft-border rounded-xl text-sm" />
      {detected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl text-sm text-indigo-700">
          <span className="text-lg">{ZODIAC_SYMBOL[detected]}</span>
          <span className="font-medium">{detected}</span>
        </div>
      )}
    </>
  );
}

// ── 궁합 폼 ──────────────────────────────────────────────────
function CoupleForm({ form, setForm }: { form: CoupleFormState; setForm: (f: CoupleFormState) => void }) {
  const u = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-3">
        <p className="text-xs font-medium text-rose-500 text-center">본인</p>
        <input placeholder="이름" value={form.name1} onChange={e => u('name1', e.target.value)}
          className="w-full px-3 py-2 border border-rose-200 rounded-xl text-sm" />
        <input type="date" value={form.birthDate1} onChange={e => u('birthDate1', e.target.value)}
          className="w-full px-3 py-2 border border-rose-200 rounded-xl text-sm" />
        <select value={form.gender1} onChange={e => u('gender1', e.target.value)}
          className="w-full px-3 py-2 border border-rose-200 rounded-xl text-sm">
          <option value="female">여성</option>
          <option value="male">남성</option>
        </select>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium text-blue-500 text-center">상대</p>
        <input placeholder="이름" value={form.name2} onChange={e => u('name2', e.target.value)}
          className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm" />
        <input type="date" value={form.birthDate2} onChange={e => u('birthDate2', e.target.value)}
          className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm" />
        <select value={form.gender2} onChange={e => u('gender2', e.target.value)}
          className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm">
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
      </div>
    </div>
  );
}

// ── 로컬 사주 카드 (즉시 표시) ────────────────────────────────
function LocalSajuCard({ data }: { data: {
  saju: SajuResult; sipsin: ReturnType<typeof getSipsinMap>;
  sinsal: Sinsal[]; daeun: DaeunPeriod[];
} }) {
  const { saju, sipsin, sinsal, daeun } = data;
  const pct = elemCountToPercent(saju.elemCount, saju.hasHour);

  return (
    <div className="bg-white border border-ft-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
      <div className="bg-gradient-to-r from-ft-navy to-ft-ink px-5 py-4">
        <h3 className="text-white font-bold font-serif text-lg">사주 원국 (엔진 계산)</h3>
        <p className="text-indigo-200 text-xs mt-0.5">사주팔자 즉시 계산 결과</p>
      </div>
      <div className="p-5 space-y-5">
        {/* 4주 8자 테이블 */}
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {(['year', 'month', 'day', 'hour'] as const).map(k => {
            const p = saju[k];
            const label = { year: '년주', month: '월주', day: '일주', hour: '시주' }[k];
            const s = k === 'day' ? '일간' : (sipsin as any)[`${k}Stem`];
            return (
              <div key={k} className={`border rounded-xl p-2.5 transition-all ${k === 'day' ? 'border-ft-gold bg-amber-50/50' : 'border-ft-border hover:border-gray-300'}`}>
                <p className="text-xs text-ft-muted mb-1">{label} {k === 'day' && <span className="text-ft-gold">★</span>}</p>
                <p className="font-bold text-lg text-ft-ink">{p.stemKo}{p.branchKo}</p>
                <p className="text-xs text-ft-muted">{p.stemHj}{p.branchHj}</p>
                <p className="text-xs mt-1 text-indigo-600">{s}</p>
              </div>
            );
          })}
        </div>

        {/* 오행 분포 */}
        <div>
          <p className="text-xs text-ft-muted mb-2">오행 분포</p>
          <div className="flex gap-1">
            {ELEM_KO.map((elem, i) => (
              <div key={elem} className="flex-1 text-center">
                <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full rounded-b-lg transition-all"
                    style={{ height: `${pct[elem]}%`, backgroundColor: ELEM_COLOR[i] + '80' }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {ELEM_EMOJI[i]} {pct[elem]}%
                  </span>
                </div>
                <p className="text-xs mt-1 text-ft-muted">{elem}({ELEM_HJ[i]})</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ft-muted mt-2">용신(用神): <span className="font-medium text-ft-ink">{saju.yongsin}행</span></p>
        </div>

        {/* 신살 */}
        {sinsal.length > 0 && (
          <div>
            <p className="text-xs text-ft-muted mb-2">신살</p>
            <div className="flex flex-wrap gap-2">
              {sinsal.map(s => (
                <span key={s.name} className={`px-2.5 py-1 rounded-full text-xs border ${
                  s.type === 'good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : s.type === 'bad' ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 대운 */}
        <div>
          <p className="text-xs text-ft-muted mb-2">대운 흐름</p>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {daeun.map(d => (
              <div key={d.startAge} className="shrink-0 text-center px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] text-ft-muted">{d.startAge}~{d.endAge}세</p>
                <p className="text-xs font-medium text-ft-ink">{d.stemKo}{d.branchKo}</p>
                <p className="text-[10px] text-indigo-600">{d.sipsin}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI 분석 결과 카드 ─────────────────────────────────────────
function FortuneResultCard({ result, tab }: { result: FortuneResult; tab: FortuneTab }) {
  return (
    <div className="bg-white border border-ft-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4">
        <h3 className="text-white font-bold font-serif">
          {tab === 'couple' ? '궁합 분석 결과' : '맞춤 운세 분석 결과'}
        </h3>
        {result.day_master && (
          <p className="text-amber-100 text-xs mt-0.5">일간: {result.day_master}</p>
        )}
      </div>
      <div className="p-5 space-y-5">

        {/* 궁합 점수 */}
        {tab === 'couple' && result.compatibility_score !== undefined && (
          <div className="text-center py-4">
            <p className={`text-5xl font-bold ${
              result.compatibility_score >= 80 ? 'text-emerald-600'
              : result.compatibility_score >= 60 ? 'text-ft-ink'
              : 'text-amber-600'
            }`}>
              {result.compatibility_score}<span className="text-xl text-ft-muted">점</span>
            </p>
            <p className="text-sm text-ft-muted mt-1">{result.compatibility_summary}</p>
          </div>
        )}

        {/* 오늘의 운세 + Fortune Score (교차 분석 하이라이트) */}
        {(result.today_fortune || result.fortune_score) && (
          <div className="grid grid-cols-2 gap-3">
            {result.today_fortune && (
              <div className={`rounded-xl p-4 border ${
                result.today_fortune.score >= 65
                  ? 'bg-emerald-50 border-emerald-200'
                  : result.today_fortune.score >= 45
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-[10px] font-medium text-ft-muted uppercase tracking-wider mb-1">오늘의 운세</p>
                <p className={`text-3xl font-bold ${
                  result.today_fortune.score >= 65 ? 'text-emerald-600'
                  : result.today_fortune.score >= 45 ? 'text-amber-600'
                  : 'text-red-500'
                }`}>{result.today_fortune.score}<span className="text-sm text-ft-muted">점</span></p>
                <p className="text-xs text-ft-muted mt-1">{result.today_fortune.grade}</p>
              </div>
            )}
            {result.fortune_score && (
              <div className="rounded-xl p-4 border bg-indigo-50 border-indigo-200">
                <p className="text-[10px] font-medium text-ft-muted uppercase tracking-wider mb-1">바이오리듬</p>
                <p className="text-3xl font-bold text-indigo-600">{result.fortune_score.percent}<span className="text-sm text-ft-muted">%</span></p>
                <p className="text-xs text-ft-muted mt-1">대운: {result.fortune_score.phase}</p>
              </div>
            )}
          </div>
        )}

        {/* 이번 달 딥다이브 */}
        {result.this_month && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-ft-ink">📅 이번 달 ({new Date().getMonth() + 1}월) 심층 분석</p>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                result.this_month.score >= 65
                  ? 'bg-emerald-100 text-emerald-700'
                  : result.this_month.score >= 45
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}>{result.this_month.score}점</span>
            </div>
            <p className="text-xs text-ft-body leading-relaxed whitespace-pre-line">{result.this_month.deepDive}</p>
            <div className="flex gap-1.5 mt-2">
              {result.this_month.keywords.map(k => (
                <span key={k} className="text-[10px] px-2 py-0.5 bg-white/70 rounded-full text-amber-700">{k}</span>
              ))}
            </div>
          </div>
        )}

        {/* 오늘 한 줄 메시지 */}
        {result.today_fortune && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-xs text-ft-body">{result.today_fortune.message}</p>
          </div>
        )}

        {/* 종합 분석 */}
        {result.summary && <Section title="종합 분석 (일간 × 용신 × 대운)" content={result.summary} />}
        {result.yearly_fortune && <Section title={`${new Date().getFullYear()}년 운세`} content={result.yearly_fortune} />}

        {/* 분야별 (빈 값은 숨김) */}
        {(result.relationships || result.career || result.wealth || result.health) && (
          <div className="grid grid-cols-2 gap-3">
            {result.relationships && <MiniCard icon="💕" title="인간관계" text={result.relationships} />}
            {result.career && <MiniCard icon="💼" title="직업·사업" text={result.career} />}
            {result.wealth && <MiniCard icon="💰" title="재물·투자" text={result.wealth} />}
            {result.health && <MiniCard icon="💪" title="건강" text={result.health} />}
          </div>
        )}

        {/* 오행 분포 */}
        {result.ohhaeng_balance && Object.keys(result.ohhaeng_balance).length > 0 && (
          <div>
            <p className="text-sm font-bold text-ft-ink mb-2">오행 균형</p>
            <div className="flex gap-1">
              {ELEM_KO.map((elem, i) => {
                const pct = result.ohhaeng_balance![elem] ?? 0;
                return (
                  <div key={elem} className="flex-1 text-center">
                    <div className="h-12 bg-gray-100 rounded-lg relative overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full rounded-b-lg transition-all"
                        style={{ height: `${pct}%`, backgroundColor: ELEM_COLOR[i] + '80' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                        {ELEM_EMOJI[i]} {pct}%
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 text-ft-muted">{elem}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 행운 정보 */}
        {(result.lucky_colors?.length > 0 || result.lucky_numbers?.length > 0 || (result.lucky_directions?.length ?? 0) > 0) && (
          <div>
            <p className="text-sm font-bold text-ft-ink mb-2">행운 정보</p>
            <div className="flex flex-wrap gap-2">
              {result.lucky_colors?.map(c => (
                <span key={c} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
                  🎨 {c}
                </span>
              ))}
              {result.lucky_numbers?.map(n => (
                <span key={n} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200">
                  🔢 {n}
                </span>
              ))}
              {result.lucky_directions?.map(d => (
                <span key={d} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs border border-emerald-200">
                  🧭 {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 신살 */}
        {result.shinsal && result.shinsal.length > 0 && (
          <div>
            <p className="text-sm font-bold text-ft-ink mb-2">특수 운세 (신살)</p>
            <div className="space-y-1.5">
              {result.shinsal.map(s => (
                <p key={s} className="text-xs text-ft-muted bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{s}</p>
              ))}
            </div>
          </div>
        )}

        {/* 주의 월 */}
        {result.caution_months && result.caution_months.length > 0 && (
          <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700 border border-red-100">
            ⚠️ 주의 시기: {result.caution_months.map(m => `${m}월`).join(', ')}
          </div>
        )}

        {/* 조언 */}
        {result.saju_advice && <Section title="행동 지침" content={result.saju_advice} />}
        {result.couple_advice && <Section title="관계 조언" content={result.couple_advice} />}
        {result.couple_caution && (
          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-700 border border-amber-100">
            💡 {result.couple_caution}
          </div>
        )}

        {/* 월별 운세 */}
        {result.monthly_fortunes.length > 0 && (
          <div>
            <p className="text-sm font-bold text-ft-ink mb-3">월별 운세</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {result.monthly_fortunes.map(m => (
                <div key={m.month} className="text-center p-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <p className="text-xs text-ft-muted">{m.month}월</p>
                  <p className={`text-lg font-bold ${
                    m.score >= 65 ? 'text-emerald-600' : m.score >= 45 ? 'text-ft-ink' : 'text-red-500'
                  }`}>{m.score}</p>
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                    {m.keywords.slice(0, 2).map(k => (
                      <span key={k} className="text-[9px] text-ft-muted">{k}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 플래너 CTA */}
        <Link
          href="/products/saju-planner-basic"
          className="block text-center py-3 bg-ft-ink text-white font-bold rounded-xl text-sm hover:bg-ft-ink/90 btn-press transition-colors"
        >
          이 사주로 맞춤 플래너 만들기 →
        </Link>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-ft-ink mb-1">{title}</p>
      <p className="text-sm text-ft-muted leading-relaxed">{content}</p>
    </div>
  );
}

function MiniCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-xs font-medium text-ft-ink mb-1">{icon} {title}</p>
      <p className="text-xs text-ft-muted leading-relaxed">{text}</p>
    </div>
  );
}
