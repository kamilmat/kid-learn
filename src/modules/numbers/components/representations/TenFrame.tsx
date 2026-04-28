import { colors } from '@/app/theme'

type Props = {
  count: number
  dotColor?: string
  highlightColor?: string
  highlightAfter?: number
  size?: number
  frameGap?: number
}

export function TenFrame({
  count,
  dotColor = '#dc2626',
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
        highlightColor={highlightColor}
        highlightAfter={highlightAfter}
        size={size}
        offset={0}
      />
      {needsTwoFrames && (
        <FrameGrid
          count={frame2Count}
          dotColor={dotColor}
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
  highlightColor,
  highlightAfter,
  size,
  offset,
}: {
  count: number
  dotColor: string
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
            }}
          >
            {filled && (
              <div
                data-testid="tenframe-dot-filled"
                style={{
                  width: Math.floor(size * 0.65),
                  height: Math.floor(size * 0.65),
                  borderRadius: '50%',
                  background: useHighlight ? highlightColor : dotColor,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
