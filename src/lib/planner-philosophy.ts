/**
 * FortuneTab 플래너 4가지 핵심 철학
 * 운세 플래너 및 실천 플래너 PDF에 삽입되는 철학 데이터
 */

export interface Philosophy {
  id: string;
  /** 원문 철학 문구 */
  quote: string;
  /** 짧은 요약 (월간 배너 등 좁은 공간용) */
  shortQuote: string;
  /** 오늘의 실천 의도 (일간 플래너용) */
  intent: string;
}

export const PHILOSOPHIES: Philosophy[] = [
  {
    id: 'intent',
    quote: '생각하는데로 살지 않으면, 사는데로 생각하게 된다.',
    shortQuote: '생각하는대로 산다',
    intent: '오늘 나는 내 선택으로 하루를 설계한다.',
  },
  {
    id: 'effort',
    quote: '정해진 운명일지라도, 노력에 따라 운명은 바꿀수 있다.',
    shortQuote: '노력이 운명을 바꾼다',
    intent: '오늘 나는 한 걸음 더 나아간다.',
  },
  {
    id: 'wish',
    quote: '소원은 강하게 빌어라. 신이 감동할 만큼의 노력을 보여라.',
    shortQuote: '간절히 바라고, 치열히 행동한다',
    intent: '오늘 나는 내 소원을 이루기 위해 최선을 다한다.',
  },
  {
    id: 'execute',
    quote: '계획을 세우고 실천하며 원하는것을 쟁취한다.',
    shortQuote: '계획 → 실천 → 쟁취',
    intent: '오늘의 계획을 완수한다.',
  },
];

/** 월 기반 철학 순환 선택 (0=1월 → index 0, 3=4월 → index 3, ...) */
export const getMonthPhilosophy = (month: number): Philosophy =>
  PHILOSOPHIES[((month % 4) + 4) % 4];

/** 일년 중 몇 번째 날(0-based)로 철학 의도 반환 */
export const getDayPhilosophyIntent = (dayOfYear: number): string =>
  PHILOSOPHIES[((dayOfYear % 4) + 4) % 4].intent;
