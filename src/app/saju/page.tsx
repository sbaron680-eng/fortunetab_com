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
  BRANCHES_KO,
  TIME_TO_BRANCH,
  type SajuResult,
  type FortuneMonth,
  type ElemKo,
} from '@/lib/saju';
import { useSajuStore } from '@/lib/store';

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
    <div className={`flex flex-col items-center rounded-xl p-4 ${isDay ? 'ring-2 ring-[#f0c040]' : ''}`}
         style={{ background: 'rgba(30,27,75,0.6)' }}>
      <span className="text-xs text-indigo-300 mb-2">{label}</span>
      {stemKo === '?' ? (
        <span className="text-indigo-400 text-2xl mt-2 mb-2">?</span>
      ) : (
        <>
          {/* 천간 */}
          <div className="flex flex-col items-center mb-1">
            <span className="text-2xl font-bold" style={{ color }}>{stemKo}</span>
            <span className="text-sm text-indigo-300">{stemHj}</span>
            <span className="text-xs px-2 py-0.5 rounded-full mt-1"
                  style={{ background: color + '33', color }}>
              {stemElem}
            </span>
          </div>
          <div className="w-px h-4 bg-indigo-600 my-1" />
          {/* 지지 */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{branchKo}</span>
            <span className="text-sm text-indigo-300">{branchHj}</span>
            <span className="text-xs px-2 py-0.5 rounded-full mt-1 bg-indigo-800 text-indigo-200">
              {branchElem}
            </span>
          </div>
        </>
      )}
      {isDay && (
        <span className="mt-2 text-xs text-[#f0c040]">일간(나)</span>
      )}
    </div>
  );
}

// ─── 서브 컴포넌트: 오행 분포 바 ──────────────────────────────────────
function ElemDistribution({ saju }: { saju: SajuResult }) {
  const pct = elemCountToPercent(saju.elemCount, saju.hasHour);

  return (
    <div className="rounded-xl p-5" style={{ background: 'rgba(30,27,75,0.6)' }}>
      <h3 className="text-sm font-semibold text-indigo-300 mb-4">오행(五行) 분포</h3>
      <div className="space-y-3">
        {ELEM_KO.map((elem, i) => (
          <div key={elem} className="flex items-center gap-3">
            <span className="text-base w-5">{ELEM_EMOJI[i]}</span>
            <span className="text-sm text-indigo-200 w-8">{elem}({ELEM_HJ[i]})</span>
            <div className="flex-1 bg-indigo-900 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${pct[elem]}%`,
                  background: ELEM_COLOR[i],
                  minWidth: pct[elem] > 0 ? '4px' : '0',
                }}
              />
            </div>
            <span className="text-xs text-indigo-300 w-8 text-right">{saju.elemCount[elem]}개</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-indigo-700 flex gap-6 text-sm">
        <div>
          <span className="text-indigo-400">일간 오행</span>
          <span className="ml-2 font-bold" style={{ color: ELEM_COLOR[ELEM_KO.indexOf(saju.dayElem)] }}>
            {ELEM_EMOJI[ELEM_KO.indexOf(saju.dayElem)]} {saju.dayElem}({ELEM_HJ[ELEM_KO.indexOf(saju.dayElem)]})
          </span>
        </div>
        <div>
          <span className="text-indigo-400">용신</span>
          <span className="ml-2 font-bold" style={{ color: ELEM_COLOR[ELEM_KO.indexOf(saju.yongsin)] }}>
            {ELEM_EMOJI[ELEM_KO.indexOf(saju.yongsin)]} {saju.yongsin}({ELEM_HJ[ELEM_KO.indexOf(saju.yongsin)]})
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 서브 컴포넌트: 월운 카드 ─────────────────────────────────────────
const GRADE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  '대길':   { bg: 'rgba(240,192,64,0.15)',  text: '#f0c040', border: 'rgba(240,192,64,0.4)' },
  '길':     { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  '평':     { bg: 'rgba(99,102,241,0.15)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
  '주의':   { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  '어려움': { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
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
  const style = GRADE_STYLE[fm.grade];
  const advice = GRADE_ADVICE[fm.grade];
  return (
    <div
      className="rounded-xl border transition-all hover:scale-[1.01] cursor-pointer"
      style={{ background: style.bg, borderColor: isExpanded ? style.text : style.border }}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">{fm.month}월</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: style.border, color: style.text }}>
              {fm.grade}
            </span>
            <span className="text-xs text-indigo-400 transition-transform duration-200"
                  style={{ display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
        </div>
        {/* 점수 바 */}
        <div className="w-full bg-indigo-900 rounded-full h-1.5 mb-3">
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
            <span key={kw} className="text-xs text-indigo-300">#{kw}</span>
          ))}
        </div>
        <p className="text-xs text-indigo-300 mt-2 leading-relaxed line-clamp-2">
          {fm.description}
        </p>
      </div>

      {/* 펼쳐진 상세 내용 */}
      {isExpanded && (
        <div
          className="px-4 pb-4 border-t"
          style={{ borderColor: style.border }}
          onClick={e => e.stopPropagation()}
        >
          <div className="pt-3 space-y-3">
            {/* 운세 점수 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-400 w-14 flex-shrink-0">운세 점수</span>
              <div className="flex-1 bg-indigo-900 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${fm.score}%`, background: fm.color }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right" style={{ color: fm.color }}>
                {fm.score}점
              </span>
            </div>
            {/* 상세 설명 */}
            <div>
              <span className="text-xs text-indigo-400 block mb-1">이달의 운세</span>
              <p className="text-xs text-indigo-200 leading-relaxed">{fm.description}</p>
            </div>
            {/* 조언 */}
            <div className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <span className="text-xs font-semibold mb-1 block" style={{ color: style.text }}>
                💡 조언
              </span>
              <p className="text-xs text-indigo-200 leading-relaxed">{advice}</p>
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
    const monthly = getMonthlyFortune(result, 2026);
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
    <main className="min-h-screen bg-[#0f0e17] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <span className="text-3xl">🔮</span>
          <h1 className="text-3xl font-bold text-white mt-3">
            무료 사주 계산기
          </h1>
          <p className="text-indigo-300 mt-2">
            생년월일을 입력하면 사주팔자와 2026년 월별 운세를 즉시 확인하세요
          </p>
        </div>

        {/* 입력 카드 */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: 'rgba(30,27,75,0.7)' }}>
          <h2 className="text-lg font-semibold text-[#f0c040] mb-5">생년월일 입력</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-indigo-300 mb-1">년도</label>
              <input
                type="number"
                value={form.year}
                onChange={e => handleChange('year', e.target.value)}
                placeholder="1990"
                min={1900}
                max={2100}
                className="w-full bg-indigo-900 border border-indigo-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0c040]"
              />
            </div>
            <div>
              <label className="block text-xs text-indigo-300 mb-1">월</label>
              <select
                value={form.month}
                onChange={e => handleChange('month', e.target.value)}
                className="w-full bg-indigo-900 border border-indigo-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0c040]"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}월</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-indigo-300 mb-1">일</label>
              <select
                value={form.day}
                onChange={e => handleChange('day', e.target.value)}
                className="w-full bg-indigo-900 border border-indigo-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0c040]"
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}일</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-indigo-300 mb-1">성별</label>
              <select
                value={form.gender}
                onChange={e => handleChange('gender', e.target.value)}
                className="w-full bg-indigo-900 border border-indigo-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0c040]"
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs text-indigo-300 mb-1">
              태어난 시간 <span className="text-indigo-500">(모르면 '모름' 선택)</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => handleChange('time', t)}
                  className={`py-2 rounded-lg border transition-colors flex flex-col items-center gap-0.5 ${
                    form.time === t
                      ? 'bg-[#f0c040] text-[#1e1b4b] border-[#f0c040] font-bold'
                      : 'bg-indigo-900 text-indigo-300 border-indigo-600 hover:border-[#f0c040]'
                  }`}
                >
                  <span className="text-xs">{t}</span>
                  {TIME_RANGES[t] && (
                    <span className={`text-[10px] leading-tight ${
                      form.time === t ? 'text-[#1e1b4b]/70' : 'text-indigo-500'
                    }`}>
                      {TIME_RANGES[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            onClick={handleCalculate}
            className="w-full py-3 rounded-xl font-bold text-[#1e1b4b] bg-[#f0c040] hover:bg-[#e0b030] transition-colors text-base"
          >
            사주 계산하기
          </button>
        </div>

        {/* 결과 섹션 */}
        {calculated && saju && (
          <>
            {/* 사주팔자 기둥 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-1">사주팔자(四柱八字)</h2>
              <p className="text-xs text-indigo-400 mb-4">{getSajuSummary(saju)}</p>
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
              <p className="text-xs text-indigo-500 mt-2 text-center">
                * 일주(日柱)의 천간이 &apos;나&apos;를 나타내는 핵심 오행입니다
              </p>
            </section>

            {/* 오행 분포 */}
            <section className="mb-8">
              <ElemDistribution saju={saju} />
            </section>

            {/* 오늘의 운세 */}
            {todayFortune && (
              <section className="mb-8 rounded-xl p-5"
                       style={{ background: 'rgba(30,27,75,0.6)', border: `1px solid ${todayFortune.color}44` }}>
                <h2 className="text-lg font-semibold text-white mb-3">
                  🌟 오늘의 운세 ({new Date().toLocaleDateString('ko-KR')})
                </h2>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold" style={{ color: todayFortune.color }}>
                      {todayFortune.score}
                    </div>
                    <div className="text-xs text-indigo-300">점</div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold px-3 py-1 rounded-full"
                          style={{ background: todayFortune.color + '33', color: todayFortune.color }}>
                      {todayFortune.grade}
                    </span>
                    <p className="text-sm text-indigo-200 mt-2">{todayFortune.message}</p>
                  </div>
                </div>
              </section>
            )}

            {/* 2026 월운 */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  2026년 병오(丙午)년 월별 운세
                </h2>
                <span className="text-xs text-indigo-400">
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
            <section className="rounded-2xl p-6 text-center"
                     style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.9), rgba(15,14,23,0.9))',
                              border: '1px solid rgba(240,192,64,0.3)' }}>
              <div className="text-3xl mb-3">📖</div>
              <h3 className="text-xl font-bold text-white mb-2">
                나만의 사주 맞춤 플래너로 업그레이드
              </h3>
              <p className="text-indigo-300 text-sm mb-5 leading-relaxed">
                방금 계산한 사주팔자와 2026년 운세를{' '}
                <span className="text-[#f0c040] font-semibold">아름다운 PDF 플래너</span>로 제작해드립니다.
                <br />매월 운세 해설, 일간 플래너, 용신 컬러 테마까지 개인화된 플래너를 받아보세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/products/saju-planner-basic"
                  className="px-6 py-3 rounded-xl font-bold text-[#1e1b4b] bg-[#f0c040] hover:bg-[#e0b030] transition-colors"
                >
                  베이직 플래너 ₩19,000
                </Link>
                <Link
                  href="/products/saju-planner-premium"
                  className="px-6 py-3 rounded-xl font-bold text-[#f0c040] border border-[#f0c040] hover:bg-[#f0c040] hover:text-[#1e1b4b] transition-colors"
                >
                  프리미엄 플래너 ₩29,000 ✨
                </Link>
              </div>
              <p className="text-xs text-indigo-500 mt-3">
                * 구매 후 입력한 사주 정보로 개인화 PDF를 이메일로 발송합니다
              </p>
            </section>
          </>
        )}

        {/* 처음 안내 (계산 전) */}
        {!calculated && (
          <div className="text-center py-16 text-indigo-500">
            <div className="text-6xl mb-4">☯</div>
            <p>생년월일을 입력하고 계산하기 버튼을 눌러주세요</p>
          </div>
        )}

        {/* 면책 고지 */}
        <p className="text-xs text-center text-indigo-600 mt-8">
          사주 계산은 전통 역술을 기반으로 하며, 오락·참고 목적으로만 활용하시기 바랍니다.
          중요한 결정은 전문 상담사와 상의하세요.
        </p>
      </div>
    </main>
  );
}
