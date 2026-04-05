import { describe, it, expect } from 'vitest';
import {
  scoreToUnifiedGrade,
  fortuneScoreToGrade,
  fortuneGradeToUnified,
  gradeClasses,
} from '../grades';

describe('scoreToUnifiedGrade (0-100 monthly score)', () => {
  it('75+ → excellent', () => {
    expect(scoreToUnifiedGrade(75).grade).toBe('excellent');
    expect(scoreToUnifiedGrade(100).grade).toBe('excellent');
  });

  it('60-74 → good', () => {
    expect(scoreToUnifiedGrade(60).grade).toBe('good');
    expect(scoreToUnifiedGrade(74).grade).toBe('good');
  });

  it('45-59 → average', () => {
    expect(scoreToUnifiedGrade(45).grade).toBe('average');
    expect(scoreToUnifiedGrade(59).grade).toBe('average');
  });

  it('30-44 → caution', () => {
    expect(scoreToUnifiedGrade(30).grade).toBe('caution');
    expect(scoreToUnifiedGrade(44).grade).toBe('caution');
  });

  it('0-29 → rest', () => {
    expect(scoreToUnifiedGrade(0).grade).toBe('rest');
    expect(scoreToUnifiedGrade(29).grade).toBe('rest');
  });
});

describe('fortuneScoreToGrade (-1~1 fortune score)', () => {
  it('0.40+ → excellent with "발굴 최적" label', () => {
    const g = fortuneScoreToGrade(0.5);
    expect(g.grade).toBe('excellent');
    expect(g.label).toBe('발굴 최적');
  });

  it('0.10-0.39 → good', () => {
    expect(fortuneScoreToGrade(0.2).grade).toBe('good');
    expect(fortuneScoreToGrade(0.2).label).toBe('좋은 흐름');
  });

  it('-0.15~0.09 → average', () => {
    expect(fortuneScoreToGrade(0).grade).toBe('average');
    expect(fortuneScoreToGrade(0).label).toBe('중립');
  });

  it('below -0.15 → caution', () => {
    expect(fortuneScoreToGrade(-0.5).grade).toBe('caution');
    expect(fortuneScoreToGrade(-0.5).label).toBe('충전');
  });
});

describe('fortuneGradeToUnified', () => {
  it('maps all 4 fortune grades', () => {
    expect(fortuneGradeToUnified('optimal').grade).toBe('excellent');
    expect(fortuneGradeToUnified('good').grade).toBe('good');
    expect(fortuneGradeToUnified('neutral').grade).toBe('average');
    expect(fortuneGradeToUnified('rest').grade).toBe('caution');
  });
});

describe('gradeClasses', () => {
  it('returns combined CSS classes', () => {
    const style = scoreToUnifiedGrade(80);
    const cls = gradeClasses(style);
    expect(cls).toContain('bg-');
    expect(cls).toContain('text-');
    expect(cls).toContain('border-');
  });
});
