// LevelSelect — ekran wyboru poziomu w module Litery.
// Sekcje 11 (poziomy), 6.5 (mastery wall), 5.2 (onboarding głosowy) spec.
//
// 4 duże kafelki: Iskierka / Płomyk / Ognik / Pochodnia — każdy z ikoną
// Iskry (różna intensywność płomienia), nazwą i liczbą liter w puli.
// Pod siatką: kompaktowa "ściana osiągnięć" — alfabet 4×8, opanowane (box=5)
// świecą jak węgielek, pozostałe są przytłumione.

import { useEffect, useMemo, useState } from 'react'
import { colors, radii } from '@/app/theme'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { levelLetterPools } from '@/shared/settings/defaults'
import type { Level } from '@/shared/settings/types'
import { POLISH_ALPHABET, toUpper } from '@/modules/letters/data/alphabet'
import {
  selectMasteredLetters,
  useLetters,
  type LettersState,
} from '@/modules/letters/store/lettersStore'

export type LevelSelectProps = {
  onSelect: (level: Level) => void
  /** Wstrzykiwany audioBus — dla testów. Default: singleton. */
  audioBus?: Pick<AudioBus, 'play'>
}

type LevelMeta = {
  level: Level
  label: string
  flame: string
  description: string
}

const LEVEL_META: LevelMeta[] = [
  { level: 'iskierka', label: 'Iskierka', flame: '🔥', description: 'najłatwiejszy — 6 literek' },
  { level: 'plomyk', label: 'Płomyk', flame: '🔥🔥', description: 'łatwy — 14 literek' },
  { level: 'ognik', label: 'Ognik', flame: '🔥🔥🔥', description: 'średni — 24 literki' },
  {
    level: 'pochodnia',
    label: 'Pochodnia',
    flame: '🔥🔥🔥🔥',
    description: 'pełen alfabet — 32 literki',
  },
]

const LEVEL_SELECT_INTRO_KEY = 'level-select-intro'

const tileStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: radii.kid,
  background: '#ffffff',
  border: `2px solid ${colors.accentBlue}`,
  color: colors.text,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  fontSize: 18,
  fontWeight: 600,
}

const masteryWallContainer: React.CSSProperties = {
  padding: 10,
  borderRadius: radii.kid,
  background: '#ffffff',
  border: `1px solid ${colors.accentBlue}33`,
  flexShrink: 0,
}

const masteryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
  gap: 4,
  marginTop: 6,
}

const masteryCellBase: React.CSSProperties = {
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'default',
  padding: 0,
}

const masteryCellMastered: React.CSSProperties = {
  ...masteryCellBase,
  background: colors.accentOrange,
  color: '#ffffff',
  boxShadow: `0 0 6px ${colors.accentOrange}`,
  cursor: 'pointer',
  // proste "ożywienie" — drobny scale + glow przez transition na :hover/active
  transition: 'transform 120ms ease',
}

const masteryCellDim: React.CSSProperties = {
  ...masteryCellBase,
  background: '#f0eadf',
  color: '#b6ad9c',
}

export function LevelSelect({
  onSelect,
  audioBus = defaultAudioBus,
}: LevelSelectProps) {
  const lettersState = useLetters()
  const masteredSet = useMemo<Set<string>>(() => {
    // selectMasteredLetters operuje na czystym shape — wyciągamy tylko letters
    const snapshot: LettersState = {
      letters: lettersState.letters,
      sessions: lettersState.sessions,
      seenIntros: lettersState.seenIntros,
      lastUsedLevel: lettersState.lastUsedLevel,
    }
    return new Set(selectMasteredLetters(snapshot))
  }, [lettersState.letters, lettersState.sessions, lettersState.seenIntros, lettersState.lastUsedLevel])

  const markIntroSeen = useLetters((s) => s.markIntroSeen)
  const hasSeenIntro = useLetters((s) => s.hasSeenIntro)

  // Onboarding głosowy — `level-select-intro` tylko 1× (sekcja 5.2).
  useEffect(() => {
    if (!hasSeenIntro(LEVEL_SELECT_INTRO_KEY)) {
      void audioBus.play(LEVEL_SELECT_INTRO_KEY)
      markIntroSeen(LEVEL_SELECT_INTRO_KEY)
    }
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [celebratingLetter, setCelebratingLetter] = useState<string | null>(null)

  const handleTileClick = (level: Level) => {
    onSelect(level)
  }

  const handleMasteredCellClick = (letter: string) => {
    void audioBus.play('mastery-celebration')
    setCelebratingLetter(letter)
    // krótka animacja celebration (UX cue + audio)
    window.setTimeout(() => {
      setCelebratingLetter((cur) => (cur === letter ? null : cur))
    }, 600)
  }

  return (
    <div
      data-testid="level-select"
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
      <h1 style={{ fontSize: 22, margin: 0, color: colors.text, flexShrink: 0 }}>
        Wybierz poziom
      </h1>

      <div
        data-testid="level-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          flex: 1,
          minHeight: 0,
        }}
      >
        {LEVEL_META.map((meta) => {
          const count = levelLetterPools[meta.level].length
          return (
            <button
              key={meta.level}
              type="button"
              data-testid={`level-tile-${meta.level}`}
              data-level={meta.level}
              aria-label={`Poziom ${meta.label}, ${count} literek`}
              style={tileStyle}
              onClick={() => handleTileClick(meta.level)}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden="true">
                {meta.flame}
              </span>
              <span style={{ fontSize: 20 }}>{meta.label}</span>
              <span style={{ fontSize: 13, color: '#7a7a82' }}>
                {count} literek
              </span>
              <span style={{ fontSize: 11, color: '#a0a0a8' }}>
                {meta.description}
              </span>
            </button>
          )
        })}
      </div>

      <section
        data-testid="mastery-wall"
        aria-label="Ściana osiągnięć"
        style={masteryWallContainer}
      >
        <h2 style={{ fontSize: 14, margin: 0, color: colors.text }}>
          Twoje literki
        </h2>
        <div style={masteryGridStyle}>
          {POLISH_ALPHABET.map((letter) => {
            const isMastered = masteredSet.has(letter)
            const isCelebrating = celebratingLetter === letter
            const baseStyle = isMastered ? masteryCellMastered : masteryCellDim
            const cellStyle: React.CSSProperties = isCelebrating
              ? { ...baseStyle, transform: 'scale(1.18)' }
              : baseStyle
            return (
              <button
                key={letter}
                type="button"
                data-testid={`mastery-cell-${letter}`}
                data-letter={letter}
                data-mastered={isMastered ? 'true' : 'false'}
                aria-label={
                  isMastered
                    ? `Litera ${toUpper(letter)} opanowana`
                    : `Litera ${toUpper(letter)} jeszcze nie opanowana`
                }
                disabled={!isMastered}
                onClick={
                  isMastered
                    ? () => handleMasteredCellClick(letter)
                    : undefined
                }
                style={cellStyle}
              >
                {toUpper(letter)}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
