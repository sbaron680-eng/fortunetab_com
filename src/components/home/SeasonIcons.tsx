// 사계절 픽토그램 — 봄(梅花)·여름(蓮葉)·가을(明月)·겨울(雪花)
// 빨강 원 배경 + 흰 선 아이콘

const SEASONS = [
  {
    label: '봄',
    labelKo: '봄 · 春',
    icon: (
      // 매화 (5 petals)
      <g>
        {/* 중앙 수술 */}
        <circle cx="14" cy="14" r="2" fill="white" opacity="0.9" />
        {/* 꽃잎 5개 */}
        {[0, 72, 144, 216, 288].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const cx = 14 + 5.5 * Math.sin(rad);
          const cy = 14 - 5.5 * Math.cos(rad);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.8" ry="2" transform={`rotate(${deg} ${cx} ${cy})`} fill="white" opacity="0.85" />;
        })}
      </g>
    ),
  },
  {
    label: '여름',
    labelKo: '여름 · 夏',
    icon: (
      // 연잎 (lotus leaf — 원 + 방사 라인)
      <g>
        <circle cx="14" cy="14" r="7" fill="none" stroke="white" strokeWidth="1.2" opacity="0.85" />
        <circle cx="14" cy="14" r="3" fill="white" opacity="0.7" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={14 + 3.5 * Math.cos(rad)}
              y1={14 + 3.5 * Math.sin(rad)}
              x2={14 + 7 * Math.cos(rad)}
              y2={14 + 7 * Math.sin(rad)}
              stroke="white"
              strokeWidth="0.8"
              opacity="0.6"
            />
          );
        })}
        {/* 줄기 */}
        <line x1="14" y1="21" x2="14" y2="25" stroke="white" strokeWidth="1" opacity="0.6" />
      </g>
    ),
  },
  {
    label: '가을',
    labelKo: '가을 · 秋',
    icon: (
      // 보름달 (full moon — circle with subtle ring)
      <g>
        <circle cx="14" cy="14" r="8" fill="white" opacity="0.85" />
        <circle cx="14" cy="14" r="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
        {/* 달 표면 크레이터 느낌 */}
        <circle cx="11" cy="12" r="1.5" fill="none" stroke="white" strokeWidth="0.6" opacity="0.35" />
        <circle cx="16" cy="16" r="1" fill="none" stroke="white" strokeWidth="0.6" opacity="0.3" />
      </g>
    ),
  },
  {
    label: '겨울',
    labelKo: '겨울 · 冬',
    icon: (
      // 설화 (snowflake — 6-pointed)
      <g>
        {/* 중심 */}
        <circle cx="14" cy="14" r="1.5" fill="white" opacity="0.9" />
        {/* 6개 가지 */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x2 = 14 + 8 * Math.cos(rad);
          const y2 = 14 + 8 * Math.sin(rad);
          // 가지 끝 Y자 갈래
          const bRad1 = ((deg + 30) * Math.PI) / 180;
          const bRad2 = ((deg - 30) * Math.PI) / 180;
          const bx = 14 + 5 * Math.cos(rad);
          const by = 14 + 5 * Math.sin(rad);
          return (
            <g key={i}>
              <line x1="14" y1="14" x2={x2} y2={y2} stroke="white" strokeWidth="1" opacity="0.85" />
              <line x1={bx} y1={by} x2={bx + 2.5 * Math.cos(bRad1)} y2={by + 2.5 * Math.sin(bRad1)} stroke="white" strokeWidth="0.7" opacity="0.65" />
              <line x1={bx} y1={by} x2={bx + 2.5 * Math.cos(bRad2)} y2={by + 2.5 * Math.sin(bRad2)} stroke="white" strokeWidth="0.7" opacity="0.65" />
            </g>
          );
        })}
      </g>
    ),
  },
];

interface SeasonIconsProps {
  showLabel?: boolean;
  size?: number;
}

export default function SeasonIcons({ showLabel = true, size = 52 }: SeasonIconsProps) {
  return (
    <div className="flex items-center gap-5 sm:gap-7">
      {SEASONS.map(({ label, labelKo, icon }) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={label}
          >
            {/* 빨강 원 배경 */}
            <circle cx="14" cy="14" r="14" fill="#b5282a" />
            {icon}
          </svg>
          {showLabel && (
            <span className="text-[10px] text-ft-muted tracking-wide">{labelKo}</span>
          )}
        </div>
      ))}
    </div>
  );
}
