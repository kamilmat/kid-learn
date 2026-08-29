// LevelSelect — ekran wyboru poziomu w module Litery.
// Sekcje 11 (poziomy), 6.5 (mastery wall), 5.2 (onboarding głosowy) spec.
//
// 4 duże kafelki: Iskierka / Płomyk / Ognik / Pochodnia — każdy z ikoną
// Iskry (różna intensywność płomienia), nazwą i liczbą liter w puli.
// Pod siatką: kompaktowa "ściana osiągnięć" — alfabet 4×8, opanowane (box=5)
// świecą jak węgielek, pozostałe są przytłumione.

import { useEffect, useMemo, useRef, useState } from 'react'
import { colors, radii } from '@/app/theme'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { levelLetterPools } from '@/shared/settings/defaults'
import type { Level } from '@/shared/settings/types'
import { LevelIconView, LevelStars, LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { LevelHeader } from '@/shared/ui/LevelHeader'
import { toUpper } from '@/modules/letters/data/alphabet'
import {
  HARD_LETTERS_MIN_POOL,
  selectHardLetters,
} from '@/modules/letters/data/hardLetters'
import { selectMasteredLetters, useLetters } from '@/modules/letters/store/lettersStore'

export type LevelSelectProps = {
  onSelect: (level: Level) => void
  /** Wejście w tryb „Trudne literki". Brak → kafelek 🔁 się nie renderuje. */
  onSelectHard?: () => void
  /** Wstrzykiwany audioBus — dla testów. Default: singleton. */
  audioBus?: Pick<AudioBus, 'play'>
}

type LevelMeta = {
  level: Level
  label: string
}

const LEVEL_META: LevelMeta[] = [
  { level: 'iskierka', label: 'Iskierka' },
  { level: 'plomyk', label: 'Płomyk' },
  { level: 'ognik', label: 'Ognik' },
  { level: 'pochodnia', label: 'Pochodnia' },
]

const LEVEL_SELECT_INTRO_KEY = 'level-select-intro'
const HARD_EMPTY_KEY = 'letters-hard-empty'

const tileStyleBase: React.CSSProperties = {
  padding: 12,
  borderRadius: radii.kid,
  color: colors.text,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
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
      style={{
        ...tileStyleBase,
        background: LEVEL_TILE_BG[meta.level],
        border: `3px solid ${LEVEL_TILE_BORDER[meta.level]}`,
      }}
      {...tap}
    >
      <span style={{ display: 'flex', justifyContent: 'center', minHeight: 92, alignItems: 'center' }} aria-hidden="true">
        <LevelIconView level={meta.level} size={72} />
      </span>
      <span style={{ fontSize: 22, fontFamily: 'var(--font-handwritten)' }}>{meta.label}</span>
      <LevelStars level={meta.level} size={18} />
    </button>
  )
}

// Kafelek „Trudne literki" — powtórka celowana. Kropki = ile liter w puli
// (dziecko nie czyta, więc licznik musi być wizualny).
function HardLettersTile({
  count,
  onEnter,
  audioBus,
}: {
  count: number
  onEnter: () => void
  audioBus: Pick<AudioBus, 'play'>
}) {
  const enabled = count >= HARD_LETTERS_MIN_POOL
  const tap = useTapHandler({
    onTap: () => {
      if (!enabled) {
        void audioBus.play(HARD_EMPTY_KEY)
        return
      }
      // Ten sam unlock audio co w LevelTile — patrz komentarz w handleTileClick.
      void audioBus.play('nav-tap')
      onEnter()
    },
  })
  return (
    <button
      type="button"
      data-testid="hard-letters-tile"
      data-enabled={enabled ? 'true' : 'false'}
      aria-label={
        enabled
          ? `Trudne literki, ${count} do powtórki`
          : 'Trudne literki — na razie nie ma czego powtarzać'
      }
      style={{
        ...tileStyleBase,
        flexDirection: 'row',
        gap: 12,
        minHeight: 60,
        padding: '8px 16px',
        flexShrink: 0,
        background: '#ffffff',
        border: `3px solid ${colors.accentBlue}`,
        opacity: enabled ? 1 : 0.4,
      }}
      {...tap}
    >
      <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden="true">
        🔁
      </span>
      <span style={{ display: 'flex', gap: 5 }} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: colors.accentOrange,
            }}
          />
        ))}
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
  onSelectHard,
  audioBus = defaultAudioBus,
}: LevelSelectProps) {
  // Selektory zamiast całego store'u — ekran nie rerenderuje się przy zapisie
  // historii sesji ani seenIntros.
  const letters = useLetters((s) => s.letters)
  const persistedLastUsedLevel = useLetters((s) => s.lastUsedLevel)
  const masteredSet = useMemo<Set<string>>(
    () => new Set(selectMasteredLetters({ letters })),
    [letters],
  )
  const hardCount = useMemo(
    () => selectHardLetters(letters, Date.now()).length,
    [letters],
  )

  // Mastery wall: pokazujemy tylko pulę aktywnego (lub ostatniego) poziomu.
  // Default Iskierka (6 liter) — dziecko widzi tylko to czego się uczy.
  const lastUsedLevel = persistedLastUsedLevel ?? 'iskierka'
  const visibleLetters = useMemo<readonly string[]>(
    () => levelLetterPools[lastUsedLevel],
    [lastUsedLevel],
  )

  const markIntroSeen = useLetters((s) => s.markIntroSeen)
  const hasSeenIntro = useLetters((s) => s.hasSeenIntro)

  // Onboarding głosowy — `level-select-intro` tylko 1× (sekcja 5.2).
  useEffect(() => {
    if (!hasSeenIntro(LEVEL_SELECT_INTRO_KEY)) {
      // Flaga "widziane" dopiero po faktycznym odtworzeniu (play() → true) —
      // zablokowany autoplay / brak pliku nie może skasować onboardingu.
      void audioBus.play(LEVEL_SELECT_INTRO_KEY).then((played) => {
        if (played) markIntroSeen(LEVEL_SELECT_INTRO_KEY)
      })
    }
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [celebratingLetter, setCelebratingLetter] = useState<string | null>(null)
  // Timer celebracji trzymany w refie — bez cleanupu odmontowanie ekranu w
  // trakcie animacji wołało setState na zniknionym komponencie.
  const celebrationTimerRef = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current)
      }
    },
    [],
  )

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
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current)
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      celebrationTimerRef.current = null
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
      <LevelHeader
        title="Wybierz poziom"
        titleStyle={{ fontSize: 22, margin: 0, color: colors.text }}
      />

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

      {onSelectHard !== undefined && (
        <HardLettersTile count={hardCount} onEnter={onSelectHard} audioBus={audioBus} />
      )}

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
          {visibleLetters.map((letter) => (
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
