import { useDroppable } from '@dnd-kit/core'
import { colors } from '@/app/theme'

type Props = {
  whole: number
  partA: number | null
  partB: number | null
  dropIdA?: string
  dropIdB?: string
  partAColor?: string
  partBColor?: string
}

export function NumberBondShape({
  whole,
  partA,
  partB,
  dropIdA,
  dropIdB,
  partAColor = '#dc2626',
  partBColor = '#1d4ed8',
}: Props) {
  return (
    <div
      data-testid="number-bond-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
      }}
    >
      <BondCircle value={whole} background="#fff" border={colors.text} dataLabel="whole" />
      <svg width="180" height="40" viewBox="0 0 180 40" aria-hidden="true">
        <line x1="90" y1="0" x2="40" y2="40" stroke={colors.text} strokeWidth="3" />
        <line x1="90" y1="0" x2="140" y2="40" stroke={colors.text} strokeWidth="3" />
      </svg>
      <div style={{ display: 'flex', gap: 32 }}>
        <BondSlot
          value={partA}
          color={partAColor}
          dropId={dropIdA}
          dataLabel="partA"
        />
        <BondSlot
          value={partB}
          color={partBColor}
          dropId={dropIdB}
          dataLabel="partB"
        />
      </div>
    </div>
  )
}

function BondCircle({
  value,
  background,
  border,
  dataLabel,
}: {
  value: number
  background: string
  border: string
  dataLabel: string
}) {
  return (
    <div
      data-testid={`bond-${dataLabel}`}
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background,
        border: `4px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-block)',
        fontSize: 56,
        fontWeight: 700,
        color: colors.text,
      }}
    >
      {value}
    </div>
  )
}

function BondSlot({
  value,
  color,
  dropId,
  dataLabel,
}: {
  value: number | null
  color: string
  dropId: string | undefined
  dataLabel: string
}) {
  if (value !== null) {
    return (
      <BondCircle
        value={value}
        background={color + '22'}
        border={color}
        dataLabel={dataLabel}
      />
    )
  }
  return <BondDropSlot color={color} dropId={dropId} dataLabel={dataLabel} />
}

function BondDropSlot({
  color,
  dropId,
  dataLabel,
}: {
  color: string
  dropId: string | undefined
  dataLabel: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId ?? `slot-${dataLabel}`,
    disabled: !dropId,
  })
  return (
    <div
      ref={setNodeRef}
      data-testid={`bond-${dataLabel}-slot`}
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: isOver ? color + '44' : '#fafafa',
        border: `4px dashed ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 120ms',
      }}
    />
  )
}
