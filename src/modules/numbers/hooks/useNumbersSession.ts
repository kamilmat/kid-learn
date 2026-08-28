import { useCallback, useMemo, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { pickNextItem } from '@/shared/srs/select'
import { nextBox, nextRecentWrong } from '@/shared/srs/update'
import type { Level, SkipCountStep } from '@/shared/settings/types'
import { pickNoRepeat } from '@/shared/audio/pickNoRepeat'
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
import { NUMBERS_PRAISE_KEYS, type NumbersPraiseKey } from '../data/praise'
import { exerciseTypeForFact } from './exerciseRouter'

export type SessionStatus = 'asking' | 'feedback' | 'paused' | 'ended'

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
  rng?: () => number
  now?: () => number
}

export function useNumbersSession({
  level,
  audioBus,
  questionCount = DEFAULT_QUESTION_COUNT,
  skipCountStep = 'mixed',
  treeCelebrationsOn = true,
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
  const finishedRef = useRef(false)
  const pausedFromRef = useRef<'asking' | 'feedback'>('asking')

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
      pool = mainPoolIds
    }

    if (pool.length === 0) return

    // Zawsze sięgaj po świeży snapshot store (closure z subscribed facts byłby
    // stale przy pierwszym start() — ensureFactsInitialized dopiero co biegło).
    const currentFacts = useNumbers.getState().facts
    const factId = pickNextItem(currentFacts, pool, lastFactRef.current, now(), rng)
    lastFactRef.current = factId

    const fact = levelFacts.find((f) => f.id === factId)
    if (!fact) return

    const exerciseType = exerciseTypeForFact(fact, level)
    const op = opForFact(fact)
    setCurrentQuestion({
      factId,
      conceptId: fact.conceptId,
      exerciseType,
      payload: { args: fact.args, op },
    })
    questionStartedAtRef.current = now()
  }, [levelFacts, mainPoolIds, level, now, rng])

  const start = useCallback(() => {
    audioBus.stop()
    void audioBus.play(`session-start-${level}`)
    startedAtRef.current = now()
    finishedRef.current = false
    lastPraiseRef.current = null
    setPraiseKey(null)
    // Bulk init całej puli poziomu — jeden zapis persist zamiast N (Płomyk: 128).
    ensureFactsInitialized(levelFacts)
    setStatus('asking')
    pickAndSetQuestion()
  }, [audioBus, level, now, pickAndSetQuestion, ensureFactsInitialized, levelFacts])

  const answer = useCallback(
    (outcome: AnswerOutcome) => {
      if (!currentQuestion) return
      // Guard: overlay feedbacku i pauza nie mogą przyjmować kolejnych odpowiedzi
      // (double-tap w trakcie feedbacku liczył się dwa razy).
      if (status !== 'asking') return
      const responseMs = now() - questionStartedAtRef.current

      eventsRef.current.push({
        factId: currentQuestion.factId,
        conceptId: currentQuestion.conceptId,
        exerciseType: currentQuestion.exerciseType,
        outcome,
        responseMs,
        timestamp: now(),
      })

      setLastOutcome(outcome)
      if (outcome === 'correct') {
        const key = pickNoRepeat(NUMBERS_PRAISE_KEYS, lastPraiseRef.current, rng)
        lastPraiseRef.current = key
        setPraiseKey(key)
      } else {
        setPraiseKey(null)
      }
      setCounters((c) => ({
        correct: c.correct + (outcome === 'correct' ? 1 : 0),
        wrong: c.wrong + (outcome === 'wrong' ? 1 : 0),
        dontKnow: c.dontKnow + (outcome === 'dontKnow' ? 1 : 0),
      }))
      setStatus('feedback')
    },
    [currentQuestion, now, rng, status],
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
      // z uczenia się w mastery (ustawienie rodzica może je wyłączyć).
      if (treeCelebrationsOn) {
        const before = useNumbers.getState().concepts
        const newlyMastered = Object.entries(updatedConcepts).some(
          ([id, c]) =>
            c?.state === 'mastered' && before[id as ConceptId]?.state !== 'mastered',
        )
        if (newlyMastered) void audioBus.play('tree-grow')
      }
      applySessionResults(updatedFacts, updatedConcepts, log)
    },
    [now, level, applySessionResults, audioBus, treeCelebrationsOn],
  )

  const advance = useCallback(() => {
    const nextIdx = questionIdx + 1
    if (nextIdx >= questionCount) {
      persistResults(false)
      setStatus('ended')
      return
    }
    setQuestionIdx(nextIdx)
    setStatus('asking')
    pickAndSetQuestion()
  }, [questionIdx, questionCount, persistResults, pickAndSetQuestion])

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
      if (status !== 'asking' && status !== 'feedback') return
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

function computeMasteryProgress(
  currentConcepts: Partial<Record<ConceptId, ConceptMastery>>,
  events: NumbersSessionEvent[],
  endedAt: number,
): Partial<Record<ConceptId, ConceptMastery>> {
  const updated: Partial<Record<ConceptId, ConceptMastery>> = {}
  const byConcept = new Map<ConceptId, NumbersSessionEvent[]>()
  for (const ev of events) {
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
    }
    let streak = prev.correctStreak
    const factsTouched = new Set(prev.factsTouched)
    for (const ev of evs) {
      factsTouched.add(ev.factId)
      if (ev.outcome === 'correct') streak += 1
      else streak = 0
    }
    const firstSeenAt = prev.firstSeenAt === 0 ? endedAt : prev.firstSeenAt
    const ageMs = endedAt - firstSeenAt
    const meetsMastery =
      streak >= def.minStreakForMastery &&
      factsTouched.size >= def.minFacts &&
      ageMs >= MIN_AGE_FOR_MASTERY_MS
    updated[conceptId] = {
      state: meetsMastery ? 'mastered' : 'learning',
      firstSeenAt,
      lastSeenAt: endedAt,
      correctStreak: streak,
      factsTouched: Array.from(factsTouched),
    }
  }
  return updated
}
