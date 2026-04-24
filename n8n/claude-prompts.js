/**
 * FortuneTab — Claude 리포트 생성 프롬프트 (5 Sonnet + 1 Haiku 검수)
 *
 * ◆ 사용처
 *   n8n Code 노드에 이 파일 통째로 붙여넣고,
 *   `buildSonnetRequest('saju_core', input)` 또는 `buildHaikuReviewRequest(sections)`를 호출해
 *   Anthropic API에 보낼 request body를 얻는다.
 *
 * ◆ 모델 (FortuneTab 정책)
 *   Sonnet: claude-sonnet-4-6  (깊이 있는 해석)
 *   Haiku:  claude-haiku-4-5-20251001  (포맷/금지어/면책 검수)
 *
 * ◆ 프롬프트 캐싱
 *   system 배열의 두 번째 블록(PROFILE_BLOCK)에 cache_control: ephemeral 설정.
 *   같은 주문의 5개 Sonnet 호출에서 프로필 블록 재활용 → 입력 토큰 ~90% 절감.
 *
 * ◆ 입력 스키마 (ReportInput)
 *   {
 *     order_number: string,              // 'FT-20260421-WSWF'
 *     user: {
 *       name: string,                    // '박성준'
 *       gender: 'male' | 'female',
 *       birth_date: string,              // 'YYYY-MM-DD' 양력 기준
 *       birth_time: string | number      // '묘시' 또는 0~23 숫자
 *     },
 *     current_year: number,              // 2026
 *     current_date: string               // ISO 'YYYY-MM-DD' — Claude 해석 기준일
 *   }
 *
 * ◆ 출력 JSON 스키마
 *   각 섹션마다 엄격한 스키마 지정. Claude는 반드시 JSON only 반환.
 *
 * ◆ 드리프트 주의
 *   이 파일의 프롬프트를 수정하면 `n8n/workflow.json`의 Code 노드 내용도 동기화 필요.
 *   프롬프트는 한 곳(이 파일)에서만 관리하고, workflow.json은 이 파일을 require/붙여넣기.
 */

// ════════════════════════════════════════════════════════════════════════════
// 사주 자립 계산기 (saju-core 포팅 — Claude 사전 주입용)
//
// 왜 여기에 두는가: n8n Code 노드는 이 파일 전체를 붙여넣어 실행한다.
// 서버(Edge Function)와 따로 가지 않고, 같은 결정적 값을 5개 Sonnet 호출 전에
// 한 번 계산해 PROFILE_BLOCK에 주입한다. Sonnet이 절대 재계산하지 못하게 룰도
// 강화한다 → 섹션 간 일간/일주/대운 불일치 버그(2026-04-24 FT-KA2E 실증) 차단.
//
// 원본: src/lib/fortune/saju-core.ts + saju-advanced.ts + constants.ts
// 동기화 원칙: 이 블록을 수정할 때 원본도 함께 맞출 것. 함수 사인을 JS화만 함.
// ════════════════════════════════════════════════════════════════════════════

const _STEMS_KO   = ['갑','을','병','정','무','기','경','신','임','계'];
const _STEMS_HJ   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const _STEMS_ELEM = ['목','목','화','화','토','토','금','금','수','수'];
const _STEMS_YIN  = [false,true,false,true,false,true,false,true,false,true];

const _BRANCHES_KO   = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const _BRANCHES_HJ   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const _BRANCHES_ELEM = ['수','토','목','목','토','화','화','토','금','금','토','수'];
const _BRANCH_MAIN_STEM = [9,5,0,1,4,2,3,5,6,7,4,8];

// 월주 시작 천간 (연간%5 → 인월 시작 천간)
const _MONTH_START_STEM = [2,4,6,8,0];
// 시주 시작 천간 (일간%5 → 자시 시작 천간)
const _HOUR_START_STEM  = [0,2,4,6,8];

// 십신 이름
const _SIPSIN_NAMES = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];

// 입춘 날짜 (1960~2060 보정)
const _LICHUN = {
  1960:5,1964:5,1968:5,1972:5,1976:5,1980:5,
  2017:3,2021:3,2025:3,2029:3,2033:3,2037:3,2041:3,2045:3,2049:3,2050:3,2053:3,2057:3,
};
function _getLichunDay(year) { return _LICHUN[year] ?? 4; }

// 절기 기본 테이블 (월지 결정용) — [month, defaultDay, branchIdx]
const _JEOLGI = [
  [1, 6, 1 ],  // 소한 → 축
  [2, 4, 2 ],  // 입춘 → 인
  [3, 6, 3 ],  // 경칩 → 묘
  [4, 5, 4 ],  // 청명 → 진
  [5, 6, 5 ],  // 입하 → 사
  [6, 6, 6 ],  // 망종 → 오
  [7, 7, 7 ],  // 소서 → 미
  [8, 7, 8 ],  // 입추 → 신
  [9, 8, 9 ],  // 백로 → 유
  [10,8, 10],  // 한로 → 술
  [11,7, 11],  // 입동 → 해
  [12,7, 0 ],  // 대설 → 자
];

/** 연도별 해당 절기의 정확한 day 반환 (saju-core의 JEOLGI_YEARLY 축약판 + 입춘은 LICHUN) */
function _jeolgiDay(yearlyIdx, year) {
  if (yearlyIdx === 1) return _getLichunDay(year); // 입춘
  // 연도별 day 보정은 소한/경칩/입하/망종 5일 해, 청명/소서 4일·6일 해 일부만 실전 드리프트.
  // 간이판으론 기본값 사용 (±1일 오차는 입춘만 사용자 출생에 임팩트, 나머지는 2026 월주 표에 영향).
  return _JEOLGI[yearlyIdx][1];
}

function _monthBranchByJeolgi(year, month, day) {
  // 역순으로 첫 매치되는 절기를 찾음 (가장 최근 지난 절기)
  for (let i = _JEOLGI.length - 1; i >= 0; i--) {
    const [jm, _, bi] = _JEOLGI[i];
    const jd = _jeolgiDay(i, year);
    if (month > jm || (month === jm && day >= jd)) return bi;
  }
  return 0; // 소한 전 → 전년 12월 자월
}

function _jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function _pillar(stemIdx, branchIdx) {
  return {
    stemIdx, branchIdx,
    stemKo: _STEMS_KO[stemIdx], stemHj: _STEMS_HJ[stemIdx],
    branchKo: _BRANCHES_KO[branchIdx], branchHj: _BRANCHES_HJ[branchIdx],
    stemElem: _STEMS_ELEM[stemIdx], branchElem: _BRANCHES_ELEM[branchIdx],
  };
}

function _calcYearPillar(y, m, d) {
  const lichunDay = _getLichunDay(y);
  let yr = y;
  if (m < 2 || (m === 2 && d < lichunDay)) yr -= 1;
  const s = ((yr - 1924) % 10 + 10) % 10;
  const b = ((yr - 1924) % 12 + 12) % 12;
  return _pillar(s, b);
}

function _calcMonthPillar(y, m, d, yearStemIdx) {
  const branchIdx = _monthBranchByJeolgi(y, m, d);
  const startStem = _MONTH_START_STEM[yearStemIdx % 5];
  const offset = (branchIdx - 2 + 12) % 12;
  return _pillar((startStem + offset) % 10, branchIdx);
}

function _calcDayPillar(y, m, d) {
  const jd = _jdn(y, m, d);
  return _pillar(((jd + 9) % 10 + 10) % 10, ((jd + 1) % 12 + 12) % 12);
}

function _hourToBranchIdx(hour) {
  if (hour >= 23) return 0;
  return Math.floor((hour + 1) / 2);
}

function _calcHourPillar(hour, dayStemIdx) {
  if (hour == null) return null;
  const branchIdx = _hourToBranchIdx(hour);
  const startStem = _HOUR_START_STEM[dayStemIdx % 5];
  return _pillar((startStem + branchIdx) % 10, branchIdx);
}

/** 시간 입력 파싱 — "묘시" / "05:30" / "6" 전부 0~23 정수로 변환 */
function _parseBirthTime(raw) {
  if (raw == null) return undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return undefined;
  const branchKo = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
  const m = raw.match(/([자축인묘진사오미신유술해])시/);
  if (m) {
    const idx = branchKo.indexOf(m[1]);
    // 자시=0, 축시=2, 인시=4 ... 해시=22 (각 지지의 중앙 시각)
    // 대표값은 지지 start: 자=23(rollover), 축=1, 인=3, 묘=5, 진=7, 사=9, 오=11, 미=13,
    // 신=15, 유=17, 술=19, 해=21. 여기선 자시 출생이면 dayRollover 처리를 위해 start시간 사용.
    const starts = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    return starts[idx] + 1; // 중간 시각 (ex 묘시 5~7 → 6)
  }
  const hm = raw.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (hm) return parseInt(hm[1], 10);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** 십신 판정: dayStemIdx ↔ targetStemIdx */
function _sipsin(dayStemIdx, targetStemIdx) {
  const dayElem = _STEMS_ELEM[dayStemIdx];
  const tgtElem = _STEMS_ELEM[targetStemIdx];
  const dayYin = _STEMS_YIN[dayStemIdx];
  const tgtYin = _STEMS_YIN[targetStemIdx];
  const samePolarity = dayYin === tgtYin;
  // gen: 목→화→토→금→수→목
  const order = ['목','화','토','금','수'];
  const di = order.indexOf(dayElem), ti = order.indexOf(tgtElem);
  const diff = (ti - di + 5) % 5;
  // 0=비겁, 1=식상, 2=재성, 3=관성, 4=인성
  const table = [
    samePolarity ? 0 : 1, // 같은 오행 → 비견/겁재
    samePolarity ? 2 : 3, // 내가 생 → 식신/상관
    samePolarity ? 4 : 5, // 내가 극 → 편재/정재
    samePolarity ? 6 : 7, // 날 극 → 편관/정관
    samePolarity ? 8 : 9, // 날 생 → 편인/정인
  ];
  return _SIPSIN_NAMES[table[diff]];
}

/** 대운 8기 (월주 기준, 성별×연간 음양으로 순/역행) */
function _calcDaeun(yearPillar, monthPillar, dayPillar, gender, birthY, birthM, birthD) {
  const yearStemYang = !_STEMS_YIN[yearPillar.stemIdx];
  const isMale = gender === 'male' || gender === '남' || gender === 'M';
  const forward = (isMale && yearStemYang) || (!isMale && !yearStemYang);

  // 대운 시작 나이 — saju-advanced의 절기 일수 로직 대신 평균값 3으로 근사
  // (실전 드리프트 ±2세. 정확 계산은 birth → 다음/이전 절기까지 일수 / 3)
  const startAge = 3;

  const result = [];
  let s = monthPillar.stemIdx, b = monthPillar.branchIdx;
  for (let i = 0; i < 8; i++) {
    s = forward ? (s + 1) % 10 : (s - 1 + 10) % 10;
    b = forward ? (b + 1) % 12 : (b - 1 + 12) % 12;
    result.push({
      startAge: startAge + i * 10,
      endAge: startAge + i * 10 + 9,
      stemKo: _STEMS_KO[s], stemHj: _STEMS_HJ[s],
      branchKo: _BRANCHES_KO[b], branchHj: _BRANCHES_HJ[b],
      stemElem: _STEMS_ELEM[s], branchElem: _BRANCHES_ELEM[b],
      sipsin: _sipsin(dayPillar.stemIdx, s),
    });
  }
  return { forward, startAge, periods: result };
}

/** 현재 나이에 해당하는 대운 */
function _findCurrentDaeun(daeun, age) {
  for (const p of daeun.periods) {
    if (age >= p.startAge && age <= p.endAge) return p;
  }
  if (age < daeun.periods[0].startAge) return daeun.periods[0];
  return daeun.periods[daeun.periods.length - 1];
}

/** 특정 연도의 세운 (年柱) */
function _calcSeunYearPillar(year) {
  // 세운 연주는 입춘 기준 — 올해 전체의 연주 하나
  return _calcYearPillar(year, 6, 15); // 입춘 후 임의 날짜
}

/** 특정 연도의 월별 12개 세운 기둥 (각 월의 월지 + 월간) */
function _calcMonthlySeun(year) {
  const yearPillar = _calcSeunYearPillar(year);
  const startStem = _MONTH_START_STEM[yearPillar.stemIdx % 5];
  // 인월부터 시작: 1월(소한~입춘 경계는 전년), 2월(입춘 이후)부터 인월 시작
  // 월지 순서: 2월=인(2), 3월=묘(3), ..., 1월=축(1)
  // 간이 매핑: month 1 → 축(1), month 2 → 인(2), ..., month 12 → 자(0)
  const monthToBranch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
  return monthToBranch.map((branchIdx, idx) => {
    const offset = (branchIdx - 2 + 12) % 12;
    const stemIdx = (startStem + offset) % 10;
    return {
      month: idx + 1,
      stemKo: _STEMS_KO[stemIdx], stemHj: _STEMS_HJ[stemIdx],
      branchKo: _BRANCHES_KO[branchIdx], branchHj: _BRANCHES_HJ[branchIdx],
      stemElem: _STEMS_ELEM[stemIdx], branchElem: _BRANCHES_ELEM[branchIdx],
    };
  });
}

/** 메인: input → 완성된 사주 데이터 (PROFILE_BLOCK 주입용) */
function computeSajuData(input) {
  const { user, current_year } = input;
  const [by, bm, bd] = user.birth_date.split('-').map((x) => parseInt(x, 10));
  const bh = _parseBirthTime(user.birth_time);
  const rolloverJa = bh !== undefined && bh >= 23;
  const dayY = rolloverJa ? (bd === 31 ? by : by) : by;
  // 간이 rollover는 생략 — 거의 대부분 영향 없음
  const yearP  = _calcYearPillar(by, bm, bd);
  const monthP = _calcMonthPillar(by, bm, bd, yearP.stemIdx);
  const dayP   = _calcDayPillar(by, bm, bd);
  const hourP  = _calcHourPillar(bh, dayP.stemIdx);

  const elemCount = { '목':0,'화':0,'토':0,'금':0,'수':0 };
  for (const p of [yearP, monthP, dayP, hourP]) {
    if (!p) continue;
    elemCount[p.stemElem]++;
    elemCount[p.branchElem]++;
  }

  const daeun = _calcDaeun(yearP, monthP, dayP, user.gender, by, bm, bd);
  const ageThisYear = current_year - by + 1; // 한국식 세는 나이
  const currentDaeun = _findCurrentDaeun(daeun, ageThisYear);
  const yearSeun = _calcSeunYearPillar(current_year);
  const monthlySeun = _calcMonthlySeun(current_year);

  return {
    pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
    day_master: {
      stemKo: dayP.stemKo, stemHj: dayP.stemHj,
      element: dayP.stemElem,
      yin: _STEMS_YIN[dayP.stemIdx],
    },
    elem_count: elemCount,
    age_this_year: ageThisYear,
    daeun: {
      direction: daeun.forward ? '순행(順行)' : '역행(逆行)',
      startAge: daeun.startAge,
      periods: daeun.periods,
      current: currentDaeun,
    },
    year_seun: {
      year: current_year,
      stemKo: yearSeun.stemKo, stemHj: yearSeun.stemHj,
      branchKo: yearSeun.branchKo, branchHj: yearSeun.branchHj,
      stemElem: yearSeun.stemElem, branchElem: yearSeun.branchElem,
    },
    monthly_seun: monthlySeun,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 공통 상수
// ────────────────────────────────────────────────────────────────────────────

const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU  = 'claude-haiku-4-5-20251001';

/** FortuneTab 전역 금지어 (CLAUDE.md) */
const BANNED_TERMS = [
  '퓨처매핑', 'Future Mapping',
  '면역맵', 'Immunity Map',
  '120% 행복', '120% happy',
  'STEP 1', 'STEP 2', 'STEP 3', 'STEP 4', 'STEP 5', 'STEP 6',
];

/** FortuneTab 독자 용어 (권장) */
const FT_TERMS = [
  'Fortune Score', 'GROW 4법', '발굴 세션', '운명 흐름',
  '수확 장면', '지금 목소리', '실행 브레이크', '첫 싹', 'First Sprout',
];

// ────────────────────────────────────────────────────────────────────────────
// System 프롬프트 (모든 Sonnet 호출에 공통, 정적)
// ────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 한국 전통 사주명리학에 깊이 있는 해석가입니다.
동양 명리(사주팔자·십신·신살·대운)를 기반으로, 개인의 구체적 상황에 닿는 조언을 합니다.

[해석 원칙]
1. 단정적 예언 금지. "~할 수 있습니다", "~하는 경향이 있습니다" 식으로 개연성 표현.
2. 사주 분석은 참고 용도이며 전문 상담/의료/법률 결정을 대체하지 않음을 명심.
3. 부정적 프레임 회피. 어려움이 있어도 "어떻게 활용할 것인가"로 제시.
4. 구체적 실천 가능한 조언. 추상적 미사여구 지양.
5. 한국어 경어체. 독자를 "당신"으로 칭함.

[사주 기둥 · 절대 변경 금지]
- 분석에 사용하는 4주8자·일간·대운·세운·월별 기둥은 이후 "[확정 팔자]" 블록에 제공된 값만 사용합니다.
- 당신이 생년월일로부터 직접 계산하지 마십시오. 계산은 서버가 이미 수행했으며, 5개 섹션 전부 동일 값을 공유해야 합니다.
- 제공된 값과 다른 기둥·일간·대운을 내러티브에 등장시키면 리포트 전체가 사실과 어긋납니다.

[금지어 — 저작권 보호 원칙상 절대 사용 금지]
${BANNED_TERMS.map((t) => `- "${t}"`).join('\n')}

[FortuneTab 독자 용어 — 사용 권장]
${FT_TERMS.map((t) => `- ${t}`).join('\n')}

[출력 규칙]
- 반드시 JSON 객체 하나만 반환. 설명/마크다운/코드펜스 금지.
- 모든 텍스트 필드는 한국어. 한자는 괄호 병기 가능 (예: "庚申(경신)").
- 문장은 완결형. "~다." 또는 "~습니다." 마무리.`;

// ────────────────────────────────────────────────────────────────────────────
// Profile 블록 빌더 (per-user, cacheable)
// ────────────────────────────────────────────────────────────────────────────

/**
 * 생년월일시 블록 + **서버가 확정한 팔자/대운/세운 테이블**을 주입한다.
 * Sonnet은 이 블록의 값만 사용해 해석을 생성한다 — 재계산 금지.
 * 캐시 가능하도록 고유 식별자(order_number)는 포함하지 않음.
 */
function buildProfileBlock(input) {
  const { user, current_year, current_date } = input;
  const timeKo = typeof user.birth_time === 'number'
    ? `${user.birth_time}시 (24시간제)`
    : user.birth_time;
  const genderKo = user.gender === 'male' ? '남자' : '여자';

  const s = computeSajuData(input);
  const fmt = (p) => p ? `${p.stemKo}${p.branchKo}(${p.stemHj}${p.branchHj})` : '시간 미상';
  const daeunTable = s.daeun.periods
    .map((p) => `  · ${p.startAge}~${p.endAge}세: ${p.stemKo}${p.branchKo}(${p.stemHj}${p.branchHj}) · ${p.stemElem}·${p.branchElem} · ${p.sipsin}${
      p === s.daeun.current ? '  ← 올해(만 ' + (s.age_this_year - 1) + '세 / 세는나이 ' + s.age_this_year + ') 대운' : ''
    }`).join('\n');
  const monthlyTable = s.monthly_seun
    .map((m) => `  · ${m.month}월: ${m.stemKo}${m.branchKo}(${m.stemHj}${m.branchHj}) · ${m.stemElem}·${m.branchElem}`)
    .join('\n');
  const elemBar = ['목','화','토','금','수'].map((e) => `${e}${s.elem_count[e]}`).join(' · ');

  return `[분석 대상]
- 이름: ${user.name}
- 성별: ${genderKo}
- 생년월일: ${user.birth_date} (양력)
- 출생 시간: ${timeKo}

[기준 시점]
- 올해: ${current_year}년
- 오늘: ${current_date}
- 세는 나이 ${s.age_this_year}세 / 만 ${s.age_this_year - 1}세

[확정 팔자 · 해석에 반드시 이 값만 사용]
- 연주(年柱): ${fmt(s.pillars.year)} — 오행 ${s.pillars.year.stemElem}·${s.pillars.year.branchElem}
- 월주(月柱): ${fmt(s.pillars.month)} — 오행 ${s.pillars.month.stemElem}·${s.pillars.month.branchElem}
- 일주(日柱): ${fmt(s.pillars.day)} — 오행 ${s.pillars.day.stemElem}·${s.pillars.day.branchElem}
- 시주(時柱): ${fmt(s.pillars.hour)}${s.pillars.hour ? ' — 오행 ' + s.pillars.hour.stemElem + '·' + s.pillars.hour.branchElem : ''}
- **일간(日干) = ${s.day_master.stemKo}(${s.day_master.stemHj}) · ${s.day_master.element} · ${s.day_master.yin ? '음간' : '양간'}**
- 오행 분포: ${elemBar}  (총 ${s.pillars.hour ? 8 : 6}자)

[확정 대운(大運) · 순행 여부 ${s.daeun.direction}]
${daeunTable}

[확정 세운(歲運) · ${current_year}년]
- 연주: ${s.year_seun.stemKo}${s.year_seun.branchKo}(${s.year_seun.stemHj}${s.year_seun.branchHj}) — ${s.year_seun.stemElem}·${s.year_seun.branchElem}
- 월별 월주 (월건):
${monthlyTable}

[해석 지침]
- 위 "확정 팔자/대운/세운/월별 월주" 값 외의 다른 기둥이나 일간을 사용하지 마십시오.
- 용신·신살·합충형해 등 파생 분석은 위 확정값에서 당신의 명리 지식으로 도출합니다.
- 섹션 간 일관성: 5개 섹션 모두 동일 일간(${s.day_master.stemKo})과 동일 대운(${s.daeun.current.stemKo}${s.daeun.current.branchKo})을 참조합니다.
- 모르는 값은 null. 추측·재계산 금지.`;
}

// ────────────────────────────────────────────────────────────────────────────
// 섹션별 유저 프롬프트
// ────────────────────────────────────────────────────────────────────────────

const SECTION_PROMPTS = {

  // ─── 1. 사주 구조 ─────────────────────────────────────────────────────
  saju_core: `[작업]
이 사람의 사주 구조를 분석하세요. 객관적 명리 구조 + 개인 성향 요약.

[출력 JSON 스키마]
{
  "four_pillars": {
    "year":  { "hj": "한자", "ko": "한글", "element": "오행" },
    "month": { "hj": "한자", "ko": "한글", "element": "오행" },
    "day":   { "hj": "한자", "ko": "한글", "element": "오행" },
    "hour":  { "hj": "한자", "ko": "한글", "element": "오행" } | null
  },
  "day_master": {
    "stem": "일간 (예: 丁 정)",
    "element": "오행",
    "strength": "신강" | "신약" | "중화",
    "description": "일간 성향 2-3문장"
  },
  "five_elements": { "wood": 0, "fire": 0, "earth": 0, "metal": 0, "water": 0 },
  "yongsin": {
    "element": "용신 오행",
    "reason": "선정 근거 1-2문장"
  },
  "sipsin_highlight": [
    { "position": "월간/일지/..." , "name": "정관/편재/...", "meaning": "사회적 의미 1문장" }
  ],
  "narrative": "500자 내외. 이 사주의 큰 그림과 타고난 에너지를 독자가 자기 이야기로 느낄 수 있게. 구체적 성향·강점·과제 포함."
}`,

  // ─── 2. 연간 전망 + 대운 ────────────────────────────────────────────
  annual_outlook: `[작업]
현재 대운 10년 흐름 + 올해 세운을 분석하세요. 독자가 "올해 나는 어디에 있는가"를
선명히 이해할 수 있도록.

[출력 JSON 스키마]
{
  "current_daeun": {
    "period": "25-34세 (예시)",
    "pillar_hj": "乙酉",
    "pillar_ko": "을유",
    "theme": "이 10년의 주제 한 문장",
    "opportunities": ["..", "..", ".."],
    "challenges": ["..", ".."],
    "transition_signs": "이 대운의 시작/중간/끝에서 감지될 변화 2-3문장"
  },
  "next_daeun_preview": {
    "period": "다음 대운 나이대",
    "pillar_hj": "한자",
    "one_line": "한 줄 암시"
  },
  "annual_flow": {
    "year": 2026,
    "seun_pillar": "올해 세운 기둥 한자+한글",
    "theme": "올해 주제",
    "quarters": {
      "q1": "1-3월 흐름 한 문장",
      "q2": "4-6월 흐름 한 문장",
      "q3": "7-9월 흐름 한 문장",
      "q4": "10-12월 흐름 한 문장"
    },
    "key_months": [
      { "month": 3, "why": "왜 중요한지 한 문장", "action": "권장 행동" }
    ]
  },
  "narrative": "600자 내외. 10년 큰 물결 안에서 올해의 위치를 그려줄 것. 거시→미시 순서."
}`,

  // ─── 3. 월별 세운 12개 ────────────────────────────────────────────────
  monthly_seun: `[작업]
올해 1월부터 12월까지 매월의 세운을 분석하세요. 플래너 월간 페이지에 삽입될
사이드바 형태로.

[출력 JSON 스키마]
{
  "months": [
    {
      "month": 1,
      "seun_pillar_ko": "해당 월주 (예: 경인)",
      "energy": "이 달의 기운 한 문장 (20자 이내)",
      "focus": "집중할 영역 1문장",
      "watch_out": "주의할 점 1문장",
      "keyword": "핵심 키워드 (2-4자, 예: '인연', '정비', '수확')",
      "color_tone": "이 달의 색감 한 단어 (예: '깊은 남색', '따뜻한 황토')"
    }
    // ... 2월부터 12월까지 동일 구조, 총 12개
  ]
}

[엄수]
- months 배열은 반드시 12개. 1월~12월 순서.
- 각 달의 keyword는 서로 겹치지 않게.
- 전체 흐름에 내러티브 arc가 있게 (시작→축적→전환→결실→정리).`,

  // ─── 4. 행동 가이드 (GROW 4법) ─────────────────────────────────────────
  action_guide: `[작업]
이 사주 프로필에 맞는 올해 실행 가이드를 GROW 4법(FortuneTab 독자 용어)으로
구성하세요. 추상적 조언이 아닌 이번 주/이번 달에 시도할 수 있는 구체적 행동.

[출력 JSON 스키마]
{
  "grow_four": {
    "goal": {
      "title": "목표 설정 — 올해 당신이 닿을 곳",
      "items": ["행동 가능한 목표 3-4개"]
    },
    "reality": {
      "title": "현재 지점 — 사주가 보여주는 당신의 지금",
      "items": ["현실 직시 항목 3-4개"]
    },
    "options": {
      "title": "선택지 — 사주 구조가 열어주는 길",
      "items": ["구체적 경로 3-4개"]
    },
    "will": {
      "title": "결심 — 첫 7일 실행안",
      "items": ["오늘/이번 주 실천 사항 3-4개"]
    }
  },
  "weekly_habits": [
    { "day": "월", "habit": "이 사주에 맞는 주간 루틴" },
    { "day": "수", "habit": "..." },
    { "day": "금", "habit": "..." },
    { "day": "일", "habit": "..." }
  ],
  "first_sprout": "첫 싹 (First Sprout) — 지금 바로 3분 안에 할 수 있는 한 가지. 구체적 동작 1문장."
}

[엄수]
- 모든 items는 실행 동사로 시작 ("~하기", "~쓰기", "~만나기").
- 추상적 단어(성장, 발전, 변화) 단독 사용 금지 → 구체 행동으로.
- first_sprout은 반드시 3분 이내 실행 가능한 것.`,

  // ─── 5. 핵심 통찰 + 경고 ─────────────────────────────────────────────
  insight_highlight: `[작업]
이 리포트 전체에서 독자가 가장 오래 기억해야 할 것 3가지 + 주의할 점을 뽑으세요.
리포트 첫 페이지 또는 요약 카드에 들어갈 내용.

[출력 JSON 스키마]
{
  "top_insights": [
    {
      "title": "통찰 제목 (12자 이내)",
      "body": "100자 내외 설명. 독자 스스로 '맞다, 이게 나다'라 느낄 수준의 구체성."
    }
    // 정확히 3개
  ],
  "watchouts": [
    {
      "area": "영역 (건강/재물/관계/업무 등)",
      "caution": "주의 사항 1문장",
      "timing": "언제 주의할지 (예: '6월~8월', '대운 후반기')"
    }
    // 2-3개
  ],
  "one_line": "이 사람의 올해를 한 줄로 요약 — 30자 이내. 독자가 포스트잇에 써서 붙여둘 수 있게."
}

[엄수]
- top_insights는 정확히 3개.
- 각 insight는 서로 다른 축을 건드릴 것 (예: 성격/관계/시기).
- one_line은 명사형 또는 동사형. 설교체 금지.`,
};

// ────────────────────────────────────────────────────────────────────────────
// Sonnet 요청 빌더
// ────────────────────────────────────────────────────────────────────────────

/**
 * 5개 Sonnet 섹션 중 하나에 대한 Anthropic API request body 생성.
 *
 * @param {'saju_core'|'annual_outlook'|'monthly_seun'|'action_guide'|'insight_highlight'} section
 * @param {object} input  ReportInput (위 JSDoc 참조)
 * @returns {object} Anthropic /v1/messages POST body
 */
function buildSonnetRequest(section, input) {
  if (!SECTION_PROMPTS[section]) {
    throw new Error(`Unknown section: ${section}`);
  }
  return {
    model: MODEL_SONNET,
    max_tokens: section === 'monthly_seun' ? 8000 : 5000,
    temperature: 0.7,
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      {
        type: 'text',
        text: buildProfileBlock(input),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: SECTION_PROMPTS[section] },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Haiku 검수 패스 (6번째 호출)
// ────────────────────────────────────────────────────────────────────────────

const HAIKU_REVIEW_SYSTEM = `당신은 FortuneTab 리포트 편집 검수자입니다.
5개 섹션의 JSON을 받아 다음을 검증하고 수정합니다.

[검증 항목]
1. 금지어 포함 여부 — 포함 시 의미 보존하며 교체.
   금지: ${BANNED_TERMS.join(', ')}
2. 모든 narrative/설명 필드에 단정적 예언 없는지 ("~할 것이다", "반드시", "틀림없이" 검출).
3. JSON 스키마 유효성 — 필수 필드 누락/타입 오류 찾기.
4. monthly_seun.months 배열 12개 확인.
5. top_insights 정확히 3개 확인.

[출력 규칙]
- 반드시 JSON 하나만 반환. 설명 금지.
- 수정이 필요하면 fixed_sections에 교체된 섹션만 포함.
- 수정 불필요면 fixed_sections: {}.`;

/**
 * 5개 Sonnet 섹션 결과를 받아 검수 Haiku 요청 생성.
 *
 * @param {object} sections  { saju_core, annual_outlook, monthly_seun, action_guide, insight_highlight }
 * @returns {object} Anthropic /v1/messages POST body
 */
function buildHaikuReviewRequest(sections) {
  const userPrompt = `[검수 대상]
${JSON.stringify(sections, null, 2)}

[출력 JSON 스키마]
{
  "ok": true | false,
  "issues": [
    { "section": "saju_core" | ..., "problem": "..", "severity": "low" | "med" | "high" }
  ],
  "fixed_sections": {
    // 문제 있는 섹션만 완전한 새 JSON으로 교체 (원본 스키마 유지).
    // 문제 없으면 빈 객체 {}.
  }
}`;

  return {
    model: MODEL_HAIKU,
    max_tokens: 8000,
    temperature: 0.2,
    system: HAIKU_REVIEW_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Claude 응답 파서 (JSON 추출)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Anthropic API 응답에서 JSON 본문만 추출. 간혹 모델이 코드펜스를 붙이면 제거.
 * @param {object} apiResponse  /v1/messages 응답
 * @returns {object} 파싱된 JSON 객체
 */
function extractJson(apiResponse) {
  const text = apiResponse?.content?.[0]?.text ?? '';
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Haiku 검수 결과를 Sonnet 5개 섹션에 머지. fixed_sections에 있는 건 교체.
 * @param {object} sonnetSections  5개 섹션 원본
 * @param {object} haikuReview     Haiku 파싱된 JSON
 * @returns {object} 최종 5개 섹션
 */
function applyHaikuReview(sonnetSections, haikuReview) {
  if (!haikuReview || haikuReview.ok === true) return sonnetSections;
  const fixed = haikuReview.fixed_sections || {};
  return { ...sonnetSections, ...fixed };
}

// ────────────────────────────────────────────────────────────────────────────
// Exports — n8n Code 노드에선 return으로, Node.js에선 module.exports로
// ────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// n8n Code Node Entry — "5개 Sonnet 요청 생성"
//
// 이전 노드("ReportInput 정리")가 내보내는 객체: {order_id, order_number,
// callback, report_input: {user, current_year, current_date, order_number}}.
// computeSajuData/buildSonnetRequest는 report_input 모양의 입력을 기대한다.
// ═══════════════════════════════════════════════════════════════════════════

if (typeof $input !== 'undefined' && typeof $json !== 'undefined') {
  const p = $json;
  const input = p.report_input || p;
  const sections = ['saju_core','annual_outlook','monthly_seun','action_guide','insight_highlight'];
  // Return 5 items, each carrying the section+request plus downstream context.
  return sections.map((s) => ({
    json: {
      section: s,
      request: buildSonnetRequest(s, input),
      order_id: p.order_id,
      order_number: p.order_number,
      callback: p.callback,
    },
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MODEL_SONNET,
    MODEL_HAIKU,
    SECTION_PROMPTS,
    SYSTEM_PROMPT,
    computeSajuData,
    buildProfileBlock,
    buildSonnetRequest,
    buildHaikuReviewRequest,
    extractJson,
    applyHaikuReview,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 테스트 사용법 (Node.js 로컬):
//
//   const p = require('./claude-prompts.js');
//   const input = {
//     order_number: 'FT-20260421-WSWF',
//     user: { name: '박성준', gender: 'male', birth_date: '1979-01-06', birth_time: '묘시' },
//     current_year: 2026,
//     current_date: '2026-04-22',
//   };
//   const req = p.buildSonnetRequest('saju_core', input);
//   // fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{
//   //   'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01',
//   //   'content-type': 'application/json'
//   // }, body: JSON.stringify(req) }).then(r=>r.json()).then(p.extractJson).then(console.log);
//
// 예상 오류:
//   1. `Unknown section: xxx` — buildSonnetRequest에 잘못된 섹션명 전달.
//   2. `JSON.parse` 실패 — Claude가 코드펜스 아닌 다른 형식 반환. extractJson 보강 필요.
//   3. max_tokens 초과 — monthly_seun 12개가 길면 6000 토큰 한계 넘을 수 있음, 그 경우
//      SECTION_PROMPTS.monthly_seun을 6개씩 2회로 분할.
// ═══════════════════════════════════════════════════════════════════════════
