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
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-2xl font-bold text-ft-ink mb-2">
            명발굴 세션
          </h1>
          <p className="text-ft-muted text-sm">
            막혔을 때, 내 안의 답을 꺼냅니다
          </p>
        </div>

        {/* 로그인 안내 */}
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <p>세션 결과를 저장하려면 로그인이 필요합니다.</p>
            <a href="/auth/login" className="underline font-medium">로그인하기</a>
          </div>
        )}

        {/* 모드 선택 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-ft-ink mb-4">어떤 상황인가요?</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedMode('biz')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedMode === 'biz'
                  ? 'border-ft-ink bg-ft-ink/5'
                  : 'border-ft-border hover:border-ft-muted'
              }`}
            >
              <div className="text-lg mb-1">💼</div>
              <div className="font-semibold text-sm text-ft-ink">1인 사업가</div>
              <div className="text-xs text-ft-muted mt-1">사업에서 막혔을 때</div>
            </button>
            <button
              onClick={() => setSelectedMode('gen')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedMode === 'gen'
                  ? 'border-ft-ink bg-ft-ink/5'
                  : 'border-ft-border hover:border-ft-muted'
              }`}
            >
              <div className="text-lg mb-1">🌱</div>
              <div className="font-semibold text-sm text-ft-ink">일반</div>
              <div className="text-xs text-ft-muted mt-1">이 길이 맞는지 모르겠을 때</div>
            </button>
          </div>
        </div>

        {/* 생년월일 입력 */}
        <div className="bg-white border border-ft-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ft-ink">생년월일 정보</h2>
            {user?.birthDate && (
              <span className="text-xs text-emerald-600 font-medium">프로필에서 불러옴</span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-ft-muted mb-1">생년월일</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border border-ft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink/20"
              />
            </div>
            <div>
              <label className="block text-sm text-ft-muted mb-1">태어난 시간</label>
              <select
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full border border-ft-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink/20"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-ft-muted mb-1">성별</label>
              <div className="flex gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      gender === g
                        ? 'border-ft-ink bg-ft-ink/5 text-ft-ink'
                        : 'border-ft-border text-ft-muted hover:border-ft-muted'
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
          <p className="text-sm text-red-600 text-center mb-4">{error}</p>
        )}

        {/* 시작 버튼 */}
        <button
          onClick={handleStart}
          disabled={isLoading || !selectedMode || !birthDate || !gender}
          className="w-full py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ft-ink/90 transition-colors"
        >
          {isLoading ? '계산 중...' : '발굴 세션 시작'}
        </button>
      </div>
    </div>
  );
}
