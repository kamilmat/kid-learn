import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'
import type { Level } from '@/shared/settings/types'

type LevelIcon = { kind: 'emoji'; value: string } | { kind: 'torch' }

const LEVELS: Array<{ level: Level; label: string; icon: LevelIcon }> = [
  { level: 'iskierka', label: 'Iskierka', icon: { kind: 'emoji', value: '✨' } },
  { level: 'plomyk', label: 'Płomyk', icon: { kind: 'emoji', value: '🔆' } },
  { level: 'ognik', label: 'Ognik', icon: { kind: 'emoji', value: '🔥' } },
  { level: 'pochodnia', label: 'Pochodnia', icon: { kind: 'torch' } },
]

function TorchIcon({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* drewniany kij */}
      <rect x="34" y="40" width="12" height="36" fill="#7b4a1a" rx="2" />
      {/* ciemniejsze pasy na kiju (textura) */}
      <line x1="34" y1="50" x2="46" y2="50" stroke="#5c3711" strokeWidth="1.5" />
      <line x1="34" y1="60" x2="46" y2="60" stroke="#5c3711" strokeWidth="1.5" />
      <line x1="34" y1="70" x2="46" y2="70" stroke="#5c3711" strokeWidth="1.5" />
      {/* metalowa obejma na czubku kija */}
      <rect x="30" y="36" width="20" height="6" fill="#4b5563" rx="1" />
      {/* płomień zewnętrzny — czerwony */}
      <path
        d="M40 4 Q22 18, 26 32 Q30 40, 40 38 Q50 40, 54 32 Q58 18, 40 4 Z"
        fill="#dc2626"
      />
      {/* płomień środkowy — pomarańczowy */}
      <path
        d="M40 12 Q28 22, 30 32 Q34 38, 40 36 Q46 38, 50 32 Q52 22, 40 12 Z"
        fill="#f97316"
      />
      {/* płomień wewnętrzny — żółty */}
      <path
        d="M40 20 Q33 27, 34 32 Q37 36, 40 35 Q43 36, 46 32 Q47 27, 40 20 Z"
        fill="#fbbf24"
      />
    </svg>
  )
}

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onSelect: (level: Level) => void
  onTree: () => void
}

export function NumbersLevelSelect({ audioBus: _audioBus, onSelect, onTree }: Props) {
  const treeTap = useTapHandler({ onTap: onTree })
  return (
    <div
      data-testid="numbers-level-select"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 24,
        background: colors.bg,
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: '2.5em',
          margin: 0,
          color: colors.text,
        }}
      >
        Cyferki
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          maxWidth: 720,
          width: '100%',
        }}
      >
        {LEVELS.map(({ level, label, icon }) => (
          <LevelTile
            key={level}
            level={level}
            label={label}
            icon={icon}
            onSelect={onSelect}
          />
        ))}
      </div>
      <button
        type="button"
        data-testid="numbers-tree-link"
        aria-label="Drzewko mistrzostwa"
        {...treeTap}
        style={{
          marginTop: 16,
          marginBottom: 16,
          padding: '12px 24px',
          minHeight: 56,
          flexShrink: 0,
          background: '#dcfce7',
          border: '3px solid #16a34a',
          borderRadius: radii.kid,
          fontSize: 24,
          fontFamily: 'var(--font-handwritten)',
          color: '#166534',
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        🌱 Drzewko mistrzostwa
      </button>
    </div>
  )
}

function LevelTile({
  level,
  label,
  icon,
  onSelect,
}: {
  level: Level
  label: string
  icon: LevelIcon
  onSelect: (level: Level) => void
}) {
  const tap = useTapHandler({ onTap: () => onSelect(level) })
  return (
    <button
      type="button"
      data-testid={`numbers-level-${level}`}
      aria-label={label}
      {...tap}
      style={{
        minHeight: 200,
        padding: 24,
        borderRadius: radii.kid,
        background: '#fff',
        border: `4px solid ${colors.accentBlue}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        aria-hidden="true"
        style={{ fontSize: 80, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80 }}
      >
        {icon.kind === 'emoji' ? icon.value : <TorchIcon size={80} />}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 28,
          fontWeight: 700,
          color: colors.text,
        }}
      >
        {label}
      </span>
    </button>
  )
}
