'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { GenerateResult } from '@/lib/stores/session';
import type { DaunPhase } from '@/lib/supabase';

// ─── 한글 폰트 등록 ──────────────────────────────────────────────────

Font.register({
  family: 'Pretendard',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf',
      fontWeight: 700,
    },
  ],
});

// ─── 스타일 ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    padding: 40,
    color: '#1a1a1a',
    backgroundColor: '#fafaf8',
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#888',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  metaItem: {
    fontSize: 9,
    color: '#666',
  },
  metaValue: {
    fontWeight: 700,
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#555',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#333',
  },
  growRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  growBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 22,
  },
  growContent: {
    flex: 1,
  },
  growName: {
    fontSize: 8,
    fontWeight: 700,
    color: '#555',
    marginBottom: 2,
  },
  sprout: {
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  sproutTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#065f46',
    marginBottom: 4,
  },
  sproutText: {
    fontSize: 10,
    color: '#047857',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaa',
  },
});

// ─── Props ────────────────────────────────────────────────────────────

interface Props {
  mode: string;
  fortunePercent: number;
  daunPhase: DaunPhase;
  gradeLabel: string;
  result: GenerateResult;
  firstSprout: string;
}

// ─── PDF Document ─────────────────────────────────────────────────────

export default function SessionResultPDF({
  mode,
  fortunePercent,
  daunPhase,
  gradeLabel,
  result,
  firstSprout,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.title}>명발굴 세션 리포트</Text>
          <Text style={s.subtitle}>FortuneTab — 막혔을 때, 내 안의 답을 꺼냅니다</Text>
        </View>

        {/* 메타 정보 */}
        <View style={s.metaRow}>
          <Text style={s.metaItem}>
            모드: <Text style={s.metaValue}>{mode === 'biz' ? '1인 사업가' : '일반'}</Text>
          </Text>
          <Text style={s.metaItem}>
            Fortune Score: <Text style={s.metaValue}>{fortunePercent}</Text>
          </Text>
          <Text style={s.metaItem}>
            대운: <Text style={s.metaValue}>{daunPhase}</Text>
          </Text>
          <Text style={s.metaItem}>
            등급: <Text style={s.metaValue}>{gradeLabel}</Text>
          </Text>
        </View>

        {/* 운명 흐름 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>운명 흐름</Text>
          {[
            { label: '과거 뿌리', text: result.story.pastRoot },
            { label: '현재 갈림길', text: result.story.presentCrossroad },
            { label: '미래 수확', text: result.story.futureHarvest },
          ].map((item) => (
            <View key={item.label} style={s.card}>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* 실행 브레이크 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>실행 브레이크 진단</Text>
          {[
            { label: '성장 목표', text: result.brake.growthGoal },
            { label: '브레이크 행동', text: result.brake.brakeAction },
            { label: '숨겨진 이유', text: result.brake.hiddenReason },
            { label: '핵심 믿음', text: result.brake.coreBelief },
          ].map((item) => (
            <View key={item.label} style={s.card}>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* GROW 4법 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>GROW 4법 행동</Text>
          {[
            { letter: 'G', name: 'Ground — 지금 심는 행동', text: result.actions.ground, bg: '#059669' },
            { letter: 'R', name: 'Root — 뿌리 내리는 행동', text: result.actions.root, bg: '#d97706' },
            { letter: 'O', name: 'Open — 가능성 여는 행동', text: result.actions.open, bg: '#2563eb' },
            { letter: 'W', name: 'Water — 물주는 습관', text: result.actions.water, bg: '#0891b2' },
          ].map((g) => (
            <View key={g.letter} style={s.growRow}>
              <Text style={[s.growBadge, { backgroundColor: g.bg }]}>{g.letter}</Text>
              <View style={s.growContent}>
                <Text style={s.growName}>{g.name}</Text>
                <Text style={s.cardText}>{g.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 첫 싹 선언 */}
        {firstSprout && (
          <View style={s.sprout}>
            <Text style={s.sproutTitle}>첫 싹 선언 (First Sprout)</Text>
            <Text style={s.sproutText}>{firstSprout}</Text>
          </View>
        )}

        {/* 푸터 */}
        <Text style={s.footer}>
          FortuneTab © {new Date().getFullYear()} — fortunetab.com
        </Text>
      </Page>
    </Document>
  );
}
