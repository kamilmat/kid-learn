import { colors } from '@/app/theme'

type Props = {
  count: number
  dotColor?: string
  /** Kolor kropek 6-10 w ramce (struktura piątki). Domyślnie rozjaśniony `dotColor`. */
  dotColorSecond?: string
  /**
   * Struktura 5: kropki 6-10 innym odcieniem + kreska po piątej kolumnie.
   * Dziecko widzi „5 i jeszcze 2" zamiast liczyć siedem razy od jedynki.
   */
  fiveStructure?: boolean
  highlightColor?: string
  highlightAfter?: number
  size?: number
  frameGap?: number
}

/**
 * Miesza kolor z bielą (0 = bez zmian, 1 = biel). Wejście spoza formatu
 * `#rgb`/`#rrggbb` (np. `rgba(...)`) zwracamy bez zmian — lepiej jeden odcień
 * niż wysypana ramka.
 */
export function lighten(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const raw = m[1]!
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const num = Number.parseInt(full, 16)
  const t = Math.min(1, Math.max(0, amount))
  const mix = (channel: number) => Math.round(channel + (255 - channel) * t)
  const r = mix((num >> 16) & 0xff)
  const g = mix((num >> 8) & 0xff)
  const b = mix(num & 0xff)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function TenFrame({
  count,
  dotColor = '#dc2626',
  dotColorSecond,
  fiveStructure = true,
  highlightColor,
  highlightAfter,
  size = 56,
  frameGap = 24,
}: Props) {
  const safeCount = Math.max(0, Math.min(20, Math.floor(count)))
  const needsTwoFrames = safeCount > 10
  const frame1Count = needsTwoFrames ? 10 : safeCount
  const frame2Count = needsTwoFrames ? safeCount - 10 : 0

  return (
    <div
      data-testid="tenframe-root"
      style={{ display: 'flex', alignItems: 'center', gap: frameGap }}
    >
      <FrameGrid
        count={frame1Count}
        dotColor={dotColor}
        dotColorSecond={dotColorSecond}
        fiveStructure={fiveStructure}
        highlightColor={highlightColor}
        highlightAfter={highlightAfter}
        size={size}
        offset={0}
      />
      {needsTwoFrames && (
        <FrameGrid
          count={frame2Count}
          dotColor={dotColor}
          dotColorSecond={dotColorSecond}
          fiveStructure={fiveStructure}
          highlightColor={highlightColor}
          highlightAfter={highlightAfter}
          size={size}
          offset={10}
        />
      )}
    </div>
  )
}

function FrameGrid({
  count,
  dotColor,
  dotColorSecond,
  fiveStructure,
  highlightColor,
  highlightAfter,
  size,
  offset,
}: {
  count: number
  dotColor: string
  dotColorSecond: string | undefined
  fiveStructure: boolean
  highlightColor: string | undefined
  highlightAfter: number | undefined
  size: number
  offset: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(5, ${size}px)`,
        gridTemplateRows: `repeat(2, ${size}px)`,
        gap: 4,
        padding: 6,
        background: '#fff',
        border: `3px solid ${colors.text}33`,
        borderRadius: 8,
      }}
    >
      {Array.from({ length: 10 }).map((_, idx) => {
        const filled = idx < count
        const globalIdx = offset + idx
        const useHighlight =
          filled &&
          highlightColor !== undefined &&
          highlightAfter !== undefined &&
          globalIdx >= highlightAfter
        // Druga piątka ramki — liczona po pozycji W RAMCE, nie globalnie, żeby
        // druga ramka (11-20) też miała własny podział 5+5.
        const isSecondHalf = fiveStructure && globalIdx % 10 >= 5
        const baseColor = isSecondHalf ? dotColorSecond ?? lighten(dotColor, 0.25) : dotColor
        return (
          <div
            key={idx}
            data-testid="tenframe-cell"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${colors.text}22`,
              borderRadius: 4,
              background: '#fafafa',
              // Kreska po piątej kropce — wizualny „przystanek" struktury 5.
              // Ramka ma 5 kolumn, więc pierwsza piątka to GÓRNY rząd: separator
              // biegnie poziomo nad dolnym rzędem, nie pionowo w jednej komórce.
              ...(fiveStructure && idx >= 5
                ? { marginTop: 2, boxShadow: `inset 0 2px 0 ${colors.text}44` }
                : {}),
            }}
          >
            {filled && (
              <div
                data-testid="tenframe-dot-filled"
                style={{
                  width: Math.floor(size * 0.65),
                  height: Math.floor(size * 0.65),
                  borderRadius: '50%',
                  background: useHighlight ? highlightColor : baseColor,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
