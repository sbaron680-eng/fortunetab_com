/**
 * fortune-generator.ts
 *
 * 교차 분석 기반 개인화 운세 생성기.
 * 단순 "오행 → 고정 텍스트" 매핑이 아니라,
 * 일간 × 용신 × 대운십신 × 오행분포 × 신살 × 월지를 교차해
 * 같은 일간이라도 사주 구성에 따라 완전히 다른 결과를 생성합니다.
 *
 * 교차 분석 축:
 * ① 일간(日干) — 기본 성향 골격
 * ② 용신(用神) — 보완 방향 (같은 일간이라도 용신이 다르면 조언이 완전히 달라짐)
 * ③ 대운 십신 — 현재 인생 국면 (같은 사주라도 나이에 따라 다른 결과)
 * ④ 오행 분포 — 과다/부족 오행에 따른 개인별 경고·보강 포인트
 * ⑤ 신살 × 대운 — "지금 시기에 이 신살이 의미하는 것"
 * ⑥ 이번 달 × 용신 — 시점 맞춤 행동 제안
 * ⑦ Fortune Score — 바이오리듬 × 대운 통합 점수
 */

import {
  type SajuResult, type FortuneMonth, type ElemKo, type SipsinName,
  type Sinsal, type DaeunPeriod,
  getMonthlyFortune, getTodayFortune,
  ELEM_KO, ELEM_HJ, ELEM_EMOJI, ELEM_COLOR,
  getSipsinMap, detectSinsal, calcDaeun,
} from './saju';
import { calcBiorhythm } from './biorhythm';

// ── FortuneResult 타입 ───────────────────────────────────────────────

export interface GeneratedFortuneResult {
  summary: string;
  yearly_fortune: string;
  relationships: string;
  career: string;
  wealth: string;
  health: string;
  lucky_colors: string[];
  lucky_numbers: number[];
  lucky_directions: string[];
  ohhaeng_balance: Record<string, number>;
  shinsal: string[];
  caution_months: number[];
  saju_advice: string;
  day_master: string;
  monthly_fortunes: Array<{ month: number; fortune: string; score: number; keywords: string[] }>;
  // 추가: 차별화 필드
  today_fortune?: { score: number; grade: string; message: string };
  this_month?: { score: number; keywords: string[]; deepDive: string };
  fortune_score?: { percent: number; biorhythm: number; phase: string };
}

// ═══════════════════════════════════════════════════════════════════════
// 교차 분석 데이터 (일간 × 용신 × 대운십신)
// ═══════════════════════════════════════════════════════════════════════

// ── ① 일간 × 용신 교차: 종합 성향 (5×5 = 25 조합) ─────────────────

type CrossKey = `${ElemKo}_${ElemKo}`;

const CROSS_PERSONALITY: Record<CrossKey, string> = {
  // 목 일간
  '목_목': '성장을 향한 순수한 의지가 강하지만, 같은 기운이 겹쳐 추진력이 분산될 수 있습니다. 한 가지에 집중하는 선택이 중요합니다.',
  '목_화': '창의적 아이디어를 표현하고 확산시키는 능력이 뛰어납니다. 자신의 비전을 적극적으로 알리면 지지를 얻습니다.',
  '목_토': '이상과 현실의 균형감이 좋습니다. 꿈을 가지되 현실적 기반 위에서 실행할 때 성과가 납니다.',
  '목_금': '부드러운 성격 안에 날카로운 판단력이 숨어 있습니다. 결정적 순간에 과감한 결단이 돌파구를 만듭니다.',
  '목_수': '직관과 성장력의 결합으로 시대 흐름을 읽는 감각이 탁월합니다. 다만 행동보다 생각이 앞서지 않도록 주의하세요.',
  // 화 일간
  '화_목': '열정에 성장의 방향성이 더해져 지속 가능한 추진력을 가집니다. 불타는 순간에도 장기적 관점을 잃지 마세요.',
  '화_화': '강렬한 에너지가 돋보이지만, 소진이 빠를 수 있습니다. 타오르되 꺼지지 않는 리듬 관리가 핵심입니다.',
  '화_토': '열정을 안정적인 성과로 전환하는 능력이 있습니다. 감정에 휩쓸리지 않고 차분하게 마무리하는 힘을 기르세요.',
  '화_금': '표현력과 정밀함이 결합된 드문 조합입니다. 완성도 높은 결과물을 만들 수 있지만, 완벽주의에 빠지지 않도록 주의하세요.',
  '화_수': '정반대 기운의 균형이 필요한 긴장 구조입니다. 이 긴장을 창조적으로 활용하면 남다른 통찰을 보여줍니다.',
  // 토 일간
  '토_목': '안정감 속에서 새로운 가능성을 키우는 타입입니다. 변화를 두려워하지 말고 점진적으로 시도하세요.',
  '토_화': '묵직한 신뢰감에 열정이 더해져 리더십이 빛납니다. 팀을 이끌거나 조직을 만드는 일에 적합합니다.',
  '토_토': '극도의 안정을 추구하지만, 변화에 둔감해질 수 있습니다. 의도적으로 새로운 자극을 찾는 것이 성장의 열쇠입니다.',
  '토_금': '기반 위에 전문성을 쌓아 독보적 위치를 만드는 데 유리합니다. 한 분야를 깊이 파는 전략이 효과적입니다.',
  '토_수': '안정과 유연함의 조화로 위기 관리 능력이 뛰어납니다. 큰 변화 앞에서도 중심을 잡으면서 적응할 수 있습니다.',
  // 금 일간
  '금_목': '정확한 판단력으로 성장 기회를 포착하는 능력이 있습니다. 분석 후 과감한 투자가 좋은 결과를 만듭니다.',
  '금_화': '차가운 논리와 뜨거운 실행력의 결합입니다. 계획을 빠르게 행동으로 옮기는 데 강점이 있습니다.',
  '금_토': '체계적 사고에 안정감이 더해져 조직 관리와 시스템 구축에 탁월합니다. 기반을 다진 후 확장하세요.',
  '금_금': '강한 의지와 집중력이 돋보이지만, 융통성 부족이 약점이 될 수 있습니다. 다른 관점을 수용하는 연습이 필요합니다.',
  '금_수': '분석력에 직관이 결합된 전략적 사고가 강점입니다. 데이터와 감각을 모두 활용하면 최적의 결정을 내립니다.',
  // 수 일간
  '수_목': '깊은 통찰이 실질적 성장으로 이어지는 조합입니다. 생각만 하지 말고 작은 것이라도 시작하세요.',
  '수_화': '지혜와 열정의 긴장 속에서 독창적 아이디어가 나옵니다. 내면의 갈등을 표현의 동력으로 전환하세요.',
  '수_토': '유연한 사고에 현실 감각이 더해져 실용적 지혜가 빛납니다. 추상적 아이디어를 구체적 계획으로 바꾸는 데 능합니다.',
  '수_금': '논리적이고 체계적인 사고의 정점입니다. 연구, 분석, 전략 수립에서 뛰어난 성과를 보여줍니다.',
  '수_수': '직관과 감수성이 매우 강하지만, 현실 기반이 약해질 수 있습니다. 구체적 행동 계획으로 균형을 잡으세요.',
};

// ── ② 대운 십신 × 일간 교차: 현재 시기 진단 ────────────────────────

function buildDaeunDiagnosis(
  sipsin: SipsinName,
  dayElem: ElemKo,
  yongsin: ElemKo,
  startAge: number,
  endAge: number,
): string {
  // 대운 십신과 용신의 관계
  const sipsinElemMap: Record<SipsinName, string> = {
    '비견': '동료·경쟁의 에너지',
    '겁재': '도전·투쟁의 에너지',
    '식신': '창의·표현의 에너지',
    '상관': '변혁·파괴 후 재건의 에너지',
    '편재': '유동적 재물·활동의 에너지',
    '정재': '안정적 재물·축적의 에너지',
    '편관': '외부 압력·시험의 에너지',
    '정관': '질서·인정의 에너지',
    '편인': '비정통적 지혜·직관의 에너지',
    '정인': '정통적 학문·보호의 에너지',
  };

  const isYongsinAligned = (() => {
    // 십신이 용신 계열과 일치하는지 체크
    const supportSipsin: Record<ElemKo, SipsinName[]> = {
      '목': ['편인', '정인'], // 수 → 목을 생
      '화': ['비견', '겁재'], // 화 계열
      '토': ['식신', '상관'], // 화 → 토를 생
      '금': ['편재', '정재'], // 토 → 금을 생
      '수': ['편관', '정관'], // 금 → 수를 생
    };
    return supportSipsin[yongsin]?.includes(sipsin) ?? false;
  })();

  let diagnosis = `현재 ${startAge}~${endAge}세 대운은 "${sipsin}" — ${sipsinElemMap[sipsin]}가 지배하는 시기입니다.\n`;

  if (isYongsinAligned) {
    diagnosis += `이 대운은 용신(${yongsin}행)과 조화를 이루어, 본래의 약점을 보완받는 유리한 흐름입니다. `;
    diagnosis += '이 시기의 기회를 적극 활용하세요.';
  } else {
    diagnosis += `다만 용신(${yongsin}행)과는 다른 방향의 에너지이므로, 의식적으로 ${yongsin}행의 활동을 병행하면 균형을 맞출 수 있습니다.`;
  }

  return diagnosis;
}

// ── ③ 신살 × 대운 교차: "지금 시기의 신살 의미" ───────────────────

function buildSinsalInContext(
  sinsal: Sinsal[],
  daeunSipsin: SipsinName,
  currentMonth: number,
  months: FortuneMonth[],
): string[] {
  if (sinsal.length === 0) return [];

  const thisMonthScore = months[currentMonth - 1]?.score ?? 50;
  const isHighSeason = thisMonthScore >= 65;

  return sinsal.map(s => {
    let context = `${s.name}: ${s.description}`;

    // 대운과 신살의 교차 해석
    if (s.name === '도화살') {
      if (['식신', '상관', '편재'].includes(daeunSipsin)) {
        context += ` → 현재 ${daeunSipsin} 대운에서 매력과 사교력이 극대화됩니다. 새로운 만남이 사업 기회로 이어질 수 있습니다.`;
      } else if (['편관', '정관'].includes(daeunSipsin)) {
        context += ` → 현재 ${daeunSipsin} 대운에서 이성 관계보다 공적 영역에서의 인정에 에너지를 집중하는 것이 좋습니다.`;
      }
    } else if (s.name === '역마살') {
      if (isHighSeason) {
        context += ` → 이번 달(${currentMonth}월) 운세가 좋으므로, 여행이나 이동 관련 결정을 지금 하면 좋은 결과를 기대할 수 있습니다.`;
      } else {
        context += ` → 이번 달은 무리한 이동보다 내부 정리에 집중하세요. 다음 상승기를 기다리는 것이 현명합니다.`;
      }
    } else if (s.name === '화개살') {
      if (['정인', '편인'].includes(daeunSipsin)) {
        context += ` → 현재 ${daeunSipsin} 대운과 시너지가 강합니다. 학문, 연구, 창작 활동에서 뜻밖의 성과가 나올 수 있습니다.`;
      }
    } else if (s.name === '천을귀인') {
      context += ` → 어려운 상황에서 도움을 줄 사람이 나타날 가능성이 높습니다. 주변 관계를 소중히 하세요.`;
      if (['편재', '정재'].includes(daeunSipsin)) {
        context += ' 특히 사업이나 재물 관련 귀인을 주목하세요.';
      }
    } else if (s.name === '양인살') {
      if (['비견', '겁재'].includes(daeunSipsin)) {
        context += ` → 현재 ${daeunSipsin} 대운에서 공격성이 증폭될 수 있습니다. 충동적 결정을 삼가고, 중요한 일은 하루 뒤에 결정하세요.`;
      } else {
        context += ' → 강한 추진력을 건설적으로 활용하면 큰 성과를 낼 수 있습니다.';
      }
    } else if (s.name === '원진살') {
      context += ` → 가까운 관계일수록 갈등에 주의하세요.`;
      if (isHighSeason) {
        context += ' 이번 달은 운이 좋으니 대화로 풀어갈 수 있는 좋은 시기입니다.';
      }
    }

    return context;
  });
}

// ── ④ 오행 분포 교차: 과다/부족 분석 ────────────────────────────────

function buildElemAnalysis(
  elemCount: Record<ElemKo, number>,
  dayElem: ElemKo,
  yongsin: ElemKo,
  hasHour: boolean,
): { health: string; career: string; wealth: string; relationships: string } {
  const total = hasHour ? 8 : 6;
  const pct = (e: ElemKo) => Math.round((elemCount[e] / total) * 100);

  // 과다/부족 판정
  const excess = ELEM_KO.filter(e => pct(e) >= 40);
  const lacking = ELEM_KO.filter(e => elemCount[e] === 0);
  const weak = ELEM_KO.filter(e => elemCount[e] === 1 && !lacking.includes(e));

  // 건강: 일간 + 과다/부족 교차
  const ORGAN_MAP: Record<ElemKo, string> = {
    '목': '간·담·눈·근육',
    '화': '심장·소장·혈관',
    '토': '위장·비장·피부',
    '금': '폐·대장·호흡기',
    '수': '신장·방광·생식기',
  };

  let health = '';
  if (excess.length > 0) {
    health += `${excess.map(e => `${e}(${pct(e)}%)`).join(', ')}이 과다합니다. `;
    health += `${excess.map(e => ORGAN_MAP[e]).join(', ')} 관련 과부하에 주의하세요. `;
  }
  if (lacking.length > 0) {
    health += `${lacking.map(e => e).join(', ')}행이 전혀 없어 ${lacking.map(e => ORGAN_MAP[e]).join(', ')}이 선천적 약점입니다. `;
    health += `${yongsin}행 활동으로 보강하세요: `;
    const BOGANG: Record<ElemKo, string> = {
      '목': '숲 산책, 스트레칭, 녹색 채소',
      '화': '유산소 운동, 적정 일광 노출',
      '토': '규칙적 식사, 맨발 걷기',
      '금': '호흡 명상, 맑은 공기',
      '수': '수영, 충분한 수분 섭취',
    };
    health += BOGANG[yongsin] + '.';
  }
  if (!health) {
    health = `오행이 비교적 균형 잡혀 있어 큰 건강 문제는 없을 가능성이 높습니다. ${ORGAN_MAP[dayElem]}을 일상적으로 관리하면 좋겠습니다.`;
  }

  // 직업: 일간의 강약 + 용신 방향
  const dayPct = pct(dayElem);
  let career = '';
  if (dayPct >= 40) {
    career = `일간(${dayElem})이 매우 강합니다. 강한 자기 주장이 가능하므로 독립 사업, 프리랜서, 리더 역할에 유리합니다. `;
    career += `다만 타인과의 협업에서는 양보와 경청이 필요합니다. `;
  } else if (dayPct <= 15) {
    career = `일간(${dayElem})이 약한 편입니다. 조직 내에서 실력을 인정받거나, 강한 파트너와 협업하는 것이 더 큰 성과를 냅니다. `;
  } else {
    career = `일간(${dayElem})이 적당한 세기를 가지고 있어, 독립과 협업 모두 적응할 수 있습니다. `;
  }
  if (elemCount['금'] >= 2) career += '분석·체계·기술 분야에서 강점이 보입니다. ';
  if (elemCount['화'] >= 2) career += '표현·마케팅·대인 업무에서 빛납니다. ';
  if (elemCount['수'] >= 2) career += '연구·전략·기획 분야에서 역량을 발휘합니다. ';
  career += `용신(${yongsin})의 방향을 살려 ${yongsin}행 관련 업종이나 활동을 병행하면 시너지가 납니다.`;

  // 재물: 재성(편재/정재) 관련 오행 분석
  const GEN: ElemKo[] = ['목','화','토','금','수'];
  const dayIdx = GEN.indexOf(dayElem);
  const jaeElem = GEN[(dayIdx + 2) % 5]; // 내가 극하는 오행 = 재성
  const jaePct = pct(jaeElem);
  let wealth = '';
  if (jaePct >= 30) {
    wealth = `재성(${jaeElem}행)이 풍부하여 재물 획득 기회가 많습니다. 다만 과도한 재물 추구가 건강이나 인간관계를 해칠 수 있으니 균형을 유지하세요.`;
  } else if (elemCount[jaeElem] === 0) {
    wealth = `재성(${jaeElem}행)이 없어 돈을 움켜쥐기보다 흘려보내는 경향이 있습니다. 자동 저축이나 시스템적 재테크가 효과적입니다.`;
  } else {
    wealth = `재성(${jaeElem}행)이 적당하여 꾸준한 수입이 기대됩니다. 큰 투자보다 본업 역량 강화에 집중하는 것이 장기적으로 유리합니다.`;
  }
  // 대운 보너스
  wealth += ` 용신(${yongsin})의 기운이 강한 시기에 재물 기회가 열리므로, 해당 시기를 주시하세요.`;

  // 대인관계: 비겁(비견/겁재) + 인성(편인/정인) 분석
  const biElem = dayElem; // 비겁 = 같은 오행
  const inElem = GEN[(dayIdx + 4) % 5]; // 나를 생해주는 오행 = 인성
  let relationships = '';
  if (elemCount[biElem] >= 3) {
    relationships = `비겁(${biElem}행)이 강하여 독립심이 강하고 자존심이 높습니다. 경쟁적 관계에서 에너지를 얻지만, 양보를 배우면 관계가 더 깊어집니다. `;
  } else if (elemCount[biElem] <= 1) {
    relationships = `비겁이 약하여 혼자보다 좋은 파트너나 팀과 함께할 때 더 큰 힘을 발휘합니다. `;
  } else {
    relationships = `대인관계에서 균형 잡힌 편입니다. `;
  }
  if (elemCount[inElem] >= 2) {
    relationships += '인성이 강하여 어른이나 멘토로부터 도움을 받기 쉽습니다. 감사의 표현을 아끼지 마세요.';
  } else if (elemCount[inElem] === 0) {
    relationships += '인성이 없어 스스로 배우고 개척해야 합니다. 대신 실전 경험에서 얻는 통찰이 남다릅니다.';
  }

  return { health, career, wealth, relationships };
}

// ── ⑤ 이번 달 딥다이브 (월지 × 용신 × 일간) ────────────────────────

function buildThisMonthDeep(
  month: FortuneMonth,
  dayElem: ElemKo,
  yongsin: ElemKo,
  currentMonth: number,
): string {
  const GEN: ElemKo[] = ['목','화','토','금','수'];
  const dayIdx = GEN.indexOf(dayElem);
  const monthIdx = GEN.indexOf(month.monthElem);
  const diff = (monthIdx - dayIdx + 5) % 5;

  let relation: string;
  if (diff === 0) relation = '비겁(같은 기운)';
  else if (diff === 1) relation = '식상(내가 생하는 관계)';
  else if (diff === 4) relation = '인성(나를 생해주는 관계)';
  else if (diff === 2) relation = '재성(내가 극하는 관계)';
  else relation = '관성(나를 극하는 관계)';

  let deep = `${currentMonth}월의 월지 오행은 ${ELEM_EMOJI[ELEM_KO.indexOf(month.monthElem)]}${month.monthElem}행으로, `;
  deep += `당신의 일간(${dayElem})과는 "${relation}" 관계입니다.\n\n`;

  if (month.score >= 75) {
    deep += `점수 ${month.score}점으로 매우 좋은 달입니다. `;
    if (month.monthElem === yongsin) {
      deep += `특히 이달의 기운이 용신(${yongsin})과 일치하여 평소보다 운이 강하게 작용합니다. 중요한 결정이나 새로운 시작을 이 달에 하세요.`;
    } else {
      deep += '에너지가 높으니 미뤄둔 일을 추진하기 좋습니다.';
    }
  } else if (month.score >= 50) {
    deep += `점수 ${month.score}점으로 무난한 달입니다. `;
    deep += `${yongsin}행 활동을 의식적으로 하면 운세를 더 끌어올릴 수 있습니다.`;
  } else {
    deep += `점수 ${month.score}점으로 주의가 필요한 달입니다. `;
    deep += `큰 결정은 미루고, ${yongsin}행의 기운으로 에너지를 보충하세요. `;
    if (diff === 3) {
      deep += '외부 압력이 느껴질 수 있으니 무리하지 말고 내면의 힘을 기르세요.';
    }
  }

  return deep;
}

// ── ⑥ 행동 지침 (교차 기반) ─────────────────────────────────────────

function buildAdvice(
  saju: SajuResult,
  sinsal: Sinsal[],
  daeunSipsin: SipsinName | null,
  currentMonthData: FortuneMonth | null,
): string {
  const { dayElem, yongsin, elemCount } = saju;
  const lines: string[] = [];

  // 용신 × 이번 달 교차 행동
  if (currentMonthData) {
    const monthIsYongsin = currentMonthData.monthElem === yongsin;
    if (monthIsYongsin) {
      lines.push(`✦ 이번 달은 용신(${yongsin})의 달입니다. 평소보다 적극적으로 행동하세요 — 결과가 좋을 확률이 높습니다.`);
    } else {
      const YONG_ACTION: Record<ElemKo, string> = {
        '목': '자연 속 산책, 새벽 기상, 계획 수립, 독서',
        '화': '사람 만나기, 운동, 밝은 환경, 자기표현',
        '토': '정리정돈, 규칙적 생활, 명상, 가족과의 시간',
        '금': '불필요한 것 정리, 집중 작업, 전문성 학습',
        '수': '휴식, 수면 관리, 물가 산책, 깊은 사고',
      };
      lines.push(`✦ 이번 달 용신 보강 행동: ${YONG_ACTION[yongsin]}`);
    }
  }

  // 대운 × 행동
  if (daeunSipsin) {
    const DAEUN_ACTION: Record<string, string> = {
      '비견': '✦ 대운 행동: 독립적 프로젝트에 도전하되, 파트너십을 무시하지 마세요.',
      '겁재': '✦ 대운 행동: 충동적 투자·지출을 자제하고, 실력 쌓기에 집중하세요.',
      '식신': '✦ 대운 행동: 창작·표현 활동을 늘리세요. 블로그, 유튜브, 취미 활동이 좋습니다.',
      '상관': '✦ 대운 행동: 기존 틀을 깨는 시도가 좋지만, 인간관계에서의 독설은 삼가세요.',
      '편재': '✦ 대운 행동: 부업이나 투자를 시도하기 좋은 시기입니다. 다만 리스크 관리를 철저히.',
      '정재': '✦ 대운 행동: 본업에 충실하고 꾸준히 저축하세요. 안정적 수입 구조를 만드세요.',
      '편관': '✦ 대운 행동: 외부 압력을 성장의 기회로 삼으세요. 자격증이나 시험이 좋은 결과를 냅니다.',
      '정관': '✦ 대운 행동: 조직 내 역할을 충실히 수행하세요. 승진이나 인정의 기회가 옵니다.',
      '편인': '✦ 대운 행동: 비주류 분야나 독특한 학문에서 기회를 찾으세요. 직관을 신뢰하세요.',
      '정인': '✦ 대운 행동: 공부, 자격, 멘토 찾기에 투자하세요. 배움이 곧 무기가 됩니다.',
    };
    lines.push(DAEUN_ACTION[daeunSipsin] ?? '');
  }

  // 오행 균형 행동
  const lacking = ELEM_KO.filter(e => elemCount[e] === 0);
  const excess = ELEM_KO.filter(e => {
    const total = saju.hasHour ? 8 : 6;
    return (elemCount[e] / total) >= 0.4;
  });
  if (lacking.length > 0) {
    lines.push(`✦ 부족 오행 보강: ${lacking.join(', ')}행이 없습니다 → ${lacking.map(e => {
      const FIX: Record<ElemKo, string> = {
        '목': '녹색 공간, 식물, 봄 여행',
        '화': '밝은 조명, 운동, 열정적 취미',
        '토': '흙과 접촉, 도자기, 요리',
        '금': '악기 연주, 명상, 금속 소재 악세사리',
        '수': '수영, 온천, 흑색 의류',
      };
      return FIX[e];
    }).join(' / ')}`);
  }
  if (excess.length > 0) {
    lines.push(`✦ 과다 오행 조절: ${excess.join(', ')}행이 과합니다 → 해당 기운을 소모하는 활동(${excess.map(e => {
      const CTRL_MAP: Record<ElemKo, string> = {
        '목': '금행 활동(정리, 결단)', '화': '수행 활동(명상, 휴식)',
        '토': '목행 활동(운동, 야외)', '금': '화행 활동(표현, 사교)',
        '수': '토행 활동(루틴, 안정)',
      };
      return CTRL_MAP[e];
    }).join(', ')})을 병행하세요.`);
  }

  return lines.filter(Boolean).join('\n');
}

// ── ⑦ 행운 정보 (교차 기반) ─────────────────────────────────────────

const ELEM_LUCKY_COLORS: Record<ElemKo, string[]> = {
  '목': ['초록', '연두', '청록'],
  '화': ['빨강', '보라', '주황'],
  '토': ['노랑', '베이지', '갈색'],
  '금': ['흰색', '금색', '은색'],
  '수': ['검정', '파랑', '남색'],
};

const ELEM_LUCKY_DIRECTIONS: Record<ElemKo, string[]> = {
  '목': ['동쪽', '동남쪽'],
  '화': ['남쪽', '남동쪽'],
  '토': ['중앙', '남서쪽'],
  '금': ['서쪽', '북서쪽'],
  '수': ['북쪽', '북동쪽'],
};

function calcLuckyNumbers(saju: SajuResult): number[] {
  // 일간 + 용신 + 일지 + 월지 교차로 고유 숫자 생성
  const a = saju.day.stemIdx + 1;
  const b = ELEM_KO.indexOf(saju.yongsin) + 1;
  const c = saju.day.branchIdx + 1;
  const d = saju.month.branchIdx + 1;
  const numbers = new Set<number>();
  numbers.add(a);
  numbers.add(b);
  numbers.add((a + c) % 9 + 1);
  numbers.add((b + d) % 9 + 1);
  numbers.add((a * b) % 9 + 1);
  return Array.from(numbers).slice(0, 4).sort((a, b) => a - b);
}

// ── 현재 나이 대운 찾기 ──────────────────────────────────────────────

function findCurrentDaeun(daeunList: DaeunPeriod[], birthYear: number, targetYear: number): DaeunPeriod | null {
  const age = targetYear - birthYear;
  for (const period of daeunList) {
    if (age >= period.startAge && age <= period.endAge) return period;
  }
  if (daeunList.length > 0) {
    return age < daeunList[0].startAge ? daeunList[0] : daeunList[daeunList.length - 1];
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 메인: 교차 분석 개인화 운세 생성
// ═══════════════════════════════════════════════════════════════════════

export function generatePersonalizedFortune(
  saju: SajuResult,
  gender: string,
  birthYear: number,
  targetYear: number = new Date().getFullYear(),
): GeneratedFortuneResult {
  const sinsal = detectSinsal(saju);
  const daeun = calcDaeun(saju, gender);
  const monthlyRaw = getMonthlyFortune(saju, targetYear);
  const currentDaeun = findCurrentDaeun(daeun, birthYear, targetYear);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentMonthData = monthlyRaw[currentMonth - 1] ?? null;
  const daeunSipsin = currentDaeun?.sipsin ?? null;

  // ── 교차 분석 ──

  // ① 일간 × 용신 성격
  const crossKey: CrossKey = `${saju.dayElem}_${saju.yongsin}`;
  const crossPersonality = CROSS_PERSONALITY[crossKey]
    ?? `${saju.dayElem}행 일간에 ${saju.yongsin}행 용신의 조합입니다.`;

  // ② 대운 진단
  const daeunDiagnosis = currentDaeun
    ? buildDaeunDiagnosis(currentDaeun.sipsin, saju.dayElem, saju.yongsin, currentDaeun.startAge, currentDaeun.endAge)
    : '';

  // ③ 신살 × 대운 교차
  const sinsalInContext = buildSinsalInContext(sinsal, daeunSipsin ?? '비견', currentMonth, monthlyRaw);

  // ④ 오행 분포 교차 분석
  const elemAnalysis = buildElemAnalysis(saju.elemCount, saju.dayElem, saju.yongsin, saju.hasHour);

  // ⑤ 이번 달 딥다이브
  const thisMonthDeep = currentMonthData
    ? buildThisMonthDeep(currentMonthData, saju.dayElem, saju.yongsin, currentMonth)
    : '';

  // ⑥ 행동 지침
  const advice = buildAdvice(saju, sinsal, daeunSipsin, currentMonthData);

  // ⑦ 오늘의 운세
  const todayFortune = getTodayFortune(saju);

  // ⑧ Fortune Score (바이오리듬)
  const birthDate = new Date(birthYear, 0, 1); // 근사값 (실제 생일 필요)
  const bio = calcBiorhythm(birthDate, now);

  // ── 종합 요약 조립 ──
  const dayElemName = `${saju.day.stemKo}(${saju.day.stemHj})`;
  const yongElemName = `${saju.yongsin}(${ELEM_HJ[ELEM_KO.indexOf(saju.yongsin)]})`;

  let summary = `당신의 일간은 ${ELEM_EMOJI[ELEM_KO.indexOf(saju.dayElem)]} ${dayElemName} — ${saju.dayElem}행입니다.\n\n`;
  summary += crossPersonality + '\n\n';
  summary += `용신은 ${ELEM_EMOJI[ELEM_KO.indexOf(saju.yongsin)]} ${yongElemName}행입니다. `;
  summary += `부족한 기운을 채워주는 방향이므로, ${saju.yongsin}행의 환경·활동·색상이 당신에게 도움이 됩니다.\n\n`;
  if (daeunDiagnosis) {
    summary += daeunDiagnosis;
  }

  // ── 연간 총평 ──
  const avgScore = Math.round(monthlyRaw.reduce((s, m) => s + m.score, 0) / 12);
  const bestMonth = monthlyRaw.reduce((a, b) => (a.score >= b.score ? a : b));
  const worstMonth = monthlyRaw.reduce((a, b) => (a.score <= b.score ? a : b));
  const goodMonths = monthlyRaw.filter(m => m.score >= 65);
  const cautionMonthsList = monthlyRaw.filter(m => m.score < 40);

  let yearlyFortune = `${targetYear}년 평균 ${avgScore}점 — `;
  yearlyFortune += `최고 ${bestMonth.month}월(${bestMonth.score}점), 최저 ${worstMonth.month}월(${worstMonth.score}점).\n\n`;

  if (goodMonths.length >= 6) {
    yearlyFortune += '상반기와 하반기 모두 기회가 많은 해입니다. 적극적으로 움직이세요.\n';
  } else if (goodMonths.length >= 3) {
    const goodMs = goodMonths.map(m => `${m.month}월`).join(', ');
    yearlyFortune += `${goodMs}에 집중적으로 에너지를 투입하면 효율이 높습니다.\n`;
  } else {
    yearlyFortune += '전반적으로 내실을 다지는 해입니다. 기반을 쌓는 데 집중하세요.\n';
  }

  if (thisMonthDeep) {
    yearlyFortune += '\n' + thisMonthDeep;
  }

  // ── 주의 월 ──
  const cautionMonths = monthlyRaw.filter(m => m.score < 40).map(m => m.month);

  // ── 월별 운세 ──
  const monthlyFortunes = monthlyRaw.map(m => ({
    month: m.month,
    fortune: m.description,
    score: m.score,
    keywords: m.keywords,
  }));

  // ── 오행 분포 ──
  const total = saju.hasHour ? 8 : 6;
  const ohhaengBalance: Record<string, number> = {};
  for (const elem of ELEM_KO) {
    ohhaengBalance[elem] = Math.round((saju.elemCount[elem] / total) * 100);
  }

  const dayElemLabel = `${saju.day.stemKo}(${saju.day.stemHj}) ${saju.dayElem}(${ELEM_HJ[ELEM_KO.indexOf(saju.dayElem)]})`;

  return {
    summary,
    yearly_fortune: yearlyFortune,
    relationships: elemAnalysis.relationships,
    career: elemAnalysis.career,
    wealth: elemAnalysis.wealth,
    health: elemAnalysis.health,
    lucky_colors: ELEM_LUCKY_COLORS[saju.yongsin],
    lucky_numbers: calcLuckyNumbers(saju),
    lucky_directions: ELEM_LUCKY_DIRECTIONS[saju.yongsin],
    ohhaeng_balance: ohhaengBalance,
    shinsal: sinsalInContext,
    caution_months: cautionMonths,
    saju_advice: advice,
    day_master: dayElemLabel,
    monthly_fortunes: monthlyFortunes,
    today_fortune: {
      score: todayFortune.score,
      grade: todayFortune.grade,
      message: todayFortune.message,
    },
    this_month: currentMonthData ? {
      score: currentMonthData.score,
      keywords: currentMonthData.keywords,
      deepDive: thisMonthDeep,
    } : undefined,
    fortune_score: {
      percent: bio.bioPercent,
      biorhythm: Math.round(bio.bioScore * 100),
      phase: currentDaeun ? currentDaeun.sipsin : '안정기',
    },
  };
}
