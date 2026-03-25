// 산수화(山水畵) SVG 배경 — 먹 선 드로잉 스타일
export default function SansuBackground({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 420"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 원산 (遠山) — 가장 먼 배경 봉우리 */}
      <path
        d="M20 320 Q80 180 140 240 Q180 190 230 260 Q260 200 310 270 Q360 180 420 250 Q460 200 510 280 L510 420 L20 420 Z"
        fill="#9c9490"
        opacity="0.06"
      />

      {/* 중산 (中山) — 중간 봉우리 3개 */}
      <path
        d="M60 360 Q120 220 170 300 Q200 240 250 310"
        fill="none"
        stroke="#6b6560"
        strokeWidth="1"
        opacity="0.15"
      />
      <path
        d="M250 310 Q300 230 340 290 Q380 210 430 300 Q460 250 510 320"
        fill="none"
        stroke="#6b6560"
        strokeWidth="1"
        opacity="0.12"
      />

      {/* 주산 (主山) — 메인 봉우리 (중앙, 가장 선명) */}
      <path
        d="M180 380 Q230 160 280 80 Q300 50 320 80 Q370 160 420 380"
        fill="none"
        stroke="#444"
        strokeWidth="1.5"
        opacity="0.18"
      />
      {/* 주산 내부 능선 */}
      <path
        d="M260 380 Q275 200 300 80"
        fill="none"
        stroke="#444"
        strokeWidth="0.7"
        strokeDasharray="3 5"
        opacity="0.10"
      />

      {/* 좌측 소산 (小山) */}
      <path
        d="M20 380 Q60 260 100 320 Q120 280 150 340"
        fill="none"
        stroke="#555"
        strokeWidth="1"
        opacity="0.13"
      />

      {/* 우측 소산 */}
      <path
        d="M390 380 Q430 270 460 320 Q480 285 510 350"
        fill="none"
        stroke="#555"
        strokeWidth="1"
        opacity="0.11"
      />

      {/* 안개 층 1 (雲霧) */}
      <ellipse cx="260" cy="330" rx="260" ry="22" fill="#b8b0a4" opacity="0.08" />
      {/* 안개 층 2 */}
      <ellipse cx="200" cy="355" rx="200" ry="16" fill="#b8b0a4" opacity="0.07" />
      {/* 안개 층 3 */}
      <ellipse cx="340" cy="348" rx="180" ry="14" fill="#b8b0a4" opacity="0.06" />

      {/* 산 정상 점 (봉우리 강조) */}
      <circle cx="300" cy="82" r="2" fill="#333" opacity="0.20" />

      {/* 먹 점 텍스처 (松林 표현) */}
      {[
        [215, 310], [235, 295], [255, 305], [275, 290],
        [320, 300], [340, 312], [360, 295],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#555" opacity="0.09" />
      ))}

      {/* 수면 반영선 (水面) — 하단 */}
      <line x1="80" y1="395" x2="200" y2="395" stroke="#888" strokeWidth="0.7" opacity="0.12" />
      <line x1="300" y1="390" x2="460" y2="390" stroke="#888" strokeWidth="0.7" opacity="0.10" />
      <line x1="140" y1="400" x2="260" y2="400" stroke="#888" strokeWidth="0.5" opacity="0.08" />
    </svg>
  );
}
