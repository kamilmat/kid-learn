// ReadingLevelSelect — ekran wyboru poziomu w module Czytanie.

import { useCallback } from 'react'
import { LevelIconView, LevelStars, LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'
import type { Level } from '@/shared/settings/types'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { LevelHeader } from '@/shared/ui/LevelHeader'

const LEVELS: { id: Level; label: string }[] = [
  { id: 'iskierka', label: 'Iskierka' },
  { id: 'plomyk', label: 'Płomyk' },
  { id: 'ognik', label: 'Ognik' },
  { id: 'pochodnia', label: 'Pochodnia' },
]

type Props = {
  onSelect: (level: Level) => void
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

export function ReadingLevelSelect({ onSelect, audioBus }: Props) {
  return (
    <div
      data-testid="reading-level-select"
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
      <LevelHeader
        title="Wybierz poziom"
        titleStyle={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: '2.5em',
          margin: 0,
          color: colors.text,
        }}
      />
      <div
        data-testid="reading-level-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          maxWidth: 720,
          width: '100%',
        }}
      >
        {LEVELS.map((level) => (
          <LevelTile key={level.id} level={level} onSelect={onSelect} audioBus={audioBus} />
        ))}
      </div>
    </div>
  )
}

function LevelTile({
  level,
  onSelect,
  audioBus,
}: {
  level: typeof LEVELS[0]
  onSelect: (l: Level) => void
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}) {
  const handleTap = useCallback(() => {
    audioBus.stop()
    void audioBus.play('nav-tap')
    onSelect(level.id)
  }, [audioBus, level.id, onSelect])

  const handlers = useTapHandler({ onTap: handleTap })

  return (
    <button
      type="button"
      data-testid={`reading-level-tile-${level.id}`}
      data-level={level.id}
      aria-label={level.label}
      style={{
        minHeight: 200,
        padding: 20,
        borderRadius: radii.kid,
        background: LEVEL_TILE_BG[level.id],
        border: `3px solid ${LEVEL_TILE_BORDER[level.id]}`,
        color: colors.text,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      {...handlers}
    >
      <LevelIconView level={level.id} size={72} />
      <span
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 28,
          fontWeight: 700,
          color: colors.text,
        }}
      >
        {level.label}
      </span>
      <LevelStars level={level.id} size={18} />
    </button>
  )
}
