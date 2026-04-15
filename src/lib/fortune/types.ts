/**
 * Fortune Engine v2 — 공통 타입 정의
 *
 * 동양 사주명리 + 서양 점성술 융합 엔진
 */

// ─── 오행 (Five Elements) ─────────────────────────────────────────────

export type ElemKo = '목' | '화' | '토' | '금' | '수';
export type ElemEn = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// ─── 천간 / 지지 ──────────────────────────────────────────────────────

export type StemKo = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type BranchKo = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해';

// ─── 주(柱) ───────────────────────────────────────────────────────────

export interface Pillar {
  stemIdx: number;     // 0–9
  branchIdx: number;   // 0–11
  stemKo: string;
  branchKo: string;
  stemHj: string;      // 한자
  branchHj: string;
  stemElem: ElemKo;
  branchElem: ElemKo;
}

// ─── 사주 결과 ────────────────────────────────────────────────────────

export interface SajuResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;  // null = 시간 미입력
  elemCount: Record<ElemKo, number>;
  dayElem: ElemKo;      // 일간 오행
  yongsin: ElemKo;      // 용신 (도움이 되는 오행)
}

// ─── 십신 (Ten Gods) ──────────────────────────────────────────────────

export type SipsinName =
  | '비견' | '겁재'   // 같은 오행
  | '식신' | '상관'   // 내가 생하는
  | '편재' | '정재'   // 내가 극하는
  | '편관' | '정관'   // 나를 극하는
  | '편인' | '정인';  // 나를 생하는

export interface SipsinInfo {
  name: SipsinName;
  element: ElemKo;
  position: string;  // 연/월/일/시
}

// ─── 신살 (Spiritual Markers) ─────────────────────────────────────────

export type SinsalType = '도화살' | '역마살' | '화개살' | '천을귀인' | '양인살' | '원진살';

// ─── 합충형파해 관계 ────────────────────────────────────────────────
export type BranchRelationType = '삼합' | '방합' | '육합' | '충' | '형' | '파' | '해';

export interface SinsalInfo {
  type: SinsalType;
  nature: 'good' | 'bad' | 'neutral';
  description: string;
  descriptionEn: string;
}

// ─── 합충형파해 결과 ─────────────────────────────────────────────────

export interface BranchRelationResult {
  type: BranchRelationType;
  branches: number[];
  description: string;
  descriptionEn: string;
  nature: 'good' | 'bad' | 'neutral';
  elem?: ElemKo;
}

export interface StemHapResult {
  stemA: number;
  stemB: number;
  resultElem: ElemKo;
  name: string;
}

export interface TonggeunResult {
  stemIdx: number;
  position: string;
  rootBranches: { branchIdx: number; jijanganType: '정기' | '중기' | '여기' }[];
}

export interface GongmangResult {
  gongmangBranches: [number, number];
  affectedPillars: string[];
}

// ─── 대운 (Major Fortune Period) ──────────────────────────────────────

export type DaunPhase = '상승기' | '안정기' | '전환기' | '하강기';
export type DaunPhaseEn = 'rising' | 'stable' | 'transition' | 'declining';

export interface DaeunPeriod {
  index: number;      // 0–7
  startAge: number;
  endAge: number;
  stemIdx: number;
  branchIdx: number;
  stemKo: string;
  branchKo: string;
  stemElem: ElemKo;
  branchElem: ElemKo;
  sipsin: SipsinName;
}

// ─── 서양 점성술 ──────────────────────────────────────────────────────

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type WesternElement = 'fire' | 'earth' | 'air' | 'water';
export type Modality = 'cardinal' | 'fixed' | 'mutable';

export interface ZodiacInfo {
  sign: ZodiacSign;
  symbol: string;
  element: WesternElement;
  modality: Modality;
  rulingPlanet: string;
  dateRange: string;   // "Mar 21 – Apr 19" 형태
}

export interface WesternProfile {
  sunSign: ZodiacInfo;
  moonSign: ZodiacInfo;
  risingSign: ZodiacInfo | null;  // null = 출생시간/위치 미입력
}

// ─── 통합 프로필 ──────────────────────────────────────────────────────

export interface CompositeFortuneProfile {
  eastern: {
    saju: SajuResult;
    sipsinMap: SipsinInfo[];
    sinsal: SinsalInfo[];
    daeun: DaeunPeriod[];
    currentDaeun: DaeunPeriod;
    daunPhase: DaunPhase;
    branchRelations: BranchRelationResult[];
    stemHap: StemHapResult[];
    tonggeun: TonggeunResult[];
    gongmang: GongmangResult;
  };
  western: WesternProfile;
  composite: {
    bioScore: number;       // -1 ~ 1
    daunBonus: number;
    westernBonus: number;
    fortuneScore: number;   // -1 ~ 1
    fortunePercent: number; // 0 ~ 100
    grade: FortuneGrade;
  };
}

// ─── 등급 ─────────────────────────────────────────────────────────────

export type FortuneGradeKey = 'optimal' | 'good' | 'neutral' | 'rest';

export interface FortuneGrade {
  key: FortuneGradeKey;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
}

// ─── 엔진 입력 ────────────────────────────────────────────────────────

export interface BirthData {
  date: string;           // 'YYYY-MM-DD'
  hour?: number;          // 0–23 (undefined = 모름)
  minute?: number;        // 0–59
  gender: 'male' | 'female';
  location?: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;     // e.g., 'Asia/Seoul'
  };
}
