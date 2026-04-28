import type { CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

type CommonProps = {
  digit: number
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
}

type TapProps = CommonProps & {
  variant: 'tap'
  onTap: (digit: number) => void
}

type DraggableProps = CommonProps & {
  variant: 'drag'
  dragId: string
  payload?: Record<string, unknown>
}

export function DigitTile(props: TapProps | DraggableProps) {
  const { digit, size = 'lg', selected = false } = props
  const fontSize = size === 'lg' ? 80 : size === 'md' ? 56 : 36
  const tileSize = size === 'lg' ? 120 : size === 'md' ? 88 : 64

  const baseStyle: CSSProperties = {
    width: tileSize,
    height: tileSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-block)',
    fontSize,
    fontWeight: 700,
    color: colors.text,
    background: selected ? '#fef3c7' : '#fff',
    border: `4px solid ${selected ? '#f59e0b' : colors.text + '22'}`,
    borderRadius: radii.kid,
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  if (props.variant === 'tap') {
    return <TapTile digit={digit} onTap={props.onTap} baseStyle={baseStyle} />
  }
  return (
    <DragTile
      digit={digit}
      dragId={props.dragId}
      payload={props.payload}
      baseStyle={baseStyle}
    />
  )
}

function TapTile({
  digit,
  onTap,
  baseStyle,
}: {
  digit: number
  onTap: (digit: number) => void
  baseStyle: CSSProperties
}) {
  const tap = useTapHandler({ onTap: () => onTap(digit) })
  return (
    <button
      type="button"
      data-testid={`digit-tile-${digit}`}
      aria-label={`Cyfra ${digit}`}
      {...tap}
      style={{
        ...baseStyle,
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {digit}
    </button>
  )
}

function DragTile({
  digit,
  dragId,
  payload,
  baseStyle,
}: {
  digit: number
  dragId: string
  payload: Record<string, unknown> | undefined
  baseStyle: CSSProperties
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { digit, ...payload },
  })

  const style: CSSProperties = {
    ...baseStyle,
    cursor: isDragging ? 'grabbing' : 'grab',
    // KRYTYCZNE dla iPad — bez tego touch scroll wygrywa z drag
    touchAction: 'none',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.95 : 1,
  }

  // Plain DIV (NIE button) — memory project_dnd_kit_drag_button.md:
  // button capturuje pointer events przed PointerSensor i drag nie startuje
  return (
    <div
      ref={setNodeRef}
      data-testid={`digit-tile-drag-${digit}`}
      aria-label={`Cyfra ${digit} (do przeciągnięcia)`}
      style={style}
      {...listeners}
      {...attributes}
    >
      {digit}
    </div>
  )
}
