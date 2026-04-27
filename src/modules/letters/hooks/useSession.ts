// useSession — orkiestrator sesji rozpoznawania liter.
// Sekcje 6 (pętla nauki), 7 (SRS), 10 (formy liter), 18 (data model) spec.
//
// Hook trzyma:
//   - aktualny status (preparing / playing / paused / feedback / finished)
//   - aktualne pytanie (target + 3 dystraktory + losowanie pozycji + display)
//   - timer odpowiedzi (jeśli timeLimit !== 'off')
//   - log eventów (SessionEvent[]) i licznik iskierek
//   - mapę `LetterState` (mutowaną przez `updateLetterState`)
//
// API: start / pause / resume / answer / dontKnow / quit
//
// Audio (wywoływane przez `audioBus.play(key)`, sekwencja FIFO):
//   - prompt: `letter-<x>`
//   - correct: `sfx-correct-ding` + pickPraiseKey z `praise-1..12` (no-repeat-with-last)
//              + `assoc-<x>` + opcjonalnie `streak-3` / `streak-5` / `streak-7-plus`
//   - wrong:   pickCorrectionPrefix (`correction-prefix-1..3` lub `correction-prefix-contrastive`
//              gdy chosenLetter ∈ CONTRASTIVE_PAIRS[target]) + `letter-<x>`
//   - dontKnow + timeout (scalone audio): losowy `dont-know-1..3` + losowy
//              `correction-prefix-1..3` + `letter-<x>`
//   - mastery: `sfx-mastery-fanfara` + `mastery-celebration` (+ ewentualnie streak audio)
//   - 3s warning: `cue-warning-3s` gdy zostają 3s do końca timera (tylko gdy showCountdownBar)
//   - session-end: `session-end-perfect` jeśli detectPerfectSession else `session-end`

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import type {
  CaseMode,
  CelebrationTempo,
  Level,
  StyleMode,
  TimeLimit,
} from '@/shared/settings/types'
import {
  pickPraiseKey,
  pickCorrectionPrefix,
  streakIntensity,
  streakAudioKey,
  detectPerfectSession,
  CORRECTION_PREFIX_KEYS,
  type PraiseKey,
} from './useSession.pickers'
import type { IskraIntensity } from '@/shared/ui/IskraMascot'
import { CONTRASTIVE_PAIRS } from '@/modules/letters/data/contrastivePairs'
import { getAssociation } from '@/modules/letters/data/associations'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import { pickDistractors } from '@/shared/srs/distractors'
import { pickNextLetter } from '@/shared/srs/select'
import { updateLetterState } from '@/shared/srs/update'
import type {
  DisplayCase,
  DisplayStyle,
  FeedbackState,
  FeedbackVariant,
  LetterState,
  Outcome,
  Question,
  SessionEvent,
  SessionLog,
  SessionStatus,
  Slot,
} from '@/modules/letters/types'

/** Konfiguracja wejściowa hooka — sesja zna swoje parametry "od strzału". */
export type UseSessionConfig = {
  level: Level
  activeLetters: string[]
  sessionLength: number
  timeLimit: TimeLimit
  showCountdownBar: boolean
  caseMode: CaseMode
  styleMode: StyleMode
  celebrationTempo: CelebrationTempo
  /** Liczba kafelków na pytanie (1 target + N-1 dystraktorów). Default 4. */
  tilesPerQuestion?: number
  /** Initialny słownik `LetterState` (z lettersStore lub czysty). */
  initialStates?: Record<string, LetterState>
  /**
   * Callback końca sesji — przekazujemy SessionLog + zaktualizowane state'y.
   * (lettersStore zapisze je w localStorage; tu hook jest pure logic + audio)
   */
  onSessionEnd?: (log: SessionLog, updatedStates: Record<string, LetterState>) => void
  /** Wstrzykiwany audioBus — dla testów. Default: singleton. */
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
  /** RNG — dla deterministycznych testów. */
  rng?: () => number
  /** `now()` — fake clock w testach. */
  now?: () => number
  /** Generator UUID dla SessionLog. */
  uuid?: () => string
}

export type UseSessionApi = {
  status: SessionStatus
  currentQuestion: Question | null
  questionNumber: number // 1-based, dla UX (np. "5/10")
  totalQuestions: number
  iskierki: number
  /** Aktualny streak w sesji (resetowany po dowolnej nie-correct). */
  currentStreak: number
  /** Intensywność mascotki w status barze QuizCard (z streak'a). */
  mascotIntensity: IskraIntensity
  countdownMs: number | null
  countdownTotalMs: number | null
  lastFeedback: FeedbackState | null
  sessionEvents: SessionEvent[]
  start: () => void
  pause: (reason?: 'manual' | 'idle' | 'visibility') => void
  resume: () => void
  answer: (chosenLetter: string, position: Slot) => void
  dontKnow: () => void
  quit: () => void
}

const DONTKNOW_KEYS = ['dont-know-1', 'dont-know-2', 'dont-know-3'] as const

// Czas trzymania feedback overlay — pokrywa audio sequence + ~1s buffer "po-audio".
// Wartości audio zmierzone afinfo na public/audio/*.mp3 (Edge TTS PL Zofia).
// PILNUJ: każda zmiana w `audio-source/` może wymagać re-pomiaru (komenda:
// `afinfo public/audio/<key>.mp3 | grep duration`). Audio-driven dismissal
// (czekanie na koniec kolejki) byłoby porządniejsze, ale sztywny timer jest
// prostszy i deterministyczny w testach.
//
// 7-latek potrzebuje ~1s na uświadomienie sobie pochwały/korekty PO tym
// jak nagranie skończy mówić. Bez tego buforu ekran zmienia się w środku
// "wybrzmiewania" — czujemy że za szybko leci.
//   - correct:  sfx-ding (1.8s) + praise (~1.5s) + assoc "X jak Y" (~1.9s) ≈ 5.2s → 6500
//   - wrong:    correction-prefix (~2.1s) + letter (~1.2s) ≈ 3.3s → 5500
//   - dontKnow: dont-know (~1.7s) + correction-prefix (~2.1s) + letter (~1.2s) ≈ 5.0s → 7000
//   - timeout:  identyczne audio jak dontKnow ≈ 5.0s → 7000
//   - mastery:  sfx-fanfara (2.1s) + mastery-celebration (3.3s) ≈ 5.4s → 7000
//               (streak audio dorzucany przez STREAK_AUDIO_DURATION_MS gdy próg)
const FEEDBACK_DURATION_BASE_MS: Record<FeedbackVariant, number> = {
  correct: 6500,
  wrong: 5500,
  dontKnow: 7000,
  timeout: 7000,
  mastery: 7000,
}

const TEMPO_MULTIPLIERS: Record<CelebrationTempo, number> = {
  short: 0.7,
  medium: 1.0,
  long: 1.4,
}

const COUNTDOWN_TICK_MS = 100
// Cue "uwaga, mało czasu" leci ~1s; 3s zostawia dziecku ~2s realnej reakcji
// po skończeniu cue. Wcześniej było 5s — krzyczeło za wcześnie (na 1/3 czasu).
const COUNTDOWN_3S_WARNING_MS = 3000
// "Wdech" między feedback overlay a kolejnym pytaniem — daje dziecku
// chwilę na reset uwagi. AudioBus.stop() na końcu wdechu czyści ogon
// poprzedniego audio (np. niedokończony streak audio) przed nowym promptem.
// Wcześniej 500ms — za szybkie przejście, dziecko nie nadążało reseet uwagi
// po wybrzmiewaniu pochwały/korekty. 1200ms = wyraźna pauza ale nie nudna.
const POST_FEEDBACK_BREATH_MS = 1200
// Górny bound dla najdłuższego streak audio ("ognisty streak!" ~1.6-1.9s
// w Edge TTS PL Zofia). Dorzucany do feedback duration tylko gdy próg streak
// osiągnięty — inaczej overlay zniknie przed końcem audio.
const STREAK_AUDIO_DURATION_MS = 2000

function defaultUuid(): string {
  // Krótki UUID-lite — dla testów i logów wystarcza.
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = arr[i]
    const b = arr[j]
    if (a !== undefined && b !== undefined) {
      arr[i] = b
      arr[j] = a
    }
  }
  return arr
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  const idx = Math.floor(rng() * arr.length)
  // Cast bezpieczny — arr.length > 0 zakłada wywołanie tylko z niepustą listą.
  return arr[idx] as T
}

function caseModeToInitialChosenCase(mode: CaseMode): 'upper' | 'lower' {
  switch (mode) {
    case 'tylko-duze':
      return 'upper'
    case 'tylko-male':
      return 'lower'
    case 'para':
      return 'lower' // pair pokazuje obie, ale do statystyk per-case zaliczamy lower
    case 'mieszane':
      return 'lower' // override w generatorze pytania
  }
}

function pickStyleForQuestion(
  mode: StyleMode,
  questionIndex: number,
  rng: () => number,
): DisplayStyle {
  switch (mode) {
    case 'tylko-drukowane':
      return 'print'
    case 'tylko-pisane':
      return 'handwritten'
    case 'mieszane-per-pytanie':
      // Naprzemiennie: 0 -> print, 1 -> handwritten, 2 -> print...
      return questionIndex % 2 === 0 ? 'print' : 'handwritten'
    case 'oba-na-kafelku':
      // Oba style są na kafelku — wybór "głównego" do statystyk: losowy.
      return rng() < 0.5 ? 'print' : 'handwritten'
  }
}

function pickCaseForQuestion(
  mode: CaseMode,
  rng: () => number,
): 'upper' | 'lower' {
  if (mode === 'mieszane') {
    return rng() < 0.5 ? 'upper' : 'lower'
  }
  return caseModeToInitialChosenCase(mode)
}

function styleModeImpliesBoth(mode: StyleMode): boolean {
  return mode === 'oba-na-kafelku'
}

function caseModeImpliesPair(mode: CaseMode): boolean {
  return mode === 'para'
}

function deriveDisplayCase(
  caseMode: CaseMode,
  chosenCase: 'upper' | 'lower',
): DisplayCase {
  if (caseMode === 'para') return 'pair'
  return chosenCase
}

function timeLimitToMs(limit: TimeLimit): number | null {
  if (limit === 'off') return null
  return limit * 1000
}

/**
 * useSession — pełny lifecycle sesji dla quizu liter.
 */
export function useSession(config: UseSessionConfig): UseSessionApi {
  const {
    level,
    activeLetters,
    sessionLength,
    timeLimit,
    showCountdownBar,
    caseMode,
    styleMode,
    celebrationTempo,
    tilesPerQuestion = 4,
    initialStates,
    onSessionEnd,
    audioBus = defaultAudioBus,
    rng = Math.random,
    now = () => Date.now(),
    uuid = defaultUuid,
  } = config

  // Stable ref na konfig — używany w callbackach (np. `answer`) bez listy
  // dependencji równej wszystkim polom.
  const cfgRef = useRef({
    activeLetters,
    sessionLength,
    timeLimit,
    showCountdownBar,
    caseMode,
    styleMode,
    celebrationTempo,
    tilesPerQuestion,
    rng,
    now,
    audioBus,
    onSessionEnd,
    level,
  })
  cfgRef.current = {
    activeLetters,
    sessionLength,
    timeLimit,
    showCountdownBar,
    caseMode,
    styleMode,
    celebrationTempo,
    tilesPerQuestion,
    rng,
    now,
    audioBus,
    onSessionEnd,
    level,
  }

  const [status, setStatus] = useState<SessionStatus>('preparing')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [iskierki, setIskierki] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [lastFeedback, setLastFeedback] = useState<FeedbackState | null>(null)
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
  const [countdownMs, setCountdownMs] = useState<number | null>(null)
  const [currentStreak, setCurrentStreak] = useState(0)
  const lastPraiseKeyRef = useRef<PraiseKey | null>(null)
  const currentStreakRef = useRef<number>(0)

  // Imperatywny stan, którego nie chcemy renderować — w refach.
  const sessionIdRef = useRef<string>('')
  const startedAtRef = useRef<number>(0)
  const lastTargetRef = useRef<string | null>(null)
  const statesRef = useRef<Record<string, LetterState>>({})
  const countdownTotalMsRef = useRef<number | null>(null)
  const countdownStartedAtRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warned3sRef = useRef<boolean>(false)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishedRef = useRef<boolean>(false)
  const eventsRef = useRef<SessionEvent[]>([])
  const iskierkiRef = useRef<number>(0)
  const questionStartedAtRef = useRef<number>(0)
  // Flag: pause został wyzwolony podczas status='feedback' (przerywając
  // pipeline feedback→breath→next-question). Resume rekonstruuje pipeline.
  const pausedDuringFeedbackRef = useRef<boolean>(false)
  // Pamiętany efektywny duration ostatniego feedbacku (z extra streak/mastery audio)
  // — używany przy resume po pauzie podczas feedback.
  const lastFeedbackEffectiveMsRef = useRef<number>(0)

  // Init letter states z poolu (lub początkowych jeśli przekazane).
  const initActiveLettersStableRef = useRef<string[]>(activeLetters)
  initActiveLettersStableRef.current = activeLetters

  // Reset state'ów przy pierwszym mountcie / zmianie aktywnej puli.
  useEffect(() => {
    const initial = initialStates ?? {}
    const next: Record<string, LetterState> = {}
    for (const letter of activeLetters) {
      next[letter] = initial[letter] ?? createInitialLetterState(letter)
    }
    statesRef.current = next
    // celowo NIE listujemy initialStates — jest przekazane przez parent raz,
    // a reaktywne aktualizacje state'ów żyją wewnątrz hooka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLetters])

  const pushEvent = useCallback((ev: SessionEvent) => {
    eventsRef.current = [...eventsRef.current, ev]
    setSessionEvents(eventsRef.current)
  }, [])

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    countdownStartedAtRef.current = null
    countdownTotalMsRef.current = null
    warned3sRef.current = false
    setCountdownMs(null)
  }, [])

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
  }, [])

  // Forward-ref na handleOutcome — ustawiany po jego definicji.
  const handleOutcomeRef = useRef<
    ((outcome: Outcome, chosenLetter?: string, chosenSlot?: Slot) => void) | null
  >(null)

  // Forward-ref na scheduleFeedbackDismiss — używany przez handleOutcome
  // (definiowany powyżej) oraz resume (rekonstrukcja po pauzie podczas feedback).
  const scheduleFeedbackDismissRef = useRef<(effectiveMs: number) => void>(() => {
    // no-op zanim zostanie nadpisany podczas pierwszego renderu
  })

  const startCountdown = useCallback(() => {
    const cfg = cfgRef.current
    const total = timeLimitToMs(cfg.timeLimit)
    if (total === null) {
      countdownTotalMsRef.current = null
      setCountdownMs(null)
      return
    }
    countdownTotalMsRef.current = total
    countdownStartedAtRef.current = cfg.now()
    warned3sRef.current = false
    setCountdownMs(total)
    countdownIntervalRef.current = setInterval(() => {
      const startedAt = countdownStartedAtRef.current
      const totalMs = countdownTotalMsRef.current
      if (startedAt === null || totalMs === null) return
      const elapsed = cfgRef.current.now() - startedAt
      const remaining = Math.max(0, totalMs - elapsed)
      setCountdownMs(remaining)
      if (
        !warned3sRef.current &&
        cfgRef.current.showCountdownBar &&
        remaining <= COUNTDOWN_3S_WARNING_MS &&
        remaining > 0
      ) {
        warned3sRef.current = true
        void cfgRef.current.audioBus.play('cue-warning-3s')
      }
      if (remaining <= 0) {
        clearCountdown()
        // Timeout = jak "nie wiem", ale outcome = 'timeout'
        handleOutcomeRef.current?.('timeout', undefined, undefined)
      }
    }, COUNTDOWN_TICK_MS)
  }, [clearCountdown])

  const generateNextQuestion = useCallback(() => {
    const cfg = cfgRef.current
    const states = Object.values(statesRef.current)
    const target = pickNextLetter(
      states,
      cfg.activeLetters,
      lastTargetRef.current,
      cfg.now(),
      cfg.rng,
    )
    const targetState = statesRef.current[target]
    if (!targetState) {
      throw new Error(`useSession: brak state dla litery "${target}"`)
    }
    // Clamp tilesPerQuestion do rozmiaru aktywnej puli — gdy user ma override
    // puli mniejszy niż wybrane tilesPerQuestion (np. pula = 4 a setting = 6),
    // używamy tylu kafelków ile pula pozwala (target + reszta jako dystraktory).
    const safeTilesPerQuestion = Math.min(
      cfg.tilesPerQuestion,
      cfg.activeLetters.length,
    )
    const distractorCount = Math.max(1, safeTilesPerQuestion - 1)
    const distractors = pickDistractors(
      target,
      cfg.activeLetters,
      targetState,
      // pickDistractors czyta tylko `contrastivePairs[target]` — readonly OK.
      CONTRASTIVE_PAIRS,
      cfg.rng,
      distractorCount,
    )
    const tiles = shuffleInPlace([target, ...distractors], cfg.rng)
    const targetSlot = tiles.indexOf(target) as Slot
    const chosenStyle = pickStyleForQuestion(
      cfg.styleMode,
      questionNumber,
      cfg.rng,
    )
    const chosenCase = pickCaseForQuestion(cfg.caseMode, cfg.rng)
    const ts = cfg.now()
    questionStartedAtRef.current = ts

    const question: Question = {
      index: questionNumber,
      targetLetter: target,
      tiles,
      targetSlot,
      chosenCase,
      chosenStyle,
      pairOnTile: caseModeImpliesPair(cfg.caseMode),
      bothStyles: styleModeImpliesBoth(cfg.styleMode),
      startedAt: ts,
    }

    setCurrentQuestion(question)
    pushEvent({
      type: 'question-start',
      ts,
      targetLetter: target,
      distractors,
      positions: tiles.map((_, i) => i as Slot),
      style: chosenStyle,
      case: deriveDisplayCase(cfg.caseMode, chosenCase),
    })

    lastTargetRef.current = target

    // Audio: prompt fonem dla nowej litery — kolejka AudioBus naturalnie
    // poczeka aż poprzedni feedback ("X jak Y") się skończy. NIE wołamy
    // stop() bo to obcięłoby końcówkę asocjacji.
    void cfg.audioBus.play(`letter-${target}`)

    // Timer
    startCountdown()
  }, [pushEvent, questionNumber, startCountdown])

  const finishSession = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearCountdown()
    clearFeedbackTimer()
    setStatus('finished')
    setCurrentQuestion(null)
    const isPerfect = detectPerfectSession(eventsRef.current, cfgRef.current.sessionLength)
    void cfgRef.current.audioBus.play(isPerfect ? 'session-end-perfect' : 'session-end')

    const log: SessionLog = {
      id: sessionIdRef.current,
      startedAt: startedAtRef.current,
      endedAt: cfgRef.current.now(),
      level: cfgRef.current.level,
      events: eventsRef.current,
    }
    cfgRef.current.onSessionEnd?.(log, { ...statesRef.current })
  }, [clearCountdown, clearFeedbackTimer])

  const handleOutcome = useCallback(
    (outcome: Outcome, chosenLetter: string | undefined, chosenSlot: Slot | undefined) => {
      const cfg = cfgRef.current
      const q = currentQuestionRef.current
      if (!q) return
      const ts = cfg.now()
      const responseMs = ts - questionStartedAtRef.current
      const target = q.targetLetter
      const targetState = statesRef.current[target]
      if (!targetState) return

      // Update SRS
      const displayStyle = q.chosenStyle
      const displayCase = deriveDisplayCase(cfg.caseMode, q.chosenCase)
      const [updated, meta] = updateLetterState(
        targetState,
        outcome,
        responseMs,
        ts,
        displayStyle,
        displayCase,
        chosenLetter,
      )
      statesRef.current = { ...statesRef.current, [target]: updated }

      // Iskierki
      if (outcome === 'correct') {
        iskierkiRef.current += 1
        setIskierki(iskierkiRef.current)
      }

      // Event
      const answerEvent: SessionEvent = {
        type: 'answer',
        ts,
        outcome,
        responseMs,
        ...(chosenLetter !== undefined ? { chosenLetter } : {}),
        ...(chosenSlot !== undefined ? { chosenPosition: chosenSlot } : {}),
      }
      pushEvent(answerEvent)

      clearCountdown()

      // Audio + feedback
      const variant: FeedbackVariant = meta.firstMastery
        ? 'mastery'
        : outcome === 'correct'
          ? 'correct'
          : outcome === 'wrong'
            ? 'wrong'
            : outcome === 'dontKnow'
              ? 'dontKnow'
              : 'timeout'

      const tempo = TEMPO_MULTIPLIERS[cfg.celebrationTempo]
      const baseDuration = FEEDBACK_DURATION_BASE_MS[variant]
      const durationMs = Math.round(baseDuration * tempo)

      setLastFeedback({
        variant,
        targetLetter: target,
        durationMs,
        ...(chosenLetter !== undefined ? { chosenLetter } : {}),
        ...(chosenSlot !== undefined ? { chosenSlot } : {}),
      })
      setStatus('feedback')

      // Audio sequence (non-blocking) + streak update
      const isCorrectOutcome = outcome === 'correct'
      const newStreak = isCorrectOutcome ? currentStreakRef.current + 1 : 0
      currentStreakRef.current = newStreak
      setCurrentStreak(newStreak)

      let extraDurationMs = 0

      switch (variant) {
        case 'correct': {
          void cfg.audioBus.play('sfx-correct-ding')
          const praiseKey = pickPraiseKey(lastPraiseKeyRef.current, cfg.rng)
          lastPraiseKeyRef.current = praiseKey
          void cfg.audioBus.play(praiseKey)
          try {
            const assoc = getAssociation(target)
            void cfg.audioBus.play(assoc.audioKey)
          } catch {
            // brak asocjacji = pomijamy bez kruszenia hooka
          }
          // Streak audio (jeśli próg)
          const skey = streakAudioKey(newStreak)
          if (skey !== null) {
            void cfg.audioBus.play(skey)
            extraDurationMs += STREAK_AUDIO_DURATION_MS
          }
          break
        }
        case 'wrong': {
          const prefixKey = pickCorrectionPrefix(
            target,
            chosenLetter ?? '',
            CONTRASTIVE_PAIRS as Record<string, readonly string[]>,
            cfg.rng,
          )
          void cfg.audioBus.play(prefixKey)
          void cfg.audioBus.play(`letter-${target}`)
          break
        }
        case 'dontKnow':
        case 'timeout': {
          // Scalone audio — dla obu wariantów leci ten sam zestaw
          void cfg.audioBus.play(pickRandom(DONTKNOW_KEYS, cfg.rng))
          void cfg.audioBus.play(pickRandom(CORRECTION_PREFIX_KEYS, cfg.rng))
          void cfg.audioBus.play(`letter-${target}`)
          break
        }
        case 'mastery': {
          void cfg.audioBus.play('sfx-mastery-fanfara')
          void cfg.audioBus.play('mastery-celebration')
          // Mastery dziedziczy streak (firstMastery zawsze == correct outcome).
          // Jeśli próg streak osiągnięty, dorzucamy też streak audio — dziecko
          // dostaje pełen "wow" zamiast cichego pominięcia.
          const skey = streakAudioKey(newStreak)
          if (skey !== null) {
            void cfg.audioBus.play(skey)
            extraDurationMs += STREAK_AUDIO_DURATION_MS
          }
          break
        }
      }

      // Po feedbacku — następne pytanie lub koniec.
      // Sekwencja: durationMs+extra → zamknij overlay → 500ms wdech → next.
      // Status pozostaje 'feedback' przez cały wdech (kafelki disabled), co
      // chroni przed re-tap na stare pytanie. `setStatus('playing')` dopiero
      // gdy generujemy nowe pytanie.
      lastFeedbackEffectiveMsRef.current = durationMs + extraDurationMs
      scheduleFeedbackDismissRef.current(durationMs + extraDurationMs)
    },
    [clearCountdown, pushEvent],
  )

  // Refs równoległe do state'u: wewnątrz callbacków używamy ref-version żeby
  // uniknąć stale closures. Synchronicznie podczas renderowania, bo użycie
  // useEffect byłoby zbyt późne dla timera/feedback timera.
  const currentQuestionRef = useRef<Question | null>(null)
  const questionNumberRef = useRef<number>(0)
  currentQuestionRef.current = currentQuestion
  questionNumberRef.current = questionNumber

  // Wpinamy handleOutcome do forward-ref synchronicznie podczas renderowania —
  // useEffect byłby za późno dla timera ustawionego w obrębie render-effect chain.
  handleOutcomeRef.current = handleOutcome

  // Pipeline po feedbacku: timer1 (effectiveMs) zamyka overlay i utrzymuje
  // status='feedback' przez wdech (kafelki disabled — chroni przed re-tap).
  // Timer2 (POST_FEEDBACK_BREATH_MS) flipuje na 'playing' i generuje next.
  const scheduleFeedbackDismiss = useCallback(
    (effectiveMs: number) => {
      clearFeedbackTimer()
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null
        const nextNum = questionNumberRef.current + 1
        if (nextNum >= cfgRef.current.sessionLength) {
          finishSession()
          return
        }
        // Zamykamy overlay (lastFeedback=null) ale status pozostaje 'feedback'
        // — kafelki disabled, dziecko nie może re-tapnąć starego pytania.
        setLastFeedback(null)
        feedbackTimerRef.current = setTimeout(() => {
          feedbackTimerRef.current = null
          // Czyścimy kolejkę audio przed nowym promptem (urywa ewentualny
          // ogon streak audio — dla 7-latka 100-200ms ucięcia niedostrzegalne).
          cfgRef.current.audioBus.stop()
          questionNumberRef.current = nextNum
          setQuestionNumber(nextNum)
          setStatus('playing')
          generateNextQuestion()
        }, POST_FEEDBACK_BREATH_MS)
      }, effectiveMs)
    },
    [clearFeedbackTimer, finishSession, generateNextQuestion],
  )
  scheduleFeedbackDismissRef.current = scheduleFeedbackDismiss

  const start = useCallback(() => {
    if (status !== 'preparing' && status !== 'finished') {
      return
    }
    const cfg = cfgRef.current
    // czyścimy kolejkę audio z ewentualnych pozostałości (poprzednie sesje,
    // niedokończone intro itp.) — żeby pierwsze pytanie miało czystą scenę
    cfg.audioBus.stop()
    sessionIdRef.current = uuid()
    startedAtRef.current = cfg.now()
    eventsRef.current = []
    setSessionEvents([])
    iskierkiRef.current = 0
    setIskierki(0)
    questionNumberRef.current = 0
    setQuestionNumber(0)
    lastTargetRef.current = null
    finishedRef.current = false
    setLastFeedback(null)
    currentStreakRef.current = 0
    setCurrentStreak(0)
    lastPraiseKeyRef.current = null
    // re-init letter states zgodnie z aktywną pulą
    const initial = initialStates ?? {}
    const next: Record<string, LetterState> = {}
    for (const letter of cfg.activeLetters) {
      next[letter] = initial[letter] ?? createInitialLetterState(letter)
    }
    statesRef.current = next

    setStatus('playing')
    generateNextQuestion()
  }, [generateNextQuestion, initialStates, status, uuid])

  const pause = useCallback(
    (reason: 'manual' | 'idle' | 'visibility' = 'manual') => {
      if (status !== 'playing' && status !== 'feedback') return
      // Zapamiętaj że pauza złapała feedback w trakcie — resume musi
      // ponowić scheduleFeedbackDismiss, bo clearFeedbackTimer urywa pipeline.
      pausedDuringFeedbackRef.current = status === 'feedback'
      clearCountdown()
      clearFeedbackTimer()
      pushEvent({ type: 'pause', ts: cfgRef.current.now(), reason })
      void cfgRef.current.audioBus.play('nav-pause')
      setStatus('paused')
    },
    [clearCountdown, clearFeedbackTimer, pushEvent, status],
  )

  const resume = useCallback(() => {
    if (status !== 'paused') return
    pushEvent({ type: 'resume', ts: cfgRef.current.now() })
    void cfgRef.current.audioBus.play('nav-resume')

    // Jeśli pauza złapała feedback w trakcie — odtwórz pipeline od nowa
    // (overlay nadal w lastFeedback, czas resetujemy do pełnej długości
    // żeby dziecko zobaczyło/usłyszało feedback ponownie po wznowieniu).
    if (pausedDuringFeedbackRef.current) {
      pausedDuringFeedbackRef.current = false
      setStatus('feedback')
      scheduleFeedbackDismissRef.current(lastFeedbackEffectiveMsRef.current)
      return
    }

    setStatus('playing')
    // restart timer dla bieżącego pytania od pełnej długości — uczciwie wobec dziecka
    if (currentQuestionRef.current) {
      questionStartedAtRef.current = cfgRef.current.now()
      startCountdown()
    }
  }, [pushEvent, startCountdown, status])

  const answer = useCallback(
    (chosenLetter: string, position: Slot) => {
      if (status !== 'playing') return
      const q = currentQuestionRef.current
      if (!q) return
      const outcome: Outcome = chosenLetter === q.targetLetter ? 'correct' : 'wrong'
      handleOutcome(outcome, chosenLetter, position)
    },
    [handleOutcome, status],
  )

  const dontKnow = useCallback(() => {
    if (status !== 'playing') return
    // Natychmiastowy cue na tap — spec "każdy klik mówi co zrobił".
    // Bez tego dziecko czeka 200-400ms aż handleOutcome ustawi feedback
    // i nie ma pewności czy "Nie wiem" zarejestrowane.
    void cfgRef.current.audioBus.play('nav-tap')
    handleOutcome('dontKnow', undefined, undefined)
  }, [handleOutcome, status])

  const quit = useCallback(() => {
    if (finishedRef.current) return
    finishSession()
  }, [finishSession])

  // Cleanup przy unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current)
      }
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const totalQuestions = sessionLength
  const countdownTotalMs = countdownTotalMsRef.current

  // showCountdownBar: gdy false, pokazujemy `null` zewnętrznie żeby UI nie
  // renderował paska (logika wewnątrz timera nadal działa).
  const exposedCountdownMs = useMemo(() => {
    if (!showCountdownBar) return null
    return countdownMs
  }, [showCountdownBar, countdownMs])

  const exposedCountdownTotalMs = useMemo(() => {
    if (!showCountdownBar) return null
    return countdownTotalMs
  }, [showCountdownBar, countdownTotalMs])

  return {
    status,
    currentQuestion,
    questionNumber: questionNumber + 1,
    totalQuestions,
    iskierki,
    currentStreak,
    mascotIntensity: streakIntensity(currentStreak),
    countdownMs: exposedCountdownMs,
    countdownTotalMs: exposedCountdownTotalMs,
    lastFeedback,
    sessionEvents,
    start,
    pause,
    resume,
    answer,
    dontKnow,
    quit,
  }
}
