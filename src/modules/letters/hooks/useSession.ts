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
//   - prompt: `promptAudioKeys(<x>, promptMode)` — `phon-<slug>` i/lub
//              `letter-name-<slug>` (default `both`: nazwa, potem fonem)
//   - correct: `sfx-correct-ding` + pickPraiseKey z `praise-1..12` (no-repeat-with-last)
//              + `assoc-<x>` + opcjonalnie `streak-3` / `streak-5` / `streak-7-plus`
//   - wrong:   pickCorrectionPrefix (`correction-prefix-1..3` lub `correction-prefix-contrastive`
//              gdy chosenLetter ∈ CONTRASTIVE_PAIRS[target]) + prompt litery
//   - dontKnow + timeout (scalone audio): losowy `dont-know-1..3` + losowy
//              `correction-prefix-1..3` + prompt litery
//   - mastery: `sfx-mastery-fanfara` + `mastery-celebration` (+ ewentualnie streak audio)
//   - 3s warning: `cue-warning-3s` gdy zostają 3s do końca timera (tylko gdy showCountdownBar)
//   - session-end: `session-end-perfect` jeśli detectPerfectSession else `session-end`
//   - retry (druga próba po błędzie, gdy `secondAttempt`): `try-again` po
//     feedbacku błędu, potem to samo pytanie z 2 kafelkami bez timera;
//     poprawka gra `retry-correct` (bez dinga, bez iskierki, bez streaka).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import type {
  CaseMode,
  CelebrationTempo,
  Level,
  PromptMode,
  StyleMode,
  TimeLimit,
} from '@/shared/settings/types'
import {
  pickPraiseKey,
  pickCorrectionPrefix,
  streakIntensity,
  streakAudioKey,
  detectPerfectSession,
  type PraiseKey,
} from './useSession.pickers'
import type { IskraIntensity } from '@/shared/ui/IskraMascot'
import { promptAudioKeys } from '@/modules/letters/audio/promptKeys'
import { CONTRASTIVE_PAIRS } from '@/modules/letters/data/contrastivePairs'
import { getAssociation } from '@/modules/letters/data/associations'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import { pickDistractors, pickRandom, shuffled } from '@/shared/srs/distractors'
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
  /**
   * Druga próba po błędzie (`settings.secondAttempt`). Default `true`.
   * Pierwsza pomyłka i tak aktualizuje SRS — retry uczy autokorekty.
   */
  secondAttempt?: boolean
  /**
   * Jak brzmi prompt litery: `phoneme` („b"), `name` („be"), `both` („be… b").
   * Default `both` — nazwa identyfikuje literę, fonem jest potrzebny do scalania.
   */
  promptMode?: PromptMode
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
  /** Liczba błędnych odpowiedzi w sesji. */
  wrongCount: number
  /** Liczba odpowiedzi "Nie wiem" w sesji. */
  dontKnowCount: number
  /** Liczba odpowiedzi nieudzielonych w czasie (timeout). */
  timeoutCount: number
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
  /** Pomiń wybrzmiewanie feedback i przejdź do następnego pytania od razu. */
  skipFeedback: () => void
  /** Kończy sesję i pokazuje podsumowanie (przycisk „Wyjdź" na pauzie). */
  quit: () => void
  /**
   * Zapisuje częściowy postęp BEZ ekranu podsumowania i bez audio — wyjście
   * przez KidNav / unmount komponentu. Idempotentne.
   */
  flush: () => void
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
//   - correct:  sfx-ding (1.8s) + praise (~1.5s) ≈ 3.3s → 4500
//               (bez assoc "X jak Y" — dziecko zna literę; guzik "→" do skip)
//   - wrong:    correction-prefix-contrastive (najdłuższy z 4 wariantów, ~3.3s)
//               + prompt litery (~1.5s dla `both` = nazwa + fonem) ⇒ worst
//               ≈ 4.7s < 6300 (margines na jitter; prompt to 1-2 klipy
//               zależnie od `promptMode`)
//   - dontKnow: dont-know (~1.7s) + letter (~1.2s) + assoc "X jak Y" (~1.9s) ≈ 4.8s → 6500
//   - timeout:  identyczne audio jak dontKnow ≈ 4.8s → 6500
//   - mastery:  sfx-fanfara (2.1s) + mastery-celebration (3.3s) ≈ 5.4s → 7000
//               (streak audio dorzucany przez STREAK_AUDIO_DURATION_MS gdy próg)
export const FEEDBACK_DURATION_BASE_MS: Record<FeedbackVariant, number> = {
  correct: 4500,
  wrong: 6300,
  dontKnow: 6500,
  timeout: 6500,
  mastery: 7000,
}

// `scheduleRetry` kolejkuje "try-again" ZA wrong-feedback audio (AudioBus
// FIFO), ale timer ekranu retry liczy tylko czas wrong-feedbacku — bez tego
// bufora ekran retry potrafi wskoczyć zanim "spróbuj jeszcze raz" doigra.
export const TRY_AGAIN_CUE_MS = 1200

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
export const POST_FEEDBACK_BREATH_MS = 1200
// Górny bound dla najdłuższego streak audio ("ognisty streak!" ~1.6-1.9s
// w Edge TTS PL Zofia). Dorzucany do feedback duration tylko gdy próg streak
// osiągnięty — inaczej overlay zniknie przed końcem audio.
const STREAK_AUDIO_DURATION_MS = 2000

function defaultUuid(): string {
  // Krótki UUID-lite — dla testów i logów wystarcza.
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
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
    secondAttempt = true,
    promptMode = 'both',
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
    secondAttempt,
    promptMode,
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
    secondAttempt,
    promptMode,
    rng,
    now,
    audioBus,
    onSessionEnd,
    level,
  }

  const [status, setStatus] = useState<SessionStatus>('preparing')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [iskierki, setIskierki] = useState(0)
  // Liczniki per outcome — pokazywane w status barze i podsumowaniu sesji.
  const [wrongCount, setWrongCount] = useState(0)
  const [dontKnowCount, setDontKnowCount] = useState(0)
  const [timeoutCount, setTimeoutCount] = useState(0)
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
  const wrongCountRef = useRef<number>(0)
  const dontKnowCountRef = useRef<number>(0)
  const timeoutCountRef = useRef<number>(0)
  const questionStartedAtRef = useRef<number>(0)
  // Pytanie drugiej próby (te same litery, 2 kafelki) — budowane w
  // `scheduleRetry`, podstawiane gdy overlay błędu zniknie.
  const retryQuestionRef = useRef<Question | null>(null)
  // Druga próba jest ZAPLANOWANA, ale wciąż gra feedback błędu. Skip/resume
  // muszą wejść w retry, a nie przeskoczyć do następnego pytania.
  const retryPendingRef = useRef<boolean>(false)
  // Pauza złapana w statusie `retry` — resume musi powtórzyć `try-again`
  // (pause robi audioBus.stop(), inaczej dziecko wraca do niemego ekranu).
  const pausedDuringRetryRef = useRef<boolean>(false)
  // Podejście, którego dotyczy aktualnie wyświetlany feedback — resume po
  // pauzie musi odegrać `retry-correct`, a nie ding + pochwałę.
  const lastFeedbackAttemptRef = useRef<1 | 2>(1)
  // Flag: pause został wyzwolony podczas status='feedback' (przerywając
  // pipeline feedback→breath→next-question). Resume rekonstruuje pipeline.
  const pausedDuringFeedbackRef = useRef<boolean>(false)
  // Pamiętany efektywny duration ostatniego feedbacku (z extra streak/mastery audio)
  // — używany przy resume po pauzie podczas feedback.
  const lastFeedbackEffectiveMsRef = useRef<number>(0)
  // Feedback w refie — `resume` czyta go imperatywnie; jako dependency
  // przebudowywał callback po każdej odpowiedzi bez żadnego zysku.
  const lastFeedbackRef = useRef<FeedbackState | null>(null)
  lastFeedbackRef.current = lastFeedback

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
    | ((
        outcome: Outcome,
        chosenLetter?: string,
        chosenSlot?: Slot,
        attempt?: 1 | 2,
      ) => void)
    | null
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

  // `num` przekazujemy jawnie — `questionNumber` ze state'u jest stale w
  // momencie wywołania (setQuestionNumber jeszcze nie przerenderowało), przez
  // co indeksy pytań szły 0,0,1,2… i psuły alternację stylu w Ogniku.
  const generateNextQuestion = useCallback((num: number) => {
    const cfg = cfgRef.current
    // Obrona: nowe pytanie zamyka wątek ewentualnej niedokończonej retry
    // ścieżki (np. przerwanej pauzą/unmountem) — inaczej stale `true` mógłby
    // pomylić późniejszy `resume()`/`skipFeedback()` co do tego, gdzie jesteśmy.
    retryPendingRef.current = false
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
    const tiles = shuffled([target, ...distractors], cfg.rng)
    const targetSlot: Slot = tiles.indexOf(target)
    const chosenStyle = pickStyleForQuestion(
      cfg.styleMode,
      num,
      cfg.rng,
    )
    const chosenCase = pickCaseForQuestion(cfg.caseMode, cfg.rng)
    const ts = cfg.now()
    questionStartedAtRef.current = ts

    const question: Question = {
      index: num,
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
      positions: tiles.map((_, i): Slot => i),
      style: chosenStyle,
      case: deriveDisplayCase(cfg.caseMode, chosenCase),
    })

    lastTargetRef.current = target

    // Audio: prompt litery wg `promptMode` — kolejka AudioBus naturalnie
    // poczeka aż poprzedni feedback ("X jak Y") się skończy. NIE wołamy
    // stop() bo to obcięłoby końcówkę asocjacji.
    for (const key of promptAudioKeys(target, cfg.promptMode)) {
      void cfg.audioBus.play(key)
    }

    // Timer
    startCountdown()
  }, [pushEvent, startCountdown])

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

  /**
   * Kolejkuje audio feedbacku dla wariantu i zwraca dodatkowy czas overlaya
   * (streak audio). Wydzielone z `handleOutcome`, bo `resume` po pauzie
   * złapanej w trakcie feedbacku musi odegrać je PONOWNIE — `pause()` robi
   * `audioBus.stop()`, więc bez tego dziecko oglądało kilka sekund niemego
   * overlaya.
   */
  const playFeedbackAudio = useCallback(
    (
      variant: FeedbackVariant,
      target: string,
      chosenLetter: string | undefined,
      newStreak: number,
      attempt: 1 | 2 = 1,
    ): number => {
      const cfg = cfgRef.current
      let extraDurationMs = 0

      switch (variant) {
        case 'correct': {
          // Druga próba: cicha pochwała za autokorektę. Bez dinga, bez
          // pochwały z puli i bez streak audio — iskierki też nie ma, więc
          // fanfara byłaby obietnicą nagrody, której dziecko nie dostanie.
          if (attempt === 2) {
            void cfg.audioBus.play('retry-correct')
            break
          }
          // Bez assoc-X audio — gdy dziecko zna literę, "X jak Y" wydłuża
          // sequence niepotrzebnie. Asocjacja gra tylko dla dontKnow/timeout
          // (gdy dziecko potrzebuje wskazówki). Guzik "→ Dalej" daje opcję
          // pominięcia czekania.
          void cfg.audioBus.play('sfx-correct-ding')
          const praiseKey = pickPraiseKey(lastPraiseKeyRef.current, cfg.rng)
          lastPraiseKeyRef.current = praiseKey
          void cfg.audioBus.play(praiseKey)
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
          for (const key of promptAudioKeys(target, cfg.promptMode)) {
            void cfg.audioBus.play(key)
          }
          break
        }
        case 'dontKnow':
        case 'timeout': {
          // Scalone audio dla obu wariantów: wsparcie + litera + asocjacja.
          // Asocjacja "X jak Y" gra TYLKO tu (nie przy correct) — gdy dziecko
          // nie wiedziało, "X jak Y" pomaga zapamiętać. NIE gramy
          // correction-prefix — to było zaprojektowane dla `wrong` (komentarz
          // do błędu). Dziecko nie pomyliło się, świadomie/biernie nie
          // odpowiedziało.
          void cfg.audioBus.play(pickRandom(DONTKNOW_KEYS, cfg.rng))
          for (const key of promptAudioKeys(target, cfg.promptMode)) {
            void cfg.audioBus.play(key)
          }
          try {
            const assoc = getAssociation(target)
            void cfg.audioBus.play(assoc.audioKey)
          } catch {
            // brak asocjacji = pomijamy bez kruszenia hooka
          }
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
      return extraDurationMs
    },
    [],
  )

  /**
   * Druga próba: to samo pytanie, ale tylko dwa kafelki — poprawny i ten,
   * który dziecko wybrało. Bez timera (`startCountdown` celowo pominięty):
   * autokorekta ma być momentem myślenia, nie kolejną presją.
   */
  const scheduleRetry = useCallback(
    (q: Question, chosenLetter: string, effectiveMs: number) => {
      const cfg = cfgRef.current
      void cfg.audioBus.play('try-again')
      retryPendingRef.current = true
      const tiles = shuffled([q.targetLetter, chosenLetter], cfg.rng)
      retryQuestionRef.current = {
        ...q,
        tiles,
        targetSlot: tiles.indexOf(q.targetLetter),
      }
      clearFeedbackTimer()
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null
        retryPendingRef.current = false
        setLastFeedback(null)
        setCurrentQuestion(retryQuestionRef.current)
        questionStartedAtRef.current = cfgRef.current.now()
        setStatus('retry')
      }, effectiveMs + TRY_AGAIN_CUE_MS)
    },
    [clearFeedbackTimer],
  )

  const handleOutcome = useCallback(
    (
      outcome: Outcome,
      chosenLetter: string | undefined,
      chosenSlot: Slot | undefined,
      attempt: 1 | 2 = 1,
    ) => {
      const cfg = cfgRef.current
      const q = currentQuestionRef.current
      if (!q) return
      const ts = cfg.now()
      const responseMs = ts - questionStartedAtRef.current
      const target = q.targetLetter
      const targetState = statesRef.current[target]
      if (!targetState) return

      const displayStyle = q.chosenStyle
      const displayCase = deriveDisplayCase(cfg.caseMode, q.chosenCase)

      // SRS i liczniki sesji rusza WYŁĄCZNIE pierwsze podejście. Pierwsza
      // pomyłka to pomyłka — poprawka w drugiej próbie uczy autokorekty, ale
      // nie odkręca boxa ani nie dosypuje iskierki.
      let firstMastery = false
      if (attempt === 1) {
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
        firstMastery = meta.firstMastery

        if (outcome === 'correct') {
          iskierkiRef.current += 1
          setIskierki(iskierkiRef.current)
        } else if (outcome === 'wrong') {
          wrongCountRef.current += 1
          setWrongCount(wrongCountRef.current)
        } else if (outcome === 'dontKnow') {
          dontKnowCountRef.current += 1
          setDontKnowCount(dontKnowCountRef.current)
        } else if (outcome === 'timeout') {
          timeoutCountRef.current += 1
          setTimeoutCount(timeoutCountRef.current)
        }
      }

      // Event
      const answerEvent: SessionEvent = {
        type: 'answer',
        ts,
        outcome,
        responseMs,
        ...(chosenLetter !== undefined ? { chosenLetter } : {}),
        ...(chosenSlot !== undefined ? { chosenPosition: chosenSlot } : {}),
        ...(attempt === 2 ? { attempt: 2 as const } : {}),
      }
      pushEvent(answerEvent)

      clearCountdown()

      // Audio + feedback
      const variant: FeedbackVariant = firstMastery
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

      // Streak liczy tylko pierwsze podejście — poprawka po błędzie nie
      // wskrzesza serii, którą ten błąd właśnie zerwał.
      const newStreak =
        attempt === 1
          ? outcome === 'correct'
            ? currentStreakRef.current + 1
            : 0
          : currentStreakRef.current
      if (attempt === 1) {
        currentStreakRef.current = newStreak
        setCurrentStreak(newStreak)
      }

      const extraDurationMs = playFeedbackAudio(
        variant,
        target,
        chosenLetter,
        newStreak,
        attempt,
      )
      const effectiveMs = durationMs + extraDurationMs
      lastFeedbackEffectiveMsRef.current = effectiveMs
      lastFeedbackAttemptRef.current = attempt

      // Pierwsza pomyłka z wyborem kafelka → druga próba zamiast przejścia
      // dalej. „Nie wiem"/timeout retry NIE dostają: dziecko nie postawiło
      // hipotezy, więc nie ma czego korygować.
      if (
        outcome === 'wrong' &&
        attempt === 1 &&
        cfg.secondAttempt &&
        chosenLetter !== undefined
      ) {
        scheduleRetry(q, chosenLetter, effectiveMs)
        return
      }

      // Po feedbacku — następne pytanie lub koniec.
      // Sekwencja: durationMs+extra → zamknij overlay → wdech → next.
      // Status pozostaje 'feedback' przez cały wdech (kafelki disabled), co
      // chroni przed re-tap na stare pytanie. `setStatus('playing')` dopiero
      // gdy generujemy nowe pytanie.
      scheduleFeedbackDismissRef.current(effectiveMs)
    },
    [clearCountdown, playFeedbackAudio, pushEvent, scheduleRetry],
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
  // Timer2 — "wdech" po zamknięciu overlaya. Wydzielony, bo resume po pauzie
  // złapanej w tej fazie ma wznowić sam wdech, a nie odtwarzać od nowa pełny
  // (już niewidoczny) feedback.
  const scheduleBreathThenNext = useCallback(
    (nextNum: number) => {
      clearFeedbackTimer()
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null
        // Czyścimy kolejkę audio przed nowym promptem (urywa ewentualny
        // ogon streak audio — dla 7-latka 100-200ms ucięcia niedostrzegalne).
        cfgRef.current.audioBus.stop()
        questionNumberRef.current = nextNum
        setQuestionNumber(nextNum)
        setStatus('playing')
        generateNextQuestion(nextNum)
      }, POST_FEEDBACK_BREATH_MS)
    },
    [clearFeedbackTimer, generateNextQuestion],
  )

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
        scheduleBreathThenNext(nextNum)
      }, effectiveMs)
    },
    [clearFeedbackTimer, finishSession, scheduleBreathThenNext],
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
    wrongCountRef.current = 0
    setWrongCount(0)
    dontKnowCountRef.current = 0
    setDontKnowCount(0)
    timeoutCountRef.current = 0
    setTimeoutCount(0)
    questionNumberRef.current = 0
    setQuestionNumber(0)
    lastTargetRef.current = null
    finishedRef.current = false
    setLastFeedback(null)
    currentStreakRef.current = 0
    setCurrentStreak(0)
    lastPraiseKeyRef.current = null
    lastFeedbackAttemptRef.current = 1
    retryQuestionRef.current = null
    retryPendingRef.current = false
    pausedDuringRetryRef.current = false
    pausedDuringFeedbackRef.current = false
    // re-init letter states zgodnie z aktywną pulą
    const initial = initialStates ?? {}
    const next: Record<string, LetterState> = {}
    for (const letter of cfg.activeLetters) {
      next[letter] = initial[letter] ?? createInitialLetterState(letter)
    }
    statesRef.current = next

    setStatus('playing')
    generateNextQuestion(0)
  }, [generateNextQuestion, initialStates, status, uuid])

  const pause = useCallback(
    (reason: 'manual' | 'idle' | 'visibility' = 'manual') => {
      if (status !== 'playing' && status !== 'feedback' && status !== 'retry') {
        return
      }
      // Zapamiętaj że pauza złapała feedback w trakcie — resume musi
      // ponowić scheduleFeedbackDismiss, bo clearFeedbackTimer urywa pipeline.
      pausedDuringFeedbackRef.current = status === 'feedback'
      pausedDuringRetryRef.current = status === 'retry'
      clearCountdown()
      clearFeedbackTimer()
      pushEvent({ type: 'pause', ts: cfgRef.current.now(), reason })
      // Najpierw stop() — inaczej prompt/feedback mówi dalej pod overlayem pauzy
      // (najbardziej widoczne przy auto-pauzie z visibility/idle).
      cfgRef.current.audioBus.stop()
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
    // Pauza w drugiej próbie: wracamy do tego samego ekranu z 2 kafelkami.
    // `pause()` zrobiło stop(), więc bez ponownego `try-again` dziecko wraca
    // do niemego ekranu i nie wie, czego się od niego oczekuje.
    if (pausedDuringRetryRef.current) {
      pausedDuringRetryRef.current = false
      setStatus('retry')
      questionStartedAtRef.current = cfgRef.current.now()
      void cfgRef.current.audioBus.play('try-again')
      return
    }

    if (pausedDuringFeedbackRef.current) {
      pausedDuringFeedbackRef.current = false
      setStatus('feedback')
      const fb = lastFeedbackRef.current
      if (fb !== null) {
        // `pause()` zrobiło stop() — bez ponownego zakolejkowania overlay
        // odliczałby pełny czas w kompletnej ciszy.
        playFeedbackAudio(
          fb.variant,
          fb.targetLetter,
          fb.chosenLetter,
          currentStreakRef.current,
          lastFeedbackAttemptRef.current,
        )
        // Pauza złapana między błędem a drugą próbą — wznawiamy tę samą
        // ścieżkę, inaczej retry przepadłby i sesja przeskoczyłaby dalej.
        const pendingQ = currentQuestionRef.current
        if (
          retryPendingRef.current &&
          pendingQ !== null &&
          fb.chosenLetter !== undefined
        ) {
          scheduleRetry(
            pendingQ,
            fb.chosenLetter,
            lastFeedbackEffectiveMsRef.current,
          )
        } else {
          scheduleFeedbackDismissRef.current(lastFeedbackEffectiveMsRef.current)
        }
      } else {
        // Overlay był już zamknięty — pauza złapała "wdech". Odtwarzanie
        // pełnego timera feedbacku oznaczałoby kilka sekund pustego ekranu.
        scheduleBreathThenNext(questionNumberRef.current + 1)
      }
      return
    }

    setStatus('playing')
    // restart timer dla bieżącego pytania od pełnej długości — uczciwie wobec dziecka
    if (currentQuestionRef.current) {
      questionStartedAtRef.current = cfgRef.current.now()
      startCountdown()
    }
  }, [
    playFeedbackAudio,
    pushEvent,
    scheduleBreathThenNext,
    scheduleRetry,
    startCountdown,
    status,
  ])

  const answer = useCallback(
    (chosenLetter: string, position: Slot) => {
      if (status !== 'playing' && status !== 'retry') return
      const q = currentQuestionRef.current
      if (!q) return
      const outcome: Outcome = chosenLetter === q.targetLetter ? 'correct' : 'wrong'
      handleOutcome(outcome, chosenLetter, position, status === 'retry' ? 2 : 1)
    },
    [handleOutcome, status],
  )

  // Pomiń wybrzmiewanie feedback overlay i przejdź do następnego pytania
  // od razu (lub zakończ sesję). Wywoływane przez guzik "→ Dalej" — daje
  // dziecku kontrolę nad tempem zamiast czekać na timer.
  const skipFeedback = useCallback(() => {
    if (status !== 'feedback') return
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    cfgRef.current.audioBus.stop()
    // „Dalej" w trakcie feedbacku błędu skraca wybrzmiewanie, ale NIE kasuje
    // drugiej próby — jedna dodatkowa próba należy się dziecku zawsze.
    if (retryPendingRef.current && retryQuestionRef.current !== null) {
      retryPendingRef.current = false
      setLastFeedback(null)
      setCurrentQuestion(retryQuestionRef.current)
      questionStartedAtRef.current = cfgRef.current.now()
      void cfgRef.current.audioBus.play('try-again')
      setStatus('retry')
      return
    }
    const nextNum = questionNumberRef.current + 1
    if (nextNum >= cfgRef.current.sessionLength) {
      finishSession()
      return
    }
    setLastFeedback(null)
    questionNumberRef.current = nextNum
    setQuestionNumber(nextNum)
    setStatus('playing')
    generateNextQuestion(nextNum)
  }, [finishSession, generateNextQuestion, status])

  const dontKnow = useCallback(() => {
    if (status !== 'playing' && status !== 'retry') return
    // 🤷 w drugiej próbie = druga pomyłka: hiperkorekcja (litera jeszcze raz)
    // i lecimy dalej. Trzeciej próby nie ma.
    if (status === 'retry') {
      handleOutcome('wrong', undefined, undefined, 2)
      return
    }
    // NIE dodajemy nav-tap — to TTS "klik" (1.4s) co brzydko miesza się
    // z `dont-know-X` audio ("spokojnie..."). Sekwencja "klik + spokojnie
    // + posłuchaj jeszcze raz" była mylna. dont-know-X jest natychmiastowym
    // (~100ms latency) potwierdzeniem audio.
    handleOutcome('dontKnow', undefined, undefined)
  }, [handleOutcome, status])

  const quit = useCallback(() => {
    if (finishedRef.current) return
    finishSession()
  }, [finishSession])

  /**
   * Wyjście bez ekranu podsumowania (KidNav ⬅️/🏠, unmount). W odróżnieniu od
   * `quit()` nie ustawia statusu `finished` i nie gra fanfary — tylko utrwala
   * to, co dziecko zdążyło odpowiedzieć.
   *
   * Warunek „choć jedna ODPOWIEDŹ" (a nie „choć jeden event") jest istotny:
   * `question-start` pojawia się już przy starcie, a StrictMode montuje
   * komponent dwa razy — bez tego cleanup pierwszego mountu zamykałby sesję
   * flagą `finishedRef` i realny postęp nigdy by się nie zapisał.
   */
  const flush = useCallback(() => {
    if (finishedRef.current) return
    if (!eventsRef.current.some((e) => e.type === 'answer')) return
    finishedRef.current = true
    clearCountdown()
    clearFeedbackTimer()
    const log: SessionLog = {
      id: sessionIdRef.current,
      startedAt: startedAtRef.current,
      endedAt: cfgRef.current.now(),
      level: cfgRef.current.level,
      events: eventsRef.current,
    }
    cfgRef.current.onSessionEnd?.(log, { ...statesRef.current })
  }, [clearCountdown, clearFeedbackTimer])

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
    wrongCount,
    dontKnowCount,
    timeoutCount,
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
    skipFeedback,
    quit,
    flush,
  }
}
