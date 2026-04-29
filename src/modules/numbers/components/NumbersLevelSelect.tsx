import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { colors, radii } from '@/app/theme'
import type { Level } from '@/shared/settings/types'

const LEVELS: Array<{ level: Level; label: string; intensity: IskraIntensity }> = [
  { level: 'iskierka', label: 'Iskierka', intensity: 'spark' },
  { level: 'plomyk', label: 'Płomyk', intensity: 'flame' },
  { level: 'ognik', label: 'Ognik', intensity: 'fire' },
  { level: 'pochodnia', label: 'Pochodnia', intensity: 'torch' },
]

const INTENSITY_TO_BODY_SIZE: Record<IskraIntensity, number> = {
  spark: 56,
  flame: 72,
  fire: 88,
  torch: 104,
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
        {LEVELS.map(({ level, label, intensity }) => (
          <LevelTile
            key={level}
            level={level}
            label={label}
            intensity={intensity}
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
  intensity,
  onSelect,
}: {
  level: Level
  label: string
  intensity: IskraIntensity
  onSelect: (level: Level) => void
}) {
  const tap = useTapHandler({ onTap: () => onSelect(level) })
  return (
    <button
      type="button"
      data-testid={`numbers-level-${level}`}
      data-level={level}
      aria-label={label}
      {...tap}
      style={{
        minHeight: 180,
        padding: 20,
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
        style={{ display: 'flex', justifyContent: 'center', minHeight: 104, alignItems: 'center' }}
      >
        <IskraMascot size={INTENSITY_TO_BODY_SIZE[intensity]} state="idle" intensity={intensity} />
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
