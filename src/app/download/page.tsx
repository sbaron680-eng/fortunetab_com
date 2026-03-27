'use client';

import { useState, useCallback, useEffect } from 'react';
import { generatePlannerPDF, PageType, Orientation, PlannerOptions } from '@/lib/pdf-generator';
import { THEMES } from '@/lib/pdf-themes';
import { useSajuStore, useAuthStore } from '@/lib/store';
import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';
import { getUserTier, verifyOrderForSaju, TIER_FEATURES, type Tier } from '@/lib/tier-gate';

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

// 현재 날짜 기준 표시할 연도 배열 계산
// 1~10월: 금년만 / 11~12월: 금년 + 내년
function getAvailableYears(): number[] {
  const now = new Date();
  const cy  = now.getFullYear();
  const mo  = now.getMonth() + 1; // 1-based
  return mo >= 11 ? [cy, cy + 1] : [cy];
}

export default function DownloadPage() {
  const savedSaju = useSajuStore((s) => s.savedSaju);
  const { user }  = useAuthStore();

  const YEARS = getAvailableYears();

  // ── 티어 & 주문 검증 ──────────────────────────────────────────────────────
  const [tier, setTier]           = useState<Tier>('free');
  const [orderVerified, setOrderVerified] = useState(false);
  const [orderId, setOrderId]     = useState<string | null>(null);

  // URL params 읽기 (window 사용 → SSR 안전)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('orderId');
    const modeParam  = params.get('mode') as PlannerOptions['mode'] | null;
    if (orderParam) setOrderId(orderParam);
    if (modeParam === 'fortune' || modeParam === 'practice') setMode(modeParam);
  }, []);

  // 로그인 유저의 티어 조회
  useEffect(() => {
    if (user?.id) {
      getUserTier(user.id).then(setTier);
    } else {
      setTier('free');
    }
  }, [user?.id]);

  // orderId로 사주 상품 구매 검증
  useEffect(() => {
    if (!user?.id || !orderId) return;
    verifyOrderForSaju(user.id, orderId).then(setOrderVerified);
  }, [user?.id, orderId]);

  // 사주 개인화 가능 여부: 티어 기반 OR 방금 구매한 주문 검증
  const canUseSaju = TIER_FEATURES[tier].sajuPersonalization || orderVerified;

  const [mode, setMode]       = useState<PlannerOptions['mode']>('fortune');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [selectedPages, setSelectedPages] = useState<Set<PageType>>(
    new Set(['cover', 'year-index', 'monthly', 'weekly', 'daily'])
  );
  const [name, setName]       = useState('');
  const [year, setYear]       = useState(() => getAvailableYears()[0]);
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
        mode,
        saju: mode === 'practice' ? undefined : (savedSaju ?? undefined),
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
  }, [orientation, selectedPages, name, year, theme, mode, savedSaju]);

  // ── 예상 페이지 수 계산 ──────────────────────────────────────────────────────
  const estimatedPages = [...selectedPages].reduce((acc, t) => {
    if (t === 'monthly') return acc + 12;
    if (t === 'weekly')  return acc + 52;
    return acc + 1;
  }, 0);

  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-ft-paper py-16 px-4">
      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <div className="bg-ft-ink -mx-4 -mt-16 px-4 pt-16 pb-12 mb-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ft-gold/10 border border-ft-gold/30 text-ft-gold text-sm font-medium mb-4">
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
      </div>

      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── 카드: 플래너 모드 선택 ───────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            플래너 종류
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'fortune', icon: '🔮', label: '운세 플래너', desc: '사주·운세 흐름 기반' },
              { value: 'practice', icon: '🎯', label: '실천 플래너', desc: '목표달성·습관형성' },
            ] as const).map(({ value, icon, label, desc }) => {
              const isSel = mode === value;
              return (
                <button
                  key={value}
                  onClick={() => { setMode(value); setDone(false); }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    isSel
                      ? 'bg-ft-ink text-white ring-2 ring-ft-ink border-ft-ink'
                      : 'bg-white border-ft-border text-ft-body hover:bg-ft-paper-alt'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${isSel ? 'text-white' : 'text-ft-body'}`}>{label}</div>
                    <div className={`text-xs mt-0.5 ${isSel ? 'text-white/70' : 'text-ft-muted'}`}>{desc}</div>
                  </div>
                  {isSel && (
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

        {/* ── 카드: 컬러 테마 ──────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
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

        {/* ── 카드: 방향 선택 ──────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
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

        {/* ── 사주 데이터 연동 배지 ─────────────────────────────────────────────── */}
        {mode === 'fortune' && (
          canUseSaju ? (
            savedSaju ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-ft-paper-alt border border-ft-border rounded-xl text-sm">
                <span className="text-xl">🔮</span>
                <div className="flex-1 min-w-0">
                  <span className="text-ft-body font-medium">사주 데이터 연동됨</span>
                  {orderVerified && (
                    <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ 구매 확인</span>
                  )}
                  <span className="ml-2 text-ft-muted text-xs truncate">{savedSaju.ganzhi}</span>
                </div>
                <button
                  onClick={() => useSajuStore.getState().clearSaju()}
                  className="text-ft-muted hover:text-ft-body transition-colors text-xs flex-shrink-0"
                >
                  해제
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-white border border-ft-border rounded-xl text-sm text-ft-muted">
                <span className="text-xl">💡</span>
                <span>
                  <a href="/saju" className="underline underline-offset-2 hover:text-ft-body transition-colors">사주 계산기</a>에서 생년월일을 입력하면 커버에 사주 정보가 자동으로 추가됩니다.
                </span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm">
              <span className="text-xl">🔒</span>
              <div className="flex-1 min-w-0">
                <span className="text-ft-body font-medium">사주 개인화</span>
                <span className="ml-2 text-ft-muted text-xs">사주 플래너 구매 후 이용 가능</span>
              </div>
              <a
                href="/products/saju-planner-basic"
                className="flex-shrink-0 px-3 py-1.5 bg-ft-gold text-ft-ink rounded-lg text-xs font-bold hover:bg-ft-gold-h transition-colors whitespace-nowrap"
              >
                구매하기 →
              </a>
            </div>
          )
        )}

        {/* ── 카드: 템플릿 선택 ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-ft-border rounded-2xl p-6">
          <h2 className="text-ft-ink font-semibold text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-ft-gold rounded-full inline-block" />
            포함할 템플릿
          </h2>

          {/* 프리셋 */}
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

          {/* 개별 선택 */}
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

          {/* 예상 페이지 수 */}
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
                    opts={{ orientation, year, name: name.trim() || '나의 플래너', theme, mode }}
                    displayWidth={140}
                  />
                  <span className="text-xs text-ft-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-ft-muted mt-3 text-center">
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

          {/* 메인 버튼 */}
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

          {/* 안내 문구 */}
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
