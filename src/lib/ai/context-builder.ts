/**
 * Fortune → Claude 컨텍스트 변환
 *
 * CompositeFortuneProfile을 XML 태그 기반 컨텍스트 블록으로 변환하여
 * 시스템 프롬프트에 주입합니다.
 */

import type { CompositeFortuneProfile } from '@/lib/fortune/types';
import {
  STEMS_KO, STEMS_HJ, BRANCHES_KO, BRANCHES_HJ,
  STEMS_ELEM, BRANCHES_ELEM,
  ZODIAC_KO,
} from '@/lib/fortune/constants';

// ─── 헬퍼 ────────────────────────────────────────────────────────────

function pillarStr(p: { stemIdx: number; branchIdx: number } | null): string {
  if (!p) return '(unknown)';
  return `${STEMS_KO[p.stemIdx]}${BRANCHES_KO[p.branchIdx]}(${STEMS_HJ[p.stemIdx]}${BRANCHES_HJ[p.branchIdx]}) [${STEMS_ELEM[p.stemIdx]}/${BRANCHES_ELEM[p.branchIdx]}]`;
}

// ─── Eastern Analysis ────────────────────────────────────────────────

function buildEasternBlock(profile: CompositeFortuneProfile): string {
  const { saju, sipsinMap, sinsal, daeun, currentDaeun, daunPhase } = profile.eastern;

  const pillars = [
    `Year:  ${pillarStr(saju.year)}`,
    `Month: ${pillarStr(saju.month)}`,
    `Day:   ${pillarStr(saju.day)}`,
    `Hour:  ${pillarStr(saju.hour)}`,
  ].join('\n');

  const elemStr = Object.entries(saju.elemCount)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const sipsinStr = sipsinMap
    .map(s => `${s.position}: ${s.name}(${s.element})`)
    .join(', ');

  const sinsalStr = sinsal.length > 0
    ? sinsal.map(s => `${s.type}: ${s.descriptionEn}`).join('\n')
    : 'None detected';

  const daeunStr = `${currentDaeun.stemKo}${currentDaeun.branchKo} (ages ${currentDaeun.startAge}-${currentDaeun.endAge}), phase: ${daunPhase}`;

  return `<eastern_analysis>
Four Pillars (사주팔자):
${pillars}

Day Master: ${saju.dayElem} (일간 오행)
Yongsin (용신): ${saju.yongsin}
Element distribution: ${elemStr}

Ten Gods (십신): ${sipsinStr}

Spiritual Markers (신살):
${sinsalStr}

Current Daeun (대운): ${daeunStr}

All Daeun periods:
${daeun.map(d => `  ${d.index + 1}. ages ${d.startAge}-${d.endAge}: ${d.stemKo}${d.branchKo}(${d.sipsin})`).join('\n')}
</eastern_analysis>`;
}

// ─── Western Analysis ────────────────────────────────────────────────

function buildWesternBlock(profile: CompositeFortuneProfile): string {
  const { sunSign, moonSign, risingSign } = profile.western;

  const sunKo = ZODIAC_KO[sunSign.sign] || sunSign.sign;
  const moonKo = ZODIAC_KO[moonSign.sign] || moonSign.sign;

  let risingStr = 'Unknown (birth time/location not provided)';
  if (risingSign) {
    const risingKo = ZODIAC_KO[risingSign.sign] || risingSign.sign;
    risingStr = `${risingSign.sign} ${risingSign.symbol} (${risingKo}) — ${risingSign.element}, ${risingSign.modality}, ruled by ${risingSign.rulingPlanet}`;
  }

  return `<western_analysis>
Sun Sign: ${sunSign.sign} ${sunSign.symbol} (${sunKo}) — ${sunSign.element}, ${sunSign.modality}, ruled by ${sunSign.rulingPlanet}
  Core identity, ego, life purpose

Moon Sign: ${moonSign.sign} ${moonSign.symbol} (${moonKo}) — ${moonSign.element}, ${moonSign.modality}, ruled by ${moonSign.rulingPlanet}
  Emotions, inner world, instinctive reactions

Rising Sign: ${risingStr}
  Social persona, first impressions, outward style
</western_analysis>`;
}

// ─── Composite Score ─────────────────────────────────────────────────

function buildCompositeBlock(profile: CompositeFortuneProfile): string {
  const c = profile.composite;
  return `<composite_score>
Fortune Score: ${c.fortuneScore.toFixed(3)} (${c.fortunePercent}%)
Grade: ${c.grade.labelEn} (${c.grade.label})
Description: ${c.grade.descriptionEn}

Components:
  Biorhythm: ${c.bioScore.toFixed(3)}
  Daeun bonus: ${c.daunBonus.toFixed(3)}
  Western bonus: ${c.westernBonus.toFixed(3)}
</composite_score>`;
}

// ─── Public API ──────────────────────────────────────────────────────

export function buildFortuneContext(profile: CompositeFortuneProfile): string {
  return [
    '<fortune_data>',
    buildEasternBlock(profile),
    buildWesternBlock(profile),
    buildCompositeBlock(profile),
    '</fortune_data>',
  ].join('\n\n');
}
