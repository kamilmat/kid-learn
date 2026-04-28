import type { CSSProperties, ReactNode } from 'react'
import type { IconSet } from '../../data/concreteSets'

type Props = {
  count: number
  iconSet: IconSet
  iconSize?: number
  layout?: 'row' | 'wrap' | 'grid'
  cols?: number
  groupColor?: string
}

export function ConcreteIcons({
  count,
  iconSet,
  iconSize = 56,
  layout = 'wrap',
  cols,
  groupColor,
}: Props) {
  const safeCount = Math.max(0, Math.floor(count))
  const items: ReactNode[] = Array.from({ length: safeCount }).map((_, idx) => (
    <span
      key={idx}
      data-testid="concrete-icon"
      aria-hidden="true"
      style={{ fontSize: iconSize, lineHeight: 1, userSelect: 'none' }}
    >
      {iconSet.emoji}
    </span>
  ))

  const containerStyle: CSSProperties =
    layout === 'grid' && cols
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${iconSize + 8}px)`,
          gap: 8,
        }
      : layout === 'row'
      ? { display: 'flex', gap: 8, flexWrap: 'nowrap' }
      : { display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 360 }

  return (
    <div
      data-testid="concrete-icons-root"
      aria-label={`${safeCount} ${iconSet.label}`}
      style={{
        ...containerStyle,
        padding: 12,
        borderRadius: 12,
        background: groupColor ?? 'transparent',
      }}
    >
      {items}
    </div>
  )
}
