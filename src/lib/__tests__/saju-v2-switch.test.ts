import { describe, it, expect } from 'vitest';
import { calculateSaju, calculateSajuFromBirthData } from '../saju';

/**
 * saju.ts v2 엔진 스위칭 검증 테스트 (2026-04-22).
 *
 * v1 공개 API를 유지하면서 내부 계산을 v2 Fortune Engine으로 위임했는지 검증.
 * 특히 v1에서 버그가 있던 영역을 집중 커버:
 *  1. 절기 12개 정확 반영 (v1은 입춘만 간이 처리)
 *  2. 야자시(23~01시) 경계 롤오버
 *  3. 60갑자 일주 순환
 *
 * 참조값:
 *  - 2026년 입춘: 2월 4일
 *  - 2026년 경칩: 3월 6일 (월지가 인→묘로 전환)
 *  - 2026년 연주: 병오(丙午) — 입춘 이후
 */

describe('calculateSaju — v2 엔진 위임 검증', () => {
  describe('절기 경계: 연주 (입춘)', () => {
    it('입춘 직전(2026-02-03)은 전년도 을사년', () => {
      const s = calculateSaju(2026, 2, 3);
      expect(s.year.stemKo).toBe('을');
      expect(s.year.branchKo).toBe('사');
    });

    it('입춘 당일 이후(2026-02-04)는 병오년', () => {
      const s = calculateSaju(2026, 2, 4);
      expect(s.year.stemKo).toBe('병');
      expect(s.year.branchKo).toBe('오');
    });
  });

  describe('절기 경계: 월주 (경칩) — v1 버그 회귀 테스트', () => {
    it('경칩 직전(2026-03-05)은 인월이어야 함 — v1은 묘월로 오산출했음', () => {
      const s = calculateSaju(2026, 3, 5);
      expect(s.month.branchKo).toBe('인');
    });

    it('경칩 당일 이후(2026-03-06)는 묘월', () => {
      const s = calculateSaju(2026, 3, 6);
      expect(s.month.branchKo).toBe('묘');
    });
  });

  describe('일주: Julian Day Number 기반 결정적 계산', () => {
    it('2000-01-01은 戊午(무오)일 — JD 2451545', () => {
      const s = calculateSaju(2000, 1, 1);
      expect(s.day.stemKo).toBe('무');
      expect(s.day.branchKo).toBe('오');
    });

    it('1900-01-01은 甲戌(갑술)일 — JD 2415021', () => {
      const s = calculateSaju(1900, 1, 1);
      expect(s.day.stemKo).toBe('갑');
      expect(s.day.branchKo).toBe('술');
    });

    it('연속 두 날짜는 일주가 순차 증가 (60갑자 순환)', () => {
      const a = calculateSaju(2026, 4, 22);
      const b = calculateSaju(2026, 4, 23);
      const aIdx = a.day.stemIdx * 12 + a.day.branchIdx; // 공동 인덱스 아님, 순차 체크용
      const bIdx = b.day.stemIdx * 12 + b.day.branchIdx;
      // 천간 +1, 지지 +1 (60갑자 순환)
      expect((b.day.stemIdx - a.day.stemIdx + 10) % 10).toBe(1);
      expect((b.day.branchIdx - a.day.branchIdx + 12) % 12).toBe(1);
      // 사용 안 되는 경고 억제
      void aIdx; void bIdx;
    });
  });

  describe('시간 처리 (문자열 → v2 hour 숫자 매핑)', () => {
    it("'모름' 입력 시 hasHour=false + hour는 빈 Pillar", () => {
      const s = calculateSaju(1979, 1, 6, '모름');
      expect(s.hasHour).toBe(false);
      expect(s.hour.stemIdx).toBe(-1);
    });

    it("'묘시' (05~07시) 입력 시 hasHour=true + branchIdx=3(묘)", () => {
      const s = calculateSaju(1979, 1, 6, '묘시');
      expect(s.hasHour).toBe(true);
      expect(s.hour.branchKo).toBe('묘');
      expect(s.hour.branchIdx).toBe(3);
    });

    it("'자시' (23~01시) 입력 시 branchIdx=0(자) — 야자시 포함 경계", () => {
      const s = calculateSaju(2026, 4, 22, '자시');
      expect(s.hasHour).toBe(true);
      expect(s.hour.branchKo).toBe('자');
      expect(s.hour.branchIdx).toBe(0);
    });
  });

  describe('오행 분포 + 일간', () => {
    it('시간 미상이어도 elemCount 6자 기반으로 정상 집계', () => {
      const s = calculateSaju(1979, 1, 6, '모름');
      const total = Object.values(s.elemCount).reduce((a, b) => a + b, 0);
      expect(total).toBe(6); // 3주 × 2(천간+지지)
      expect(s.dayElem).toBeTruthy();
    });

    it('시간 입력 시 elemCount 8자 기반', () => {
      const s = calculateSaju(1979, 1, 6, '묘시');
      const total = Object.values(s.elemCount).reduce((a, b) => a + b, 0);
      expect(total).toBe(8);
    });
  });

  describe('결정성: 같은 입력 = 같은 출력', () => {
    it('동일 입력 10회 반복 시 완전히 동일한 결과', () => {
      const runs = Array.from({ length: 10 }, () =>
        calculateSaju(1979, 1, 6, '묘시'),
      );
      const first = JSON.stringify(runs[0]);
      for (const r of runs) {
        expect(JSON.stringify(r)).toBe(first);
      }
    });
  });

  describe('calculateSajuFromBirthData 래퍼', () => {
    it("birthDate 'YYYY-MM-DD' + birthHour 문자열 → 정상 SajuResult", () => {
      const s = calculateSajuFromBirthData('1979-01-06', '묘시');
      expect(s.day.stemKo).toBeTruthy();
      expect(s.hasHour).toBe(true);
    });

    it('birthHour null → 시간 미상 처리', () => {
      const s = calculateSajuFromBirthData('1979-01-06', null);
      expect(s.hasHour).toBe(false);
    });
  });
});

/*
 * 예상 오류 3가지:
 * 1. 음수 월/일 (0월 32일 등) — 현재 입력 검증 없음. 호출부(UI)에서 막아야 함.
 * 2. 윤년 2월 29일 비윤년 호출 — Date 객체 내부 정규화에 의존
 * 3. 서기 0년 이전 (기원전) — Julian 산식 자체는 동작하나 SajuResult 해석 범위 벗어남
 */
