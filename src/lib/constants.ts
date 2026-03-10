export const COPY = {
  hero: {
    headline: '사주·운세로 설계한\n나만의 365일 플래너',
    subheadline:
      '당신의 생년월일을 기반으로 목표·루틴·운세를\n한 번에 정리한 맞춤형 전자 플래너',
    ctaButton: '출시 알림 받기',
    ctaSubtext: '현재 준비 중이에요. 출시 시 가장 먼저 알려드릴게요.',
  },
  problem: {
    sectionLabel: '왜 필요한가요?',
    headline: '계획은 세웠는데, 왜 항상 흐지부지될까요?',
    points: [
      {
        icon: '📅',
        title: '새해 목표가 2월에 사라집니다',
        desc: '의지의 문제가 아닙니다. 내 흐름에 맞지 않는 계획이 문제입니다.',
      },
      {
        icon: '🌀',
        title: '루틴이 계속 끊깁니다',
        desc: '작심삼일의 반복. 나만의 리듬을 찾지 못했기 때문입니다.',
      },
      {
        icon: '😶‍🌫️',
        title: '방향을 잃은 날이 너무 많습니다',
        desc: '불안하고 막막한 날, 무엇부터 해야 할지 모르겠는 그 감각.',
      },
    ],
  },
  features: {
    sectionLabel: '이렇게 달라집니다',
    headline: '사주 흐름을 알면,\n계획이 자연스럽게 유지됩니다',
    items: [
      {
        icon: '✨',
        title: '올해 꼭 이루고 싶은 목표를 사주 흐름에 맞춰 배치',
        desc: '내 에너지가 높은 시기에 도전하고, 낮은 시기에 준비합니다.',
      },
      {
        icon: '🗓️',
        title: '하루 루틴이 자연스럽게 유지되는 월·주·일 구조',
        desc: '플래너가 내 리듬을 기억합니다. 빠진 날도 다시 잡아줍니다.',
      },
      {
        icon: '🧭',
        title: '불안한 날도 방향을 잃지 않는 나만의 나침반',
        desc: '오늘 운세와 함께 "이것만 하자"를 알려주는 한 줄의 방향.',
      },
    ],
  },
  preview: {
    sectionLabel: '미리보기',
    headline: '이런 플래너입니다',
    altText: '맞춤 전자 플래너 미리보기 화면',
    caption: '실제 출시 버전은 개인 사주 분석을 기반으로 완전히 맞춤 제작됩니다.',
  },
  pricing: {
    sectionLabel: '가격 안내',
    headline: '출시 예정 가격',
    subheadline: '지금 알림 신청하시면 출시 기념 특별 혜택을 드립니다.',
    ctaButton: '출시 시 이 가격으로 구매하겠습니다',
    modalTitle: '감사합니다! 🌙',
    modalBody: '현재 베타 준비 중입니다.\n출시 시 가장 먼저 알려드릴게요.',
    modalCtaText: '출시 알림도 함께 신청하기',
    modalCloseText: '닫기',
  },
  footer: {
    ctaHeadline: '출시 알림을 받아보세요',
    ctaSubtext: '이메일 하나로, 나만의 플래너를 가장 먼저 만나보세요.',
    copyright: '© 2025 FortuneTab. All rights reserved.',
  },
  form: {
    emailPlaceholder: '이메일 주소를 입력해주세요',
    jobLabel: '현재 하시는 일 (선택)',
    jobOptions: [
      { value: '', label: '선택해주세요' },
      { value: 'student', label: '학생' },
      { value: 'employee', label: '직장인' },
      { value: 'freelancer', label: '프리랜서 / 자영업자' },
      { value: 'homemaker', label: '주부' },
      { value: 'jobseeker', label: '취업 준비생' },
      { value: 'other', label: '기타' },
    ],
    reasonLabel: '플래너를 쓰고 싶은 이유 (선택)',
    reasonPlaceholder: '예: 올해 꼭 목표를 이루고 싶어서요',
    submitButton: '출시 알림 받기',
    successTitle: '신청 완료! 🌙',
    successMessage: '출시되면 가장 먼저 알려드릴게요.\n조금만 기다려주세요.',
    errorEmail: '올바른 이메일 주소를 입력해주세요.',
  },
} as const

export const PLANS = [
  {
    id: 'plan_a',
    gaName: 'plan_a_기본플래너',
    name: '기본 플래너',
    price: 19000,
    priceFormatted: '19,000원',
    badge: null as string | null,
    features: [
      '사주 기반 2025 목표 플래너 (PDF)',
      '월간 · 주간 · 일간 구조 포함',
      '운세 흐름 캘린더 (연간)',
      '루틴 트래커 템플릿',
    ],
    highlighted: false,
  },
  {
    id: 'plan_b',
    gaName: 'plan_b_플래너_리포트',
    name: '플래너 + 개인 리포트',
    price: 29000,
    priceFormatted: '29,000원',
    badge: '인기' as string | null,
    features: [
      '기본 플래너의 모든 것 포함',
      '개인 사주 심층 리포트 (20p+)',
      '2025 월별 운세 가이드',
      '출시 기념 얼리버드 할인 예약',
    ],
    highlighted: true,
  },
] as const

export type Plan = (typeof PLANS)[number]
