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
import { ASSOCIATIONS } from '@/modules/letters/data/associations'
import { configLevelForHard } from '@/modules/letters/data/hardLetters'
import { dayKey, pickDailyLetter } from '@/modules/letters/data/dailyLetter'
import type { DailyLetter } from '@/modules/letters/store/lettersStore'
import type { LetterState, SessionLog } from '@/modules/letters/types'
import { SessionView } from './SessionView'

const DAILY_INTRO_KEY = 'letters-daily-intro'
const DAILY_END_KEY = 'letters-daily-end'

/** Ile razy litera pokazuje się w mikrosesji. */
export const DAILY_EXPOSURES = 4

/** Minimum, przez które kotwica słowna (emoji + wyraz) zostaje na ekranie. */
const MIN_WORD_ANCHOR_MS = 1500

/** Bezpiecznik: nawet gdy kolejka audio utknie, po tym czasie wracamy na Home. */
const MAX_WORD_ANCHOR_MS = 8000

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
  /**
   * Koniec mikrosesji — wyjście na Home. Klucz doby = oznacz dobę jako
   * zrobioną; `null` = wychodzimy bez zaliczenia (pauza/pusta pula).
   */
  onDone: (doneDayKey: string | null) => void
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
      // Wyjście przez pauzę też kończy sesję (`quit()` → `finishSession`) —
      // po 1-2 ekspozycjach doba NIE może być zaliczona. Drugie podejścia
      // (`attempt: 2`) to to samo pytanie, więc się nie liczą.
      const answered = log.events.filter(
        (e) => e.type === 'answer' && e.attempt !== 2,
      ).length
      if (answered < DAILY_EXPOSURES) {
        onDoneRef.current(null)
        return
      }
      // Przełączenie fazy w tym samym batchu co `status: 'finished'` sprawia,
      // że `SessionEnd` nigdy się nie renderuje.
      setPhase('word')
    },
    [onSessionComplete],
  )

  // Bezpieczny lookup: litera spoza alfabetu (stary persist, ręczna pula)
  // nie może wysadzić ekranu dziecka wyjątkiem z `getAssociation`.
  const assoc = today ? (ASSOCIATIONS[today.letter] ?? null) : null

  // Kotwica słowna: emoji + wyraz, potem pożegnanie i wyjście. Czekamy na
  // KONIEC obu klipów — inaczej `letters-daily-end` (3.6 s) dogrywa się już
  // na Home, a wyraz zostaje ucięty.
  useEffect(() => {
    if (phase !== 'word' || !assoc || !today) return
    const doneDayKey = today.dayKey
    const audioKey = assoc.audioKey
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms))
      })

    void (async () => {
      const spoken = (async () => {
        await audioBus.play(audioKey)
        await audioBus.play(DAILY_END_KEY)
      })()
      // `play()` może rozstrzygnąć się natychmiast na `false` (brak pliku,
      // zablokowany autoplay) — minimum trzyma kotwicę na ekranie, maksimum
      // chroni przed utknięciem na zawsze.
      await Promise.all([
        Promise.race([spoken, sleep(MAX_WORD_ANCHOR_MS)]),
        sleep(MIN_WORD_ANCHOR_MS),
      ])
      if (cancelled) return
      onDoneRef.current(doneDayKey)
    })()

    return () => {
      cancelled = true
      for (const timer of timers) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Pusta pula (override rodzica bez liter) albo litera bez asocjacji — nie ma
  // czego ćwiczyć, więc wychodzimy BEZ zaliczania doby.
  useEffect(() => {
    if (today === null || assoc === null) onDoneRef.current(null)
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
      settings={settings}
      {...(initialStates !== undefined ? { initialStates } : {})}
      onExit={() => onDoneRef.current(null)}
      onSessionComplete={handleSessionComplete}
      audioBus={audioBus}
      {...(quitRef !== undefined ? { quitRef } : {})}
    />
  )
}
