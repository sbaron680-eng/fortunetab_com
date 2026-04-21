import type { Product } from '@/types';

// 11월부터는 다음 해 플래너를 판매 → 연도 자동 전환
const d = new Date();
export const PLANNER_YEAR = d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear();

export const PRODUCTS: Product[] = [
  {
    id: 'common-planner',
    slug: 'common-planner',
    name: '무료 공통 플래너',
    subtitle: '누구나 쓰는 5종 기본 플래너 — 무료 진입 상품',
    price: 0,
    originalPrice: null,
    badge: '무료',
    badgeColor: 'green',
    images: [
      '/products/cover-common.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/cover-common.png',
    shortDescription: '사주·목표 없이 바로 쓰는 5종 기본 플래너. 브라우저 즉시 다운로드.',
    description: `운세의 흐름을 담아 설계한 ${PLANNER_YEAR}년 공통 플래너입니다. 커버·연간·월간·주간·일간 5종 템플릿이 하나의 PDF에 담겨 있습니다.

사주 입력도, 목표 설정도 필요 없이 브라우저에서 즉시 다운로드됩니다. 사주 라인(기본·프리미엄) 또는 실천 라인(practice)으로 업그레이드하기 전 포지셔닝을 잡기에 가장 적합한 진입 상품입니다.`,
    features: [
      { icon: '🌙', title: '달의 운세 철학',    description: '음력 리듬과 천간지지를 바탕으로 설계된 일정 구조' },
      { icon: '📅', title: '5종 기본 템플릿',   description: '커버·연간·월간·주간·일간 — 한 파일에 모든 기본 플래너' },
      { icon: '🖨️', title: 'A4 고화질 인쇄',   description: '고화질, A4 규격 — 가정용 프린터도 선명하게 출력' },
      { icon: '📲', title: '태블릿 최적화',    description: 'GoodNotes · Noteshelf · Apple PDF 앱에서 바로 사용' },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF (고화질 PNG 포함)' },
      { label: '페이지 수', value: '약 67p (커버1+연간1+월간12+주간52+일간1)' },
      { label: '크기',     value: 'A4 (210×297mm), 고화질' },
      { label: '언어',     value: '한국어' },
      { label: '배송',     value: '브라우저 즉시 다운로드 (이메일 불필요)' },
      { label: '가격',     value: '무료' },
    ],
    downloadUrl: '/free-planner',
    previewTheme: 'rose',
    coverStyle: 'fortune',
    category: 'free',
    inStock: true,
    includedPages: [
      { icon: '🌙', label: '커버',     count: '1p' },
      { icon: '📅', label: '연간 인덱스', count: '1p' },
      { icon: '🗓️', label: '월간',    count: '12p' },
      { icon: '📋', label: '주간',    count: '52p' },
      { icon: '✏️', label: '일간 샘플', count: '1p', note: '365일 풀 버전은 유료 사주 플래너에만 포함' },
    ],
    previewPages: [
      { type: 'cover',      label: '커버',    icon: '🌙', idx: 0 },
      { type: 'year-index', label: '연간',    icon: '📅', idx: 0 },
      { type: 'monthly',    label: '월간',    icon: '🗓️', idx: 0 },
      { type: 'weekly',     label: '주간',    icon: '📋', idx: 1 },
      { type: 'daily',      label: '일간 샘플', icon: '✏️', idx: 0 },
    ],
    differentiators: [
      '사주 없이 누구나 사용 가능',
      '브라우저 즉시 다운로드 (이메일 불필요)',
      '테마 7종 선택 가능',
    ],
    notIncluded: ['365일 일간 스케줄', '사주 맞춤 분석', '사주 리포트', '부록 페이지', 'OKR·습관 트래커'],
    compareRow: {
      core4: '포함', dailyCount: '샘플 1p', sajuCustom: false, sajuReport: false, practiceKit: false,
      extrasCount: 0, repeat: false, delivery: '즉시',
    },
    seo: {
      title: `무료 PDF 플래너 ${PLANNER_YEAR} - 운세 흐름 플래너 무료 다운로드`,
      description: `${PLANNER_YEAR}년 운세 흐름으로 설계한 PDF 플래너 무료 다운로드. 커버·연간·월간·주간·일간 5종 템플릿. 브라우저에서 즉시 생성.`,
      keywords: ['PDF 플래너 무료', `${PLANNER_YEAR} 플래너 다운로드`, '운세 플래너', '무료 다이어리 PDF', '플래너 템플릿 무료'],
    },
  },

  {
    id: 'saju-planner-basic',
    slug: 'saju-planner-basic',
    name: '사주 플래너 기본',
    subtitle: '내 사주로 맞춤 설계되는 12개월 운세 캘린더',
    price: 29000,
    originalPrice: null,
    badge: '인기',
    badgeColor: 'gold',
    images: [
      '/products/cover-saju-basic.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/cover-saju-basic.png',
    shortDescription: '사주팔자 분석으로 월별 운세 강약과 기일/길일이 직접 반영된 플래너.',
    description: `생년월일시를 입력하면 사주팔자 분석을 바탕으로 ${PLANNER_YEAR}년 한 해의 운세 흐름을 맞춤 설계합니다.

공통 플래너와 달리 **연간 페이지에 월별 운세 강약이 그라디언트로 표시**되고, **월간 페이지 사이드바에 해당 월의 간지·테마·길흉일**이 자동 채워집니다. 일간 페이지의 DAY QI 박스는 해당 날짜의 일진·오행까지 보여줍니다.

단순 일정 관리가 아닌, 내 운의 흐름을 읽고 실행 시점을 맞추는 전략 도구입니다.`,
    features: [
      { icon: '🔮', title: '사주 기반 맞춤 제작',  description: '생년월일시 → 사주 분석 → 연간·월간·일간 페이지에 운세 정보 삽입' },
      { icon: '📊', title: '월별 운세 강약 캘린더', description: '12개월 운 흐름이 연간 페이지에 그라디언트로 시각화' },
      { icon: '🎯', title: '길일·기일 자동 마킹',    description: '맞춤 길흉일이 월간 달력 셀에 기본 포함' },
      { icon: '💡', title: '월별 운세 가이드 노트',  description: '각 달 사이드바에 핵심 키워드·추천 행동 패턴 수록' },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF (개인 정보 포함 맞춤 제작)' },
      { label: '페이지 수', value: '약 430p (커버1+연간1+월간12+주간52+일간365)' },
      { label: '크기',     value: 'A4 (210×297mm), 고화질' },
      { label: '언어',     value: '한국어' },
      { label: '배송',     value: '결제 후 이메일로 PDF 자동 발송 (평균 5분)' },
      { label: '가격',     value: '29,000원' },
    ],
    downloadUrl: '/premium-planner',
    previewTheme: 'navy',
    coverStyle: 'fortune',
    category: 'basic',
    inStock: true,
    includedPages: [
      { icon: '🌙', label: '커버 (사주 정보 포함)', count: '1p', highlight: true, note: '생년월일시 기반' },
      { icon: '📅', label: '연간 인덱스 (운세 강약)', count: '1p', highlight: true, note: '월별 그라디언트' },
      { icon: '🗓️', label: '월간 (월별 운세)',      count: '12p', highlight: true, note: '간지·테마·길일' },
      { icon: '📋', label: '주간',                 count: '52p' },
      { icon: '✏️', label: '일간 스케줄 (DAY QI 박스)', count: '365p', highlight: true, note: '매일 일진·오행·기운 자동 채움' },
      { icon: '📦', label: '부록 페이지 선택', count: '옵션', note: '원하는 부록 7종 선택 가능' },
    ],
    previewPages: [
      { type: 'cover',      label: '사주 커버', icon: '🌙', idx: 0 },
      { type: 'year-index', label: '연간',    icon: '📅', idx: 0 },
      { type: 'monthly',    label: '월간',    icon: '🗓️', idx: 4 },  // 5월 (생일의 달 느낌)
      { type: 'weekly',     label: '주간',    icon: '📋', idx: 20 },
      { type: 'daily',      label: '일간',    icon: '✏️', idx: 134 }, // 5/15 샘플
    ],
    differentiators: [
      '내 사주 기반 12개월 운세 자동 반영',
      '매일 365일 일간 스케줄 (DAY QI 박스)',
      '월별 간지·키워드·길일 자동 채움',
      '부록 페이지 원하는 만큼 선택 가능',
    ],
    notIncluded: ['20p 사주 리포트', 'OKR·MIT·습관 트래커'],
    compareRow: {
      core4: '포함', dailyCount: '365p', sajuCustom: true, sajuReport: false, practiceKit: false,
      extrasCount: 0, repeat: false, delivery: '이메일',
    },
    seo: {
      title: `사주 플래너 기본 - 내 사주로 설계한 ${PLANNER_YEAR}년 맞춤 플래너`,
      description: `사주팔자 분석으로 맞춤 제작되는 ${PLANNER_YEAR}년 PDF 플래너. 운세 흐름 캘린더·월간·주간·일간 플래너 포함.`,
      keywords: ['사주 플래너', '사주 다이어리', '운세 플래너', '맞춤 플래너', '사주팔자 플래너', `${PLANNER_YEAR} 사주`, 'PDF 다이어리'],
    },
  },

  {
    id: 'saju-planner-premium',
    slug: 'saju-planner-premium',
    name: '사주 플래너 프리미엄',
    subtitle: '사주 맞춤 플래너 + 심층 리포트 (출시 예정)',
    price: 49000,
    originalPrice: null,
    badge: 'BEST',
    badgeColor: 'red',
    images: [
      '/products/cover-saju-premium.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/cover-saju-premium.png',
    shortDescription: '사주 맞춤 플래너 + 365일 일간. 심층 리포트는 개발 중 (무료 업데이트로 제공).',
    description: `사주 플래너 기본의 모든 페이지를 포함하고, 추가로 사주 심층 리포트 기능이 개발 중입니다.

**지금 구매 시 즉시 이용 가능한 것**
- 사주 커버 + 연간 운세 강약 + 월별 세운 사이드바 + 주간 + 365일 일간 스케줄(DAY QI 박스)
- 원하는 부록 페이지 자유 선택

**출시 예정 (얼리버드 고객 무료 제공)**
- 사주 구조·성향·강약 분석 리포트 (별도 PDF)
- 10년 대운 흐름 차트
- ${PLANNER_YEAR}년 12개월 세운(歲運) 분석 + 액션 플랜

리포트 출시 시 가입 이메일로 별도 발송해드리며, 추후 가격 상향 예정이니 얼리버드로 구매하시는 게 유리합니다.`,
    features: [
      { icon: '📋', title: '기본 플래너 전체 포함',   description: '사주 기본 플래너의 연간·월간·주간·365일 일간 전부 포함' },
      { icon: '📖', title: '사주 심층 리포트 (출시 예정)', description: '개발 중 — 얼리버드 고객은 출시 후 무료로 이메일 발송' },
      { icon: '🌊', title: '12개월 세운 분석 (출시 예정)', description: `${PLANNER_YEAR}년 월별 세운 + 추천 액션 플랜` },
      { icon: '🎯', title: '10년 대운 차트 (출시 예정)',    description: '중장기 인생 흐름을 이해하고 한 해를 전략적으로 활용' },
    ],
    specs: [
      { label: '파일 형식', value: '플래너 PDF (리포트 PDF 출시 예정)' },
      { label: '페이지 수', value: '플래너 약 430p (커버1+연간1+월간12+주간52+일간365) · 리포트 20p+ 출시 예정' },
      { label: '크기',     value: 'A4 (210×297mm), 고화질' },
      { label: '언어',     value: '한국어' },
      { label: '배송',     value: '결제 후 이메일로 PDF 자동 발송 (평균 5분)' },
      { label: '가격',     value: '49,000원' },
    ],
    downloadUrl: '/premium-planner',
    previewTheme: 'gold',
    coverStyle: 'premium',
    category: 'premium',
    inStock: true,
    includedPages: [
      { icon: '🌙', label: '커버 (프리미엄 스타일)', count: '1p', highlight: true },
      { icon: '📅', label: '연간 인덱스 (운세 강약)', count: '1p' },
      { icon: '🗓️', label: '월간 (월별 운세)',      count: '12p' },
      { icon: '📋', label: '주간',                 count: '52p' },
      { icon: '✏️', label: '일간 스케줄 (DAY QI 박스)', count: '365p', highlight: true, note: '매일 일진·오행·기운' },
      { icon: '📦', label: '부록 페이지 선택',       count: '옵션', note: '원하는 부록 자유 선택' },
      { icon: '📖', label: '사주 심층 리포트',        count: '20p+', highlight: true, note: '⏳ 출시 예정 — 현재 개발 중' },
      { icon: '🌊', label: '월별 세운 분석',          count: '12개', highlight: true, note: '⏳ 출시 예정' },
      { icon: '🎯', label: '10년 대운 차트',          count: '1p',   highlight: true, note: '⏳ 출시 예정' },
    ],
    previewPages: [
      { type: 'cover',      label: '프리미엄 커버', icon: '✨', idx: 0 },
      { type: 'year-index', label: '연간',       icon: '📅', idx: 0 },
      { type: 'monthly',    label: '월간',       icon: '🗓️', idx: 4 },
      { type: 'weekly',     label: '주간',       icon: '📋', idx: 20 },
      { type: 'daily',      label: '일간',       icon: '✏️', idx: 134 },
    ],
    differentiators: [
      '사주 기본 플래너의 모든 기능 포함 + 365일 일간',
      '부록 페이지 자유 선택',
      '사주 심층 리포트·대운 차트 (출시 예정 — 무료 업데이트)',
      '얼리버드 가격 — 리포트 기능 출시 후 가격 상향',
    ],
    notIncluded: ['OKR·MIT·습관 트래커'],
    compareRow: {
      core4: '포함', dailyCount: '365p', sajuCustom: true, sajuReport: true, practiceKit: false,
      extrasCount: 0, repeat: false, delivery: '이메일',
    },
    seo: {
      title: `사주 플래너 프리미엄 - 플래너+개인 사주 리포트 패키지`,
      description: `사주 맞춤 플래너 + 20페이지 개인 사주 심층 리포트. ${PLANNER_YEAR} 월별 운세, 대운 분석 포함.`,
      keywords: ['사주 리포트', '개인 사주 분석', '사주풀이', '사주 플래너 세트', '운세 리포트', `${PLANNER_YEAR} 운세`, '사주 PDF'],
    },
  },

  {
    id: 'practice-planner',
    slug: 'practice-planner',
    name: '실천 플래너',
    subtitle: 'OKR·MIT·습관 트래커가 기본 탑재된 목표달성 플래너',
    price: 0,
    originalPrice: null,
    badge: 'NEW',
    badgeColor: 'blue',
    images: [
      '/products/cover-practice.png',
      '/products/planner-year.png',
      '/products/planner-monthly.png',
      '/products/planner-weekly.png',
      '/products/planner-daily.png',
    ],
    thumbnailImage: '/products/cover-practice.png',
    shortDescription: '운세 없이 순수 목표 관리에 집중 — OKR·MIT·습관 트래커 내장.',
    description: `공통 플래너와 달리 **운세·사주를 완전히 배제**하고, 목표 설정과 실천 사이클에 집중한 구성입니다.

연간 3대 목표 → 분기 계획 → 월 OKR → 주간 포커스 → **일일 MIT 3가지**까지 목표가 계층화되어 있고, 운동·독서·명상 등 **5가지 핵심 습관 트래커**가 월간 사이드바에 기본 탑재됩니다. 월말에는 잘한 점·개선점 회고 블록이 자동으로 나타납니다.`,
    features: [
      { icon: '🎯', title: '연간 3대 목표 → 일일 MIT', description: '연→분기→월→주→일 계층화로 큰 그림부터 실천까지' },
      { icon: '✅', title: '일일 MIT 3가지',           description: '매일 최우선 3가지 과제로 집중력·실행력 유지' },
      { icon: '🔁', title: '5가지 습관 트래커',        description: '운동·독서·명상 등 월간 사이드바에 기본 탑재' },
      { icon: '📝', title: '월간 OKR + 회고',          description: '목표·핵심결과 + 잘한 점·개선점 월말 반성' },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF (고화질 PNG 포함)' },
      { label: '페이지 수', value: '약 67p (커버+연간+월간12+주간52+일간)' },
      { label: '크기',     value: 'A4 (210×297mm), 고화질' },
      { label: '언어',     value: '한국어' },
      { label: '배송',     value: '브라우저 즉시 다운로드 (이메일 불필요)' },
      { label: '가격',     value: '무료' },
    ],
    downloadUrl: '/free-planner/practice',
    previewTheme: 'forest',
    coverStyle: 'practice',
    category: 'free',
    inStock: true,
    includedPages: [
      { icon: '🎯', label: '커버 (실천 스타일)',     count: '1p', highlight: true },
      { icon: '📅', label: '연간 3대 목표',          count: '1p', highlight: true },
      { icon: '🗓️', label: '월간 OKR + 습관 트래커', count: '12p', highlight: true, note: '사이드바 내장' },
      { icon: '📋', label: '주간 (MIT 3가지)',       count: '52p', highlight: true },
      { icon: '✏️', label: '일간 MIT 샘플',           count: '1p', note: '365일 풀 버전 없음' },
    ],
    previewPages: [
      { type: 'cover',      label: '실천 커버', icon: '🎯', idx: 0 },
      { type: 'year-index', label: '연간',    icon: '📅', idx: 0 },
      { type: 'monthly',    label: '월간 OKR', icon: '🗓️', idx: 0 },
      { type: 'weekly',     label: '주간 MIT', icon: '📋', idx: 1 },
      { type: 'daily',      label: '일간 MIT', icon: '✏️', idx: 0 },
    ],
    differentiators: [
      '운세·사주 완전 배제 — 순수 실천 중심',
      'OKR·MIT·습관 트래커 기본 탑재',
      '월간 사이드바에 5가지 핵심 습관 자동',
      '월말 회고 블록 자동 포함',
    ],
    notIncluded: ['365일 일간 스케줄', '사주 맞춤 분석', '사주 리포트', '부록 페이지'],
    compareRow: {
      core4: '포함', dailyCount: '샘플 1p', sajuCustom: false, sajuReport: false, practiceKit: true,
      extrasCount: 0, repeat: false, delivery: '즉시',
    },
    seo: {
      title: '실천 플래너 무료 - 목표달성·습관형성 PDF 플래너 다운로드',
      description: '사주 없이 누구나 쓰는 목표달성 플래너. 연간 목표 + 분기 계획 + 월 OKR + 일일 MIT + 습관 체크. 무료 다운로드.',
      keywords: ['목표달성 플래너', '습관 트래커', 'OKR 플래너', 'MIT 플래너', '실천 다이어리', '무료 PDF 플래너'],
    },
  },

  {
    id: 'extras-free',
    slug: 'extras-free',
    name: '부록 플래너 맛보기',
    subtitle: '28종 부록 중 7종 선택 — 나만의 조합',
    price: 0,
    originalPrice: null,
    badge: '무료',
    badgeColor: 'green',
    images: ['/products/planner-cover.png'],
    thumbnailImage: '/products/planner-cover.png',
    shortDescription: '감사 저널·습관 트래커·할일 등 28종 부록 중 7종 무료 선택.',
    description: `메인 5종(커버·연간·월간·주간·일간) 대신 **부록 페이지 28종 중 7종만 골라** PDF로 만듭니다.

연간·월간·주간·일간·재무·라이프·노트 7개 카테고리 중 필요한 페이지만 선택할 수 있습니다. 더 많은 페이지 또는 12개월/52주 반복 기능이 필요하면 라이프 플래너 올인원(9,900원)으로 업그레이드하세요.`,
    features: [
      { icon: '📋', title: '28종 부록 페이지', description: '연간·월간·주간·일간·재무·라이프·노트 7개 카테고리' },
      { icon: '🎯', title: '7종 무료 선택',   description: '원하는 페이지만 골라서 나만의 조합 생성' },
      { icon: '🖨️', title: 'A4 고화질',      description: '인쇄·태블릿 모두 최적화' },
      { icon: '⬆️', title: '업그레이드 가능', description: '9,900원으로 28종 전체 + 반복 페이지 이용' },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF' },
      { label: '선택 가능', value: '28종 중 7종' },
      { label: '크기',     value: 'A4 (210×297mm), 고화질' },
      { label: '배송',     value: '브라우저 즉시 다운로드' },
      { label: '가격',     value: '무료' },
    ],
    downloadUrl: '/free-planner/extras',
    previewTheme: 'navy',
    coverStyle: 'extras',
    category: 'free',
    inStock: true,
    includedPages: [
      { icon: '📋', label: '커버 (부록 스타일)',   count: '1p' },
      { icon: '🎯', label: '부록 페이지 선택',      count: '7종', highlight: true, note: '28종 중' },
    ],
    previewPages: [
      { type: 'cover',          label: '부록 커버',  icon: '📋', idx: 0 },
      { type: 'habit-tracker',  label: '습관 트래커', icon: '✅', idx: 0 },
      { type: 'gratitude',      label: '감사 일기',   icon: '🙏', idx: 0 },
      { type: 'todo',           label: '할일 목록',   icon: '☑️', idx: 0 },
      { type: 'yearly-goals',   label: '연간 목표',   icon: '🎯', idx: 0 },
    ],
    differentiators: [
      '기본 5종 없음 — 부록만 담는 가벼운 버전',
      '7종 무료 선택 (28종 중)',
      '7개 카테고리에서 자유 조합',
    ],
    notIncluded: ['메인 5종 템플릿', '365일 일간 스케줄', '12개월 반복', '사주 맞춤'],
    compareRow: {
      core4: '미포함', dailyCount: '미포함', sajuCustom: false, sajuReport: false, practiceKit: false,
      extrasCount: 7, repeat: false, delivery: '즉시',
    },
    seo: {
      title: '무료 부록 플래너 - 감사저널, 습관트래커, 할일목록 PDF 다운로드',
      description: '28종 플래너 부록 페이지 중 7종 무료 선택. 감사 저널, 습관 트래커, 연간 목표, 할일 목록 등. 즉시 PDF 다운로드.',
      keywords: ['무료 플래너', '감사 저널', '습관 트래커', '할일 목록', 'PDF 부록', '플래너 템플릿'],
    },
  },

  {
    id: 'extras-full',
    slug: 'extras-full',
    name: '라이프 플래너 올인원',
    subtitle: '메인 5종 + 28종 부록 전체 + 12개월/52주 반복',
    price: 9900,
    originalPrice: null,
    badge: '인기',
    badgeColor: 'red',
    images: ['/products/planner-cover.png'],
    thumbnailImage: '/products/planner-cover.png',
    shortDescription: '메인 5종 + 부록 28종 전체 + 월간/주간 반복 — 인생 전 영역 관리.',
    description: `메인 플래너 + **28종 부록 페이지 전부** + 월간 목표·하루 한 줄·습관 트래커 등의 **12개월/52주 반복 페이지**까지 포함된 완전판입니다.

연간 목표부터 일간 저널, 재무·식단·여행·비전 보드까지 — 하나의 PDF에 인생의 모든 영역이 담깁니다. 부록 맛보기(extras-free)에서 단일 PDF 제공하는 7종과 달리, 이 상품은 **반복 페이지 자동 생성**으로 한 달 동안 실제 쓸 수 있는 분량을 제공합니다.`,
    features: [
      { icon: '📦', title: '28종 부록 전체',   description: '연간·월간·주간·일간·재무·라이프·노트 모든 카테고리' },
      { icon: '🔄', title: '12개월/52주 반복', description: '월간 목표·하루 한 줄·습관 트래커 반복 자동 생성' },
      { icon: '🎨', title: '7가지 테마',       description: '로즈·네이비·블랙·블루·포레스트·오렌지·골드' },
      { icon: '📐', title: '가로/세로 선택',    description: '인쇄용 세로, 태블릿용 가로 모두 지원' },
    ],
    specs: [
      { label: '파일 형식', value: 'PDF' },
      { label: '페이지 수', value: '메인 5종 + 부록 28종 + 반복 (약 100~150p)' },
      { label: '크기',     value: 'A4 (210×297mm), 고화질' },
      { label: '배송',     value: '이메일 발송 (결제 후 자동)' },
      { label: '가격',     value: '9,900원' },
    ],
    downloadUrl: null,
    previewTheme: 'gold',
    coverStyle: 'allinone',
    category: 'basic',
    inStock: true,
    includedPages: [
      { icon: '🌙', label: '커버',                    count: '1p' },
      { icon: '📅', label: '연간 인덱스',              count: '1p' },
      { icon: '🗓️', label: '월간',                   count: '12p' },
      { icon: '📋', label: '주간',                    count: '52p' },
      { icon: '✏️', label: '일간 스케줄',              count: '365p', highlight: true, note: '매일 개별 페이지' },
      { icon: '📦', label: '부록 28종 전체',          count: '28종', highlight: true },
      { icon: '🔄', label: '월간 목표 반복',           count: '12p', highlight: true, note: '자동 생성' },
      { icon: '✍️', label: '하루 한 줄 반복',          count: '12p', highlight: true },
      { icon: '✅', label: '습관 트래커 반복',          count: '52p', highlight: true },
    ],
    previewPages: [
      { type: 'cover',         label: '올인원 커버', icon: '✨', idx: 0 },
      { type: 'monthly',       label: '월간',       icon: '🗓️', idx: 4 },
      { type: 'daily',         label: '일간',       icon: '✏️', idx: 0 },
      { type: 'habit-tracker', label: '습관 트래커', icon: '✅', idx: 0 },
      { type: 'vision-board',  label: '비전 보드',   icon: '🌟', idx: 0 },
    ],
    differentiators: [
      '메인 5종 + 28종 부록 완전판',
      '일간 스케줄 365일 자동 생성',
      '12개월/52주 반복 페이지 자동',
      '사주 없이 라이프 관리 전 영역 커버',
    ],
    notIncluded: ['사주 맞춤 분석', '사주 리포트'],
    compareRow: {
      core4: '포함', dailyCount: '365p', sajuCustom: false, sajuReport: false, practiceKit: true,
      extrasCount: 28, repeat: true, delivery: '이메일',
    },
    seo: {
      title: '라이프 플래너 올인원 - 28종 부록 페이지 전체 세트 | 9,900원',
      description: '28종 플래너 부록 전체 세트. 감사 저널, 습관 트래커, 재무 관리, 식단 계획, 비전 보드 등. 12개월 반복 포함. 9,900원.',
      keywords: ['라이프 플래너', '올인원 플래너', '부록 세트', '감사 저널', '습관 트래커', '재무 플래너', '비전 보드'],
    },
  },
];

export const getProductBySlug = (slug: string): Product | undefined =>
  PRODUCTS.find((p) => p.slug === slug);


export const formatPrice = (price: number): string =>
  price === 0 ? '무료' : `₩${price.toLocaleString('ko-KR')}`;
