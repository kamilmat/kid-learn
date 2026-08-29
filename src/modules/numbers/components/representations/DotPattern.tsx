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

/**
 * Deterministyczna siatka — awaryjny układ, gdy losowanie z odrzuceniem nie
 * zmieści wszystkich kropek. Bez tego przy 9-10 kropkach renderowało się ich
 * mniej niż `count`, więc dziecko liczyło INNĄ liczbę niż poprawna.
 */
function gridPositions(count: number): Array<[number, number]> {
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const out: Array<[number, number]> = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    out.push([0.15 + ((col + 0.5) / cols) * 0.7, 0.15 + ((row + 0.5) / rows) * 0.7])
  }
  return out
}

function scatteredPositions(count: number, seed: number): Array<[number, number]> {
  const rng = mulberry32(seed)
  const positions: Array<[number, number]> = []
  // Odstęp musi maleć z liczbą kropek: przy 0.22 w polu 0.7x0.7 mieści się
  // najwyżej 8, więc 9-10 nigdy się nie układało.
  const minDist = count > 6 ? 0.17 : 0.22
  let attempts = 0
  while (positions.length < count && attempts < 2000) {
    attempts++
    const x = 0.15 + rng() * 0.7
    const y = 0.15 + rng() * 0.7
    const tooClose = positions.some(([px, py]) => Math.hypot(px - x, py - y) < minDist)
    if (!tooClose) positions.push([x, y])
  }
  return positions.length < count ? gridPositions(count) : positions
}

export function DotPattern({
  count,
  pattern = 'dice',
  size = 160,
  dotColor = '#dc2626',
  seed = 1,
}: Props) {
  // Do 10 — subitizing „ile kropek" obsługuje też liczenie 7-10. Układ kostki
  // istnieje wyłącznie do 6, więc powyżej (i przy brakującym układzie) spadamy
  // na rozsypane kropki zamiast rysować pustą ramkę.
  const safeCount = Math.max(1, Math.min(10, Math.floor(count)))
  const dicePositions = pattern === 'dice' ? DICE_POSITIONS[safeCount] : undefined
  const positions = dicePositions ?? scatteredPositions(safeCount, seed)
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
