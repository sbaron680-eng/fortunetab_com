'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  calculateSaju,
  getMonthlyFortune,
  getTodayFortune,
  getSajuSummary,
  elemCountToPercent,
  ELEM_KO,
  ELEM_HJ,
  ELEM_COLOR,
  ELEM_EMOJI,
  STEMS_KO,
  STEMS_HJ,
  BRANCHES_KO,
  BRANCHES_HJ,
  TIME_TO_BRANCH,
  type SajuResult,
  type FortuneMonth,
  type ElemKo,
} from '@/lib/saju';
import { useSajuStore } from '@/lib/store';
import { PLANNER_YEAR } from '@/lib/products';

// 연도 → 간지(干支) 이름 계산
function getYearGanzhi(year: number) {
  const si = ((year - 4) % 10 + 10) % 10;
  const bi = ((year - 4) % 12 + 12) % 12;
  return `${STEMS_KO[si]}${BRANCHES_KO[bi]}(${STEMS_HJ[si]}${BRANCHES_HJ[bi]})`;
}

// ─── 입력 폼 타입 ────────────────────────────────────────────────────
interface BirthForm {
  year: string;
  month: string;
  day: string;
  time: string;
  gender: 'male' | 'female';
}

const TIME_OPTIONS = Object.keys(TIME_TO_BRANCH);

const TIME_RANGES: Record<string, string> = {
  '자시': '23~01시',
  '축시': '01~03시',
  '인시': '03~05시',
  '묘시': '05~07시',
  '진시': '07~09시',
  '사시': '09~11시',
  '오시': '11~13시',
  '미시': '13~15시',
  '신시': '15~17시',
  '유시': '17~19시',
  '술시': '19~21시',
  '해시': '21~23시',
};

// ─── 서브 컴포넌트: 사주 기둥 카드 ───────────────────────────────────
interface PillarCardProps {
  label: string;
  stemKo: string;
  branchKo: string;
  stemHj: string;
  branchHj: string;
  stemElem: string;
  branchElem: string;
  isDay?: boolean;
}

function PillarCard({
  label, stemKo, branchKo, stemHj, branchHj, stemElem, branchElem, isDay
}: PillarCardProps) {
  const elemIdx = ELEM_KO.indexOf(stemElem as typeof ELEM_KO[number]);
  const color   = elemIdx >= 0 ? ELEM_COLOR[elemIdx] : '#f0c040';

  return (
    <div className={`flex flex-col items-center rounded-xl p-4 bg-white border border-ft-border ${isDay ? 'ring-2 ring-ft-ink' : ''}`}>
      <span className="text-xs text-ft-muted mb-2">{label}</span>
      {stemKo === '?' ? (
        <span className="text-ft-muted text-2xl mt-2 mb-2">?</span>
      ) : (
        <>
          {/* 천간 */}
          <div className="flex flex-col items-center mb-1">
            <span className="text-2xl font-bold text-ft-ink">{stemKo}</span>
            <span className="text-sm text-ft-muted">{stemHj}</span>
            <span className="text-xs px-2 py-0.5 rounded-full mt-1"
                  style={{ background: color + '33', color }}>
              {stemElem}
            </span>
          </div>
          <div className="w-px h-4 bg-ft-border my-1" />
          {/* 지지 */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-ft-ink">{branchKo}</span>
            <span className="text-sm text-ft-muted">{branchHj}</span>
            <span className="text-xs px-2 py-0.5 rounded-full mt-1 bg-ft-paper-alt border border-ft-border text-ft-body">
              {branchElem}
            </span>
          </div>
        </>
      )}
      {isDay && (
        <span className="mt-2 text-xs text-ft-ink font-semibold">일간(나)</span>
      )}
    </div>
  );
}

// ─── 서브 컴포넌트: 오행 분포 바 ──────────────────────────────────────
function ElemDistribution({ saju }: { saju: SajuResult }) {
  const pct = elemCountToPercent(saju.elemCount, saju.hasHour);

  return (
    <div className="rounded-xl p-5 bg-white border border-ft-border">
      <h3 className="text-sm font-semibold text-ft-ink mb-4">오행(五行) 분포</h3>
      <div className="space-y-3">
        {ELEM_KO.map((elem, i) => (
          <div key={elem} className="flex items-center gap-3">
            <span className="text-base w-5">{ELEM_EMOJI[i]}</span>
            <span className="text-sm text-ft-body w-8">{elem}({ELEM_HJ[i]})</span>
            <div className="flex-1 bg-ft-paper-alt rounded-full h-3 border border-ft-border">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${pct[elem]}%`,
                  background: ELEM_COLOR[i],
                  minWidth: pct[elem] > 0 ? '4px' : '0',
                }}
              />
            </div>
            <span className="text-xs text-ft-muted w-8 text-right">{saju.elemCount[elem]}개</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-ft-border flex gap-6 text-sm">
        <div>
          <span className="text-ft-muted">일간 오행</span>
          <span className="ml-2 font-bold" style={{ color: ELEM_COLOR[ELEM_KO.indexOf(saju.dayElem)] }}>
            {ELEM_EMOJI[ELEM_KO.indexOf(saju.dayElem)]} {saju.dayElem}({ELEM_HJ[ELEM_KO.indexOf(saju.dayElem)]})
          </span>
        </div>
        <div>
          <span className="text-ft-muted">용신</span>
          <span className="ml-2 font-bold" style={{ color: ELEM_COLOR[ELEM_KO.indexOf(saju.yongsin)] }}>
            {ELEM_EMOJI[ELEM_KO.indexOf(saju.yongsin)]} {saju.yongsin}({ELEM_HJ[ELEM_KO.indexOf(saju.yongsin)]})
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 서브 컴포넌트: 월운 카드 ─────────────────────────────────────────
const GRADE_STYLE: Record<string, { badgeBg: string; badgeText: string; badgeBorder: string; barColor: string }> = {
  '대길':   { badgeBg: 'bg-green-50',  badgeText: 'text-green-700',  badgeBorder: 'border border-green-200',  barColor: '#22c55e' },
  '길':     { badgeBg: 'bg-blue-50',   badgeText: 'text-blue-700',   badgeBorder: 'border border-blue-200',   barColor: '#3b82f6' },
  '평':     { badgeBg: 'bg-gray-50',   badgeText: 'text-gray-600',   badgeBorder: 'border border-gray-200',   barColor: '#9ca3af' },
  '주의':   { badgeBg: 'bg-red-50',    badgeText: 'text-red-700',    badgeBorder: 'border border-red-200',    barColor: '#ef4444' },
  '어려움': { badgeBg: 'bg-red-50',    badgeText: 'text-red-700',    badgeBorder: 'border border-red-200',    barColor: '#ef4444' },
};

const GRADE_ADVICE: Record<string, string> = {
  '대길':   '이 달은 운기가 최고조에 달합니다. 새로운 시작, 중요한 결정, 대인관계 확장에 최적의 시기입니다. 적극적으로 행동하세요.',
  '길':     '전반적으로 순탄한 흐름입니다. 계획한 일을 추진하기 좋은 달이며, 노력한 만큼 결과가 따릅니다.',
  '평':     '큰 변동 없이 안정적인 달입니다. 현상 유지에 집중하고 무리한 도전보다는 내실을 다지는 시간으로 활용하세요.',
  '주의':   '예상치 못한 변수가 생길 수 있습니다. 충동적 결정을 피하고 신중하게 판단하며 주변의 조언에 귀 기울이세요.',
  '어려움': '다소 힘든 시기입니다. 무리한 확장보다 수비에 집중하고 건강과 관계에 각별히 신경 쓰는 것이 좋습니다.',
};

interface MonthFortuneCardProps {
  fm: FortuneMonth;
  isExpanded: boolean;
  onToggle: () => void;
}

function MonthFortuneCard({ fm, isExpanded, onToggle }: MonthFortuneCardProps) {
  const style = GRADE_STYLE[fm.grade] ?? GRADE_STYLE['평'];
  const advice = GRADE_ADVICE[fm.grade];
  return (
    <div
      className="rounded-xl border border-ft-border bg-white transition-all hover:scale-[1.01] cursor-pointer"
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-ft-ink">{fm.month}월</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}>
              {fm.grade}
            </span>
            <span className="text-xs text-ft-muted transition-transform duration-200"
                  style={{ display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
        </div>
        {/* 점수 바 */}
        <div className="w-full bg-ft-paper-alt border border-ft-border rounded-full h-1.5 mb-3">
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${fm.score}%`, background: fm.color }}
          />
        </div>
        {/* 오행 + 키워드 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: fm.color + '33', color: fm.color }}>
            {ELEM_EMOJI[ELEM_KO.indexOf(fm.monthElem)]} {fm.monthElem}
          </span>
          {fm.keywords.map(kw => (
            <span key={kw} className="text-xs text-ft-muted">#{kw}</span>
          ))}
        </div>
        <p className="text-xs text-ft-muted mt-2 leading-relaxed line-clamp-2">
          {fm.description}
        </p>
      </div>

      {/* 펼쳐진 상세 내용 */}
      {isExpanded && (
        <div
          className="px-4 pb-4 border-t border-ft-border"
          onClick={e => e.stopPropagation()}
        >
          <div className="pt-3 space-y-3">
            {/* 운세 점수 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-ft-muted w-14 flex-shrink-0">운세 점수</span>
              <div className="flex-1 bg-ft-paper-alt border border-ft-border rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${fm.score}%`, background: fm.color }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right text-ft-ink">
                {fm.score}점
              </span>
            </div>
            {/* 상세 설명 */}
            <div>
              <span className="text-xs text-ft-muted block mb-1">이달의 운세</span>
              <p className="text-xs text-ft-body leading-relaxed">{fm.description}</p>
            </div>
            {/* 조언 */}
            <div className="rounded-lg p-3 bg-ft-paper-alt border border-ft-border">
              <span className="text-xs font-semibold text-ft-ink mb-1 block">
                조언
              </span>
              <p className="text-xs text-ft-body leading-relaxed">{advice}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────
export default function SajuPage() {
  const [form, setForm] = useState<BirthForm>({
    year: '1990', month: '1', day: '1', time: '모름', gender: 'male',
  });
  const [saju, setSaju]       = useState<SajuResult | null>(null);
  const [fortune, setFortune] = useState<FortuneMonth[]>([]);
  const [error, setError]     = useState('');
  const [calculated, setCalculated] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const handleChange = (key: keyof BirthForm, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setCalculated(false);
  };

  const handleCalculate = useCallback(() => {
    const y = parseInt(form.year);
    const m = parseInt(form.month);
    const d = parseInt(form.day);

    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      setError('올바른 생년월일을 입력해주세요 (1900–2100년)');
      return;
    }
    setError('');

    const result  = calculateSaju(y, m, d, form.time);
    const monthly = getMonthlyFortune(result, PLANNER_YEAR);
    setSaju(result);
    setFortune(monthly);
    setCalculated(true);

    // PDF 연동용 SajuData를 Zustand store에 저장
    const topElems = (Object.entries(result.elemCount) as [ElemKo, number][])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([e, n]) => `${e} ${n}`)
      .join(' · ');
    useSajuStore.getState().setSaju({
      ganzhi:      getSajuSummary(result),
      dayElem:     result.dayElem,
      yongsin:     result.yongsin,
      yearPillar:  `${result.year.stemKo}${result.year.branchKo}(${result.year.stemHj}${result.year.branchHj})`,
      monthPillar: `${result.month.stemKo}${result.month.branchKo}(${result.month.stemHj}${result.month.branchHj})`,
      dayPillar:   `${result.day.stemKo}${result.day.branchKo}(${result.day.stemHj}${result.day.branchHj})`,
      hourPillar:  result.hasHour ? result.hour.branchKo : '시간미상',
      elemSummary: topElems || '오행 미상',
    });
  }, [form]);

  const todayFortune = saju ? getTodayFortune(saju) : null;

  return (
    <main className="min-h-screen bg-ft-paper py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 히어로 */}
        <div className="text-center mb-10 rounded-2xl py-10 px-6 bg-ft-ink">
          <span className="text-3xl">🔮</span>
          <h1 className="text-3xl font-bold text-white mt-3">
            무료 사주 계산기
          </h1>
          <p className="text-indigo-300 mt-2">
            생년월일을 입력하면 사주팔자와 {PLANNER_YEAR}년 월별 운세를 즉시 확인하세요
          </p>
        </div>

        {/* 입력 카드 */}
        <div className="rounded-2xl p-6 mb-8 bg-white border border-ft-border shadow-sm">
          <h2 className="text-lg font-semibold text-ft-ink mb-5">생년월일 입력</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-ft-ink mb-1">년도</label>
              <input
                type="number"
                value={form.year}
                onChange={e => handleChange('year', e.target.value)}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                placeholder="1990"
                min={1900}
                max={2100}
                className="w-full bg-ft-paper-alt border border-ft-border rounded-lg px-3 py-2 text-ft-body text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ft-ink mb-1">월</label>
              <select
                value={form.month}
                onChange={e => handleChange('month', e.target.value)}
                className="w-full bg-ft-paper-alt border border-ft-border rounded-lg px-3 py-2 text-ft-body text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}월</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ft-ink mb-1">일</label>
              <select
                value={form.day}
                onChange={e => handleChange('day', e.target.value)}
                className="w-full bg-ft-paper-alt border border-ft-border rounded-lg px-3 py-2 text-ft-body text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink"
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}일</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ft-ink mb-1">성별</label>
              <select
                value={form.gender}
                onChange={e => handleChange('gender', e.target.value)}
                className="w-full bg-ft-paper-alt border border-ft-border rounded-lg px-3 py-2 text-ft-body text-sm focus:outline-none focus:ring-2 focus:ring-ft-ink"
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-ft-ink mb-1">
              태어난 시간 <span className="text-ft-muted font-normal">(모르면 &apos;모름&apos; 선택)</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => handleChange('time', t)}
                  className={`py-2 rounded-lg border transition-colors flex flex-col items-center gap-0.5 ${
                    form.time === t
                      ? 'bg-ft-gold text-ft-navy border-ft-gold font-bold'
                      : 'bg-ft-paper-alt text-ft-body border-ft-border hover:border-ft-ink'
                  }`}
                >
                  <span className="text-xs">{t}</span>
                  {TIME_RANGES[t] && (
                    <span className={`text-[10px] leading-tight ${
                      form.time === t ? 'text-[#1e1b4b]/70' : 'text-ft-muted'
                    }`}>
                      {TIME_RANGES[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleCalculate}
            className="w-full py-3 rounded-xl font-bold text-ft-navy bg-ft-gold hover:bg-ft-gold-h transition-colors text-base"
          >
            사주 계산하기
          </button>
        </div>

        {/* 결과 섹션 */}
        {calculated && saju && (
          <>
            {/* 사주팔자 기둥 */}
            <section className="mb-8 bg-ft-paper rounded-2xl p-6">
              <h2 className="text-lg font-semibold font-serif text-ft-ink mb-1">사주팔자(四柱八字)</h2>
              <p className="text-xs text-ft-muted mb-4">{getSajuSummary(saju)}</p>
              <div className="grid grid-cols-4 gap-3">
                <PillarCard label="연주(年柱)" {...saju.year}
                  stemElem={saju.year.stemElem} branchElem={saju.year.branchElem} />
                <PillarCard label="월주(月柱)" {...saju.month}
                  stemElem={saju.month.stemElem} branchElem={saju.month.branchElem} />
                <PillarCard label="일주(日柱)" {...saju.day}
                  stemElem={saju.day.stemElem} branchElem={saju.day.branchElem} isDay />
                <PillarCard label="시주(時柱)" {...saju.hour}
                  stemElem={saju.hour.stemElem} branchElem={saju.hour.branchElem} />
              </div>
              <p className="text-xs text-ft-muted mt-2 text-center">
                * 일주(日柱)의 천간이 &apos;나&apos;를 나타내는 핵심 오행입니다
              </p>
            </section>

            {/* 오행 분포 */}
            <section className="mb-8">
              <ElemDistribution saju={saju} />
            </section>

            {/* 오늘의 운세 */}
            {todayFortune && (
              <section className="mb-8 rounded-xl p-5 bg-white border border-ft-border">
                <h2 className="text-lg font-semibold font-serif text-ft-ink mb-3">
                  오늘의 운세 ({new Date().toLocaleDateString('ko-KR')})
                </h2>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold text-ft-ink">
                      {todayFortune.score}
                    </div>
                    <div className="text-xs text-ft-muted">점</div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold px-3 py-1 rounded-full"
                          style={{ background: todayFortune.color + '33', color: todayFortune.color }}>
                      {todayFortune.grade}
                    </span>
                    <p className="text-sm text-ft-body mt-2">{todayFortune.message}</p>
                  </div>
                </div>
              </section>
            )}

            {/* 2026 월운 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold font-serif text-ft-ink">
                  {PLANNER_YEAR}년 {getYearGanzhi(PLANNER_YEAR)}년 월별 운세
                </h2>
                <span className="text-xs text-ft-muted">
                  일간: {ELEM_EMOJI[ELEM_KO.indexOf(saju.dayElem)]} {saju.dayElem} · 용신: {ELEM_EMOJI[ELEM_KO.indexOf(saju.yongsin)]} {saju.yongsin}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fortune.map(fm => (
                  <MonthFortuneCard
                    key={fm.month}
                    fm={fm}
                    isExpanded={expandedMonth === fm.month}
                    onToggle={() => setExpandedMonth(prev => prev === fm.month ? null : fm.month)}
                  />
                ))}
              </div>
            </section>

            {/* 유료 플래너 CTA */}
            <section className="rounded-2xl p-6 text-center bg-ft-ink border border-ft-border">
              <div className="text-3xl mb-3">📖</div>
              <h3 className="text-xl font-bold text-white mb-2">
                나만의 사주 맞춤 플래너로 업그레이드
              </h3>
              <p className="text-indigo-300 text-sm mb-5 leading-relaxed">
                방금 계산한 사주팔자와 {PLANNER_YEAR}년 운세를{' '}
                <span className="text-ft-gold font-semibold">아름다운 PDF 플래너</span>로 제작해드립니다.
                <br />매월 운세 해설, 일간 플래너, 용신 컬러 테마까지 개인화된 플래너를 받아보세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/products/saju-planner-basic"
                  className="px-6 py-3 rounded-xl font-bold text-ft-navy bg-ft-gold hover:bg-ft-gold-h transition-colors"
                >
                  사주 플래너 기본 ₩19,000
                </Link>
                <Link
                  href="/products/saju-planner-premium"
                  className="px-6 py-3 rounded-xl font-bold text-ft-gold border border-ft-gold hover:bg-ft-gold hover:text-ft-navy transition-colors"
                >
                  사주 플래너 + 리포트 ₩29,000
                </Link>
              </div>
              <p className="text-xs text-indigo-400 mt-3">
                * 구매 후 입력한 사주 정보로 개인화 PDF를 이메일로 발송합니다
              </p>
            </section>
          </>
        )}

        {/* 처음 안내 (계산 전) */}
        {!calculated && (
          <div className="text-center py-16 text-ft-muted">
            <div className="text-6xl mb-4">☯</div>
            <p>생년월일을 입력하고 계산하기 버튼을 눌러주세요</p>
          </div>
        )}

        {/* 면책 고지 */}
        <p className="text-xs text-center text-ft-muted mt-8">
          사주 계산은 전통 역술을 기반으로 하며, 오락·참고 목적으로만 활용하시기 바랍니다.
          중요한 결정은 전문 상담사와 상의하세요.
        </p>
      </div>
    </main>
  );
}
