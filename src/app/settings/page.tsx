'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useSajuStore } from '@/lib/store';
import { calculateSajuFromBirthData, sajuResultToSajuData, getSajuSummary, TIME_TO_BRANCH } from '@/lib/saju';

const BIRTH_HOURS = Object.keys(TIME_TO_BRANCH).filter((k) => k !== '모름');
const HOUR_LABELS: Record<string, string> = {
  '자시': '자시 (23:00~01:00)',
  '축시': '축시 (01:00~03:00)',
  '인시': '인시 (03:00~05:00)',
  '묘시': '묘시 (05:00~07:00)',
  '진시': '진시 (07:00~09:00)',
  '사시': '사시 (09:00~11:00)',
  '오시': '오시 (11:00~13:00)',
  '미시': '미시 (13:00~15:00)',
  '신시': '신시 (15:00~17:00)',
  '유시': '유시 (17:00~19:00)',
  '술시': '술시 (19:00~21:00)',
  '해시': '해시 (21:00~23:00)',
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthReady } = useAuthStore();
  const updateBirthData = useAuthStore((s) => s.updateBirthData);

  // 생년월일 폼 상태
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthMonth, setBirthMonth] = useState<number | ''>('');
  const [birthDay, setBirthDay] = useState<number | ''>('');
  const [birthHour, setBirthHour] = useState<string>('모름');
  const [gender, setGender] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sajuSummary, setSajuSummary] = useState<string | null>(null);

  // 로그인 안 했으면 로그인 페이지로
  useEffect(() => {
    if (isAuthReady && !user) router.replace('/auth/login');
  }, [isAuthReady, user, router]);

  // 기존 생년월일 데이터 로드
  useEffect(() => {
    if (!user?.birthDate) return;
    const [y, m, d] = user.birthDate.split('-').map(Number);
    setBirthYear(y);
    setBirthMonth(m);
    setBirthDay(d);
    if (user.birthHour) setBirthHour(user.birthHour);
    if (user.gender) setGender(user.gender);
    // 사주 요약 표시
    try {
      const result = calculateSajuFromBirthData(user.birthDate!, user.birthHour ?? null);
      setSajuSummary(getSajuSummary(result));
    } catch { /* 무시 */ }
  }, [user?.birthDate, user?.birthHour, user?.gender]);

  const maxDay = birthYear && birthMonth ? daysInMonth(birthYear as number, birthMonth as number) : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const canSave = birthYear !== '' && birthMonth !== '' && birthDay !== '' && gender !== '';

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setMessage(null);

    const dateStr = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
    const ok = await updateBirthData(dateStr, birthHour, gender);

    if (ok) {
      // 사주 계산 + 동기화
      try {
        const result = calculateSajuFromBirthData(dateStr, birthHour);
        useSajuStore.getState().setSaju(sajuResultToSajuData(result));
        setSajuSummary(getSajuSummary(result));
      } catch { /* 무시 */ }
      setMessage({ type: 'success', text: '생년월일이 저장되었습니다.' });
    } else {
      setMessage({ type: 'error', text: '저장에 실패했습니다. 다시 시도해주세요.' });
    }
    setSaving(false);
  }

  if (!isAuthReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-ft-muted">로딩 중…</span>
      </div>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-ft-muted hover:text-ft-body transition-colors">
          ← 대시보드
        </Link>
        <h1 className="text-2xl font-serif font-bold text-ft-ink mt-2">프로필 설정</h1>
        <p className="text-sm text-ft-muted mt-1">생년월일을 설정하면 맞춤 운세 플래너를 생성할 수 있습니다.</p>
      </div>

      {/* 기본 정보 (읽기 전용) */}
      <section className="bg-white border border-ft-border rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-ft-ink uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-ft-ink rounded-full inline-block" />
          기본 정보
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ft-muted">이름</span>
            <span className="text-ft-body font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ft-muted">이메일</span>
            <span className="text-ft-body font-medium">{user.email}</span>
          </div>
        </div>
      </section>

      {/* 생년월일 설정 */}
      <section className="bg-white border border-ft-border rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-ft-ink uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-ft-red rounded-full inline-block" />
          생년월일 정보
        </h2>

        {/* 생년월일 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-ft-muted mb-1">출생 연도</label>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-3 py-2.5 text-sm text-ft-body focus:outline-none focus:ring-2 focus:ring-ft-ink"
            >
              <option value="">선택</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ft-muted mb-1">월</label>
            <select
              value={birthMonth}
              onChange={(e) => { setBirthMonth(e.target.value ? Number(e.target.value) : ''); setBirthDay(''); }}
              className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-3 py-2.5 text-sm text-ft-body focus:outline-none focus:ring-2 focus:ring-ft-ink"
            >
              <option value="">선택</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ft-muted mb-1">일</label>
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-3 py-2.5 text-sm text-ft-body focus:outline-none focus:ring-2 focus:ring-ft-ink"
            >
              <option value="">선택</option>
              {days.map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </div>
        </div>

        {/* 출생 시간 */}
        <div className="mb-4">
          <label className="block text-xs text-ft-muted mb-1">출생 시간 (선택)</label>
          <select
            value={birthHour}
            onChange={(e) => setBirthHour(e.target.value)}
            className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-3 py-2.5 text-sm text-ft-body focus:outline-none focus:ring-2 focus:ring-ft-ink"
          >
            <option value="모름">모름</option>
            {BIRTH_HOURS.map((h) => (
              <option key={h} value={h}>{HOUR_LABELS[h]}</option>
            ))}
          </select>
        </div>

        {/* 성별 */}
        <div className="mb-5">
          <label className="block text-xs text-ft-muted mb-2">성별</label>
          <div className="flex gap-3">
            {[{ v: 'male', l: '남성' }, { v: 'female', l: '여성' }].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setGender(v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  gender === v
                    ? 'bg-ft-ink text-white border-ft-ink'
                    : 'bg-white border-ft-border text-ft-body hover:bg-ft-paper-alt'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 데이터 보존 고지 */}
        <div className="bg-ft-paper-alt border border-ft-border rounded-xl px-4 py-3 text-xs text-ft-muted mb-5">
          <span className="font-medium text-ft-body">📋 데이터 보존 안내</span>
          <p className="mt-1">생년월일 정보는 입력일로부터 1년간 저장됩니다. 만료 후 자동 삭제되며, 언제든 직접 삭제할 수 있습니다.</p>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-3 rounded-xl text-sm font-bold bg-ft-red text-white hover:bg-ft-red-h transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중…' : '저장하기'}
        </button>

        {/* 메시지 */}
        {message && (
          <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </section>

      {/* 사주 요약 (저장된 경우) */}
      {sajuSummary && (
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ft-ink uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            사주 정보
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xl">🔮</span>
            <div>
              <div className="text-ft-body font-medium">{sajuSummary}</div>
              <div className="text-xs text-ft-muted mt-0.5">이 사주 정보가 플래너 생성 시 자동으로 적용됩니다.</div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
