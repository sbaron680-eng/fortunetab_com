import type { Product } from '@/types';

// 11월부터는 다음 해 플래너를 판매 → 연도 자동 전환
const d = new Date();
export const PLANNER_YEAR = d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear();

export const PRODUCTS: Product[] = [
  {
    id: 'common-planner',
    slug: 'common-planner',
    name: '무료 공통 플래너',
    subtitle: '운세 흐름으로 설계한 2026년 PDF 플래너',
    price: 0,
    originalPrice: null,
    badge: '무료',
    badgeColor: 'green',
    images: [
      '/products/planner-cover.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/planner-cover.png',
    shortDescription: '브라우저에서 즉시 PDF 생성 — 이메일 없이 바로 다운로드.',
    description: `운세의 흐름을 담아 설계한 2026년 공통 플래너입니다. 커버 페이지부터 연간 인덱스, 월간·주간·일간 플래너까지 5종 템플릿이 하나의 PDF에 담겨 있습니다.

버튼 하나로 브라우저에서 즉시 PDF를 생성합니다. 이메일 입력 없이 바로 다운로드할 수 있습니다. 직접 인쇄하거나 태블릿·PDF 앱에서 바로 사용할 수 있습니다.`,
    features: [
      {
        icon: '🌙',
        title: '달의 운세 철학',
        description: '음력 리듬과 천간지지를 바탕으로 설계된 일정 구조',
      },
      {
        icon: '📅',
        title: '5종 템플릿 세트',
        description: '커버·연간·월간·주간·일간 — 한 파일에 모든 플래너',
      },
      {
        icon: '🖨️',
        title: 'A4 고화질 인쇄',
        description: '고화질, A4 규격 — 가정용 프린터도 선명하게 출력',
      },
      {
        icon: '📲',
        title: '태블릿 최적화',
        description: 'GoodNotes, Noteshelf, Apple PDF 앱에서 바로 사용',
      },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF (고화질 PNG 포함)' },
      { label: '페이지 수', value: '5종 템플릿 (커버+연간+월간+주간+일간)' },
      { label: '크기', value: 'A4 (210×297mm), 고화질' },
      { label: '언어', value: '한국어' },
      { label: '배송 방법', value: '브라우저 즉시 다운로드 (이메일 불필요)' },
      { label: '가격', value: '무료' },
    ],
    downloadUrl: '/download',
    previewTheme: 'rose',
    category: 'free',
    inStock: true,
    seo: {
      title: '무료 PDF 플래너 2026 - 운세 흐름 플래너 무료 다운로드',
      description:
        '2026년 운세 흐름으로 설계한 PDF 플래너 무료 다운로드. 커버·연간·월간·주간·일간 5종 템플릿. 이메일 신청 시 즉시 발송.',
      keywords: [
        'PDF 플래너 무료',
        '2026 플래너 다운로드',
        '운세 플래너',
        '무료 다이어리 PDF',
        '플래너 템플릿 무료',
      ],
    },
  },
  {
    id: 'saju-planner-basic',
    slug: 'saju-planner-basic',
    name: '사주 플래너 기본',
    subtitle: '나의 사주로 맞춤 설계된 2026년 플래너',
    price: 19000,
    originalPrice: 29000,
    badge: '인기',
    badgeColor: 'gold',
    images: [
      '/products/planner-cover.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/planner-cover.png',
    shortDescription: '사주팔자 분석을 바탕으로 맞춤 제작되는 1년치 PDF 플래너.',
    description: `내 사주를 바탕으로 2026년 한 해의 운세 흐름을 분석하고, 그에 맞게 맞춤 제작되는 PDF 플래너입니다.

운이 강한 달과 조심해야 할 달, 최적의 행동 시기를 플래너에 직접 반영했습니다. 단순한 일정 관리가 아닌, 내 운의 흐름을 읽고 활용하는 도구입니다.`,
    features: [
      {
        icon: '🔮',
        title: '사주 기반 맞춤 제작',
        description: '생년월일시 입력 → 전문 분석 → 맞춤 플래너 제작',
      },
      {
        icon: '📊',
        title: '연간 운세 흐름 캘린더',
        description: '12개월 운세 강약 표시, 중요 기일·길일 마킹',
      },
      {
        icon: '🗓️',
        title: '월간·주간·일간 구조',
        description: '목표 설정부터 일일 루틴까지 완전한 플래너 시스템',
      },
      {
        icon: '💡',
        title: '월별 운세 가이드 노트',
        description: '각 달의 운세 핵심 키워드와 추천 행동 패턴 수록',
      },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF (개인 정보 포함)' },
      { label: '페이지 수', value: '약 70~80페이지 (월간×12+주간×52+일간×30×12)' },
      { label: '크기', value: 'A4 (210×297mm), 고화질' },
      { label: '언어', value: '한국어' },
      { label: '제작 기간', value: '결제 후 영업일 기준 1~2일 이내 이메일 발송' },
      { label: '가격', value: '19,000원 (얼리버드 할인가)' },
    ],
    downloadUrl: null, // TODO: 개인별 Google Drive 링크 연결
    previewTheme: 'navy',
    category: 'basic',
    inStock: true,
    seo: {
      title: '사주 플래너 기본 - 내 사주로 설계한 2026년 맞춤 플래너',
      description:
        '사주팔자 분석으로 맞춤 제작되는 2026년 PDF 플래너. 운세 흐름 캘린더·월간·주간·일간 플래너 포함. 얼리버드 19,000원.',
      keywords: [
        '사주 플래너',
        '사주 다이어리',
        '운세 플래너',
        '맞춤 플래너',
        '사주팔자 플래너',
        '2026 사주',
        'PDF 다이어리',
      ],
    },
  },
  {
    id: 'saju-planner-premium',
    slug: 'saju-planner-premium',
    name: '사주 플래너 + 개인 리포트',
    subtitle: '플래너 + 20페이지 심층 사주 분석 리포트',
    price: 29000,
    originalPrice: 49000,
    badge: 'BEST',
    badgeColor: 'red',
    images: [
      '/products/planner-cover.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/planner-cover.png',
    shortDescription: '맞춤 플래너 + 20페이지 사주 심층 리포트. 가장 완전한 패키지.',
    description: `사주 플래너 기본의 모든 것에 더해, 20페이지 이상의 개인 사주 심층 리포트를 함께 받아보실 수 있습니다.

나의 사주 구조, 10년 대운 흐름, 2026년 월별 세운 분석까지 — 운세를 깊이 이해하고 한 해를 전략적으로 설계하고 싶은 분에게 추천합니다.`,
    features: [
      {
        icon: '📋',
        title: '기본 플래너 전체 포함',
        description: '사주 기반 맞춤 플래너 + 연간 운세 캘린더 모두 포함',
      },
      {
        icon: '📖',
        title: '개인 사주 심층 리포트 (20p+)',
        description: '사주 구조·성향·강약·재운·관운 분석 리포트',
      },
      {
        icon: '🌊',
        title: '2026 월별 운세 가이드',
        description: '12개월 세운(歲運) 분석 + 추천 액션 플랜',
      },
      {
        icon: '🎯',
        title: '10년 대운 흐름 분석',
        description: '중장기 인생 흐름을 이해하고 2026을 전략적으로 활용',
      },
    ],
    specs: [
      { label: '파일 형식', value: '플래너 PDF + 리포트 PDF (별도 파일)' },
      { label: '페이지 수', value: '플래너 80p + 리포트 20p+' },
      { label: '크기', value: 'A4 (210×297mm), 고화질' },
      { label: '언어', value: '한국어' },
      { label: '제작 기간', value: '결제 후 영업일 기준 1~2일 이내 이메일 발송' },
      { label: '가격', value: '29,000원 (얼리버드 특별가)' },
    ],
    downloadUrl: null, // TODO: 개인별 Google Drive 링크 연결
    previewTheme: 'gold',
    category: 'premium',
    inStock: true,
    seo: {
      title: '사주 플래너 프리미엄 - 플래너+개인 사주 리포트 패키지',
      description:
        '사주 맞춤 플래너 + 20페이지 개인 사주 심층 리포트. 2026 월별 운세, 대운 분석 포함. 얼리버드 29,000원.',
      keywords: [
        '사주 리포트',
        '개인 사주 분석',
        '사주풀이',
        '사주 플래너 세트',
        '운세 리포트',
        '2026 운세',
        '사주 PDF',
      ],
    },
  },
];

export const getProductBySlug = (slug: string): Product | undefined =>
  PRODUCTS.find((p) => p.slug === slug);

export const getFeaturedProducts = (): Product[] =>
  PRODUCTS.filter((p) => p.category !== 'free');

export const formatPrice = (price: number): string =>
  price === 0 ? '무료' : `₩${price.toLocaleString('ko-KR')}`;
