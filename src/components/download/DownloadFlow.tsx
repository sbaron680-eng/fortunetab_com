'use client';

import { useState, useCallback, useMemo } from 'react';
import { generatePlannerPDF, PageType, Orientation, PlannerOptions } from '@/lib/pdf-generator';
import { THEMES } from '@/lib/pdf-themes';
import { useSajuStore, useAuthStore } from '@/lib/store';
import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';
import { EXTRA_PAGES } from '@/lib/pdf-pages-extras';
import { generatePlannerFortune, type PlannerFortuneData } from '@/lib/fortune-text';
import { calculateSajuFromBirthData } from '@/lib/saju';
import { generateZodiacFortune, generateYearFortune } from '@/lib/zodiac-fortune';

// ── 기본 페이지 선택 옵션 ───────────────────────────────────────────────────
// 무료 플래너는 일간 샘플 1p만 제공 — 365일 풀버전은 /premium-planner 전용
const PAGE_OPTIONS: { type: PageType; label: string; sublabel: string; icon: string }[] = [
  { type: 'cover',      label: '커버',        sublabel: '1 페이지',  icon: '🌙' },
  { type: 'year-index', label: '연간 인덱스',  sublabel: '1 페이지',  icon: '📅' },
  { type: 'monthly',    label: '월간',        sublabel: '12 페이지', icon: '🗓️' },
  { type: 'weekly',     label: '주간',        sublabel: '52 페이지', icon: '📋' },
  { type: 'daily',      label: '일간 (샘플)', sublabel: '1 페이지',  icon: '✏️' },
];

// ── 부록 페이지 옵션 (28종) ─────────────────────────────────────────────────
const EXTRA_PAGE_OPTIONS = EXTRA_PAGES.map(e => ({
  type: e.type as PageType,
  label: e.titleKo,
  sublabel: '1 페이지',
  icon: e.icon,
  category: e.categoryKo,
  free: e.free,
})).sort((a, b) => (a.free === b.free ? 0 : a.free ? -1 : 1));

const EXTRA_CATEGORIES = ['연간', '월간', '주간', '일간', '재무', '라이프', '노트'] as const;

// ── 미리 정의된 묶음 프리셋 ──────────────────────────────────────────────────
const PRESETS: { label: string; pages: PageType[] }[] = [
  { label: '전체',       pages: ['cover', 'year-index', 'monthly', 'weekly', 'daily'] },
  { label: '가벼운 버전', pages: ['cover', 'year-index', 'monthly'] },
  { label: '월간+주간',  pages: ['monthly', 'weekly'] },
  { label: '커버만',     pages: ['cover'] },
];

function getAvailableYears(): number[] {
  const now = new Date();
  const cy  = now.getFullYear();
  const mo  = now.getMonth() + 1;
  return mo >= 11 ? [cy, cy + 1] : [cy];
}

export interface DownloadFlowProps {
  /** 개별 라우트에서 플로우 지정 — `/free-planner`는 fortune 기본 */
  initialFlow?: 'fortune' | 'practice' | 'extras';
}

export default function DownloadFlow({ initialFlow = 'fortune' }: DownloadFlowProps = {}) {
  const savedSaju = useSajuStore((s) => s.savedSaju);
  const { user }  = useAuthStore();

  const YEARS = getAvailableYears();

  const flow = initialFlow;

  const flowHeader = {
    fortune: {
      badge: '🔮 무료 다운로드',
      title: '운세 플래너',
      desc: '사주·운세 철학 기반 5종 기본 플래너. 브라우저에서 즉시 PDF 생성.',
    },
    practice: {
      badge: '🎯 무료 다운로드',
      title: '실천 플래너',
      desc: 'OKR·MIT·습관 트래커 내장. 목표달성·실행에 집중한 5종 플래너.',
    },
    extras: {
      badge: '📋 무료 다운로드',
      title: '부록 플래너 맛보기',
      desc: '28종 부록 중 7종 무료 선택. 감사 저널·습관 트래커·할일 목록 등.',
    },
  }[flow];

  const [mode] = useState<PlannerOptions['mode']>(flow === 'practice' ? 'practice' : 'fortune');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [selectedPages, setSelectedPages] = useState<Set<PageType>>(() => {
    if (flow === 'extras') {
      const freeExtras = EXTRA_PAGE_OPTIONS.filter(p => p.free).map(p => p.type);
      return new Set(freeExtras);
    }
    return new Set(['cover', 'year-index', 'monthly', 'weekly', 'daily']);
  });
  const [name, setName]       = useState('');
  const [year, setYear]       = useState(() => getAvailableYears()[0]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [theme, setTheme]     = useState('rose');
  const [zodiacBirthYear, setZodiacBirthYear] = useState<number | ''>(() => {
    if (user?.birthDate) return Number(user.birthDate.split('-')[0]);
    return '';
  });

  // 띠 운세 필요 여부: 운세 플로우 + 생년월일 미입력 사용자 (extras 플로우 제외)
  const needsZodiacInput = flow === 'fortune' && !user?.birthDate;

  // ── 운세 데이터 (미리보기 + PDF 공통) ─────────────────────────────────────────
  const fortuneData = useMemo<PlannerFortuneData | undefined>(() => {
    if (mode !== 'fortune') return undefined;
    if (user?.birthDate) {
      try {
        const sajuResult = calculateSajuFromBirthData(user.birthDate, user.birthHour ?? null);
        return generatePlannerFortune(sajuResult, year);
      } catch { /* 계산 실패 시 다음 단계로 */ }
    }
    if (zodiacBirthYear) {
      return generateZodiacFortune(zodiacBirthYear as number, year);
    }
    return generateYearFortune(year);
  }, [mode, year, zodiacBirthYear, user?.birthDate, user?.birthHour]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [done, setDone]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePage = useCallback((type: PageType) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
    setDone(false);
  }, []);

  const applyPreset = useCallback((pages: PageType[]) => {
    setSelectedPages(new Set(pages));
    setDone(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedPages.size === 0) return;
    setIsGenerating(true);
    setDone(false);
    setError(null);
    setProgress(null);

    try {
      await generatePlannerPDF({
        orientation,
        year,
        name: name.trim() || '나의 플래너',
        pages: [
          ...PAGE_OPTIONS.filter((o) => selectedPages.has(o.type)).map((o) => o.type),
          ...EXTRA_PAGE_OPTIONS.filter((o) => selectedPages.has(o.type)).map((o) => o.type),
        ],
        theme,
        mode,
        saju: mode === 'practice' ? undefined : (savedSaju ?? undefined),
        // 무료 플래너는 일간 샘플 1p만 생성 — 365일 풀버전은 /premium-planner 전용
        dailyFull: false,
        fortuneData,
        onProgress: (current, total, label) => {
          setProgress({ current, total, label });
        },
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Canvas') || msg.includes('memory')) {
        setError('메모리 부족 — 선택한 페이지 수를 줄이거나 브라우저를 새로고침해 주세요.');
      } else if (msg.includes('font') || msg.includes('Font')) {
        setError('폰트 로딩 실패 — 새로고침 후 다시 시도해 주세요.');
      } else {
        setError('PDF 생성 중 오류가 발생했습니다. 선택한 옵션을 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [orientation, selectedPages, name, year, theme, mode, savedSaju, fortuneData]);

  const estimatedPages = [...selectedPages].reduce((acc, t) => {
    if (t === 'monthly') return acc + 12;
    if (t === 'weekly')  return acc + 52;
    return acc + 1; // daily는 항상 샘플 1p
  }, 0);

  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-ft-paper py-16 px-4 animate-fade-in">
      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <div className="bg-ft-ink -mx-4 -mt-16 px-4 pt-16 pb-12 mb-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ft-gold/10 border border-ft-gold/30 text-ft-gold text-sm font-medium mb-4">
            {flowHeader.badge}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {flowHeader.title}
          </h1>
          <p className="text-indigo-300 text-base sm:text-lg leading-relaxed">
            {flowHeader.desc}
          </p>
          <div className="mt-5 flex justify-center gap-1 text-xs">
            {([
              { f: 'fortune',  path: '/free-planner',          label: '🔮 운세' },
              { f: 'practice', path: '/free-planner/practice', label: '🎯 실천' },
              { f: 'extras',   path: '/free-planner/extras',   label: '📋 부록' },
            ] as const).map(({ f, path, label }) => (
              <a
                key={f}
                href={path}
                className={`px-3 py-1 rounded-full transition-colors ${
                  flow === f
                    ? 'bg-ft-gold/20 text-ft-gold border border-ft-gold/40'
                    : 'text-indigo-300/80 hover:text-white border border-transparent hover:border-indigo-400/30'
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── 플로우별 특화 안내 카드 — 실천/부록에는 스타일 선택 대신 ──────────── */}
        {flow === 'practice' && (
          <section className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🎯</span>
              <div>
                <h2 className="text-ft-ink font-bold text-base mb-1.5">실천 플래너가 제공하는 것</h2>
                <ul className="space-y-1 text-sm text-ft-body">
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold">◆</span> 월간 사이드바: 01 OKR · 02 HABITS(5종) · 03 FOCUS · 04 REVIEW</li>
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold">◆</span> 주간 하단: MIT 3가지 · 주간 습관 · 주 회고</li>
                  <li className="flex gap-2"><span className="text-emerald-600 font-bold">◆</span> 일간: TIME BLOCKS(06~22시) + DAILY FOCUS + MIT 3</li>
                </ul>
              </div>
            </div>
          </section>
        )}
        {flow === 'extras' && (
          <section className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">📋</span>
              <div>
                <h2 className="text-ft-ink font-bold text-base mb-1.5">부록 맛보기 가이드</h2>
                <p className="text-sm text-ft-body leading-relaxed">
                  28종 부록 중 <b>무료 7종</b>이 이미 선택되어 있습니다. 원하지 않는 항목은 체크 해제하고, 다른 무료 부록으로 교체할 수 있습니다.
                  메인 5종 템플릿은 이 플래너에 포함되지 않습니다 — 필요하면 <a className="underline" href="/free-planner">운세</a> 또는 <a className="underline" href="/free-planner/practice">실천</a>으로 이동하세요.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── 카드: 출생 연도 (운세 모드 + 생년월일 미설정 시) ─────────────────── */}
        {needsZodiacInput && (
          <section className="bg-white border border-ft-border rounded-2xl p-6">
            <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-ft-red rounded-full inline-block" />
              출생 연도 (띠 운세용)
            </h2>
            <p className="text-xs text-ft-muted -mt-2 mb-3">
              출생 연도를 선택하면 띠별 운세가 플래너에 삽입됩니다.
              {user ? (
                <> <a href="/settings" className="text-ft-ink underline">프로필 설정</a>에서 생년월일을 입력하면 맞춤 운세를 받을 수 있습니다.</>
              ) : (
                <> 로그인 후 생년월일을 입력하면 더 정확한 맞춤 운세를 받을 수 있습니다.</>
              )}
            </p>
            <select
              value={zodiacBirthYear}
              onChange={(e) => { setZodiacBirthYear(e.target.value ? Number(e.target.value) : ''); setDone(false); }}
              className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-3 py-2.5 text-sm text-ft-body focus:outline-none focus:ring-2 focus:ring-ft-ink"
            >
              <option value="">선택 안 함 (운세 없이 생성)</option>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </section>
        )}

        {/* ── 카드: 연도 선택 ───────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            연도
          </h2>
          <div className={`grid gap-3 ${YEARS.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {YEARS.map((y) => {
              const isSel = year === y;
              return (
                <button
                  key={y}
                  onClick={() => { setYear(y); setDone(false); }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    isSel
                      ? 'bg-ft-ink text-white ring-2 ring-ft-ink border-ft-ink'
                      : 'bg-white border border-ft-border text-ft-body hover:bg-ft-paper-alt'
                  }`}
                >
                  {y}년
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 빠른/커스텀 토글 ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-white border border-ft-border rounded-2xl px-5 py-3">
          <span className="text-sm text-ft-ink font-medium">
            {advancedMode ? '커스텀 옵션 표시 중' : '기본 설정으로 빠르게 생성'}
          </span>
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className="text-xs px-3 py-1.5 rounded-lg border border-ft-border text-ft-muted hover:text-ft-ink hover:border-ft-ink transition-colors"
          >
            {advancedMode ? '간소화' : '7가지 테마 · 가로/세로 선택 →'}
          </button>
        </div>

        {/* ── 카드: 컬러 테마 ──────────────────────────────────────────────────── */}
        <section className={`bg-white border border-ft-border rounded-2xl p-6 ${advancedMode ? '' : 'hidden'}`}>
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            컬러 테마
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {THEMES.map((t) => {
              const isSel = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setDone(false); }}
                  title={t.name}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    isSel
                      ? 'border-ft-ink bg-ft-paper-alt ring-2 ring-ft-ink'
                      : 'border-ft-border bg-white hover:bg-ft-paper-alt'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full border-2 border-ft-border shadow-md"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span className={`text-xs font-medium ${isSel ? 'text-ft-ink' : 'text-ft-muted'}`}>
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 카드: 방향 선택 (커스텀) ──────────────────────────────────────────────────── */}
        <section className={`bg-white border border-ft-border rounded-2xl p-6 ${advancedMode ? "" : "hidden"}`}>
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            용지 방향
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(['portrait', 'landscape'] as Orientation[]).map((ori) => {
              const isSelected = orientation === ori;
              return (
                <button
                  key={ori}
                  onClick={() => { setOrientation(ori); setDone(false); }}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'bg-ft-ink text-white ring-2 ring-ft-ink border-ft-ink'
                      : 'bg-white border border-ft-border text-ft-body hover:bg-ft-paper-alt'
                  }`}
                >
                  <div
                    className={`rounded border-2 ${isSelected ? 'border-white/60 bg-white/20' : 'border-ft-border bg-ft-paper-alt'}`}
                    style={ori === 'portrait' ? { width: 32, height: 44 } : { width: 44, height: 32 }}
                  />
                  <div>
                    <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-ft-body'}`}>
                      {ori === 'portrait' ? '세로 (A4)' : '가로 (A4)'}
                    </div>
                    <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-ft-muted'}`}>
                      {ori === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-ft-gold rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-ft-ink" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 카드: 이름 입력 ───────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            플래너 이름 <span className="text-ft-muted font-normal normal-case tracking-normal">(선택)</span>
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setDone(false); }}
            placeholder="예: 나의 2026 플래너"
            maxLength={30}
            className="w-full bg-ft-paper-alt border border-ft-border rounded-xl px-4 py-3 text-ft-body placeholder-ft-muted text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-colors"
          />
          <p className="text-xs text-ft-muted mt-2">커버 페이지에 표시됩니다. 비워두면 &quot;나의 플래너&quot;로 표시됩니다.</p>
        </section>

        {/* ── 카드: 템플릿 선택 ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            포함할 템플릿
          </h2>

          {/* 무료 플래너 안내 — 일간은 샘플 1p만, 365일 풀버전은 유료 전용 */}
          {flow !== 'extras' && (
            <div className="mt-3 mb-4 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 bg-gray-50 text-gray-600 border border-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0 leading-none">ℹ️</span>
                <span className="truncate">
                  무료 다운로드 — 일간은 <b>샘플 1p</b>만 생성됩니다
                </span>
              </div>
              <a href="/products/saju-planner-basic" className="text-ft-ink underline flex-shrink-0 whitespace-nowrap">
                365일 풀버전 →
              </a>
            </div>
          )}

          {/* 운세/실천 플로우 — 메인 5종 선택만 */}
          {flow !== 'extras' && (
            <>
              <div className="flex flex-wrap gap-2 mb-4 mt-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.pages)}
                    className="px-3 py-1 text-xs rounded-full border border-ft-border text-ft-muted hover:border-ft-ink hover:text-ft-ink transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {PAGE_OPTIONS.map(({ type, label, sublabel, icon }) => {
                  const checked = selectedPages.has(type);
                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? 'border-ft-ink bg-ft-paper-alt'
                          : 'border-ft-border bg-white hover:bg-ft-paper-alt'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => togglePage(type)}
                      />
                      <span
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                          checked
                            ? 'bg-ft-ink border-ft-ink'
                            : 'border-ft-border bg-transparent'
                        }`}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className="text-lg leading-none">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-ft-body">{label}</span>
                        <span className="ml-2 text-xs text-ft-muted">{sublabel}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {/* 부록 플로우 — 무료 부록 7종만 선택 (유료 숨김) */}
          {flow === 'extras' && (
            <div className="mt-3">
              <p className="text-xs text-ft-muted mb-3">
                무료 부록 페이지를 선택하세요. 최대 <b>7종</b>까지 가능합니다. 더 많은 부록이 필요하면{' '}
                <a href="/products/extras-full" className="text-ft-ink underline">라이프 플래너 올인원</a>을 확인하세요.
              </p>
              {EXTRA_CATEGORIES.map(cat => {
                const catPages = EXTRA_PAGE_OPTIONS.filter(p => p.category === cat && p.free);
                if (catPages.length === 0) return null;
                return (
                  <div key={cat} className="mb-3">
                    <p className="text-xs font-medium text-ft-muted mb-1.5">{cat}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {catPages.map(({ type, label, icon }) => {
                        const checked = selectedPages.has(type);
                        return (
                          <label
                            key={type}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                              checked
                                ? 'border-ft-ink bg-ft-paper-alt'
                                : 'border-ft-border bg-white hover:bg-ft-paper-alt'
                            }`}
                          >
                            <input type="checkbox" className="sr-only" checked={checked}
                              onChange={() => togglePage(type)} />
                            <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                              checked ? 'bg-ft-ink border-ft-ink' : 'border-ft-border'
                            }`}>
                              {checked && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>}
                            </span>
                            <span>{icon}</span>
                            <span className="flex-1 truncate">{label}</span>
                            <span className="text-emerald-600 text-[10px]">무료</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedPages.size > 0 && (
            <div className="mt-3 text-right text-xs text-ft-muted">
              예상 페이지 수: <span className="text-ft-ink font-medium">{estimatedPages}p</span>
            </div>
          )}
        </section>

        {/* ── 카드: 실시간 미리보기 ────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            실시간 미리보기
            <span className="text-ft-muted font-normal normal-case tracking-normal text-xs ml-1">— 실제 PDF와 동일</span>
          </h2>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {(flow === 'extras'
                ? [
                    { type: 'cover'         as PageType, label: '커버',      idx: 0 },
                    { type: 'habit-tracker' as PageType, label: '습관 트래커', idx: 0 },
                    { type: 'gratitude'     as PageType, label: '감사 일기',   idx: 0 },
                    { type: 'todo'          as PageType, label: '할일 목록',   idx: 0 },
                    { type: 'yearly-goals'  as PageType, label: '연간 목표',   idx: 0 },
                  ]
                : [
                    { type: 'cover'      as PageType, label: '커버',   idx: 0 },
                    { type: 'year-index' as PageType, label: '연간',   idx: 0 },
                    { type: 'monthly'    as PageType, label: '월간',   idx: 0 },
                    { type: 'weekly'     as PageType, label: '주간',   idx: 1 },
                    { type: 'daily'      as PageType, label: '일간',   idx: 0 },
                  ]
              ).map(({ type, label, idx }) => (
                <div key={type} className="flex flex-col items-center gap-2">
                  <PlannerPreviewCanvas
                    pageType={type}
                    pageIdx={idx}
                    opts={{ orientation, year, name: name.trim() || '나의 플래너', theme, mode, fortuneData }}
                    displayWidth={140}
                  />
                  <span className="text-xs text-ft-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-ft-muted mt-3 text-center">
            {flow === 'extras'
              ? '선택한 부록 페이지로 구성된 미리보기입니다'
              : flow === 'practice'
              ? '실천 스타일 — 월간 OKR · 주간 MIT · 일간 TIME BLOCKS로 렌더됩니다'
              : '운세 스타일 — 테마·연도·방향 변경 시 자동 업데이트'}
          </p>
        </section>

        {/* ── 생성 버튼 & 진행 상태 ─────────────────────────────────────────────── */}
        <section className="space-y-3">

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {done && !isGenerating && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              PDF 생성 완료! 다운로드가 시작되었습니다 🎉
            </div>
          )}

          {isGenerating && progress && (
            <div className="px-4 py-3 bg-ft-paper-alt border border-ft-border rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-ft-muted">
                <span className="truncate">{progress.label}</span>
                <span className="flex-shrink-0 ml-2">{progressPct}%</span>
              </div>
              <div className="w-full bg-ft-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-ft-gold h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-xs text-ft-muted text-right">
                {progress.current} / {progress.total} 페이지
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedPages.size === 0}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2.5 ${
              isGenerating || selectedPages.size === 0
                ? 'bg-ft-border text-ft-muted cursor-not-allowed'
                : 'bg-ft-gold text-ft-ink hover:bg-ft-gold-h active:scale-[0.98] shadow-lg shadow-ft-gold/20'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                PDF 생성 중…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {year}년 {THEMES.find(t => t.id === theme)?.name} 테마 PDF 생성
              </>
            )}
          </button>

          <p className="text-center text-xs text-ft-muted leading-relaxed">
            🔒 모든 처리는 내 브라우저에서만 이루어집니다. 서버로 데이터가 전송되지 않습니다.
            <br />
            주간(52p) 포함 시 생성에 10~30초 소요될 수 있습니다.
          </p>
        </section>

        {/* ── 유료 버전 업셀 배너 ───────────────────────────────────────────────── */}
        <section className="bg-ft-ink border border-ft-ink rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-3xl">🔮</div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">사주 기반 맞춤 플래너가 필요하신가요?</div>
            <p className="text-indigo-300 text-xs mt-1 leading-relaxed">
              생년월일시를 바탕으로 나만의 운세 흐름이 담긴 맞춤 플래너를 제작해 드립니다.
            </p>
          </div>
          <a
            href="/products/saju-planner-basic"
            className="flex-shrink-0 px-4 py-2 bg-ft-gold text-ft-ink rounded-xl text-sm font-bold hover:bg-ft-gold-h transition-colors whitespace-nowrap"
          >
            자세히 보기 →
          </a>
        </section>

      </div>
    </main>
  );
}
