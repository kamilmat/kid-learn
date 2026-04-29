import type { Level } from '@/shared/settings/types'

export type LevelIcon = { kind: 'emoji'; value: string } | { kind: 'torch' }

export const LEVEL_ICONS: Record<Level, LevelIcon> = {
  iskierka: { kind: 'emoji', value: '✨' },
  plomyk: { kind: 'emoji', value: '🔆' },
  ognik: { kind: 'emoji', value: '🔥' },
  pochodnia: { kind: 'torch' },
}

export function LevelIconView({ level, size = 80 }: { level: Level; size?: number }) {
  const icon = LEVEL_ICONS[level]
  if (icon.kind === 'emoji') {
    return (
      <span
        aria-hidden="true"
        style={{
          fontSize: size,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: size,
        }}
      >
        {icon.value}
      </span>
    )
  }
  return <TorchIcon size={size} />
}

function TorchIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <rect x="34" y="40" width="12" height="36" fill="#7b4a1a" rx="2" />
      <line x1="34" y1="50" x2="46" y2="50" stroke="#5c3711" strokeWidth="1.5" />
      <line x1="34" y1="60" x2="46" y2="60" stroke="#5c3711" strokeWidth="1.5" />
      <line x1="34" y1="70" x2="46" y2="70" stroke="#5c3711" strokeWidth="1.5" />
      <rect x="30" y="36" width="20" height="6" fill="#4b5563" rx="1" />
      <path
        d="M40 4 Q22 18, 26 32 Q30 40, 40 38 Q50 40, 54 32 Q58 18, 40 4 Z"
        fill="#dc2626"
      />
      <path
        d="M40 12 Q28 22, 30 32 Q34 38, 40 36 Q46 38, 50 32 Q52 22, 40 12 Z"
        fill="#f97316"
      />
      <path
        d="M40 20 Q33 27, 34 32 Q37 36, 40 35 Q43 36, 46 32 Q47 27, 40 20 Z"
        fill="#fbbf24"
      />
    </svg>
  )
}
