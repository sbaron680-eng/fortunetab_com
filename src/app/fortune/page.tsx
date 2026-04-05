'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { analyzeSaju, analyzeCompatibility, analyzeCareer } from '@/lib/ai-service';
import {
  calculateSaju, getSipsinMap, detectSinsal, calcDaeun,
  detectZodiac, getYearGanzhi, elemCountToPercent,
  ELEM_KO, ELEM_HJ, ELEM_COLOR, ELEM_EMOJI,
  TIME_TO_BRANCH, ZODIAC_LIST, ZODIAC_SYMBOL,
  type SajuResult, type ElemKo, type SipsinName, type Sinsal, type DaeunPeriod,
} from '@/lib/saju';

// ── 타입 ──────────────────────────────────────────────────────
type FortuneTab = 'saju' | 'zodiac' | 'couple';

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
  const [sajuForm, setSajuForm] = useState<{
    name: string; year: string; month: string; day: string; time: string; gender: 'male' | 'female';
  }>({
    name: '', year: '1990', month: '1', day: '1', time: '모름', gender: 'male',
  });

  // 별자리 폼
  const [zodiacForm, setZodiacForm] = useState({ name: '', birthDate: '' });

  // 궁합 폼
  const [coupleForm, setCoupleForm] = useState<{
    name1: string; birthDate1: string; gender1: 'male' | 'female';
    name2: string; birthDate2: string; gender2: 'male' | 'female';
  }>({
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

  async function handleAnalyze() {
    // 로그인 필수 확인
    if (!user) {
      setError('AI 운세 분석은 로그인 후 이용 가능합니다. 우측 상단에서 로그인해 주세요.');
      return;
    }

    // 구매 확인 (paywall)
    if (!hasPurchase) {
      window.location.href = `/checkout?product=fortune-${tab}`;
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setLocalSaju(null);

    try {
      let aiResult: string | null = null;

      if (tab === 'saju') {
        const { name, year, month, day, time, gender } = sajuForm;
        const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        // 로컬 사주 계산
        const saju = calculateSaju(Number(year), Number(month), Number(day), time);
        setLocalSaju({
          saju,
          sipsin: getSipsinMap(saju),
          sinsal: detectSinsal(saju),
          daeun: calcDaeun(saju, gender),
        });

        // PDF 서버 AI 분석 시도
        try {
          const hour = time === '모름' ? 12 : Object.keys(TIME_TO_BRANCH).indexOf(time);
          const response = await analyzeSaju({
            birth_year: Number(year),
            birth_month: Number(month),
            birth_day: Number(day),
            birth_hour: hour >= 0 ? hour : 12,
            analysis_type: 'full',
          });
          if (response.success) {
            aiResult = response.result;
          }
        } catch (aiErr) {
          console.warn('PDF 서버 AI 분석 실패, Supabase 백업 사용:', aiErr);
        }

        // AI 결과가 없으면 기존 Supabase 방식 시도
        if (!aiResult) {
          const body = {
            type: 'saju',
            input: { name: name || '사용자', birth_date: birthDate, birth_time: time, gender, year: 2026 },
          };
          aiResult = await callSupabaseFortune(body);
        }
      } else if (tab === 'zodiac') {
        const [y, m, d] = zodiacForm.birthDate.split('-').map(Number);
        const zodiac = detectZodiac(m, d);
        const body = {
          type: 'astrology',
          input: { name: zodiacForm.name || '사용자', birth_date: zodiacForm.birthDate, zodiac, year: 2026 },
        };
        aiResult = await callSupabaseFortune(body);
      } else {
        // 궁합 분석
        try {
          const [y1, m1, d1] = coupleForm.birthDate1.split('-').map(Number);
          const [y2, m2, d2] = coupleForm.birthDate2.split('-').map(Number);
          const response = await analyzeCompatibility({
            birth_year1: y1, birth_month1: m1, birth_day1: d1, birth_hour1: 12,
            birth_year2: y2, birth_month2: m2, birth_day2: d2, birth_hour2: 12,
          });
          if (response.success) {
            aiResult = response.result;
          }
        } catch (aiErr) {
          console.warn('PDF 서버 궁합 분석 실패:', aiErr);
          const body = {
            type: 'couple',
            input: {
              person1: { name: coupleForm.name1, birth_date: coupleForm.birthDate1, gender: coupleForm.gender1 },
              person2: { name: coupleForm.name2, birth_date: coupleForm.birthDate2, gender: coupleForm.gender2 },
              year: 2026,
            },
          };
          aiResult = await callSupabaseFortune(body);
        }
      }

      if (aiResult) {
        // 결과를 포맷팅하여 설정 (기존 FortuneResult 형식으로 변환)
        setResult({ summary: aiResult, yearly_fortune: '', relationships: '', career: '', wealth: '', health: '', lucky_colors: [], lucky_numbers: [], monthly_fortunes: [] });
        
        // 이용권 사용 처리 (used_at 업데이트)
        if (user) {
          await supabase
            .from('fortune_purchases')
            .update({ used_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('type', tab)
            .is('used_at', null);
          setHasPurchase(false);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-20 px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">

        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-serif text-ft-ink tracking-tight">AI 운세 분석</h1>
          <p className="text-sm text-ft-muted mt-2">Claude AI가 사주·별자리를 심층 분석합니다 (10~15초 소요)</p>
          <p className="text-xs text-ft-muted mt-1">즉시 무료 계산만 원하시면 <a href="/saju" className="text-ft-ink underline hover:text-ft-red transition-colors">사주 계산기</a>를 이용해 보세요</p>
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
            className={`w-full py-3.5 font-bold rounded-xl transition-all btn-press disabled:opacity-50 ${
              hasPurchase
                ? 'bg-ft-gold text-ft-ink hover:bg-ft-gold-h shadow-md hover:shadow-lg'
                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 분석 중... (10~15초 소요)
              </span>
            ) : hasPurchase ? (
              tab === 'couple' ? '궁합 분석하기 (이용권 보유)' : '운세 분석하기 (이용권 보유)'
            ) : (
              tab === 'couple' ? '궁합 분석 구매하기' : '운세 분석 구매하기'
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
function SajuForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
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
function ZodiacForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
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
function CoupleForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
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
    <div className="bg-white border border-ft-border rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4">
        <h3 className="text-white font-bold font-serif">AI 운세 분석 결과</h3>
      </div>
      <div className="p-5 space-y-5">

        {/* 궁합 점수 */}
        {tab === 'couple' && result.compatibility_score !== undefined && (
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-ft-ink">{result.compatibility_score}<span className="text-xl text-ft-muted">점</span></p>
            <p className="text-sm text-ft-muted mt-1">{result.compatibility_summary}</p>
          </div>
        )}

        {/* 요약 */}
        <Section title="종합 운세" content={result.summary} />
        <Section title="2026년 운세" content={result.yearly_fortune} />

        {/* 분야별 */}
        <div className="grid grid-cols-2 gap-3">
          <MiniCard icon="💕" title="인간관계" text={result.relationships} />
          <MiniCard icon="💼" title="직업·사업" text={result.career} />
          <MiniCard icon="💰" title="재물·투자" text={result.wealth} />
          <MiniCard icon="💪" title="건강" text={result.health} />
        </div>

        {/* 행운 정보 */}
        <div className="flex flex-wrap gap-2">
          {result.lucky_colors?.map(c => (
            <span key={c} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
              행운색: {c}
            </span>
          ))}
          {result.lucky_numbers?.map(n => (
            <span key={n} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200">
              행운숫자: {n}
            </span>
          ))}
          {result.lucky_directions?.map(d => (
            <span key={d} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs border border-emerald-200">
              행운방향: {d}
            </span>
          ))}
        </div>

        {/* 조심 월 */}
        {result.caution_months && result.caution_months.length > 0 && (
          <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700 border border-red-100">
            주의 시기: {result.caution_months.map(m => `${m}월`).join(', ')}
          </div>
        )}

        {/* 조언 */}
        {result.saju_advice && <Section title="행동 지침" content={result.saju_advice} />}
        {result.couple_advice && <Section title="관계 조언" content={result.couple_advice} />}

        {/* 월별 운세 */}
        {result.monthly_fortunes.length > 0 && (
          <div>
            <p className="text-sm font-bold text-ft-ink mb-3">월별 운세</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {result.monthly_fortunes.map(m => (
                <div key={m.month} className="text-center p-2 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-ft-muted">{m.month}월</p>
                  <p className={`text-lg font-bold ${
                    m.score >= 8 ? 'text-emerald-600' : m.score >= 5 ? 'text-ft-ink' : 'text-red-500'
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
