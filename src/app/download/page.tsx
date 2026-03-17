'use client';

import { useState, useCallback } from 'react';
import { generatePlannerPDF, PageType, Orientation } from '@/lib/pdf-generator';
import { THEMES } from '@/lib/pdf-themes';
import { useSajuStore } from '@/lib/store';
import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';

// ── 페이지 선택 옵션 ─────────────────────────────────────────────────────────
const PAGE_OPTIONS: { type: PageType; label: string; sublabel: string; icon: string }[] = [
  { type: 'cover',      label: '커버',       sublabel: '1 페이지',    icon: '🌙' },
  { type: 'year-index', label: '연간 인덱스', sublabel: '1 페이지',    icon: '📅' },
  { type: 'monthly',    label: '월간',       sublabel: '12 페이지',   icon: '🗓️' },
  { type: 'weekly',     label: '주간',       sublabel: '52 페이지',   icon: '📋' },
  { type: 'daily',      label: '일간 (샘플)', sublabel: '1 페이지',    icon: '✏️' },
];

// ── 미리 정의된 묶음 프리셋 ──────────────────────────────────────────────────
const PRESETS: { label: string; pages: PageType[] }[] = [
  { label: '전체',       pages: ['cover', 'year-index', 'monthly', 'weekly', 'daily'] },
  { label: '가벼운 버전', pages: ['cover', 'year-index', 'monthly'] },
  { label: '월간+주간',  pages: ['monthly', 'weekly'] },
  { label: '커버만',     pages: ['cover'] },
];

const YEARS = [2025, 2026, 2027];

export default function DownloadPage() {
  const savedSaju = useSajuStore((s) => s.savedSaju);

  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [selectedPages, setSelectedPages] = useState<Set<PageType>>(
    new Set(['cover', 'year-index', 'monthly', 'weekly', 'daily'])
  );
  const [name, setName]       = useState('');
  const [year, setYear]       = useState(2026);
  const [theme, setTheme]     = useState('rose');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [done, setDone]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 페이지 토글 ─────────────────────────────────────────────────────────────
  const togglePage = useCallback((type: PageType) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
    setDone(false);
  }, []);

  // ── 프리셋 적용 ─────────────────────────────────────────────────────────────
  const applyPreset = useCallback((pages: PageType[]) => {
    setSelectedPages(new Set(pages));
    setDone(false);
  }, []);

  // ── PDF 생성 ────────────────────────────────────────────────────────────────
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
        pages: PAGE_OPTIONS
          .filter((o) => selectedPages.has(o.type))
          .map((o) => o.type),
        theme,
        saju: savedSaju ?? undefined,
        onProgress: (current, total, label) => {
          setProgress({ current, total, label });
        },
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      setError('PDF 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [orientation, selectedPages, name, year, theme, savedSaju]);

  // ── 예상 페이지 수 계산 ──────────────────────────────────────────────────────
  const estimatedPages = [...selectedPages].reduce((acc, t) => {
    if (t === 'monthly') return acc + 12;
    if (t === 'weekly')  return acc + 52;
    return acc + 1;
  }, 0);

  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1e1b4b] via-[#2d2a6e] to-[#1e1b4b] py-16 px-4">
      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-sm font-medium mb-4">
          🎁 무료 다운로드
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          운세 플래너
        </h1>
        <p className="text-indigo-300 text-base sm:text-lg leading-relaxed">
          템플릿과 방향을 선택하면 브라우저에서 즉시 PDF가 생성됩니다.
          <br className="hidden sm:block" />
          서버 전송 없이 내 기기에서 바로 다운로드됩니다.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── 카드: 연도 선택 ───────────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#f59e0b] rounded-full inline-block" />
            연도
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {YEARS.map((y) => {
              const isSel = year === y;
              return (
                <button
                  key={y}
                  onClick={() => { setYear(y); setDone(false); }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    isSel
                      ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]'
                      : 'border-white/10 bg-white/5 text-white hover:border-white/30'
                  }`}
                >
                  {y}년
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 카드: 컬러 테마 ──────────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#f59e0b] rounded-full inline-block" />
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
                      ? 'border-[#f59e0b] bg-[#f59e0b]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span className={`text-xs font-medium ${isSel ? 'text-[#f59e0b]' : 'text-indigo-300'}`}>
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 카드: 방향 선택 ──────────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#f59e0b] rounded-full inline-block" />
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
                      ? 'border-[#f59e0b] bg-[#f59e0b]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div
                    className={`rounded border-2 ${isSelected ? 'border-[#f59e0b]' : 'border-indigo-400'} bg-indigo-900/60`}
                    style={ori === 'portrait' ? { width: 32, height: 44 } : { width: 44, height: 32 }}
                  />
                  <div>
                    <div className={`text-sm font-semibold ${isSelected ? 'text-[#f59e0b]' : 'text-white'}`}>
                      {ori === 'portrait' ? '세로 (A4)' : '가로 (A4)'}
                    </div>
                    <div className="text-xs text-indigo-400 mt-0.5">
                      {ori === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-[#f59e0b] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#1e1b4b]" fill="currentColor" viewBox="0 0 20 20">
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
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#f59e0b] rounded-full inline-block" />
            플래너 이름 <span className="text-indigo-400 font-normal normal-case tracking-normal">(선택)</span>
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setDone(false); }}
            placeholder="예: 나의 2026 플래너"
            maxLength={30}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-indigo-400/60 text-sm focus:outline-none focus:border-[#f59e0b]/60 transition-colors"
          />
          <p className="text-xs text-indigo-400 mt-2">커버 페이지에 표시됩니다. 비워두면 &quot;나의 플래너&quot;로 표시됩니다.</p>
        </section>

        {/* ── 사주 데이터 연동 배지 ─────────────────────────────────────────────── */}
        {savedSaju ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-sm">
            <span className="text-xl">🔮</span>
            <div className="flex-1 min-w-0">
              <span className="text-indigo-200 font-medium">사주 데이터 연동됨</span>
              <span className="ml-2 text-indigo-400 text-xs truncate">{savedSaju.ganzhi}</span>
            </div>
            <button
              onClick={() => useSajuStore.getState().clearSaju()}
              className="text-indigo-500 hover:text-indigo-300 transition-colors text-xs flex-shrink-0"
            >
              해제
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-indigo-400">
            <span className="text-xl">💡</span>
            <span>
              <a href="/saju" className="underline underline-offset-2 hover:text-indigo-200 transition-colors">사주 계산기</a>에서 생년월일을 입력하면 커버에 사주 정보가 자동으로 추가됩니다.
            </span>
          </div>
        )}

        {/* ── 카드: 템플릿 선택 ─────────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#f59e0b] rounded-full inline-block" />
            포함할 템플릿
          </h2>

          {/* 프리셋 */}
          <div className="flex flex-wrap gap-2 mb-4 mt-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.pages)}
                className="px-3 py-1 text-xs rounded-full border border-white/20 text-indigo-300 hover:border-[#f59e0b]/60 hover:text-[#f59e0b] transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 개별 선택 */}
          <div className="space-y-2">
            {PAGE_OPTIONS.map(({ type, label, sublabel, icon }) => {
              const checked = selectedPages.has(type);
              return (
                <label
                  key={type}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-[#f59e0b]/40 bg-[#f59e0b]/8'
                      : 'border-white/10 bg-white/3 hover:border-white/20'
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
                        ? 'bg-[#f59e0b] border-[#f59e0b]'
                        : 'border-white/30 bg-transparent'
                    }`}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-[#1e1b4b]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <span className="text-lg leading-none">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{label}</span>
                    <span className="ml-2 text-xs text-indigo-400">{sublabel}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* 예상 페이지 수 */}
          {selectedPages.size > 0 && (
            <div className="mt-3 text-right text-xs text-indigo-400">
              예상 페이지 수: <span className="text-[#f59e0b] font-medium">{estimatedPages}p</span>
            </div>
          )}
        </section>

        {/* ── 카드: 실시간 미리보기 ────────────────────────────────────────────── */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#f59e0b] rounded-full inline-block" />
            실시간 미리보기
            <span className="text-indigo-400 font-normal normal-case tracking-normal text-xs ml-1">— 실제 PDF와 동일</span>
          </h2>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {([
                { type: 'cover'      as PageType, label: '커버',   idx: 0 },
                { type: 'year-index' as PageType, label: '연간',   idx: 0 },
                { type: 'monthly'    as PageType, label: '월간',   idx: 0 },
                { type: 'weekly'     as PageType, label: '주간',   idx: 1 },
                { type: 'daily'      as PageType, label: '일간',   idx: 0 },
              ]).map(({ type, label, idx }) => (
                <div key={type} className="flex flex-col items-center gap-2">
                  <PlannerPreviewCanvas
                    pageType={type}
                    pageIdx={idx}
                    opts={{ orientation, year, name: name.trim() || '나의 플래너', theme }}
                    displayWidth={140}
                  />
                  <span className="text-xs text-indigo-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-indigo-500 mt-3 text-center">
            테마·연도·방향 변경 시 자동으로 업데이트됩니다
          </p>
        </section>

        {/* ── 생성 버튼 & 진행 상태 ─────────────────────────────────────────────── */}
        <section className="space-y-3">

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* 완료 메시지 */}
          {done && !isGenerating && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              PDF 생성 완료! 다운로드가 시작되었습니다 🎉
            </div>
          )}

          {/* 진행 바 */}
          {isGenerating && progress && (
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-indigo-300">
                <span className="truncate">{progress.label}</span>
                <span className="flex-shrink-0 ml-2">{progressPct}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#f59e0b] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-xs text-indigo-400 text-right">
                {progress.current} / {progress.total} 페이지
              </div>
            </div>
          )}

          {/* 메인 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedPages.size === 0}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2.5 ${
              isGenerating || selectedPages.size === 0
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-[#f59e0b] text-[#1e1b4b] hover:bg-[#fbbf24] active:scale-[0.98] shadow-lg shadow-[#f59e0b]/20'
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

          {/* 안내 문구 */}
          <p className="text-center text-xs text-indigo-400 leading-relaxed">
            🔒 모든 처리는 내 브라우저에서만 이루어집니다. 서버로 데이터가 전송되지 않습니다.
            <br />
            주간(52p) 포함 시 생성에 10~30초 소요될 수 있습니다.
          </p>
        </section>

        {/* ── 유료 버전 업셀 배너 ───────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-indigo-800/50 to-purple-800/50 border border-indigo-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-3xl">🔮</div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">사주 기반 맞춤 플래너가 필요하신가요?</div>
            <p className="text-indigo-300 text-xs mt-1 leading-relaxed">
              생년월일시를 바탕으로 나만의 운세 흐름이 담긴 맞춤 플래너를 제작해 드립니다.
            </p>
          </div>
          <a
            href="/products/saju-planner-basic"
            className="flex-shrink-0 px-4 py-2 bg-[#f59e0b] text-[#1e1b4b] rounded-xl text-sm font-bold hover:bg-[#fbbf24] transition-colors whitespace-nowrap"
          >
            자세히 보기 →
          </a>
        </section>

      </div>
    </main>
  );
}
