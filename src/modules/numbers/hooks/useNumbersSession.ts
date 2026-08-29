import { useCallback, useMemo, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { pickNextItem } from '@/shared/srs/select'
import { nextBox, nextRecentWrong } from '@/shared/srs/update'
import type { Level, SkipCountStep } from '@/shared/settings/types'
import { pickPraiseMixed } from '@/shared/audio/pickPraiseMixed'
import type {
  AnswerOutcome,
  ConceptId,
  ConceptMastery,
  MathFactId,
  MathFactState,
  NumbersAntiCheatEvent,
  NumbersSessionEvent,
  NumbersSessionLog,
  PauseReason,
  Question,
} from '../types'
import { useNumbers } from '../store/numbersStore'
import { CONCEPTS, MIN_AGE_FOR_MASTERY_MS } from '../data/concepts'
import type { Fact } from '../data/facts'
import {
  excludeMaintenance,
  getLevelFacts,
  opForFact,
  POCHODNIA_SUB_MAINTENANCE_FACTS,
} from '../data/levelFacts'
import { NUMBERS_PRAISE_KEYS, NUMBERS_PRAISE_PROCESS_KEYS, type NumbersPraiseKey } from '../data/praise'
import { masteryAudioKey } from '../data/masteryAudio'
import { extractCorrectValue } from '../data/correctValue'
import { exerciseTypeForFact } from './exerciseRouter'
import { pickConcept } from './pickConcept'

export type SessionStatus = 'asking' | 'feedback' | 'retry' | 'paused' | 'ended'

const DEFAULT_QUESTION_COUNT = 8
// Pochodnia: ~18% pytań to maintenance odejmowania (interleaving Bjork & Bjork 1994)
const POCHODNIA_SUBTRACT_MAINTENANCE_RATIO = 0.18

export type UseNumbersSessionParams = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  questionCount?: number
  /** Ustawienie rodzica: zawęża Pochodnię do jednego kroku skip-count. */
  skipCountStep?: SkipCountStep
  /** Ustawienie rodzica: cue `tree-grow` gdy koncept osiąga mastery. */
  treeCelebrationsOn?: boolean
  /**
   * Druga próba po błędzie (`settings.secondAttempt`). Default `true`.
   * Pierwsza pomyłka i tak aktualizuje SRS — retry uczy autokorekty.
   */
  secondAttempt?: boolean
  rng?: () => number
  now?: () => number
}

export function useNumbersSession({
  level,
  audioBus,
  questionCount = DEFAULT_QUESTION_COUNT,
  skipCountStep = 'mixed',
  treeCelebrationsOn = true,
  secondAttempt = true,
  rng = Math.random,
  now = Date.now,
}: UseNumbersSessionParams) {
  const [status, setStatus] = useState<SessionStatus>('asking')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome | null>(null)
  const [praiseKey, setPraiseKey] = useState<NumbersPraiseKey | null>(null)
  const lastPraiseRef = useRef<NumbersPraiseKey | null>(null)
  const [counters, setCounters] = useState({ correct: 0, wrong: 0, dontKnow: 0 })
  const eventsRef = useRef<NumbersSessionEvent[]>([])
  const antiCheatRef = useRef<NumbersAntiCheatEvent[]>([])
  const startedAtRef = useRef<number>(0)
  const questionStartedAtRef = useRef<number>(0)
  const lastFactRef = useRef<MathFactId | null>(null)
  const lastConceptRef = useRef<ConceptId | null>(null)
  const finishedRef = useRef(false)
  const pausedFromRef = useRef<'asking' | 'feedback' | 'retry'>('asking')
  // Druga próba: dokładnie dwie opcje — poprawna i ta, którą dziecko wybrało.
  // `null` = ekran nie jest w fazie retry. `retryPendingRef` mówi, że po
  // wybrzmieniu bieżącego feedbacku wchodzimy w retry zamiast iść dalej.
  const [retryChoices, setRetryChoices] = useState<number[] | null>(null)
  const retryChoicesRef = useRef<number[] | null>(null)
  const retryPendingRef = useRef(false)
  // Numer podejścia ostatniej odpowiedzi — overlay gra `retry-correct` zamiast
  // pochwały, gdy dziecko poprawiło się w drugiej próbie.
  const [lastAttempt, setLastAttempt] = useState<1 | 2>(1)

  const ensureFactsInitialized = useNumbers((s) => s.ensureFactsInitialized)
  const applySessionResults = useNumbers((s) => s.applySessionResults)

  const levelFacts = useMemo<Fact[]>(
    () => getLevelFacts(level, skipCountStep),
    [level, skipCountStep],
  )
  // Fakty maintenance losujemy wyłącznie w gałęzi 18% — w głównej puli byłyby
  // liczone drugi raz i wypadały częściej niż zakłada interleaving.
  const mainPoolIds = useMemo<string[]>(
    () => excludeMaintenance(levelFacts).map((f) => f.id),
    [levelFacts],
  )

  const pickAndSetQuestion = useCallback(() => {
    let pool: string[]
    if (
      level === 'pochodnia' &&
      rng() < POCHODNIA_SUBTRACT_MAINTENANCE_RATIO
    ) {
      pool = POCHODNIA_SUB_MAINTENANCE_FACTS.map((f) => f.id)
    } else {
      // Dwa kroki: najpierw KONCEPT (ważony, z prerekwizytami), potem fakt z jego
      // puli. Płaska pula poziomu dawała proporcje wg liczby faktów — Płomyk
      // wyrzucał `addsub-10` w ~70% pytań.
      const store = useNumbers.getState()
      const conceptId = pickConcept({
        level,
        concepts: store.concepts,
        facts: store.facts,
        lastConceptId: lastConceptRef.current,
        rng,
        levelFacts,
      })
      const conceptPool = conceptId
        ? excludeMaintenance(levelFacts)
            .filter((f) => f.conceptId === conceptId)
            .map((f) => f.id)
        : []
      pool = conceptPool.length > 0 ? conceptPool : mainPoolIds
      if (conceptId) lastConceptRef.current = conceptId
    }

    if (pool.length === 0) return

    // Zawsze sięgaj po świeży snapshot store (closure z subscribed facts byłby
    // stale przy pierwszym start() — ensureFactsInitialized dopiero co biegło).
    const currentFacts = useNumbers.getState().facts
    const factId = pickNextItem(currentFacts, pool, lastFactRef.current, now(), rng)
    lastFactRef.current = factId

    const fact = levelFacts.find((f) => f.id === factId)
    if (!fact) return

    // Nowe pytanie zamyka temat drugiej próby — zaległe opcje przeniosłyby się
    // na kolejny błąd.
    retryPendingRef.current = false
    retryChoicesRef.current = null
    setRetryChoices(null)
    setLastAttempt(1)

    const exerciseType = exerciseTypeForFact(fact, level)
    const op = opForFact(fact)
    setCurrentQuestion({
      factId,
      conceptId: fact.conceptId,
      exerciseType,
      // `conceptId` także w payloadzie: ćwiczenie widzi tylko payload, a zakres
      // liczb (np. subitizing do 6 vs liczenie do 10) zależy od konceptu.
      payload: { args: fact.args, op, conceptId: fact.conceptId },
    })
    questionStartedAtRef.current = now()
  }, [levelFacts, mainPoolIds, level, now, rng])

  const start = useCallback(() => {
    audioBus.stop()
    void audioBus.play(`session-start-${level}`)
    startedAtRef.current = now()
    finishedRef.current = false
    lastPraiseRef.current = null
    lastFactRef.current = null
    lastConceptRef.current = null
    setPraiseKey(null)
    // Bulk init całej puli poziomu — jeden zapis persist zamiast N (Płomyk: 128).
    ensureFactsInitialized(levelFacts)
    setStatus('asking')
    pickAndSetQuestion()
  }, [audioBus, level, now, pickAndSetQuestion, ensureFactsInitialized, levelFacts])

  /**
   * `attempt === 2` to poprawka w drugiej próbie: leci do logu, ale nie rusza
   * SRS (event jest pomijany w `computeUpdatedFacts`/`computeMasteryProgress`)
   * ani liczników sesji. Pierwsza pomyłka zostaje pomyłką.
   */
  const answer = useCallback(
    (outcome: AnswerOutcome, attempt: 1 | 2 = 1, chosenValue?: number) => {
      if (!currentQuestion) return
      // Guard: overlay feedbacku i pauza nie mogą przyjmować kolejnych odpowiedzi
      // (double-tap w trakcie feedbacku liczył się dwa razy).
      if (status !== (attempt === 2 ? 'retry' : 'asking')) return
      const isFirstAttempt = attempt === 1
      const responseMs = now() - questionStartedAtRef.current

      eventsRef.current.push({
        factId: currentQuestion.factId,
        conceptId: currentQuestion.conceptId,
        exerciseType: currentQuestion.exerciseType,
        outcome,
        responseMs,
        timestamp: now(),
        ...(attempt === 2 ? { attempt: 2 as const } : {}),
      })

      setLastOutcome(outcome)
      setLastAttempt(attempt)
      if (outcome === 'correct' && isFirstAttempt) {
        const key = pickPraiseMixed(
          NUMBERS_PRAISE_KEYS,
          NUMBERS_PRAISE_PROCESS_KEYS,
          lastPraiseRef.current,
          rng,
        )
        lastPraiseRef.current = key
        setPraiseKey(key)
      } else {
        setPraiseKey(null)
      }
      if (isFirstAttempt) {
        setCounters((c) => ({
          correct: c.correct + (outcome === 'correct' ? 1 : 0),
          wrong: c.wrong + (outcome === 'wrong' ? 1 : 0),
          dontKnow: c.dontKnow + (outcome === 'dontKnow' ? 1 : 0),
        }))
      }

      // Pierwsza pomyłka z wyborem wartości → druga próba zamiast przejścia
      // dalej. `number-bond-builder` i `fact-family-triangle` są wyłączone:
      // odpowiedź nie jest tam wyborem z listy, więc nie da się jej przyciąć
      // do dwóch opcji. „Nie wiem" też nie — dziecko nie postawiło hipotezy.
      const isChoiceExercise =
        currentQuestion.exerciseType !== 'number-bond-builder' &&
        currentQuestion.exerciseType !== 'fact-family-triangle'
      if (
        outcome === 'wrong' &&
        isFirstAttempt &&
        secondAttempt &&
        isChoiceExercise &&
        chosenValue !== undefined
      ) {
        const correctValue = extractCorrectValue(currentQuestion)
        if (correctValue !== null && correctValue !== chosenValue) {
          retryChoicesRef.current = [correctValue, chosenValue]
          retryPendingRef.current = true
        }
      }
      setStatus('feedback')
    },
    [currentQuestion, now, rng, secondAttempt, status],
  )

  // Zapisz wyniki sesji (SRS + mastery + log). Idempotentne — druga próba
  // (np. wyjście z pauzy tuż po ostatnim pytaniu) nic nie robi.
  const persistResults = useCallback(
    (aborted: boolean) => {
      if (finishedRef.current) return
      finishedRef.current = true
      const endedAt = now()
      const log: NumbersSessionLog = {
        startedAt: startedAtRef.current,
        endedAt,
        level,
        events: eventsRef.current,
        antiCheatEvents: antiCheatRef.current,
        ...(aborted ? { aborted: true } : {}),
      }
      const currentFacts = useNumbers.getState().facts
      const updatedFacts = computeUpdatedFacts(currentFacts, eventsRef.current, endedAt)
      const updatedConcepts = computeMasteryProgress(
        useNumbers.getState().concepts,
        eventsRef.current,
        endedAt,
      )
      // „Drzewko rośnie" — cue tylko dla konceptów, które W TEJ sesji przeszły
      // z uczenia się w mastery (ustawienie rodzica może je wyłączyć). Przy
      // przerwanym flushu (quit/unmount) audio i tak by nie zdążyło zagrać
      // sensownie — ekran znika pod dzieckiem — więc pomijamy cue. Kolejka
      // FIFO audioBus gwarantuje mastery-* przed tree-grow bez timerów.
      if (treeCelebrationsOn && !aborted) {
        const before = useNumbers.getState().concepts
        const newlyMastered = (Object.entries(updatedConcepts) as [ConceptId, ConceptMastery][])
          .filter(([id, c]) => c.state === 'mastered' && before[id]?.state !== 'mastered')
          .map(([id]) => id)
        for (const id of newlyMastered) void audioBus.play(masteryAudioKey(id))
        if (newlyMastered.length > 0) void audioBus.play('tree-grow')
      }
      applySessionResults(updatedFacts, updatedConcepts, log)
    },
    [now, level, applySessionResults, audioBus, treeCelebrationsOn],
  )

  const advance = useCallback(() => {
    // Druga próba: to samo pytanie z dwoma kafelkami, bez timera. Cue
    // `try-again` gra dopiero tutaj — overlay feedbacku właśnie wybrzmiał.
    if (retryPendingRef.current && retryChoicesRef.current !== null) {
      retryPendingRef.current = false
      setRetryChoices(retryChoicesRef.current)
      questionStartedAtRef.current = now()
      setStatus('retry')
      void audioBus.play('try-again')
      return
    }
    const nextIdx = questionIdx + 1
    if (nextIdx >= questionCount) {
      persistResults(false)
      setStatus('ended')
      return
    }
    setQuestionIdx(nextIdx)
    setStatus('asking')
    pickAndSetQuestion()
  }, [audioBus, now, questionIdx, questionCount, persistResults, pickAndSetQuestion])

  /**
   * Wyjście w trakcie sesji (przycisk Wyjdź na pauzie) — zapisuje częściowe
   * wyniki, żeby odpowiedzi dziecka nie przepadły (jak `quit()` w literach).
   */
  const flush = useCallback(() => {
    // Pusta sesja nie trafia do historii — ale NIE zamykamy jej flagą
    // `finishedRef`: unmount-safety flush leci też przy podwójnym mouncie
    // w StrictMode, a to skasowałoby zapis całej realnej sesji.
    if (eventsRef.current.length === 0) return
    persistResults(true)
  }, [persistResults])

  const pause = useCallback(
    (reason: PauseReason = 'manual') => {
      if (status !== 'asking' && status !== 'feedback' && status !== 'retry') return
      pausedFromRef.current = status
      antiCheatRef.current.push({ type: 'pause', ts: now(), reason })
      audioBus.stop()
      // "Każdy klik mówi co zrobił" — cue jak w module liter.
      void audioBus.play('nav-pause')
      setStatus('paused')
    },
    [status, now, audioBus],
  )

  const resume = useCallback(() => {
    if (status !== 'paused') return
    antiCheatRef.current.push({ type: 'resume', ts: now() })
    void audioBus.play('nav-resume')
    // Wracamy do stanu sprzed pauzy — pauza w trakcie feedbacku nie może
    // zgubić przejścia do następnego pytania (odpowiedź jest już zalogowana).
    setStatus(pausedFromRef.current)
    // `pause()` zrobiło stop(), więc bez ponownego `try-again` dziecko wraca
    // do dwóch kafelków bez wyjaśnienia, po co tu jest.
    if (pausedFromRef.current === 'retry') void audioBus.play('try-again')
  }, [status, now, audioBus])

  return {
    status,
    /** Status sprzed pauzy — overlay feedbacku zostaje pod pauzą, nie znika. */
    pausedFrom: pausedFromRef.current,
    questionIdx,
    questionCount,
    currentQuestion,
    counters,
    lastOutcome,
    /** Numer podejścia ostatniej odpowiedzi — `2` = poprawka w drugiej próbie. */
    lastAttempt,
    /** Dwie opcje drugiej próby (poprawna + wybrana) albo `null` poza retry. */
    retryChoices,
    praiseKey,
    start,
    answer,
    advance,
    flush,
    pause,
    resume,
  }
}

function computeUpdatedFacts(
  currentFacts: Record<MathFactId, MathFactState>,
  events: NumbersSessionEvent[],
  endedAt: number,
): Record<MathFactId, MathFactState> {
  const updated: Record<MathFactId, MathFactState> = {}
  for (const ev of events) {
    // Poprawka w drugiej próbie nie odkręca boxa ani `recentWrong` — pierwsza
    // pomyłka zostaje pomyłką (kontrakt drugiej próby, moduł liter).
    if (ev.attempt === 2) continue
    // Fold sekwencyjny: ten sam fakt powtórzony w sesji musi kumulować wyniki
    // (wcześniej każdy event startował od stanu sprzed sesji → liczył się tylko
    // ostatni).
    const current = updated[ev.factId] ?? currentFacts[ev.factId]
    if (!current) continue
    // Mapuj AnswerOutcome → SRS Outcome (alias kompatybilny)
    const srsOutcome = ev.outcome
    updated[ev.factId] = {
      ...current,
      box: nextBox(current.box, srsOutcome),
      lastSeen: endedAt,
      recentWrong: nextRecentWrong(current.recentWrong, srsOutcome),
    }
  }
  return updated
}

/** Ile ostatnich odpowiedzi konceptu bierzemy pod uwagę przy mastery. */
export const RECENT_WINDOW = 10

/**
 * Ile poprawnych w oknie 10 wystarcza. `minStreakForMastery` przenosimy 1:1 ze
 * znaczenia „tyle z rzędu" na „tyle z ostatnich dziesięciu" — dla domyślnych 8
 * daje 8/10. WHY: seria z rzędu zerowała się przy jednej wpadce (zmęczenie,
 * przypadkowy tap), więc dziecko potrafiące koncept nigdy nie domykało mastery.
 */
function requiredInWindow(minStreakForMastery: number): number {
  return Math.min(RECENT_WINDOW, Math.max(1, minStreakForMastery))
}

export function computeMasteryProgress(
  currentConcepts: Partial<Record<ConceptId, ConceptMastery>>,
  events: NumbersSessionEvent[],
  endedAt: number,
): Partial<Record<ConceptId, ConceptMastery>> {
  const updated: Partial<Record<ConceptId, ConceptMastery>> = {}
  const byConcept = new Map<ConceptId, NumbersSessionEvent[]>()
  for (const ev of events) {
    // Jak wyżej — poprawka nie wskrzesza serii, którą błąd właśnie zerwał.
    if (ev.attempt === 2) continue
    const arr = byConcept.get(ev.conceptId) ?? []
    arr.push(ev)
    byConcept.set(ev.conceptId, arr)
  }

  for (const [conceptId, evs] of byConcept) {
    const def = CONCEPTS[conceptId]
    if (!def) continue
    const prev: ConceptMastery = currentConcepts[conceptId] ?? {
      state: 'unseen',
      firstSeenAt: 0,
      lastSeenAt: 0,
      correctStreak: 0,
      factsTouched: [],
      recentOutcomes: [],
      factsCorrect: [],
    }
    let streak = prev.correctStreak
    const factsTouched = new Set(prev.factsTouched ?? [])
    const factsCorrect = new Set(prev.factsCorrect ?? [])
    const recent = [...(prev.recentOutcomes ?? [])]
    for (const ev of evs) {
      factsTouched.add(ev.factId)
      const ok = ev.outcome === 'correct'
      if (ok) {
        streak += 1
        factsCorrect.add(ev.factId)
      } else {
        streak = 0
      }
      // „Nie wiem" liczy się jak błąd — dziecko nie pokazało umiejętności.
      recent.push(ok ? 'correct' : 'wrong')
    }
    const window = recent.slice(-RECENT_WINDOW)
    const correctInWindow = window.filter((o) => o === 'correct').length
    const firstSeenAt = prev.firstSeenAt === 0 ? endedAt : prev.firstSeenAt
    const ageMs = endedAt - firstSeenAt
    const meetsMastery =
      window.length >= RECENT_WINDOW &&
      correctInWindow >= requiredInWindow(def.minStreakForMastery) &&
      factsCorrect.size >= def.minFacts &&
      ageMs >= MIN_AGE_FOR_MASTERY_MS
    updated[conceptId] = {
      // Mastery raz zdobyte nie cofa się przez chwilowy dołek w oknie.
      state: prev.state === 'mastered' || meetsMastery ? 'mastered' : 'learning',
      firstSeenAt,
      lastSeenAt: endedAt,
      correctStreak: streak,
      factsTouched: Array.from(factsTouched),
      recentOutcomes: window,
      factsCorrect: Array.from(factsCorrect),
    }
  }
  return updated
}
