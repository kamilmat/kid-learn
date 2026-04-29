import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { LevelIconView, LevelStars, LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import { colors, radii } from '@/app/theme'
import type { Level } from '@/shared/settings/types'
import { IskraHero } from '@/shared/ui/IskraHero'

const LEVELS: Array<{ level: Level; label: string }> = [
  { level: 'iskierka', label: 'Iskierka' },
  { level: 'plomyk', label: 'Płomyk' },
  { level: 'ognik', label: 'Ognik' },
  { level: 'pochodnia', label: 'Pochodnia' },
]

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
        scrollbarGutter: 'stable',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <IskraHero size={80} state="idle" intensity="fire" />
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
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          maxWidth: 720,
          width: '100%',
        }}
      >
        {LEVELS.map(({ level, label }) => (
          <LevelTile key={level} level={level} label={label} onSelect={onSelect} />
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
  onSelect,
}: {
  level: Level
  label: string
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
        padding: 20,
        borderRadius: radii.kid,
        background: LEVEL_TILE_BG[level],
        border: `3px solid ${LEVEL_TILE_BORDER[level]}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <LevelIconView level={level} size={80} />
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
      <LevelStars level={level} size={18} />
    </button>
  )
}
