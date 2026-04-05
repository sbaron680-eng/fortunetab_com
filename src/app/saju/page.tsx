'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  calculateSaju,
  getMonthlyFortune,
  getTodayFortune,
  getSajuSummary,
  getSipsinMap,
  detectSinsal,
  calcDaeun,
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
  type Sinsal,
  type DaeunPeriod,
} from '@/lib/saju';
import { useSajuStore, useAuthStore } from '@/lib/store';
import { PLANNER_YEAR } from '@/lib/products';
import { supabase } from '@/lib/supabase';

// ── AI 분석 결과 타입 ────────────────────────────────────────────
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
  monthly_fortunes: Array<{ month: number; fortune: string; score: number; keywords: string[] }>;
}

type AnalysisMode = 'free' | 'paid';

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

// ─── AI 분석 결과 카드 ───────────────────────────────────────────────
function FortuneResultCard({ result }: { result: FortuneResult }) {
  return (
    <div className="bg-white border border-ft-border rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4">
        <h3 className="text-white font-bold font-serif">AI 운세 분석 결과</h3>
      </div>
      <div className="p-5 space-y-5">
        <FSection title="종합 운세" content={result.summary} />
        <FSection title="2026년 운세" content={result.yearly_fortune} />

        <div className="grid grid-cols-2 gap-3">
          <FMiniCard icon="💕" title="인간관계" text={result.relationships} />
          <FMiniCard icon="💼" title="직업·사업" text={result.career} />
          <FMiniCard icon="💰" title="재물·투자" text={result.wealth} />
          <FMiniCard icon="💪" title="건강" text={result.health} />
        </div>

        <div className="flex flex-wrap gap-2">
          {result.lucky_colors?.map(c => (
            <span key={c} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">행운색: {c}</span>
          ))}
          {result.lucky_numbers?.map(n => (
            <span key={n} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200">행운숫자: {n}</span>
          ))}
          {result.lucky_directions?.map(d => (
            <span key={d} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs border border-emerald-200">행운방향: {d}</span>
          ))}
        </div>

        {result.caution_months && result.caution_months.length > 0 && (
          <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700 border border-red-100">
            주의 시기: {result.caution_months.map(m => `${m}월`).join(', ')}
          </div>
        )}

        {result.saju_advice && <FSection title="행동 지침" content={result.saju_advice} />}

        {result.monthly_fortunes.length > 0 && (
          <div>
            <p className="text-sm font-bold text-ft-ink mb-3">월별 운세</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {result.monthly_fortunes.map(m => (
                <div key={m.month} className="text-center p-2 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-ft-muted">{m.month}월</p>
                  <p className={`text-lg font-bold ${m.score >= 8 ? 'text-emerald-600' : m.score >= 5 ? 'text-ft-ink' : 'text-red-500'}`}>{m.score}</p>
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

        <Link
          href="/products/saju-planner-basic"
          className="block text-center py-3 bg-ft-ink text-white font-bold rounded-xl text-sm hover:bg-ft-ink-mid transition-colors"
        >
          이 사주로 맞춤 플래너 만들기 →
        </Link>
      </div>
    </div>
  );
}

function FSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-ft-ink mb-1">{title}</p>
      <p className="text-sm text-ft-muted leading-relaxed">{content}</p>
    </div>
  );
}

function FMiniCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-xs font-medium text-ft-ink mb-1">{icon} {title}</p>
      <p className="text-xs text-ft-muted leading-relaxed">{text}</p>
    </div>
  );
}

// ─── AI 분석 로컬 사주 카드 ──────────────────────────────────────────
function AiLocalSajuCard({ data }: { data: {
  saju: SajuResult; sipsin: ReturnType<typeof getSipsinMap>;
  sinsal: Sinsal[]; daeun: DaeunPeriod[];
} }) {
  const { saju, sipsin, sinsal, daeun } = data;
  const pct = elemCountToPercent(saju.elemCount, saju.hasHour);

  return (
    <div className="bg-white border border-ft-border rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-4">
        <h3 className="text-white font-bold font-serif">사주 원국 (엔진 계산)</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {(['year', 'month', 'day', 'hour'] as const).map(k => {
            const p = saju[k];
            const label = { year: '년주', month: '월주', day: '일주', hour: '시주' }[k];
            const s = k === 'day' ? '일간' : (sipsin as Record<string, string>)[`${k}Stem`];
            return (
              <div key={k} className="border border-ft-border rounded-xl p-2">
                <p className="text-xs text-ft-muted mb-1">{label} {k === 'day' && <span className="text-ft-gold">★</span>}</p>
                <p className="font-bold text-lg text-ft-ink">{p.stemKo}{p.branchKo}</p>
                <p className="text-xs text-ft-muted">{p.stemHj}{p.branchHj}</p>
                <p className="text-xs mt-1 text-indigo-600">{s}</p>
              </div>
            );
          })}
        </div>

        <div>
          <p className="text-xs text-ft-muted mb-2">오행 분포</p>
          <div className="flex gap-1">
            {ELEM_KO.map((elem, i) => (
              <div key={elem} className="flex-1 text-center">
                <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                  <div className="absolute bottom-0 w-full rounded-b-lg transition-all"
                    style={{ height: `${pct[elem]}%`, backgroundColor: ELEM_COLOR[i] + '80' }} />
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

        {sinsal.length > 0 && (
          <div>
            <p className="text-xs text-ft-muted mb-2">신살</p>
            <div className="flex flex-wrap gap-2">
              {sinsal.map(s => (
                <span key={s.name} className={`px-2.5 py-1 rounded-full text-xs border ${
                  s.type === 'good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : s.type === 'bad' ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>{s.name}</span>
              ))}
            </div>
          </div>
        )}

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

// ─── AI 분석 잠금 화면 ───────────────────────────────────────────────
function AiPaywall({ onUnlock }: { onUnlock: () => void }) {
  return (
    <section className="mb-8 rounded-2xl overflow-hidden border border-ft-border">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-4 flex items-center gap-2">
        <span className="text-white text-lg">✨</span>
        <div>
          <h3 className="text-white font-bold font-serif">AI 심층 분석</h3>
          <p className="text-amber-100 text-xs">Claude AI가 사주팔자를 심층 분석합니다</p>
        </div>
      </div>
      <div className="bg-white p-5 relative">
        <div className="select-none pointer-events-none blur-[5px] space-y-4">
          <div>
            <p className="text-sm font-bold text-ft-ink mb-1">종합 운세</p>
            <p className="text-sm text-ft-muted leading-relaxed">
              목하 병화(丙火) 일간의 기운이 강하게 작용하는 한 해입니다.
              상반기에는 새로운 기회가 열리며 특히 3~4월에 중요한 전환점이 찾아옵니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['💼 직업·사업', '💰 재물·투자', '💕 인간관계', '💪 건강'].map(t => (
              <div key={t} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-ft-ink mb-1">{t}</p>
                <p className="text-xs text-ft-muted">올해는 전반적으로 상승세를 타는 시기입니다.</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[7, 8, 6, 9, 5, 8, 7, 9, 6, 8, 5, 7].map((s, i) => (
              <div key={i} className="text-center p-2 bg-gray-50 rounded-xl">
                <p className="text-xs text-ft-muted">{i + 1}월</p>
                <p className={`text-lg font-bold ${s >= 8 ? 'text-emerald-600' : s >= 6 ? 'text-ft-ink' : 'text-red-500'}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="text-center px-6 py-6 rounded-2xl bg-white border border-ft-border shadow-lg max-w-xs w-full">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-sm font-bold text-ft-ink mb-1">AI 심층 분석 잠금</p>
            <p className="text-xs text-ft-muted mb-4 leading-relaxed">
              종합운세·직업·재물·건강·인간관계<br />월별 운세 + 행운 정보 포함
            </p>
            <button
              onClick={onUnlock}
              className="w-full py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors text-sm"
            >
              AI 운세 분석 보기 — ₩3,900
            </button>
            <p className="text-[10px] text-ft-muted mt-2">1회 이용권 · 로그인 필요</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────
export default function SajuPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<BirthForm>({
    year: '1990', month: '1', day: '1', time: '모름', gender: 'male',
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saju, setSaju]       = useState<SajuResult | null>(null);
  const [fortune, setFortune] = useState<FortuneMonth[]>([]);
  const [error, setError]     = useState('');
  const [calculated, setCalculated] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  // ── 모드 & AI 분석 상태 ──
  const [mode, setMode] = useState<AnalysisMode>('free');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<FortuneResult | null>(null);
  const [aiLocalSaju, setAiLocalSaju] = useState<{
    saju: SajuResult; sipsin: ReturnType<typeof getSipsinMap>;
    sinsal: Sinsal[]; daeun: DaeunPeriod[];
  } | null>(null);
  const [aiError, setAiError] = useState('');
  const [hasPurchase, setHasPurchase] = useState<boolean | null>(null);

  // 구매 확인 (paid 모드일 때)
  useEffect(() => {
    if (mode !== 'paid' || !user) { setHasPurchase(mode === 'paid' ? false : null); return; }
    supabase
      .from('fortune_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'saju')
      .is('used_at', null)
      .maybeSingle()
      .then(({ data }) => setHasPurchase(!!data));
  }, [user, mode]);

  // 프로필 생년월일 자동 채움
  useEffect(() => {
    if (!user?.birthDate) return;
    const [y, m, d] = user.birthDate.split('-').map(String);
    setForm({
      year: y,
      month: String(Number(m)),
      day: String(Number(d)),
      time: user.birthHour ?? '모름',
      gender: (user.gender as 'male' | 'female') ?? 'male',
    });
    setProfileLoaded(true);
  }, [user?.birthDate, user?.birthHour, user?.gender]);

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

  // ── AI 분석 실행 ──
  const handleAiAnalyze = useCallback(async () => {
    if (!user) {
      window.location.href = '/auth/login?next=/saju';
      return;
    }
    if (!hasPurchase) {
      window.location.href = '/checkout?product=fortune-saju';
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    setAiLocalSaju(null);

    try {
      const { year, month, day, time, gender } = form;
      const birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // 로컬 사주 계산 (AI 분석 패널용)
      const sajuCalc = calculateSaju(Number(year), Number(month), Number(day), time);
      setAiLocalSaju({
        saju: sajuCalc,
        sipsin: getSipsinMap(sajuCalc),
        sinsal: detectSinsal(sajuCalc),
        daeun: calcDaeun(sajuCalc, gender),
      });

      const body = {
        type: 'saju',
        input: { name: user.name || '사용자', birth_date: birthDate, birth_time: time, gender, year: 2026 },
      };

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
      setAiResult(data.data);

      // 이용권 사용 처리
      await supabase
        .from('fortune_purchases')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('type', 'saju')
        .is('used_at', null);
      setHasPurchase(false);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  }, [form, user, hasPurchase]);

  const handleUnlock = useCallback(() => {
    if (!user) {
      window.location.href = '/auth/login?next=/saju';
      return;
    }
    window.location.href = '/checkout?product=fortune-saju';
  }, [user]);

  const todayFortune = saju ? getTodayFortune(saju) : null;

  return (
    <main className="min-h-screen bg-ft-paper py-20 px-6">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* 히어로 — 대칭형 2컬럼 (모드 셀렉터) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* 무료 — 라이트 카드 */}
          <button
            onClick={() => setMode('free')}
            className={`hover-lift btn-press rounded-2xl border-2 bg-white p-6 flex flex-col items-center text-center transition-all text-left ${
              mode === 'free' ? 'border-ft-ink shadow-lg scale-[1.02]' : 'border-ft-border hover:border-gray-300'
            }`}
          >
            <span className="text-3xl mb-3">🔮</span>
            <h2 className="font-serif text-lg font-bold text-ft-ink">사주 계산기</h2>
            <p className="text-sm text-ft-muted mt-2 leading-relaxed">
              생년월일로 사주팔자, 오행 분포,<br />{PLANNER_YEAR}년 월별 운세를 즉시 확인
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-ft-body">
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                사주팔자 · 천간지지
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                오행 분포 · 용신 분석
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {PLANNER_YEAR}년 12개월 운세 흐름
              </li>
            </ul>
            <span className={`mt-auto pt-5 w-full block py-2.5 rounded-xl border-2 text-sm font-semibold text-center transition-colors ${
              mode === 'free'
                ? 'border-ft-ink bg-ft-ink text-white'
                : 'border-ft-ink text-ft-ink hover:bg-ft-ink hover:text-white'
            }`}>
              무료로 시작
            </span>
          </button>

          {/* 유료 — 다크 카드 */}
          <button
            onClick={() => setMode('paid')}
            className={`hover-lift btn-press rounded-2xl border-2 bg-ft-ink p-6 flex flex-col items-center text-center transition-all text-left ${
              mode === 'paid' ? 'border-ft-gold shadow-lg scale-[1.02]' : 'border-ft-ink hover:border-indigo-400'
            }`}
          >
            <span className="text-3xl mb-3">
              <svg className="w-8 h-8 text-ft-gold mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </span>
            <h2 className="font-serif text-lg font-bold text-white">AI 운세 심층 분석</h2>
            <p className="text-sm text-indigo-300 mt-2 leading-relaxed">
              사주 결과를 AI가 해석해 드립니다<br />성격, 재운, 연애운, 건강운까지
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-indigo-200">
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-ft-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                AI 성격 · 성향 심층 해석
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-ft-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                재운 · 연애운 · 건강운 분석
              </li>
              <li className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-ft-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                맞춤 행동 가이드 제공
              </li>
            </ul>
            <span className={`mt-auto pt-5 w-full block py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
              mode === 'paid'
                ? 'bg-ft-gold text-ft-ink'
                : 'bg-ft-gold/80 text-ft-ink hover:bg-ft-gold'
            }`}>
              심층 분석 보기
            </span>
          </button>
        </div>

        {/* 프로필 자동 입력 안내 */}
        {profileLoaded && (
          <div className="bg-ft-paper-alt border border-ft-border rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
            <span className="text-xs text-ft-body">&#10003; 프로필 생년월일이 자동 입력되었습니다.</span>
            <Link href="/settings" className="text-xs text-ft-muted hover:text-ft-ink transition-colors">설정에서 수정 →</Link>
          </div>
        )}

        {/* 입력 카드 */}
        <div id="input" className="rounded-2xl p-6 mb-8 bg-white border border-ft-border shadow-sm scroll-mt-20">
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

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setMode('free'); handleCalculate(); }}
              className={`btn-press py-3 rounded-xl font-bold transition-colors text-sm ${
                mode === 'free'
                  ? 'bg-ft-ink text-white'
                  : 'text-ft-ink border-2 border-ft-ink hover:bg-ft-ink hover:text-white'
              }`}
            >
              무료로 시작
            </button>
            <button
              onClick={() => { setMode('paid'); handleAiAnalyze(); }}
              disabled={aiLoading}
              className={`btn-press py-3 rounded-xl font-bold transition-colors text-sm ${
                mode === 'paid'
                  ? 'bg-ft-gold text-ft-ink'
                  : 'bg-ft-gold/80 text-ft-ink hover:bg-ft-gold'
              } disabled:opacity-50`}
            >
              {aiLoading ? 'AI 분석 중...' : '심층 분석 보기'}
            </button>
          </div>
          <p className="text-xs text-ft-muted text-center mt-2">무료: 사주팔자 + 오행 + 월별 운세 즉시 확인 · 심층: AI가 성격, 재운, 연애운까지 해석</p>
        </div>

        {/* ── 분석 결과 섹션 ── */}

        {/* 무료 모드 결과 */}
        {mode === 'free' && calculated && saju && (
          <>
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

            <section className="mb-8">
              <ElemDistribution saju={saju} />
            </section>

            {todayFortune && (
              <section className="mb-8 rounded-xl p-5 bg-white border border-ft-border">
                <h2 className="text-lg font-semibold font-serif text-ft-ink mb-3">
                  오늘의 운세 ({new Date().toLocaleDateString('ko-KR')})
                </h2>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold text-ft-ink">{todayFortune.score}</div>
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

            {/* 무료 모드 하단: AI 분석 업그레이드 유도 */}
            <section className="mb-8 rounded-2xl p-6 text-center bg-gradient-to-r from-amber-600 to-amber-500 border border-amber-400">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="text-xl font-bold text-white mb-2">더 깊은 분석이 궁금하다면?</h3>
              <p className="text-amber-100 text-sm mb-4 leading-relaxed">
                AI가 사주팔자를 심층 해석합니다 — 성격, 직업운, 재물운, 건강운, 월별 운세까지
              </p>
              <button
                onClick={() => { setMode('paid'); handleAiAnalyze(); }}
                className="px-8 py-3 rounded-xl font-bold text-ft-ink bg-white hover:bg-gray-100 transition-colors text-sm"
              >
                AI 심층 분석 보기 →
              </button>
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

        {/* 유료 모드 결과 */}
        {mode === 'paid' && (
          <div className="space-y-6">
            {/* AI 로딩 */}
            {aiLoading && (
              <div className="text-center py-16">
                <svg className="animate-spin w-10 h-10 mx-auto text-amber-500 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-ft-ink font-semibold">AI가 사주를 분석하고 있습니다...</p>
                <p className="text-sm text-ft-muted mt-1">약 10~15초 소요됩니다</p>
              </div>
            )}

            {/* AI 에러 */}
            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{aiError}</div>
            )}

            {/* AI 로컬 사주 + 결과 */}
            {!aiLoading && !aiResult && !aiError && (
              <AiPaywall onUnlock={handleUnlock} />
            )}

            {aiLocalSaju && <AiLocalSajuCard data={aiLocalSaju} />}
            {aiResult && <FortuneResultCard result={aiResult} />}

            {/* 면책 */}
            {(aiResult || aiLocalSaju) && (
              <p className="text-center text-xs text-ft-muted">
                이 분석은 사주명리학의 학문적 관점에서 참고용으로 제공됩니다.
              </p>
            )}
          </div>
        )}

        {/* 처음 안내 (무료 모드 + 계산 전) */}
        {mode === 'free' && !calculated && (
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
