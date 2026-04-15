/**
 * Fortune Engine v2 — 상수 정의
 *
 * 천간/지지/오행 + 서양 점성술 기초 데이터
 */

import type { ElemKo, ElemEn, ZodiacSign, ZodiacInfo, WesternElement, Modality } from './types';

// ─── 천간 (Heavenly Stems) ────────────────────────────────────────────

export const STEMS_KO   = ['갑','을','병','정','무','기','경','신','임','계'] as const;
export const STEMS_EN   = ['gap','eul','byeong','jeong','mu','gi','gyeong','sin','im','gye'] as const;
export const STEMS_HJ   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const;
export const STEMS_ELEM: readonly ElemKo[] = ['목','목','화','화','토','토','금','금','수','수'];
export const STEMS_YIN  = [false,true,false,true,false,true,false,true,false,true] as const;

// ─── 지지 (Earthly Branches) ──────────────────────────────────────────

export const BRANCHES_KO   = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const;
export const BRANCHES_EN   = ['ja','chuk','in','myo','jin','sa','o','mi','sin','yu','sul','hae'] as const;
export const BRANCHES_HJ   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const;
export const BRANCHES_ELEM: readonly ElemKo[] = ['수','토','목','목','토','화','화','토','금','금','토','수'];
export const BRANCHES_ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'] as const;
export const BRANCHES_ANIMAL_EN = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'] as const;

// 지지의 정기(正氣) 천간 인덱스 — 십신 판단에 사용
export const BRANCH_MAIN_STEM = [9,5,0,1,4,2,3,5,6,7,4,8] as const;
// 자→계(9), 축→기(5), 인→갑(0), 묘→을(1), 진→무(4), 사→병(2)
// 오→정(3), 미→기(5), 신→경(6), 유→신(7), 술→무(4), 해→임(8)

// ─── 오행 (Five Elements) ─────────────────────────────────────────────

export const ELEM_KO_LIST: readonly ElemKo[] = ['목','화','토','금','수'];
export const ELEM_EN_LIST: readonly ElemEn[] = ['wood','fire','earth','metal','water'];
export const ELEM_HJ = ['木','火','土','金','水'] as const;
export const ELEM_COLOR = ['#22c55e','#ef4444','#f59e0b','#94a3b8','#3b82f6'] as const;
export const ELEM_EMOJI = ['🌿','🔥','🪨','⚔️','💧'] as const;

// 오행 상생(相生): 목→화→토→금→수→목
export const GEN_CYCLE: readonly ElemKo[] = ['목','화','토','금','수'];

// 오행 상극(相剋): 목→토, 화→금, 토→수, 금→목, 수→화
export const CTRL_MAP: Readonly<Record<ElemKo, ElemKo>> = {
  '목': '토', '화': '금', '토': '수', '금': '목', '수': '화',
};

// 오행 한↔영 매핑
export const ELEM_KO_TO_EN: Readonly<Record<ElemKo, ElemEn>> = {
  '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water',
};
export const ELEM_EN_TO_KO: Readonly<Record<ElemEn, ElemKo>> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
};

// ─── 오행 ↔ 서양 원소 브릿지 ──────────────────────────────────────────

export const ELEM_TO_WESTERN: Readonly<Record<ElemKo, WesternElement>> = {
  '목': 'earth',  // 목=성장/봄 → Earth(nurturing)에 가장 근접
  '화': 'fire',
  '토': 'earth',
  '금': 'air',
  '수': 'water',
};

export const WESTERN_TO_ELEM: Readonly<Record<WesternElement, ElemKo>> = {
  fire: '화', earth: '토', air: '금', water: '수',
};

// ─── 월주 시작 천간 테이블 ────────────────────────────────────────────

// 연간 % 5에 따라 인월(寅月) 시작 천간 결정
export const MONTH_START_STEM: Readonly<Record<number, number>> = {
  0: 2,  // 甲/己年 → 인월=丙(2)
  1: 4,  // 乙/庚年 → 인월=戊(4)
  2: 6,  // 丙/辛年 → 인월=庚(6)
  3: 8,  // 丁/壬年 → 인월=壬(8)
  4: 0,  // 戊/癸年 → 인월=甲(0)
};

// ─── 시주 시작 천간 테이블 ────────────────────────────────────────────

// 일간 % 5에 따라 자시(子時) 시작 천간 결정
export const HOUR_START_STEM: Readonly<Record<number, number>> = {
  0: 0,  // 甲/己日 → 자시=甲(0)
  1: 2,  // 乙/庚日 → 자시=丙(2)
  2: 4,  // 丙/辛日 → 자시=戊(4)
  3: 6,  // 丁/壬日 → 자시=庚(6)
  4: 8,  // 戊/癸日 → 자시=壬(8)
};

// ─── 십신 (Ten Gods) ──────────────────────────────────────────────────

export const SIPSIN_NAMES = [
  '비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인',
] as const;

export const SIPSIN_NAMES_EN = [
  'Parallel','Rob Wealth','Eating God','Hurting Officer',
  'Indirect Wealth','Direct Wealth','Seven Killings','Direct Officer',
  'Indirect Seal','Direct Seal',
] as const;

// ─── 태양 절기 테이블 (입춘 날짜) ─────────────────────────────────────
// 1920~2100년 입춘(立春) 날짜 — 양력 2월 기준
// 실제 입춘은 2/3~2/5 사이에서 변동
// 출처: 천문연감 기반 사전 계산

export const LICHUN_DATES: Readonly<Record<number, { month: number; day: number }>> = {
  // 1920~2060 — 천문연감/KASI 기반 입춘 날짜 (KST 기준)
  // 대부분 2/4이므로 2/3 또는 2/5인 해만 명시, 나머지는 getLichunDate()에서 기본값 2/4 사용
  // ── 1920~1959 ──
  1920: { month: 2, day: 5 }, 1921: { month: 2, day: 4 }, 1922: { month: 2, day: 4 },
  1923: { month: 2, day: 4 }, 1924: { month: 2, day: 5 }, 1925: { month: 2, day: 4 },
  1926: { month: 2, day: 4 }, 1927: { month: 2, day: 4 }, 1928: { month: 2, day: 5 },
  1929: { month: 2, day: 4 }, 1930: { month: 2, day: 4 }, 1931: { month: 2, day: 4 },
  1932: { month: 2, day: 5 }, 1933: { month: 2, day: 4 }, 1934: { month: 2, day: 4 },
  1935: { month: 2, day: 4 }, 1936: { month: 2, day: 5 }, 1937: { month: 2, day: 4 },
  1938: { month: 2, day: 4 }, 1939: { month: 2, day: 4 }, 1940: { month: 2, day: 5 },
  1941: { month: 2, day: 4 }, 1942: { month: 2, day: 4 }, 1943: { month: 2, day: 4 },
  1944: { month: 2, day: 5 }, 1945: { month: 2, day: 4 }, 1946: { month: 2, day: 4 },
  1947: { month: 2, day: 4 }, 1948: { month: 2, day: 5 }, 1949: { month: 2, day: 4 },
  1950: { month: 2, day: 4 }, 1951: { month: 2, day: 4 }, 1952: { month: 2, day: 5 },
  1953: { month: 2, day: 4 }, 1954: { month: 2, day: 4 }, 1955: { month: 2, day: 4 },
  1956: { month: 2, day: 5 }, 1957: { month: 2, day: 4 }, 1958: { month: 2, day: 4 },
  1959: { month: 2, day: 4 },
  // ── 1960~1999 ──
  1960: { month: 2, day: 5 }, 1961: { month: 2, day: 4 }, 1962: { month: 2, day: 4 },
  1963: { month: 2, day: 4 }, 1964: { month: 2, day: 5 }, 1965: { month: 2, day: 4 },
  1966: { month: 2, day: 4 }, 1967: { month: 2, day: 4 }, 1968: { month: 2, day: 5 },
  1969: { month: 2, day: 4 }, 1970: { month: 2, day: 4 }, 1971: { month: 2, day: 4 },
  1972: { month: 2, day: 5 }, 1973: { month: 2, day: 4 }, 1974: { month: 2, day: 4 },
  1975: { month: 2, day: 4 }, 1976: { month: 2, day: 5 }, 1977: { month: 2, day: 4 },
  1978: { month: 2, day: 4 }, 1979: { month: 2, day: 4 }, 1980: { month: 2, day: 5 },
  1981: { month: 2, day: 4 }, 1982: { month: 2, day: 4 }, 1983: { month: 2, day: 4 },
  1984: { month: 2, day: 4 }, 1985: { month: 2, day: 4 }, 1986: { month: 2, day: 4 },
  1987: { month: 2, day: 4 }, 1988: { month: 2, day: 4 }, 1989: { month: 2, day: 4 },
  1990: { month: 2, day: 4 }, 1991: { month: 2, day: 4 }, 1992: { month: 2, day: 4 },
  1993: { month: 2, day: 4 }, 1994: { month: 2, day: 4 }, 1995: { month: 2, day: 4 },
  1996: { month: 2, day: 4 }, 1997: { month: 2, day: 4 }, 1998: { month: 2, day: 4 },
  1999: { month: 2, day: 4 },
  // ── 2000~2040 ──
  2000: { month: 2, day: 4 }, 2001: { month: 2, day: 4 }, 2002: { month: 2, day: 4 },
  2003: { month: 2, day: 4 }, 2004: { month: 2, day: 4 }, 2005: { month: 2, day: 4 },
  2006: { month: 2, day: 4 }, 2007: { month: 2, day: 4 }, 2008: { month: 2, day: 4 },
  2009: { month: 2, day: 4 }, 2010: { month: 2, day: 4 }, 2011: { month: 2, day: 4 },
  2012: { month: 2, day: 4 }, 2013: { month: 2, day: 4 }, 2014: { month: 2, day: 4 },
  2015: { month: 2, day: 4 }, 2016: { month: 2, day: 4 }, 2017: { month: 2, day: 3 },
  2018: { month: 2, day: 4 }, 2019: { month: 2, day: 4 }, 2020: { month: 2, day: 4 },
  2021: { month: 2, day: 3 }, 2022: { month: 2, day: 4 }, 2023: { month: 2, day: 4 },
  2024: { month: 2, day: 4 }, 2025: { month: 2, day: 3 }, 2026: { month: 2, day: 4 },
  2027: { month: 2, day: 4 }, 2028: { month: 2, day: 4 }, 2029: { month: 2, day: 3 },
  2030: { month: 2, day: 4 }, 2031: { month: 2, day: 4 }, 2032: { month: 2, day: 4 },
  2033: { month: 2, day: 3 }, 2034: { month: 2, day: 4 }, 2035: { month: 2, day: 4 },
  2036: { month: 2, day: 4 }, 2037: { month: 2, day: 3 }, 2038: { month: 2, day: 4 },
  2039: { month: 2, day: 4 }, 2040: { month: 2, day: 4 },
  // ── 2041~2060 ──
  2041: { month: 2, day: 3 }, 2042: { month: 2, day: 4 }, 2043: { month: 2, day: 4 },
  2044: { month: 2, day: 4 }, 2045: { month: 2, day: 3 }, 2046: { month: 2, day: 4 },
  2047: { month: 2, day: 4 }, 2048: { month: 2, day: 4 }, 2049: { month: 2, day: 3 },
  2050: { month: 2, day: 3 }, 2051: { month: 2, day: 4 }, 2052: { month: 2, day: 4 },
  2053: { month: 2, day: 3 }, 2054: { month: 2, day: 4 }, 2055: { month: 2, day: 4 },
  2056: { month: 2, day: 4 }, 2057: { month: 2, day: 3 }, 2058: { month: 2, day: 4 },
  2059: { month: 2, day: 4 }, 2060: { month: 2, day: 4 },
};

/** 해당 연도의 입춘 날짜 반환 (테이블에 없으면 2월 4일 기본값) */
export function getLichunDate(year: number): { month: number; day: number } {
  return LICHUN_DATES[year] ?? { month: 2, day: 4 };
}

// ─── 신살 매핑 테이블 ─────────────────────────────────────────────────

// 도화살: 일지 삼합 기준 → 도화 지지
export const DOHWA_MAP: Readonly<Record<number, number>> = {
  2:3, 6:3, 10:3,   // 인오술 → 묘(3)
  0:9, 4:9, 8:9,    // 자진신 → 유(9)
  3:0, 7:0, 11:0,   // 묘미해 → 자(0)
  1:6, 5:6, 9:6,    // 축사유 → 오(6)
};

// 역마살: 일지 삼합 기준 → 역마 지지
export const YEOKMA_MAP: Readonly<Record<number, number>> = {
  2:8, 6:8, 10:8,   // 인오술 → 신(8)
  0:2, 4:2, 8:2,    // 자진신 → 인(2)
  3:5, 7:5, 11:5,   // 묘미해 → 사(5)
  1:11, 5:11, 9:11, // 축사유 → 해(11)
};

// 화개살: 일지 삼합 기준 → 화개 지지
export const HWAGAE_MAP: Readonly<Record<number, number>> = {
  2:10, 6:10, 10:10, // 인오술 → 술(10)
  0:4, 4:4, 8:4,     // 자진신 → 진(4)
  3:7, 7:7, 11:7,    // 묘미해 → 미(7)
  1:1, 5:1, 9:1,     // 축사유 → 축(1)
};

// 천을귀인: 일간 → 귀인 지지 목록
export const GUIIN_MAP: Readonly<Record<number, readonly number[]>> = {
  0: [1,7],   // 갑 → 축,미
  1: [0,8],   // 을 → 자,신
  2: [9,11],  // 병 → 유,해
  3: [9,11],  // 정 → 유,해
  4: [1,7],   // 무 → 축,미
  5: [0,8],   // 기 → 자,신
  6: [1,7],   // 경 → 축,미
  7: [2,6],   // 신 → 인,오
  8: [3,5],   // 임 → 묘,사
  9: [3,5],   // 계 → 묘,사
};

// 양인살: 양간 일간 → 양인 지지
export const YANGIN_MAP: Readonly<Record<number, number>> = {
  0:3, 2:6, 4:6, 6:9, 8:0, // 갑→묘, 병→오, 무→오, 경→유, 임→자
};

// 원진살: 6쌍
export const WONJIN_PAIRS: readonly (readonly [number, number])[] = [
  [0,7], [1,6], [2,5], [3,4], [8,11], [9,10],
];

// ═══════════════════════════════════════════════════════════════════════
// 합충형파해(合沖刑破害) — 지지 관계 테이블
// ═══════════════════════════════════════════════════════════════════════

// ─── 삼합(三合) ──────────────────────────────────────────────────────
// 세 지지가 모이면 해당 오행의 국(局)을 이룸
export type SamhapGroup = { branches: readonly [number, number, number]; elem: ElemKo; name: string };
export const SAMHAP_TABLE: readonly SamhapGroup[] = [
  { branches: [8, 0, 4],  elem: '수', name: '신자진 수국' },  // 申子辰
  { branches: [2, 6, 10], elem: '화', name: '인오술 화국' },  // 寅午戌
  { branches: [5, 9, 1],  elem: '금', name: '사유축 금국' },  // 巳酉丑
  { branches: [11, 3, 7], elem: '목', name: '해묘미 목국' },  // 亥卯未
];

// ─── 방합(方合) ──────────────────────────────────────────────────────
// 같은 방위 세 지지 → 해당 계절 오행 강화
export type BanghapGroup = { branches: readonly [number, number, number]; elem: ElemKo; name: string };
export const BANGHAP_TABLE: readonly BanghapGroup[] = [
  { branches: [2, 3, 4],   elem: '목', name: '인묘진 동방목' },
  { branches: [5, 6, 7],   elem: '화', name: '사오미 남방화' },
  { branches: [8, 9, 10],  elem: '금', name: '신유술 서방금' },
  { branches: [11, 0, 1],  elem: '수', name: '해자축 북방수' },
];

// ─── 육합(六合) ──────────────────────────────────────────────────────
// 두 지지가 합하여 다른 오행으로 변화
export type YukhapPair = { pair: readonly [number, number]; elem: ElemKo };
export const YUKHAP_TABLE: readonly YukhapPair[] = [
  { pair: [0, 1],   elem: '토' },  // 자축합토
  { pair: [2, 11],  elem: '목' },  // 인해합목
  { pair: [3, 10],  elem: '화' },  // 묘술합화
  { pair: [4, 9],   elem: '금' },  // 진유합금
  { pair: [5, 8],   elem: '수' },  // 사신합수
  { pair: [6, 7],   elem: '토' },  // 오미합토 (일설 화)
];

// ─── 충(沖) ──────────────────────────────────────────────────────────
// 대립 관계. 서로 반대 방위의 지지
export const CHUNG_PAIRS: readonly (readonly [number, number])[] = [
  [0, 6],   // 자오충
  [1, 7],   // 축미충
  [2, 8],   // 인신충
  [3, 9],   // 묘유충
  [4, 10],  // 진술충
  [5, 11],  // 사해충
];

// ─── 형(刑) ──────────────────────────────────────────────────────────
export type HyungGroup = { branches: readonly number[]; name: string; nameEn: string };
export const HYUNG_TABLE: readonly HyungGroup[] = [
  { branches: [2, 5, 8],  name: '인사신 무은지형', nameEn: 'Ungrateful Punishment' },
  { branches: [1, 10, 7], name: '축술미 무례지형', nameEn: 'Uncivilized Punishment' },
  { branches: [0, 3],     name: '자묘 무례지형',   nameEn: 'Rude Punishment' },
  { branches: [4, 4],     name: '진진 자형',       nameEn: 'Self Punishment (辰)' },
  { branches: [6, 6],     name: '오오 자형',       nameEn: 'Self Punishment (午)' },
  { branches: [9, 9],     name: '유유 자형',       nameEn: 'Self Punishment (酉)' },
  { branches: [11, 11],   name: '해해 자형',       nameEn: 'Self Punishment (亥)' },
];

// ─── 파(破) ──────────────────────────────────────────────────────────
export const PA_PAIRS: readonly (readonly [number, number])[] = [
  [0, 9],  // 자유파
  [1, 4],  // 축진파
  [2, 11], // 인해파
  [3, 6],  // 묘오파
  [5, 8],  // 사신파
  [7, 10], // 미술파
];

// ─── 해(害) ──────────────────────────────────────────────────────────
export const HAE_PAIRS: readonly (readonly [number, number])[] = [
  [0, 7],  // 자미해
  [1, 6],  // 축오해
  [2, 5],  // 인사해
  [3, 4],  // 묘진해
  [8, 11], // 신해해
  [9, 10], // 유술해
];

// ═══════════════════════════════════════════════════════════════════════
// 천간합(天干合) — 5합
// ═══════════════════════════════════════════════════════════════════════

export type CheonganHapPair = { pair: readonly [number, number]; resultElem: ElemKo; name: string };
export const CHEONGAN_HAP_TABLE: readonly CheonganHapPair[] = [
  { pair: [0, 5], resultElem: '토', name: '갑기합토' },  // 甲己
  { pair: [1, 6], resultElem: '금', name: '을경합금' },  // 乙庚
  { pair: [2, 7], resultElem: '수', name: '병신합수' },  // 丙辛
  { pair: [3, 8], resultElem: '목', name: '정임합목' },  // 丁壬
  { pair: [4, 9], resultElem: '화', name: '무계합화' },  // 戊癸
];

// ═══════════════════════════════════════════════════════════════════════
// 공망(空亡) — 갑자순 기준 빈 지지
// ═══════════════════════════════════════════════════════════════════════

/**
 * 일주(일간+일지)의 갑자순 기준 공망 지지 2개 반환.
 * 60갑자 순환에서 10천간이 12지지를 덮지 못해 남는 2개가 공망.
 */
export function calcGongmang(dayStemIdx: number, dayBranchIdx: number): [number, number] {
  // 해당 일주가 속한 순(旬)의 시작 지지 = dayBranchIdx - dayStemIdx
  const startBranch = ((dayBranchIdx - dayStemIdx) % 12 + 12) % 12;
  // 공망 = 순의 시작 지지에서 10, 11번째 (즉 10번째, 11번째 지지)
  const gm1 = (startBranch + 10) % 12;
  const gm2 = (startBranch + 11) % 12;
  return [gm1, gm2];
}

// ─── 서양 점성술 (Western Astrology) ──────────────────────────────────

export const ZODIAC_DATA: readonly ZodiacInfo[] = [
  { sign: 'aries',       symbol: '♈', element: 'fire',  modality: 'cardinal', rulingPlanet: 'Mars',    dateRange: 'Mar 21 – Apr 19' },
  { sign: 'taurus',      symbol: '♉', element: 'earth', modality: 'fixed',    rulingPlanet: 'Venus',   dateRange: 'Apr 20 – May 20' },
  { sign: 'gemini',      symbol: '♊', element: 'air',   modality: 'mutable',  rulingPlanet: 'Mercury', dateRange: 'May 21 – Jun 20' },
  { sign: 'cancer',      symbol: '♋', element: 'water', modality: 'cardinal', rulingPlanet: 'Moon',    dateRange: 'Jun 21 – Jul 22' },
  { sign: 'leo',         symbol: '♌', element: 'fire',  modality: 'fixed',    rulingPlanet: 'Sun',     dateRange: 'Jul 23 – Aug 22' },
  { sign: 'virgo',       symbol: '♍', element: 'earth', modality: 'mutable',  rulingPlanet: 'Mercury', dateRange: 'Aug 23 – Sep 22' },
  { sign: 'libra',       symbol: '♎', element: 'air',   modality: 'cardinal', rulingPlanet: 'Venus',   dateRange: 'Sep 23 – Oct 22' },
  { sign: 'scorpio',     symbol: '♏', element: 'water', modality: 'fixed',    rulingPlanet: 'Pluto',   dateRange: 'Oct 23 – Nov 21' },
  { sign: 'sagittarius', symbol: '♐', element: 'fire',  modality: 'mutable',  rulingPlanet: 'Jupiter', dateRange: 'Nov 22 – Dec 21' },
  { sign: 'capricorn',   symbol: '♑', element: 'earth', modality: 'cardinal', rulingPlanet: 'Saturn',  dateRange: 'Dec 22 – Jan 19' },
  { sign: 'aquarius',    symbol: '♒', element: 'air',   modality: 'fixed',    rulingPlanet: 'Uranus',  dateRange: 'Jan 20 – Feb 18' },
  { sign: 'pisces',      symbol: '♓', element: 'water', modality: 'mutable',  rulingPlanet: 'Neptune', dateRange: 'Feb 19 – Mar 20' },
];

// 별자리 한글 이름
export const ZODIAC_KO: Readonly<Record<ZodiacSign, string>> = {
  aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리', cancer: '게자리',
  leo: '사자자리', virgo: '처녀자리', libra: '천칭자리', scorpio: '전갈자리',
  sagittarius: '사수자리', capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리',
};

// ─── 십신 → 대운 단계 매핑 ────────────────────────────────────────────

export const SIPSIN_TO_DAUN_PHASE = {
  '편재': '상승기',
  '정재': '상승기',
  '식신': '상승기',
  '정관': '안정기',
  '정인': '안정기',
  '편인': '안정기',
  '상관': '전환기',
  '편관': '전환기',
  '비견': '하강기',
  '겁재': '하강기',
} as const;

// 대운 단계별 Fortune Score 보너스
export const DAUN_BONUS = {
  '상승기': +0.22,
  '안정기': +0.05,
  '전환기': -0.08,
  '하강기': -0.18,
} as const;

// ─── 12절기(節氣) 테이블 ─────────────────────────────────────────────
// 각 월의 절입일 (양력 기준 평균값). 절기 이전 출생이면 전월 월주 사용.
// 인덱스 0=소한(1월절), 1=입춘(2월절), ..., 11=대설(12월절)
// [month, day] 형태. 연도별 ±1일 오차 가능하나 대부분 정확.

export interface JeolgiEntry {
  name: string;
  nameHj: string;
  month: number;
  day: number;
  branchIdx: number; // 해당 절기의 월지
}

export const JEOLGI_TABLE: readonly JeolgiEntry[] = [
  { name: '소한', nameHj: '小寒', month: 1,  day: 6,  branchIdx: 1  }, // 축월(丑)
  { name: '입춘', nameHj: '立春', month: 2,  day: 4,  branchIdx: 2  }, // 인월(寅)
  { name: '경칩', nameHj: '驚蟄', month: 3,  day: 6,  branchIdx: 3  }, // 묘월(卯)
  { name: '청명', nameHj: '清明', month: 4,  day: 5,  branchIdx: 4  }, // 진월(辰)
  { name: '입하', nameHj: '立夏', month: 5,  day: 6,  branchIdx: 5  }, // 사월(巳)
  { name: '망종', nameHj: '芒種', month: 6,  day: 6,  branchIdx: 6  }, // 오월(午)
  { name: '소서', nameHj: '小暑', month: 7,  day: 7,  branchIdx: 7  }, // 미월(未)
  { name: '입추', nameHj: '立秋', month: 8,  day: 7,  branchIdx: 8  }, // 신월(申)
  { name: '백로', nameHj: '白露', month: 9,  day: 8,  branchIdx: 9  }, // 유월(酉)
  { name: '한로', nameHj: '寒露', month: 10, day: 8,  branchIdx: 10 }, // 술월(戌)
  { name: '입동', nameHj: '立冬', month: 11, day: 7,  branchIdx: 11 }, // 해월(亥)
  { name: '대설', nameHj: '大雪', month: 12, day: 7,  branchIdx: 0  }, // 자월(子)
];

// ─── 주요 절기 연도별 보정 테이블 (1960~2060) ──────────────────────────
// 천문연감/KASI 기반. 평균값과 다른 해만 기록.
// key: 절기 인덱스(JEOLGI_TABLE), value: { year → day }

export const JEOLGI_YEARLY: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  // 0: 소한(小寒) — 평균 1/6, 변동: 1/5
  0: {
    1981: 5, 1985: 5, 1989: 5, 1993: 5, 1997: 5,
    2001: 5, 2005: 5, 2009: 5, 2013: 5, 2017: 5,
    2021: 5, 2025: 5, 2029: 5, 2033: 5, 2037: 5,
    2041: 5, 2045: 5, 2049: 5, 2053: 5, 2057: 5,
  },
  // 2: 경칩(驚蟄) — 평균 3/6, 변동: 3/5
  2: {
    1981: 5, 1985: 5, 1989: 5, 1993: 5, 1997: 5,
    2001: 5, 2005: 5, 2009: 5, 2013: 5, 2017: 5,
    2021: 5, 2025: 5, 2029: 5, 2033: 5, 2037: 5,
    2041: 5, 2045: 5, 2049: 5, 2053: 5, 2057: 5,
  },
  // 3: 청명(清明) — 평균 4/5, 변동: 4/4
  3: {
    1960: 4, 1964: 4, 1968: 4, 1972: 4, 1976: 4,
    1980: 4, 1984: 4, 1988: 4, 1992: 4, 1996: 4,
    2000: 4, 2004: 4, 2008: 4, 2012: 4, 2016: 4,
    2020: 4, 2024: 4, 2028: 4, 2032: 4, 2036: 4,
    2040: 4, 2044: 4, 2048: 4, 2052: 4, 2056: 4, 2060: 4,
  },
  // 4: 입하(立夏) — 평균 5/6, 변동: 5/5
  4: {
    1981: 5, 1985: 5, 1989: 5, 1993: 5, 1997: 5,
    2001: 5, 2005: 5, 2009: 5, 2013: 5, 2017: 5,
    2021: 5, 2025: 5, 2029: 5, 2033: 5, 2037: 5,
    2041: 5, 2045: 5, 2049: 5, 2053: 5, 2057: 5,
  },
  // 5: 망종(芒種) — 평균 6/6, 변동: 6/5
  5: {
    1981: 5, 1985: 5, 1989: 5, 1993: 5, 1997: 5,
    2001: 5, 2005: 5, 2009: 5, 2013: 5, 2017: 5,
    2021: 5, 2025: 5, 2029: 5, 2033: 5, 2037: 5,
    2041: 5, 2045: 5, 2049: 5, 2053: 5, 2057: 5,
  },
  // 6: 소서(小暑) — 평균 7/7, 변동: 7/6
  6: {
    1960: 6, 1964: 6, 1968: 6, 1972: 6, 1976: 6,
    1980: 6, 1984: 6, 1988: 6, 1992: 6, 1996: 6,
    2000: 6, 2004: 6, 2008: 6, 2012: 6, 2016: 6,
    2020: 6, 2024: 6, 2028: 6, 2032: 6, 2036: 6,
    2040: 6, 2044: 6, 2048: 6, 2052: 6, 2056: 6, 2060: 6,
  },
};

/**
 * 연도별 보정이 적용된 절기 날짜 목록 생성.
 * 입춘은 LICHUN_DATES, 나머지 6개 주요 절기는 JEOLGI_YEARLY 반영.
 */
export function getJeolgiDaysForYear(year: number): JeolgiEntry[] {
  const lichun = getLichunDate(year);
  return JEOLGI_TABLE.map((j, i) => {
    if (i === 1) return { ...j, day: lichun.day };
    const yearly = JEOLGI_YEARLY[i];
    if (yearly && yearly[year] !== undefined) return { ...j, day: yearly[year] };
    return j;
  });
}

/**
 * 주어진 양력 날짜가 속한 월지(지지 인덱스)와 절기 반환.
 * 입춘 + 주요 6개 절기에 연도별 보정 적용.
 */
export function getMonthBranchByJeolgi(
  year: number, month: number, day: number,
): { branchIdx: number; jeolgiIdx: number } {
  const jeolgiDays = getJeolgiDaysForYear(year);

  for (let i = jeolgiDays.length - 1; i >= 0; i--) {
    const j = jeolgiDays[i];
    if (month > j.month || (month === j.month && day >= j.day)) {
      return { branchIdx: j.branchIdx, jeolgiIdx: i };
    }
  }

  // 1월 소한 이전 → 전년 12월 대설 구간 = 자월(子)
  return { branchIdx: 0, jeolgiIdx: 11 };
}

/** 두 양력 날짜 사이의 일수 차이 (반올림) */
function diffDays(
  y1: number, m1: number, d1: number,
  y2: number, m2: number, d2: number,
): number {
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * 다음 절기까지 남은 일수 계산 (대운 시작 나이 산출용)
 */
export function daysToNextJeolgi(year: number, month: number, day: number): number {
  const jeolgiDays = getJeolgiDaysForYear(year);

  for (const j of jeolgiDays) {
    if (j.month > month || (j.month === month && j.day > day)) {
      return diffDays(year, month, day, year, j.month, j.day);
    }
  }
  // 12월 대설 이후 → 다음 해 소한까지
  const nextYearJeolgi = getJeolgiDaysForYear(year + 1);
  return diffDays(year, month, day, year + 1, 1, nextYearJeolgi[0].day);
}

/**
 * 이전 절기부터 경과한 일수 계산 (대운 시작 나이 산출용)
 */
export function daysSincePrevJeolgi(year: number, month: number, day: number): number {
  const jeolgiDays = getJeolgiDaysForYear(year);

  for (let i = jeolgiDays.length - 1; i >= 0; i--) {
    const j = jeolgiDays[i];
    if (month > j.month || (month === j.month && day >= j.day)) {
      return diffDays(year, j.month, j.day, year, month, day);
    }
  }
  // 1월 소한 이전 → 전년 대설부터 경과
  const prevYearJeolgi = getJeolgiDaysForYear(year - 1);
  return diffDays(year - 1, 12, prevYearJeolgi[11].day, year, month, day);
}

// ─── 지장간(藏干) 테이블 ─────────────────────────────────────────────
// 각 지지에 포함된 천간 인덱스 [여기, 중기, 정기] 순서
// 정기만 있는 경우 나머지는 null

export interface JijanganEntry {
  yeogi: number | null;   // 여기(餘氣)
  junggi: number | null;  // 중기(中氣)
  jeonggi: number;        // 정기(正氣) — 항상 존재
}

export const JIJANGAN_TABLE: readonly JijanganEntry[] = [
  { yeogi: null, junggi: null, jeonggi: 9 },  // 子: 계(癸)
  { yeogi: 9,    junggi: 7,    jeonggi: 5 },  // 丑: 계→신→기
  { yeogi: 4,    junggi: 2,    jeonggi: 0 },  // 寅: 무→병→갑
  { yeogi: null, junggi: null, jeonggi: 1 },  // 卯: 을(乙)
  { yeogi: 1,    junggi: 9,    jeonggi: 4 },  // 辰: 을→계→무
  { yeogi: 4,    junggi: 6,    jeonggi: 2 },  // 巳: 무→경→병
  { yeogi: 2,    junggi: 5,    jeonggi: 3 },  // 午: 병→기→정
  { yeogi: 3,    junggi: 1,    jeonggi: 5 },  // 未: 정→을→기
  { yeogi: 4,    junggi: 8,    jeonggi: 6 },  // 申: 무→임→경
  { yeogi: null, junggi: null, jeonggi: 7 },  // 酉: 신(辛)
  { yeogi: 7,    junggi: 3,    jeonggi: 4 },  // 戌: 신→정→무
  { yeogi: 4,    junggi: 0,    jeonggi: 8 },  // 亥: 무→갑→임
];
