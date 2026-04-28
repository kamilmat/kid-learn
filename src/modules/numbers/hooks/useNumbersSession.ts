import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { pickNextItem } from '@/shared/srs/select'
import { nextBox, nextRecentWrong } from '@/shared/srs/update'
import type { Level } from '@/shared/settings/types'
import type {
  AnswerOutcome,
  ConceptId,
  ConceptMastery,
  MathFactId,
  MathFactState,
  NumbersSessionEvent,
  NumbersSessionLog,
  Question,
} from '../types'
import { useNumbers } from '../store/numbersStore'
import {
  CONCEPTS,
  getConceptsForLevel,
  MIN_AGE_FOR_MASTERY_MS,
} from '../data/concepts'
import { generateFactsForConcept, type Fact } from '../data/facts'
import { exerciseTypeForFact } from './exerciseRouter'

export type SessionStatus = 'asking' | 'feedback' | 'paused' | 'ended'

const DEFAULT_QUESTION_COUNT = 8
// Pochodnia: ~18% pytań to maintenance odejmowania (interleaving Bjork & Bjork 1994)
const POCHODNIA_SUBTRACT_MAINTENANCE_RATIO = 0.18
// Pula maintenance odejmowania dla Pochodni — kuratorowana, do 20 z przekraczaniem progu
const POCHODNIA_SUB_MAINTENANCE_FACTS: Fact[] = [
  { id: 'sub-13-5', conceptId: 'plomyk-addsub-10', args: [13, 5] },
  { id: 'sub-15-7', conceptId: 'plomyk-addsub-10', args: [15, 7] },
  { id: 'sub-12-8', conceptId: 'plomyk-addsub-10', args: [12, 8] },
  { id: 'sub-14-6', conceptId: 'plomyk-addsub-10', args: [14, 6] },
  { id: 'sub-11-4', conceptId: 'plomyk-addsub-10', args: [11, 4] },
  { id: 'sub-16-9', conceptId: 'plomyk-addsub-10', args: [16, 9] },
]

export type UseNumbersSessionParams = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  questionCount?: number
  rng?: () => number
  now?: () => number
}

export function useNumbersSession({
  level,
  audioBus,
  questionCount = DEFAULT_QUESTION_COUNT,
  rng = Math.random,
  now = Date.now,
}: UseNumbersSessionParams) {
  const [status, setStatus] = useState<SessionStatus>('asking')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome | null>(null)
  const [counters, setCounters] = useState({ correct: 0, wrong: 0, dontKnow: 0 })
  const eventsRef = useRef<NumbersSessionEvent[]>([])
  const startedAtRef = useRef<number>(0)
  const questionStartedAtRef = useRef<number>(0)
  const lastFactRef = useRef<MathFactId | null>(null)

  const facts = useNumbers((s) => s.facts)
  const ensureFactInitialized = useNumbers((s) => s.ensureFactInitialized)
  const applySessionResults = useNumbers((s) => s.applySessionResults)

  const levelFacts = useMemo<Fact[]>(() => {
    const concepts = getConceptsForLevel(level)
    const main = concepts.flatMap((c) => generateFactsForConcept(c.id))
    if (level === 'pochodnia') {
      return [...main, ...POCHODNIA_SUB_MAINTENANCE_FACTS]
    }
    return main
  }, [level])

  // Initialize all facts in store
  useEffect(() => {
    levelFacts.forEach((f) => ensureFactInitialized(f.id, f.conceptId))
  }, [levelFacts, ensureFactInitialized])

  const pickAndSetQuestion = useCallback(() => {
    let pool: string[]
    if (
      level === 'pochodnia' &&
      rng() < POCHODNIA_SUBTRACT_MAINTENANCE_RATIO
    ) {
      // Maintenance: pick from sub- facts
      pool = POCHODNIA_SUB_MAINTENANCE_FACTS.map((f) => f.id)
    } else {
      pool = levelFacts.map((f) => f.id)
    }

    if (pool.length === 0) return

    const factId = pickNextItem(facts, pool, lastFactRef.current, now(), rng)
    lastFactRef.current = factId

    const fact = levelFacts.find((f) => f.id === factId)
    if (!fact) return

    const exerciseType = exerciseTypeForFact(fact, level)
    const op: '+' | '-' = fact.id.startsWith('sub-') ? '-' : '+'
    setCurrentQuestion({
      factId,
      conceptId: fact.conceptId,
      exerciseType,
      payload: { args: fact.args, op },
    })
    questionStartedAtRef.current = now()
  }, [facts, levelFacts, level, now, rng])

  const start = useCallback(() => {
    audioBus.stop()
    void audioBus.play(`session-start-${level}`)
    startedAtRef.current = now()
    setStatus('asking')
    pickAndSetQuestion()
  }, [audioBus, level, now, pickAndSetQuestion])

  const answer = useCallback(
    (outcome: AnswerOutcome) => {
      if (!currentQuestion) return
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
      setCounters((c) => ({
        correct: c.correct + (outcome === 'correct' ? 1 : 0),
        wrong: c.wrong + (outcome === 'wrong' ? 1 : 0),
        dontKnow: c.dontKnow + (outcome === 'dontKnow' ? 1 : 0),
      }))
      setStatus('feedback')
    },
    [currentQuestion, now],
  )

  const advance = useCallback(() => {
    const nextIdx = questionIdx + 1
    if (nextIdx >= questionCount) {
      const endedAt = now()
      const log: NumbersSessionLog = {
        startedAt: startedAtRef.current,
        endedAt,
        level,
        events: eventsRef.current,
      }
      const updatedFacts = computeUpdatedFacts(facts, eventsRef.current, endedAt)
      const updatedConcepts = computeMasteryProgress(
        useNumbers.getState().concepts,
        eventsRef.current,
        endedAt,
      )
      applySessionResults(updatedFacts, updatedConcepts, log)
      setStatus('ended')
      return
    }
    setQuestionIdx(nextIdx)
    setStatus('asking')
    pickAndSetQuestion()
  }, [
    questionIdx,
    questionCount,
    now,
    level,
    facts,
    applySessionResults,
    pickAndSetQuestion,
  ])

  const pause = useCallback(() => setStatus('paused'), [])
  const resume = useCallback(() => setStatus('asking'), [])

  return {
    status,
    questionIdx,
    questionCount,
    currentQuestion,
    counters,
    lastOutcome,
    start,
    answer,
    advance,
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
    const current = currentFacts[ev.factId]
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
