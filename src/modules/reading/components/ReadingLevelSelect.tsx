// ReadingLevelSelect — ekran wyboru poziomu w module Czytanie.
// Analogiczny do LevelSelect w module Litery, bez ściany osiągnięć.

import { useCallback } from 'react'
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import type { Level } from '@/shared/settings/types'
import type { AudioBus } from '@/shared/audio/AudioBus'

const LEVELS: {
  id: Level
  label: string
  subtitle: string
  intensity: IskraIntensity
}[] = [
  { id: 'iskierka', label: 'Iskierka', subtitle: 'Sylaby', intensity: 'spark' },
  { id: 'plomyk', label: 'Płomyk', subtitle: 'Słowa', intensity: 'flame' },
  { id: 'ognik', label: 'Ognik', subtitle: 'Trudniejsze słowa', intensity: 'fire' },
  { id: 'pochodnia', label: 'Pochodnia', subtitle: 'Brakuje sylaby', intensity: 'torch' },
]

// Rozmiar maskotki rośnie z poziomem — wizualny sygnał trudności.
const INTENSITY_TO_MASCOT_SIZE: Record<IskraIntensity, number> = {
  spark: 44,
  flame: 60,
  fire: 76,
  torch: 92,
}

type Props = {
  onSelect: (level: Level) => void
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

export function ReadingLevelSelect({ onSelect, audioBus }: Props) {
  return (
    <div
      data-testid="reading-level-select"
      style={{
        padding: 12,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <h1 style={{ fontSize: 22, margin: 0, color: '#2d2d33', flexShrink: 0 }}>
        Wybierz poziom
      </h1>
      <div
        data-testid="reading-level-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          flex: 1,
          minHeight: 0,
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
      aria-label={`${level.label} — ${level.subtitle}`}
      style={{
        padding: 12,
        borderRadius: 16,
        background: '#ffffff',
        border: '2px solid #5b8def',
        color: '#2d2d33',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        fontSize: 18,
        fontWeight: 600,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      {...handlers}
    >
      <span
        style={{ display: 'flex', justifyContent: 'center', minHeight: 92, alignItems: 'center' }}
        aria-hidden="true"
      >
        <IskraMascot
          size={INTENSITY_TO_MASCOT_SIZE[level.intensity]}
          state="idle"
          intensity={level.intensity}
        />
      </span>
      <span style={{ fontSize: 20 }}>{level.label}</span>
      <span
        style={{
          fontSize: 13,
          color: '#7a7a82',
          textAlign: 'center',
          lineHeight: 1.3,
          padding: '0 6px',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {level.subtitle}
      </span>
    </button>
  )
}
