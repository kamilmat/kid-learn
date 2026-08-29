// DailyLetterSession — „Literka dnia": mikrosesja 60-90 s wokół JEDNEJ litery.
//
// Świadomie bez `SessionEnd`, iskierek na koniec i sugestii poziomu — to ma być
// krótkie „przywitanie z literką", a nie sesja. Cztery ekspozycje pod rząd
// (masowana powtórka) + kotwica słowna na koniec; wyniki lecą do SRS normalnie.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { getActiveLetterPool } from '@/shared/settings/defaults'
import type { Settings } from '@/shared/settings/types'
import type { SessionLog as StatsSessionLog } from '@/shared/stats/types'
import { colors, radii } from '@/app/theme'
import { getAssociation } from '@/modules/letters/data/associations'
import { configLevelForHard } from '@/modules/letters/data/hardLetters'
import { dayKey, pickDailyLetter } from '@/modules/letters/data/dailyLetter'
import type { DailyLetter } from '@/modules/letters/store/lettersStore'
import type { LetterState, SessionLog } from '@/modules/letters/types'
import { SessionView } from './SessionView'

const DAILY_INTRO_KEY = 'letters-daily-intro'
const DAILY_END_KEY = 'letters-daily-end'

/** Ile razy litera pokazuje się w mikrosesji. */
export const DAILY_EXPOSURES = 4

// Mikrosesja ma 4 pytania, więc domyślne „co 5." nigdy by nie trafiło.
// Drugie pytanie jest odwrotne: dziecko zdążyło już usłyszeć literę raz.
const DAILY_REVERSE_INDICES = [1]

/** Ile trwa ekran kotwicy słownej (emoji + wyraz) zanim wrócimy na Home. */
const WORD_ANCHOR_MS = 2500

export type DailyLetterSessionProps = {
  settings: Settings
  /** Cała mapa `LetterState` ze store'u — z niej liczymy literkę dnia. */
  letters: Record<string, LetterState>
  /** Historia sesji — z niej bierzemy poziom, z którego kopiujemy config. */
  sessions: readonly StatsSessionLog[]
  /** Zapamiętana literka dnia (może być z wczoraj albo pusta). */
  dailyLetter: DailyLetter | null
  /** Inicjalne state'y dla PEŁNEJ puli poziomu (z `selectLetterStateMap`). */
  initialStates?: Record<string, LetterState>
  /** Woła się tylko gdy literkę trzeba było wylosować na dziś. */
  onPickLetter: (picked: DailyLetter) => void
  onSessionComplete?: (
    log: SessionLog,
    updatedStates: Record<string, LetterState>,
  ) => void
  /** Koniec mikrosesji — oznacz dobę jako zrobioną i wyjdź na Home. */
  onDone: (doneDayKey: string) => void
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
  quitRef?: RefObject<(() => void) | null>
  /** `now()` — fake clock w testach. */
  now?: () => number
}

export function DailyLetterSession({
  settings,
  letters,
  sessions,
  dailyLetter,
  initialStates,
  onPickLetter,
  onSessionComplete,
  onDone,
  audioBus = defaultAudioBus,
  quitRef,
  now = () => Date.now(),
}: DailyLetterSessionProps) {
  const nowRef = useRef(now)
  nowRef.current = now
  const onPickRef = useRef(onPickLetter)
  onPickRef.current = onPickLetter
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const level = useMemo(() => configLevelForHard(sessions), [sessions])

  // Literkę czytamy RAZ, w inicjalizatorze — zmiana daty (albo zapis SRS)
  // w trakcie mikrosesji nie może przelosować litery pod dzieckiem.
  const [today] = useState(() => {
    const ts = nowRef.current()
    const key = dayKey(ts)
    if (dailyLetter && dailyLetter.dayKey === key) return dailyLetter
    const pool = getActiveLetterPool(settings, configLevelForHard(sessions))
    const picked = pickDailyLetter(letters, pool, ts)
    return picked ? { letter: picked, dayKey: key } : null
  })

  // Zapis wylosowanej litery to side effect — nie może polecieć w renderze.
  useEffect(() => {
    if (today && today !== dailyLetter) onPickRef.current(today)
    // mount-only — `today` jest zamrożone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void audioBus.play(DAILY_INTRO_KEY)
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [phase, setPhase] = useState<'quiz' | 'word'>('quiz')

  const targetPool = useMemo(() => (today ? [today.letter] : []), [today])

  const handleSessionComplete = useCallback(
    (log: SessionLog, updatedStates: Record<string, LetterState>) => {
      onSessionComplete?.(log, updatedStates)
      // Przełączenie fazy w tym samym batchu co `status: 'finished'` sprawia,
      // że `SessionEnd` nigdy się nie renderuje.
      setPhase('word')
    },
    [onSessionComplete],
  )

  const assoc = today ? getAssociation(today.letter) : null

  // Kotwica słowna: emoji + wyraz, potem pożegnanie i wyjście.
  useEffect(() => {
    if (phase !== 'word' || !assoc || !today) return
    void audioBus.play(assoc.audioKey)
    const timer = setTimeout(() => {
      void audioBus.play(DAILY_END_KEY)
      onDoneRef.current(today.dayKey)
    }, WORD_ANCHOR_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Pusta pula (override rodzica bez liter) — nie ma czego ćwiczyć.
  useEffect(() => {
    if (today === null) onDoneRef.current(dayKey(nowRef.current()))
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!today || !assoc) return null

  if (phase === 'word') {
    return (
      <div
        data-testid="daily-letter-word"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: colors.bg,
        }}
      >
        <div aria-hidden="true" style={{ fontSize: 160, lineHeight: 1 }}>
          {assoc.emoji}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-handwritten)',
            fontSize: 56,
            fontWeight: 700,
            color: colors.text,
            padding: '8px 24px',
            borderRadius: radii.kid,
          }}
        >
          {assoc.word}
        </div>
      </div>
    )
  }

  return (
    <SessionView
      level={level}
      mode="daily"
      targetPool={targetPool}
      sessionLength={DAILY_EXPOSURES}
      forceReverseIndices={DAILY_REVERSE_INDICES}
      settings={settings}
      {...(initialStates !== undefined ? { initialStates } : {})}
      onExit={() => onDoneRef.current(today.dayKey)}
      onSessionComplete={handleSessionComplete}
      audioBus={audioBus}
      {...(quitRef !== undefined ? { quitRef } : {})}
    />
  )
}
