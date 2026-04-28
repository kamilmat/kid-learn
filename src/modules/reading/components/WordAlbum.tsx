// WordAlbum — kolekcja kart słów opanowanych przez dziecko (Phase 9).
// Karty unlockowane gdy SRS box >= 5. Tap na odblokowaną kartę → scenka + audio.

import { useState, useCallback } from 'react'
import { useReading } from '../store/readingStore'
import { ALL_WORDS, getWordById } from '../data/words'
import { pickRandomScene } from '../data/scenes'
import { WordScene } from './WordScene'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { IskraMascotAnimated } from './IskraMascotAnimated'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Level } from '@/shared/settings/types'
import type { WordData } from '../data/words'
import type { Scene } from '../data/scenes'

type Filter = 'all' | Level

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onExit: () => void
}

export function WordAlbum({ audioBus, onExit }: Props) {
  const albumUnlocked = useReading(s => s.albumUnlocked)
  const seenSceneVariants = useReading(s => s.seenSceneVariants)
  const markSceneSeen = useReading(s => s.markSceneSeen)
  const [filter, setFilter] = useState<Filter>('all')
  const [activeScene, setActiveScene] = useState<{ scene: Scene; wordId: string } | null>(null)

  const filtered = ALL_WORDS.filter(w => filter === 'all' || w.level === filter)
  const totalCount = ALL_WORDS.length
  const unlockedCount = albumUnlocked.length

  const handleCardTap = useCallback((wordId: string) => {
    if (!albumUnlocked.includes(wordId)) return
    const word = getWordById(wordId)
    if (!word) return

    const seen = seenSceneVariants[word.text] ?? []
    const scene = pickRandomScene(word.text, seen)

    if (scene) {
      markSceneSeen(word.text, scene.id)
      setActiveScene({ scene, wordId })
    } else {
      // Fallback: brak scenki, odgraj samo audio słowa
      void audioBus.play(`word-${word.text}`)
    }
  }, [albumUnlocked, seenSceneVariants, markSceneSeen, audioBus])

  const exitHandlers = useTapHandler({ onTap: onExit })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 16, gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IskraMascotAnimated audioBus={audioBus} size={56} intensity="flame" enableEasterEggsOnTap={true} />
          <div>
            <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 28, fontWeight: 700, color: '#2d2d33' }}>
              Album Iskry
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {unlockedCount} z {totalCount} słów
            </div>
          </div>
        </div>
        <button
          {...exitHandlers}
          aria-label="Wróć"
          style={{ padding: '8px 16px', borderRadius: 12, background: '#fef9f2', border: '2px solid #d1d5db', fontSize: 18, cursor: 'pointer' }}
        >
          🏠
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, overflowX: 'auto' }}>
        {(['all', 'plomyk', 'ognik', 'pochodnia'] as Filter[]).map(f => (
          <FilterTab key={f} value={f} active={filter === f} onSelect={() => setFilter(f)} />
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {filtered.map(w => (
            <AlbumCard
              key={w.id}
              word={w}
              unlocked={albumUnlocked.includes(w.id)}
              onTap={() => handleCardTap(w.id)}
            />
          ))}
        </div>
      </div>

      {/* Active scene overlay */}
      {activeScene && (
        <WordScene
          scene={activeScene.scene}
          audioBus={audioBus}
          onComplete={() => setActiveScene(null)}
        />
      )}
    </div>
  )
}

function FilterTab({ value, active, onSelect }: { value: Filter; active: boolean; onSelect: () => void }) {
  const handlers = useTapHandler({ onTap: onSelect })
  const labels: Record<Filter, string> = {
    all: 'Wszystkie',
    plomyk: 'Płomyk',
    ognik: 'Ognik',
    pochodnia: 'Pochodnia',
    iskierka: 'Iskierka',
  }
  return (
    <button
      {...handlers}
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        background: active ? '#f59e0b' : '#f3f4f6',
        color: active ? 'white' : '#4b5563',
        border: 'none',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {labels[value]}
    </button>
  )
}

function AlbumCard({ word, unlocked, onTap }: { word: WordData; unlocked: boolean; onTap: () => void }) {
  const handlers = useTapHandler({ onTap: unlocked ? onTap : () => {} })
  return (
    <button
      {...handlers}
      aria-label={`karta ${word.text}${unlocked ? '' : ' (jeszcze nie zdobyta)'}`}
      disabled={!unlocked}
      style={{
        aspectRatio: '1',
        background: unlocked ? '#d1fae5' : '#f3f4f6',
        border: `2px solid ${unlocked ? '#10b981' : '#d1d5db'}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: unlocked ? 1 : 0.5,
        cursor: unlocked ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <div style={{ fontSize: 36 }}>{unlocked ? word.albumEmoji : '?'}</div>
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 14, fontWeight: 700, color: '#2d2d33' }}>
        {unlocked ? word.text : ''}
      </div>
    </button>
  )
}
