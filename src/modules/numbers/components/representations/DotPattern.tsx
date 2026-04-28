import { colors } from '@/app/theme'

type Props = {
  count: number
  pattern?: 'dice' | 'scattered'
  size?: number
  dotColor?: string
  seed?: number
}

const DICE_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scatteredPositions(count: number, seed: number): Array<[number, number]> {
  const rng = mulberry32(seed)
  const positions: Array<[number, number]> = []
  let attempts = 0
  while (positions.length < count && attempts < 200) {
    attempts++
    const x = 0.15 + rng() * 0.7
    const y = 0.15 + rng() * 0.7
    const tooClose = positions.some(([px, py]) => Math.hypot(px - x, py - y) < 0.22)
    if (!tooClose) positions.push([x, y])
  }
  return positions
}

export function DotPattern({
  count,
  pattern = 'dice',
  size = 160,
  dotColor = '#dc2626',
  seed = 1,
}: Props) {
  const safeCount = Math.max(1, Math.min(6, Math.floor(count)))
  const positions =
    pattern === 'dice'
      ? DICE_POSITIONS[safeCount] ?? []
      : scatteredPositions(safeCount, seed)
  const dotSize = Math.max(20, Math.floor(size * 0.16))

  return (
    <div
      data-testid="dotpattern-root"
      style={{
        position: 'relative',
        width: size,
        height: size,
        background: '#fff',
        border: `3px solid ${colors.text}33`,
        borderRadius: 12,
      }}
    >
      {positions.map(([x, y], idx) => (
        <div
          key={idx}
          data-testid="dotpattern-dot"
          style={{
            position: 'absolute',
            left: `calc(${x * 100}% - ${dotSize / 2}px)`,
            top: `calc(${y * 100}% - ${dotSize / 2}px)`,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: dotColor,
          }}
        />
      ))}
    </div>
  )
}
