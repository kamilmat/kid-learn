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
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { useTapHandler } from '@/shared/ui/useTapHandler'
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
  intensity: IskraIntensity
  description: string
}

const LEVEL_META: LevelMeta[] = [
  { level: 'iskierka', label: 'Iskierka', intensity: 'spark', description: 'najłatwiejszy — 6 literek' },
  { level: 'plomyk', label: 'Płomyk', intensity: 'flame', description: 'łatwy — 14 literek' },
  { level: 'ognik', label: 'Ognik', intensity: 'fire', description: 'średni — 24 literki' },
  {
    level: 'pochodnia',
    label: 'Pochodnia',
    intensity: 'torch',
    description: 'pełen alfabet — 32 literki',
  },
]

// Skalowanie body mascotki per poziom — sama liczba iskier wokół (1/2/4/6)
// jest dla 7-latka prawie nieczytelna. Wzrost rozmiaru ciała daje wyraźny
// sygnał wzrostu trudności (Iskierka → Pochodnia).
const INTENSITY_TO_BODY_SIZE: Record<IskraIntensity, number> = {
  spark: 44,
  flame: 60,
  fire: 76,
  torch: 92,
}

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
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
}

// Pojedynczy kafelek — wyciągnięty żeby useTapHandler żył w komponencie
// (hooki w pętli LEVEL_META.map nie są dozwolone).
function LevelTile({
  meta,
  onSelect,
}: {
  meta: LevelMeta
  onSelect: (level: Level) => void
}) {
  const count = levelLetterPools[meta.level].length
  const tap = useTapHandler({ onTap: () => onSelect(meta.level) })
  return (
    <button
      type="button"
      data-testid={`level-tile-${meta.level}`}
      data-level={meta.level}
      aria-label={`Poziom ${meta.label}, ${count} literek`}
      style={tileStyle}
      {...tap}
    >
      <span style={{ display: 'flex', justifyContent: 'center', minHeight: 92, alignItems: 'center' }} aria-hidden="true">
        <IskraMascot size={INTENSITY_TO_BODY_SIZE[meta.intensity]} state="idle" intensity={meta.intensity} />
      </span>
      <span style={{ fontSize: 20 }}>{meta.label}</span>
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
        {meta.description}
      </span>
    </button>
  )
}

// Pojedyncza komórka opanowanej litery — wyciągnięta z tego samego powodu.
function MasteryCell({
  letter,
  isMastered,
  isCelebrating,
  onTap,
}: {
  letter: string
  isMastered: boolean
  isCelebrating: boolean
  onTap: (letter: string) => void
}) {
  const baseStyle = isMastered ? masteryCellMastered : masteryCellDim
  const cellStyle: React.CSSProperties = isCelebrating
    ? { ...baseStyle, transform: 'scale(1.18)' }
    : baseStyle
  const tap = useTapHandler({
    onTap: () => onTap(letter),
    disabled: !isMastered,
  })
  return (
    <button
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
      {...(isMastered ? tap : {})}
      style={cellStyle}
    >
      {toUpper(letter)}
    </button>
  )
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
    // iPad/Safari unlock: pierwsze synchroniczne audioBus.play() w user-gesture
    // context (onClick) "primuje" persistent HTMLAudioElement. Bez tego pierwsze
    // letter-X w sesji bywało blokowane przez autoplay policy → cisza, dziecko
    // musiało ręcznie klikać 🔊. session.start() i tak zaraz robi stop(), więc
    // nav-tap zagra tylko 50-100ms — to wystarczy do unlocku.
    void audioBus.play('nav-tap')
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
        {LEVEL_META.map((meta) => (
          <LevelTile key={meta.level} meta={meta} onSelect={handleTileClick} />
        ))}
      </div>

      <section
        data-testid="mastery-wall"
        aria-label="Opanowane literki"
        style={masteryWallContainer}
      >
        <h2 style={{ fontSize: 14, margin: 0, color: colors.text }}>
          Opanowane literki
        </h2>
        <p style={{ fontSize: 11, margin: '2px 0 0', color: '#7a7a82' }}>
          Tu pojawią się literki, których się nauczysz
        </p>
        <div style={masteryGridStyle}>
          {POLISH_ALPHABET.map((letter) => (
            <MasteryCell
              key={letter}
              letter={letter}
              isMastered={masteredSet.has(letter)}
              isCelebrating={celebratingLetter === letter}
              onTap={handleMasteredCellClick}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
