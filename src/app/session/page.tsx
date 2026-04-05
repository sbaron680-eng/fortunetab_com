'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useSessionStore } from '@/lib/stores/session';
import { calcFortuneScore } from '@/lib/fortune-score';
import type { UserMode } from '@/lib/supabase';

export default function SessionStartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setMode, setFortuneScore, setStep, reset } = useSessionStore();
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('모름');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 로그인 사용자의 프로필 생년월일 자동 입력
  useEffect(() => {
    if (!user || profileLoaded) return;
    if (user.birthDate) setBirthDate(user.birthDate);
    if (user.birthHour) setBirthTime(user.birthHour);
    if (user.gender) setGender(user.gender);
    setProfileLoaded(true);
  }, [user, profileLoaded]);

  const timeOptions = [
    '자시', '축시', '인시', '묘시', '진시', '사시',
    '오시', '미시', '신시', '유시', '술시', '해시', '모름',
  ];

  async function handleStart() {
    if (!selectedMode || !birthDate || !gender) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      reset();
      const result = calcFortuneScore(birthDate, birthTime, gender);

      setMode(selectedMode);
      setFortuneScore(
        result.fortuneScore,
        result.fortunePercent,
        result.daunPhase,
        result.grade.label,
      );
      setStep(0);

      router.push('/session/wizard');
    } catch {
      setError('Fortune Score 계산 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-16 px-4">
      <div className="max-w-lg mx-auto animate-fade-in">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-ft-gold/10 text-ft-gold px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-4">
            명발굴 세션
          </div>
          <h1 className="font-serif text-3xl font-bold text-ft-ink mb-3 leading-tight">
            막혔을 때,<br />내 안의 답을 꺼냅니다
          </h1>
          <p className="text-ft-muted text-sm max-w-xs mx-auto">
            사주와 바이오리듬 기반으로 지금 당신에게 필요한 돌파구를 발굴합니다
          </p>
        </div>

        {/* 로그인 안내 */}
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 animate-fade-in">
            <p>세션 결과를 저장하려면 로그인이 필요합니다.</p>
            <a href="/auth/login" className="underline font-medium">로그인하기</a>
          </div>
        )}

        {/* 모드 선택 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-serif font-semibold text-ft-ink mb-1 text-base">어떤 상황인가요?</h2>
          <p className="text-xs text-ft-muted mb-5">나에게 맞는 모드를 선택해 주세요</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedMode('biz')}
              className={`hover-lift btn-press p-5 rounded-xl border-2 text-left transition-all ${
                selectedMode === 'biz'
                  ? 'border-ft-ink bg-ft-ink/5 shadow-md'
                  : 'border-ft-border hover:border-ft-muted bg-white'
              }`}
            >
              <div className="text-2xl mb-2">💼</div>
              <div className="font-bold text-sm text-ft-ink mb-1">1인 사업가</div>
              <div className="text-xs text-ft-muted leading-relaxed">사업에서 막혔을 때</div>
            </button>
            <button
              onClick={() => setSelectedMode('gen')}
              className={`hover-lift btn-press p-5 rounded-xl border-2 text-left transition-all ${
                selectedMode === 'gen'
                  ? 'border-ft-ink bg-ft-ink/5 shadow-md'
                  : 'border-ft-border hover:border-ft-muted bg-white'
              }`}
            >
              <div className="text-2xl mb-2">🌱</div>
              <div className="font-bold text-sm text-ft-ink mb-1">일반</div>
              <div className="text-xs text-ft-muted leading-relaxed">이 길이 맞는지 모르겠을 때</div>
            </button>
          </div>
        </div>

        {/* 생년월일 입력 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif font-semibold text-ft-ink text-base">생년월일 정보</h2>
              <p className="text-xs text-ft-muted mt-0.5">Fortune Score 계산에 사용됩니다</p>
            </div>
            {user?.birthDate && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                프로필에서 불러옴
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ft-ink/70 mb-1.5">생년월일</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border border-ft-border rounded-xl px-4 py-2.5 text-sm bg-ft-paper-alt/30 focus:outline-none focus:ring-2 focus:ring-ft-ink/20 focus:border-ft-ink/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ft-ink/70 mb-1.5">태어난 시간</label>
              <select
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full border border-ft-border rounded-xl px-4 py-2.5 text-sm bg-ft-paper-alt/30 focus:outline-none focus:ring-2 focus:ring-ft-ink/20 focus:border-ft-ink/30 transition-all"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ft-ink/70 mb-1.5">성별</label>
              <div className="flex gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`btn-press flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      gender === g
                        ? 'border-ft-ink bg-ft-ink text-white shadow-sm'
                        : 'border-ft-border text-ft-muted hover:border-ft-muted bg-white'
                    }`}
                  >
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-ft-red/5 border border-ft-red/20 rounded-xl p-3 mb-5 animate-fade-in">
            <p className="text-sm text-ft-red text-center font-medium">{error}</p>
          </div>
        )}

        {/* 시작 버튼 */}
        <button
          onClick={handleStart}
          disabled={isLoading || !selectedMode || !birthDate || !gender}
          className="btn-press w-full py-4 rounded-xl bg-ft-ink text-white font-bold text-base shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:bg-ft-ink/90 hover:shadow-xl transition-all"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              계산 중...
            </span>
          ) : '발굴 세션 시작'}
        </button>

        {/* 하단 안내 */}
        <p className="text-center text-xs text-ft-muted mt-4">
          약 5분 소요 · 결과는 PDF로 다운로드 가능
        </p>
      </div>
    </div>
  );
}
