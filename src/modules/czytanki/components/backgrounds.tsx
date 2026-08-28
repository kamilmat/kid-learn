import type { CSSProperties } from 'react'
import type { BgKind } from '../data/types'

// Kolory teł — stałe, żeby uniknąć magic stringów rozsianych po SVG.
const SKY_TOP = '#bae6fd'
const SKY_BOTTOM = '#e0f2fe'
const SUN = '#fde047'
const CLOUD = '#ffffff'

const ROOM_TOP = '#fde68a'
const ROOM_BOTTOM = '#fef3c7'
const WINDOW_GLASS = '#bae6fd'
const WINDOW_FRAME = '#92400e'
const FLOOR = '#d6b48a'

const MEADOW_TOP = '#bfdbfe'
const MEADOW_BOTTOM = '#dcfce7'
const GRASS = '#86efac'
const FLOWER_CENTER = '#fde047'
const FLOWER_PETAL = '#f472b6'

const FOREST_TOP = '#bbf7d0'
const FOREST_BOTTOM = '#166534'
const FOREST_GRASS = '#4ade80'
const TREE_LEAVES = '#15803d'
const TREE_TRUNK = '#78350f'

const BEACH_SKY = '#7dd3fc'
const BEACH_SAND_TOP = '#fde68a'
const SEA = '#38bdf8'
const WAVE = '#ffffff'
const SAND = '#fcd34d'

const NIGHT_TOP = '#1e3a8a'
const NIGHT_BOTTOM = '#3b82f6'
const MOON = '#fef3c7'
const STAR = '#ffffff'

const SNOW_TOP = '#e0f2fe'
const SNOW_BOTTOM = '#f8fafc'
const SNOWFLAKE = '#ffffff'
const SNOW_GROUND = '#ffffff'

const KITCHEN_TOP = '#fecdd3'
const KITCHEN_BOTTOM = '#fff1f2'
const COUNTER = '#a16207'
const CABINET = '#fda4af'
const CABINET_BORDER = '#e11d48'

const svgStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

function SkyBg() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SKY_TOP} />
          <stop offset="100%" stopColor={SKY_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-sky)" />
      <circle className="cz-sun" cx="82" cy="12" r="7" fill={SUN} />
      <g className="cz-cloud">
        <ellipse cx="18" cy="14" rx="8" ry="4" fill={CLOUD} />
        <ellipse cx="24" cy="12" rx="6" ry="3.5" fill={CLOUD} />
        <ellipse cx="12" cy="12" rx="5" ry="3" fill={CLOUD} />
      </g>
      <g className="cz-cloud" style={{ animationDelay: '4s' }}>
        <ellipse cx="60" cy="24" rx="7" ry="3.5" fill={CLOUD} />
        <ellipse cx="66" cy="22" rx="5" ry="3" fill={CLOUD} />
        <ellipse cx="54" cy="22" rx="4.5" ry="2.8" fill={CLOUD} />
      </g>
    </svg>
  )
}

function RoomBg() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ROOM_TOP} />
          <stop offset="100%" stopColor={ROOM_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-room)" />
      <rect x="30" y="10" width="26" height="20" fill={WINDOW_GLASS} stroke={WINDOW_FRAME} strokeWidth="2" />
      <line x1="43" y1="10" x2="43" y2="30" stroke={WINDOW_FRAME} strokeWidth="1.5" />
      <line x1="30" y1="20" x2="56" y2="20" stroke={WINDOW_FRAME} strokeWidth="1.5" />
      <rect x="0" y="44" width="100" height="16" fill={FLOOR} />
    </svg>
  )
}

function MeadowBg() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MEADOW_TOP} />
          <stop offset="100%" stopColor={MEADOW_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-meadow)" />
      <circle className="cz-sun" cx="85" cy="10" r="6" fill={SUN} />
      <rect x="0" y="42" width="100" height="18" fill={GRASS} />
      {[[20, 48], [50, 52], [75, 46]].map(([fx, fy], i) => (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <ellipse cx="-3" cy="0" rx="2.4" ry="1.6" fill={FLOWER_PETAL} />
          <ellipse cx="3" cy="0" rx="2.4" ry="1.6" fill={FLOWER_PETAL} />
          <ellipse cx="0" cy="-3" rx="1.6" ry="2.4" fill={FLOWER_PETAL} />
          <ellipse cx="0" cy="3" rx="1.6" ry="2.4" fill={FLOWER_PETAL} />
          <circle cx="0" cy="0" r="1.6" fill={FLOWER_CENTER} />
        </g>
      ))}
    </svg>
  )
}

function ForestBg() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-forest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={FOREST_TOP} />
          <stop offset="100%" stopColor={FOREST_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-forest)" />
      <rect x="0" y="46" width="100" height="14" fill={FOREST_GRASS} />
      {[18, 50, 80].map((tx, i) => (
        <g key={i} transform={`translate(${tx} 0)`}>
          <rect x="-1.5" y="38" width="3" height="8" fill={TREE_TRUNK} />
          <polygon points="0,18 -9,40 9,40" fill={TREE_LEAVES} />
          <polygon points="0,26 -7,42 7,42" fill={TREE_LEAVES} />
        </g>
      ))}
    </svg>
  )
}

function BeachBg() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-beach" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BEACH_SKY} />
          <stop offset="100%" stopColor={BEACH_SAND_TOP} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-beach)" />
      <circle className="cz-sun" cx="80" cy="10" r="6" fill={SUN} />
      <rect x="0" y="32" width="100" height="14" fill={SEA} />
      <g className="cz-cloud">
        <path d="M0,36 Q5,33 10,36 T20,36 T30,36" fill="none" stroke={WAVE} strokeWidth="1.5" />
      </g>
      <g className="cz-cloud" style={{ animationDelay: '3s' }}>
        <path d="M60,40 Q65,37 70,40 T80,40 T90,40" fill="none" stroke={WAVE} strokeWidth="1.5" />
      </g>
      <rect x="0" y="46" width="100" height="14" fill={SAND} />
    </svg>
  )
}

function NightBg() {
  const stars = [
    [10, 8], [22, 18], [35, 6], [48, 22], [58, 10], [70, 16], [82, 6], [90, 24],
  ]
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NIGHT_TOP} />
          <stop offset="100%" stopColor={NIGHT_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-night)" />
      <circle cx="78" cy="14" r="8" fill={MOON} />
      {stars.map(([sx, sy], i) => (
        <circle
          key={i}
          className="cz-star"
          cx={sx}
          cy={sy}
          r="1.2"
          fill={STAR}
          style={{ animationDelay: `${(i % 5) * 0.4}s` }}
        />
      ))}
    </svg>
  )
}

function SnowBg() {
  const flakes = [
    [6, 10], [15, 22], [24, 6], [33, 16], [42, 26], [51, 8], [60, 20], [69, 12], [78, 24], [88, 8],
  ]
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SNOW_TOP} />
          <stop offset="100%" stopColor={SNOW_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-snow)" />
      {flakes.map(([fx, fy], i) => (
        <circle
          key={i}
          className="cz-star"
          cx={fx}
          cy={fy}
          r="1"
          fill={SNOWFLAKE}
          style={{ animationDelay: `${(i % 4) * 0.5}s` }}
        />
      ))}
      <rect x="0" y="44" width="100" height="16" fill={SNOW_GROUND} />
    </svg>
  )
}

function KitchenBg() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden="true">
      <defs>
        <linearGradient id="cz-bg-kitchen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={KITCHEN_TOP} />
          <stop offset="100%" stopColor={KITCHEN_BOTTOM} />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#cz-bg-kitchen)" />
      <rect x="8" y="10" width="20" height="16" fill={CABINET} stroke={CABINET_BORDER} strokeWidth="1.5" />
      <rect x="72" y="10" width="20" height="16" fill={CABINET} stroke={CABINET_BORDER} strokeWidth="1.5" />
      <rect x="0" y="42" width="100" height="18" fill={COUNTER} />
    </svg>
  )
}

export function SceneBackground({ kind }: { kind: BgKind }) {
  switch (kind) {
    case 'sky':
      return <SkyBg />
    case 'room':
      return <RoomBg />
    case 'meadow':
      return <MeadowBg />
    case 'forest':
      return <ForestBg />
    case 'beach':
      return <BeachBg />
    case 'night':
      return <NightBg />
    case 'snow':
      return <SnowBg />
    case 'kitchen':
      return <KitchenBg />
  }
}
