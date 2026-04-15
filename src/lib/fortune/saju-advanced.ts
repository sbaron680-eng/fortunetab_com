/**
 * Fortune Engine v2 — 사주 파생 분석
 *
 * 십신(十神), 신살(神殺), 대운(大運) 계산
 * saju-core.ts의 SajuResult를 입력으로 받아 고급 분석 수행
 */

import type {
  SajuResult, Pillar, SipsinName, SipsinInfo,
  SinsalType, SinsalInfo, DaeunPeriod, DaunPhase, ElemKo,
} from './types';
import {
  STEMS_KO, STEMS_HJ, STEMS_ELEM, STEMS_YIN,
  BRANCHES_KO, BRANCHES_ELEM,
  SIPSIN_NAMES, BRANCH_MAIN_STEM,
  DOHWA_MAP, YEOKMA_MAP, HWAGAE_MAP, GUIIN_MAP, YANGIN_MAP, WONJIN_PAIRS,
  SIPSIN_TO_DAUN_PHASE,
  daysToNextJeolgi, daysSincePrevJeolgi,
  JIJANGAN_TABLE,
  SAMHAP_TABLE, BANGHAP_TABLE, YUKHAP_TABLE,
  CHUNG_PAIRS, HYUNG_TABLE, PA_PAIRS, HAE_PAIRS,
  CHEONGAN_HAP_TABLE, calcGongmang,
} from './constants';
import { makePillar, calcAge } from './saju-core';

// ═══════════════════════════════════════════════════════════════════════
// 십신 (Ten Gods)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 일간 기준 대상 천간의 십신 판단
 * 오행 관계(0~4) × 음양(편/정) = 10종
 */
export function getSipsin(dayStemIdx: number, targetStemIdx: number): SipsinName {
  const dayElemIdx = Math.floor(dayStemIdx / 2);
  const targetElemIdx = Math.floor(targetStemIdx / 2);
  const elemDiff = (targetElemIdx - dayElemIdx + 5) % 5;
  const sameYinYang = (dayStemIdx % 2) === (targetStemIdx % 2);
  const baseIdx = elemDiff * 2;
  return SIPSIN_NAMES[baseIdx + (sameYinYang ? 0 : 1)];
}

/**
 * 사주 전체의 십신 배치도
 * 일간 자체는 제외하고 나머지 7자리(시주 없으면 5자리)의 십신 반환
 */
export function buildSipsinMap(saju: SajuResult): SipsinInfo[] {
  const d = saju.day.stemIdx;
  const results: SipsinInfo[] = [];

  const addStem = (p: Pillar, pos: string) => {
    results.push({
      name: getSipsin(d, p.stemIdx),
      element: p.stemElem,
      position: pos,
    });
  };

  const addBranch = (p: Pillar, pos: string) => {
    const jijangan = JIJANGAN_TABLE[p.branchIdx];
    // 정기(본기)를 대표 십신으로 기록
    results.push({
      name: getSipsin(d, jijangan.jeonggi),
      element: STEMS_ELEM[jijangan.jeonggi] as ElemKo,
      position: pos,
    });
    // 중기·여기도 보조 십신으로 기록 (지장간 완전 분석)
    if (jijangan.junggi !== null) {
      results.push({
        name: getSipsin(d, jijangan.junggi),
        element: STEMS_ELEM[jijangan.junggi] as ElemKo,
        position: `${pos}(중기)`,
      });
    }
    if (jijangan.yeogi !== null) {
      results.push({
        name: getSipsin(d, jijangan.yeogi),
        element: STEMS_ELEM[jijangan.yeogi] as ElemKo,
        position: `${pos}(여기)`,
      });
    }
  };

  // 연주
  addStem(saju.year, '연간');
  addBranch(saju.year, '연지');
  // 월주
  addStem(saju.month, '월간');
  addBranch(saju.month, '월지');
  // 일지 (일간은 자기 자신이므로 지지만)
  addBranch(saju.day, '일지');
  // 시주
  if (saju.hour) {
    addStem(saju.hour, '시간');
    addBranch(saju.hour, '시지');
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// 신살 (Spiritual Markers)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 주요 신살 6종 탐지
 */
export function detectSinsal(saju: SajuResult): SinsalInfo[] {
  const results: SinsalInfo[] = [];
  const allBranches = [saju.year.branchIdx, saju.month.branchIdx, saju.day.branchIdx];
  if (saju.hour) allBranches.push(saju.hour.branchIdx);

  const dayBranch = saju.day.branchIdx;
  const dayStemIdx = saju.day.stemIdx;
  const othersExcludeDay = allBranches.filter((_, i) => i !== 2);

  // 도화살 (桃花殺)
  const dohwaTarget = DOHWA_MAP[dayBranch];
  if (dohwaTarget !== undefined && othersExcludeDay.includes(dohwaTarget)) {
    results.push({
      type: '도화살',
      nature: 'neutral',
      description: '매력과 인기가 있으나 이성 문제에 주의',
      descriptionEn: 'Charisma and popularity, but caution in romantic matters',
    });
  }

  // 역마살 (驛馬殺)
  const yeokmaTarget = YEOKMA_MAP[dayBranch];
  if (yeokmaTarget !== undefined && othersExcludeDay.includes(yeokmaTarget)) {
    results.push({
      type: '역마살',
      nature: 'neutral',
      description: '이동·변화가 많고 활동적인 삶, 해외 인연',
      descriptionEn: 'Active life with many changes and travel, international connections',
    });
  }

  // 화개살 (華蓋殺)
  const hwagaeTarget = HWAGAE_MAP[dayBranch];
  if (hwagaeTarget !== undefined && othersExcludeDay.includes(hwagaeTarget)) {
    results.push({
      type: '화개살',
      nature: 'neutral',
      description: '예술적 재능, 종교·학문 인연, 고독한 면',
      descriptionEn: 'Artistic talent, spiritual/academic connections, solitary nature',
    });
  }

  // 천을귀인 (天乙貴人)
  const guiinTargets = GUIIN_MAP[dayStemIdx] ?? [];
  if (allBranches.some(b => guiinTargets.includes(b))) {
    results.push({
      type: '천을귀인',
      nature: 'good',
      description: '어려울 때 귀인의 도움을 받는 길한 신살',
      descriptionEn: 'Receives help from benefactors during difficult times',
    });
  }

  // 양인살 (羊刃殺)
  const yangInTarget = YANGIN_MAP[dayStemIdx];
  if (yangInTarget !== undefined && othersExcludeDay.includes(yangInTarget)) {
    results.push({
      type: '양인살',
      nature: 'bad',
      description: '강한 추진력과 결단력, 과격해질 수 있으니 주의',
      descriptionEn: 'Strong drive and decisiveness, but watch for aggression',
    });
  }

  // 원진살 (怨嗔殺)
  for (const [a, b] of WONJIN_PAIRS) {
    if (
      (dayBranch === a && allBranches.includes(b)) ||
      (dayBranch === b && allBranches.includes(a))
    ) {
      results.push({
        type: '원진살',
        nature: 'bad',
        description: '가까운 사이에서 미움이 생기기 쉬움, 인간관계 주의',
        descriptionEn: 'Potential resentment in close relationships, handle with care',
      });
      break;
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// 대운 (Major Fortune Periods)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 대운 시작 나이 계산
 *
 * 순행: 출생일 → 다음 절기까지 일수 / 3 (반올림)
 * 역행: 출생일 → 이전 절기까지 일수 / 3 (반올림)
 * 최솟값 1, 최댓값 10
 */
export function calcDaeunStartAge(
  year: number, month: number, day: number, forward: boolean,
): number {
  const days = forward
    ? daysToNextJeolgi(year, month, day)
    : daysSincePrevJeolgi(year, month, day);
  return Math.max(1, Math.min(10, Math.round(days / 3)));
}

/**
 * 대운 8기 계산
 * 월주 기준 순행/역행, 10년 단위
 * 시작 나이는 절기까지 일수로 동적 계산
 *
 * @param saju 사주 결과
 * @param gender 'male' | 'female'
 * @param birthYear 출생 연도 (대운 시작 나이 계산용)
 * @param birthMonth 출생 월
 * @param birthDay 출생 일
 */
export function calcDaeun(
  saju: SajuResult,
  gender: string,
  birthYear?: number,
  birthMonth?: number,
  birthDay?: number,
): DaeunPeriod[] {
  const yearStemYang = !STEMS_YIN[saju.year.stemIdx];
  const isMale = gender === 'male';
  const forward = (isMale && yearStemYang) || (!isMale && !yearStemYang);

  const startAge = (birthYear !== undefined && birthMonth !== undefined && birthDay !== undefined)
    ? calcDaeunStartAge(birthYear, birthMonth, birthDay, forward)
    : 3;

  const result: DaeunPeriod[] = [];
  let stemIdx = saju.month.stemIdx;
  let branchIdx = saju.month.branchIdx;

  for (let i = 0; i < 8; i++) {
    if (forward) {
      stemIdx = (stemIdx + 1) % 10;
      branchIdx = (branchIdx + 1) % 12;
    } else {
      stemIdx = (stemIdx - 1 + 10) % 10;
      branchIdx = (branchIdx - 1 + 12) % 12;
    }

    const age = startAge + i * 10;
    result.push({
      index: i,
      startAge: age,
      endAge: age + 9,
      stemIdx,
      branchIdx,
      stemKo: STEMS_KO[stemIdx],
      branchKo: BRANCHES_KO[branchIdx],
      stemElem: STEMS_ELEM[stemIdx] as ElemKo,
      branchElem: BRANCHES_ELEM[branchIdx] as ElemKo,
      sipsin: getSipsin(saju.day.stemIdx, stemIdx),
    });
  }

  return result;
}

/**
 * 현재 나이에 해당하는 대운 기간 찾기
 */
export function findCurrentDaeun(daeunList: DaeunPeriod[], age: number): DaeunPeriod {
  for (const period of daeunList) {
    if (age >= period.startAge && age <= period.endAge) {
      return period;
    }
  }
  if (age < daeunList[0].startAge) return daeunList[0];
  return daeunList[daeunList.length - 1];
}

/**
 * 대운 기간의 십신 → 대운 단계(Phase) 변환
 */
export function getDaunPhase(sipsin: SipsinName): DaunPhase {
  return (SIPSIN_TO_DAUN_PHASE[sipsin] ?? '안정기') as DaunPhase;
}

// ═══════════════════════════════════════════════════════════════════════
// 합충형파해(合沖刑破害) — 지지 관계 분석
// ═══════════════════════════════════════════════════════════════════════

import type {
  BranchRelationResult, StemHapResult, TonggeunResult, GongmangResult,
} from './types';

function pairExists(pairs: readonly (readonly [number, number])[], a: number, b: number): boolean {
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

export function analyzeBranchRelations(saju: SajuResult): BranchRelationResult[] {
  const results: BranchRelationResult[] = [];
  const branches = [saju.year.branchIdx, saju.month.branchIdx, saju.day.branchIdx];
  if (saju.hour) branches.push(saju.hour.branchIdx);

  const branchSet = new Set(branches);

  // 삼합 검사
  for (const group of SAMHAP_TABLE) {
    const match = group.branches.filter(b => branchSet.has(b));
    if (match.length >= 2) {
      results.push({
        type: '삼합',
        branches: match,
        description: match.length === 3
          ? `${group.name} 성립 — ${group.elem} 기운 극대화`
          : `${group.name} 반합 — ${group.elem} 기운 강화`,
        descriptionEn: match.length === 3
          ? `${group.name} complete — ${group.elem} energy maximized`
          : `${group.name} partial — ${group.elem} energy strengthened`,
        nature: 'good',
        elem: group.elem,
      });
    }
  }

  // 방합 검사
  for (const group of BANGHAP_TABLE) {
    const match = group.branches.filter(b => branchSet.has(b));
    if (match.length === 3) {
      results.push({
        type: '방합',
        branches: match,
        description: `${group.name} — 계절 오행 극강`,
        descriptionEn: `${group.name} — seasonal element at full power`,
        nature: 'good',
        elem: group.elem,
      });
    }
  }

  // 육합 검사
  for (const { pair, elem } of YUKHAP_TABLE) {
    if (branchSet.has(pair[0]) && branchSet.has(pair[1])) {
      const nameKo = `${BRANCHES_KO[pair[0]]}${BRANCHES_KO[pair[1]]}합${elem === '토' ? '토' : elem}`;
      results.push({
        type: '육합',
        branches: [...pair],
        description: `${nameKo} — 조화와 융합의 기운`,
        descriptionEn: `Six harmony (${elem}) — harmonizing energy`,
        nature: 'good',
        elem,
      });
    }
  }

  // 충 검사
  for (const [a, b] of CHUNG_PAIRS) {
    if (branchSet.has(a) && branchSet.has(b)) {
      results.push({
        type: '충',
        branches: [a, b],
        description: `${BRANCHES_KO[a]}${BRANCHES_KO[b]}충 — 충돌과 변화, 갈등 주의`,
        descriptionEn: `${BRANCHES_KO[a]}${BRANCHES_KO[b]} clash — conflict and change`,
        nature: 'bad',
      });
    }
  }

  // 형 검사
  for (const group of HYUNG_TABLE) {
    const match = group.branches.filter(b => branchSet.has(b));
    const isSelfPunish = group.branches.length === 2 && group.branches[0] === group.branches[1];
    if (isSelfPunish) {
      const count = branches.filter(b => b === group.branches[0]).length;
      if (count >= 2) {
        results.push({
          type: '형',
          branches: [group.branches[0]],
          description: `${group.name} — 자기 파괴적 경향 주의`,
          descriptionEn: `${group.nameEn} — watch for self-destructive tendencies`,
          nature: 'bad',
        });
      }
    } else if (match.length >= 2) {
      results.push({
        type: '형',
        branches: match,
        description: `${group.name} — 법적 문제나 건강 주의`,
        descriptionEn: `${group.nameEn} — caution with legal or health matters`,
        nature: 'bad',
      });
    }
  }

  // 파 검사
  for (const [a, b] of PA_PAIRS) {
    if (branchSet.has(a) && branchSet.has(b)) {
      results.push({
        type: '파',
        branches: [a, b],
        description: `${BRANCHES_KO[a]}${BRANCHES_KO[b]}파 — 기존 질서의 파괴와 재편`,
        descriptionEn: `${BRANCHES_KO[a]}${BRANCHES_KO[b]} break — disruption and restructuring`,
        nature: 'neutral',
      });
    }
  }

  // 해 검사
  for (const [a, b] of HAE_PAIRS) {
    if (branchSet.has(a) && branchSet.has(b)) {
      results.push({
        type: '해',
        branches: [a, b],
        description: `${BRANCHES_KO[a]}${BRANCHES_KO[b]}해 — 은밀한 방해와 손실`,
        descriptionEn: `${BRANCHES_KO[a]}${BRANCHES_KO[b]} harm — hidden obstruction and loss`,
        nature: 'bad',
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// 천간합(天干合)
// ═══════════════════════════════════════════════════════════════════════

export function analyzeStemHap(saju: SajuResult): StemHapResult[] {
  const results: StemHapResult[] = [];
  const stems = [saju.year.stemIdx, saju.month.stemIdx, saju.day.stemIdx];
  if (saju.hour) stems.push(saju.hour.stemIdx);

  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      for (const hap of CHEONGAN_HAP_TABLE) {
        if ((stems[i] === hap.pair[0] && stems[j] === hap.pair[1]) ||
            (stems[i] === hap.pair[1] && stems[j] === hap.pair[0])) {
          results.push({
            stemA: stems[i],
            stemB: stems[j],
            resultElem: hap.resultElem,
            name: hap.name,
          });
        }
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// 통근(通根) — 천간이 지장간에 뿌리가 있는지
// ═══════════════════════════════════════════════════════════════════════

export function analyzeTonggeun(saju: SajuResult): TonggeunResult[] {
  const results: TonggeunResult[] = [];
  const allBranches = [
    { idx: saju.year.branchIdx, pos: '연지' },
    { idx: saju.month.branchIdx, pos: '월지' },
    { idx: saju.day.branchIdx, pos: '일지' },
  ];
  if (saju.hour) allBranches.push({ idx: saju.hour.branchIdx, pos: '시지' });

  const stemPositions = [
    { idx: saju.year.stemIdx, pos: '연간' },
    { idx: saju.month.stemIdx, pos: '월간' },
    { idx: saju.day.stemIdx, pos: '일간' },
  ];
  if (saju.hour) stemPositions.push({ idx: saju.hour.stemIdx, pos: '시간' });

  const stemElemIdx = (stemIdx: number) => Math.floor(stemIdx / 2);

  for (const stem of stemPositions) {
    const myElemIdx = stemElemIdx(stem.idx);
    const roots: TonggeunResult['rootBranches'] = [];

    for (const branch of allBranches) {
      const jj = JIJANGAN_TABLE[branch.idx];
      if (stemElemIdx(jj.jeonggi) === myElemIdx) {
        roots.push({ branchIdx: branch.idx, jijanganType: '정기' });
      } else if (jj.junggi !== null && stemElemIdx(jj.junggi) === myElemIdx) {
        roots.push({ branchIdx: branch.idx, jijanganType: '중기' });
      } else if (jj.yeogi !== null && stemElemIdx(jj.yeogi) === myElemIdx) {
        roots.push({ branchIdx: branch.idx, jijanganType: '여기' });
      }
    }

    results.push({ stemIdx: stem.idx, position: stem.pos, rootBranches: roots });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// 세운(歲運) — 당년 천간지지와 사주의 관계 분석
// ═══════════════════════════════════════════════════════════════════════

export interface SeunAnalysis {
  yearStemIdx: number;
  yearBranchIdx: number;
  stemSipsin: SipsinName;
  branchRelations: BranchRelationResult[];
  stemHap: StemHapResult | null;
  chung: boolean;
}

export function analyzeSeun(saju: SajuResult, targetYear: number): SeunAnalysis {
  const stemIdx = ((targetYear - 1924) % 10 + 10) % 10;
  const branchIdx = ((targetYear - 1924) % 12 + 12) % 12;

  // 세운 천간의 십신
  const stemSipsin = getSipsin(saju.day.stemIdx, stemIdx);

  // 세운 지지와 사주 지지의 관계
  const allBranches = [saju.year.branchIdx, saju.month.branchIdx, saju.day.branchIdx];
  if (saju.hour) allBranches.push(saju.hour.branchIdx);

  const branchRelations: BranchRelationResult[] = [];

  // 충 검사
  let chung = false;
  for (const b of allBranches) {
    if (pairExists(CHUNG_PAIRS, branchIdx, b)) {
      chung = true;
      branchRelations.push({
        type: '충',
        branches: [branchIdx, b],
        description: `세운 ${BRANCHES_KO[branchIdx]}와 ${BRANCHES_KO[b]} 충`,
        descriptionEn: `Annual ${BRANCHES_KO[branchIdx]} clashes with ${BRANCHES_KO[b]}`,
        nature: 'bad',
      });
    }
  }

  // 육합 검사
  for (const { pair, elem } of YUKHAP_TABLE) {
    for (const b of allBranches) {
      if ((branchIdx === pair[0] && b === pair[1]) || (branchIdx === pair[1] && b === pair[0])) {
        branchRelations.push({
          type: '육합',
          branches: [branchIdx, b],
          description: `세운 ${BRANCHES_KO[branchIdx]}와 ${BRANCHES_KO[b]} 합`,
          descriptionEn: `Annual ${BRANCHES_KO[branchIdx]} harmonizes with ${BRANCHES_KO[b]}`,
          nature: 'good',
          elem,
        });
      }
    }
  }

  // 천간합 검사
  let stemHap: StemHapResult | null = null;
  const sajuStems = [saju.year.stemIdx, saju.month.stemIdx, saju.day.stemIdx];
  if (saju.hour) sajuStems.push(saju.hour.stemIdx);

  for (const s of sajuStems) {
    for (const hap of CHEONGAN_HAP_TABLE) {
      if ((stemIdx === hap.pair[0] && s === hap.pair[1]) ||
          (stemIdx === hap.pair[1] && s === hap.pair[0])) {
        stemHap = { stemA: stemIdx, stemB: s, resultElem: hap.resultElem, name: hap.name };
        break;
      }
    }
    if (stemHap) break;
  }

  return { yearStemIdx: stemIdx, yearBranchIdx: branchIdx, stemSipsin, branchRelations, stemHap, chung };
}

// ═══════════════════════════════════════════════════════════════════════
// 공망(空亡)
// ═══════════════════════════════════════════════════════════════════════

export function analyzeGongmang(saju: SajuResult): GongmangResult {
  const [gm1, gm2] = calcGongmang(saju.day.stemIdx, saju.day.branchIdx);
  const affected: string[] = [];

  if (saju.year.branchIdx === gm1 || saju.year.branchIdx === gm2) affected.push('연지');
  if (saju.month.branchIdx === gm1 || saju.month.branchIdx === gm2) affected.push('월지');
  if (saju.hour && (saju.hour.branchIdx === gm1 || saju.hour.branchIdx === gm2)) affected.push('시지');

  return { gongmangBranches: [gm1, gm2], affectedPillars: affected };
}
