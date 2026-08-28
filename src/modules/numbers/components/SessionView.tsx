import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Settings, Level } from '@/shared/settings/types'
import { useIdleDetector } from '@/shared/engagement/useIdleDetector'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii, tapTargets } from '@/app/theme'
import { useNumbersSession, type SessionStatus } from '../hooks/useNumbersSession'
import { useNumbers } from '../store/numbersStore'
import { extractCorrectValue } from '../data/correctValue'
import type { AnswerOutcome, ExerciseType, Question } from '../types'
import { ConceptIntro } from './intros/ConceptIntro'
import { SessionEnd } from './SessionEnd'
import { PauseOverlay } from '@/shared/ui/PauseOverlay'
import { SubitizeFlashExercise } from './exercises/SubitizeFlashExercise'
import { MatchDigitDotsExercise } from './exercises/MatchDigitDotsExercise'
import { NumberRhythmExercise } from './exercises/NumberRhythmExercise'
import { ConcreteAddExercise } from './exercises/ConcreteAddExercise'
import { NumberBondBuilder } from './exercises/NumberBondBuilder'
import { TenFrameFill } from './exercises/TenFrameFill'
import { ConcreteAddSubtract } from './exercises/ConcreteAddSubtract'
import { FactFamilyTriangle } from './exercises/FactFamilyTriangle'
import { DoublesExercise } from './exercises/DoublesExercise'
import { NearDoublesExercise } from './exercises/NearDoublesExercise'
import { Make10Exercise } from './exercises/Make10Exercise'
import { EqualGroupsExercise } from './exercises/EqualGroupsExercise'
import { SkipCountChase } from './exercises/SkipCountChase'
import { ArrayMatchExercise } from './exercises/ArrayMatchExercise'
import { SubtractMaintenance } from './exercises/SubtractMaintenance'

type Props = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onTree: () => void
}

// Minimalny czas overlayu feedbacku. Realne przejście następuje dopiero gdy
// kolejka audio (pochwała / "spróbuj jeszcze raz" + "tu było N") się domknie —
// stały timer ucinał korektę hypercorrection.
const MIN_FEEDBACK_MS = 2200
// Twardy limit — overlay nigdy nie może zablokować sesji, gdyby audio nie
// domknęło obietnicy.
const MAX_FEEDBACK_MS = 12_000
const IDLE_THRESHOLD_MS = 20_000

/**
 * Domyka obietnicę `play()` niezależnie od wyniku — czekamy na KONIEC klipu,
 * a brak pliku (404) czy `stop()` nie może zawiesić przejścia do następnego
 * pytania.
 */
function settled(promise: Promise<unknown> | undefined): Promise<void> {
  return Promise.resolve(promise).then(
    () => undefined,
    () => undefined,
  )
}

const PRAISE_KEYS = [
  'praise-effort',
  'praise-strategy',
  'praise-precision',
  'praise-mastery',
  'praise-think',
  'praise-brawo',
  'praise-super',
  'praise-tak-jest',
] as const

export function SessionView({ level, audioBus, settings, onExit, onTree }: Props) {
  const session = useNumbersSession({
    level,
    audioBus,
    questionCount: settings.numbers?.questionCount ?? 8,
  })
  const seenIntros = useNumbers((s) => s.seenIntros)
  const markIntroSeen = useNumbers((s) => s.markIntroSeen)
  const startedRef = useRef(false)

  // Auto-start session na mount
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    session.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Anti-cheat: idle 20 s bez interakcji → auto-pauza (jak w module liter).
  useIdleDetector({
    thresholdMs: IDLE_THRESHOLD_MS,
    enabled: session.status === 'asking',
    onIdle: () => session.pause('idle'),
  })

  // Anti-cheat: wyjście z zakładki / zablokowanie iPada → auto-pauza.
  usePageVisibility({
    enabled: session.status === 'asking' || session.status === 'feedback',
    onHidden: () => session.pause('visibility'),
    onVisible: () => {
      // Celowo bez auto-wznowienia — dziecko musi tapnąć Wznów.
    },
  })

  // Wyjście w trakcie sesji zapisuje częściowe wyniki (SRS by przepadł).
  const handleQuit = useCallback(() => {
    session.flush()
    onExit()
    // flush jest stabilne w obrębie sesji
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.flush, onExit])

  const conceptsIntrosOn = settings.numbers?.conceptIntros ?? true

  // Intro guard — pokaż ConceptIntro jeśli nie widziano dla tego konceptu
  const showIntro = useMemo(() => {
    if (!conceptsIntrosOn) return false
    if (!session.currentQuestion) return false
    if (session.status !== 'asking') return false
    const introKey = `intro-${session.currentQuestion.conceptId}`
    return !seenIntros.includes(introKey)
  }, [session.currentQuestion, session.status, seenIntros, conceptsIntrosOn])

  if (session.status === 'ended') {
    return (
      <SessionEnd
        counters={session.counters}
        audioBus={audioBus}
        onExit={onExit}
        onTree={onTree}
      />
    )
  }

  if (showIntro && session.currentQuestion) {
    return (
      <ConceptIntro
        conceptId={session.currentQuestion.conceptId}
        audioBus={audioBus}
        onContinue={() =>
          markIntroSeen(`intro-${session.currentQuestion!.conceptId}`)
        }
      />
    )
  }

  if (!session.currentQuestion) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ⏳
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 0,
      }}
    >
      <StatusBar
        counters={session.counters}
        currentIdx={session.questionIdx}
        total={session.questionCount}
        onPause={() => session.pause('manual')}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ExerciseRouter
          question={session.currentQuestion}
          audioBus={audioBus}
          onAnswer={session.answer}
        />
      </div>
      {session.status === 'feedback' && (
        <FeedbackOverlay
          outcome={session.lastOutcome ?? 'correct'}
          correctValue={extractCorrectValue(session.currentQuestion)}
          audioBus={audioBus}
          onAdvance={session.advance}
        />
      )}
      {session.status === 'paused' && (
        <PauseOverlay
          onResume={session.resume}
          onQuit={handleQuit}
          position="absolute"
          zIndex={100}
        />
      )}
    </div>
  )
}

type ExerciseProps = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

function ExerciseRouter({
  question,
  audioBus,
  onAnswer,
}: {
  question: Question
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onAnswer: (outcome: AnswerOutcome) => void
}) {
  const props: ExerciseProps = {
    audioBus,
    payload: question.payload as { args: number[] },
    onAnswer,
  }
  // Re-mount na zmianę question.factId — gwarantuje czysty stan ćwiczenia
  return <ExerciseSwitch key={question.factId} type={question.exerciseType} props={props} />
}

function ExerciseSwitch({
  type,
  props,
}: {
  type: ExerciseType
  props: ExerciseProps
}) {
  switch (type) {
    case 'subitize-flash':
      return <SubitizeFlashExercise {...props} />
    case 'match-digit-dots':
      return <MatchDigitDotsExercise {...props} />
    case 'number-rhythm':
      return <NumberRhythmExercise {...props} />
    case 'concrete-add':
      return <ConcreteAddExercise {...props} />
    case 'number-bond-builder':
      return <NumberBondBuilder {...props} />
    case 'ten-frame-fill':
      return <TenFrameFill {...props} />
    case 'concrete-add-subtract':
      return <ConcreteAddSubtract {...props} />
    case 'fact-family-triangle':
      return <FactFamilyTriangle {...props} />
    case 'doubles':
      return <DoublesExercise {...props} />
    case 'near-doubles':
      return <NearDoublesExercise {...props} />
    case 'make-10':
      return <Make10Exercise {...props} />
    case 'equal-groups':
      return <EqualGroupsExercise {...props} />
    case 'skip-count-chase':
      return <SkipCountChase {...props} />
    case 'array-match':
      return <ArrayMatchExercise {...props} />
    case 'subtract-maintenance':
      return <SubtractMaintenance {...props} />
  }
}

function StatusBar({
  counters,
  currentIdx,
  total,
  onPause,
}: {
  counters: { correct: number; wrong: number; dontKnow: number }
  currentIdx: number
  total: number
  onPause: () => void
}) {
  const pauseTap = useTapHandler({ onTap: onPause })
  const dots = Array.from({ length: total }).map((_, i) => i < currentIdx)
  return (
    <div
      data-testid="status-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: `1px solid ${colors.text}22`,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: 12, fontSize: 18, fontFamily: 'var(--font-handwritten)' }}>
        <span aria-label={`${counters.correct} poprawnych`}>✅ {counters.correct}</span>
        <span aria-label={`${counters.wrong} błędów`}>❌ {counters.wrong}</span>
        <span aria-label={`${counters.dontKnow} nie wiem`}>🤷 {counters.dontKnow}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {dots.map((done, i) => (
          <span
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: done ? colors.accentBlue : '#e5e7eb',
              display: 'inline-block',
            }}
          />
        ))}
      </div>
      <button
        type="button"
        data-testid="status-pause"
        aria-label="Pauza"
        {...pauseTap}
        style={{
          width: tapTargets.minSize,
          height: tapTargets.minSize,
          borderRadius: radii.kid,
          background: '#fef3c7',
          border: `2px solid #f59e0b`,
          fontSize: 22,
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ⏸
      </button>
    </div>
  )
}

export function FeedbackOverlay({
  outcome,
  correctValue,
  audioBus,
  onAdvance,
}: {
  outcome: AnswerOutcome
  correctValue: number | null
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onAdvance: () => void
}) {
  const onAdvanceRef = useRef(onAdvance)
  useEffect(() => {
    onAdvanceRef.current = onAdvance
  }, [onAdvance])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let safetyTimer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()

    audioBus.stop()
    const plays: Array<Promise<unknown>> = []
    if (outcome === 'correct') {
      const praise = PRAISE_KEYS[Math.floor(Math.random() * PRAISE_KEYS.length)]!
      plays.push(settled(audioBus.play(praise)))
    } else {
      plays.push(
        settled(audioBus.play(outcome === 'wrong' ? 'try-again-soft' : 'try-again')),
      )
      // Hypercorrection — kolejka jest FIFO, więc "tu było N" zagra zaraz po
      // korekcie; żadnego timera nie trzeba, a przejście czeka na koniec audio.
      if (correctValue !== null) {
        plays.push(settled(audioBus.play(`correct-show-${correctValue}`)))
      }
    }

    // Bezpiecznik: gdyby audio nigdy nie zamknęło obietnicy (element bez
    // zdarzeń `ended`/`error`), sesja nie może utknąć na overlayu.
    const safety = new Promise<void>((resolve) => {
      safetyTimer = setTimeout(resolve, MAX_FEEDBACK_MS)
    })

    void Promise.race([Promise.all(plays), safety]).then(() => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt
      timer = setTimeout(
        () => {
          if (!cancelled) onAdvanceRef.current()
        },
        Math.max(0, MIN_FEEDBACK_MS - elapsed),
      )
    })

    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
      if (safetyTimer !== undefined) clearTimeout(safetyTimer)
    }
  }, [outcome, correctValue, audioBus])

  const bg =
    outcome === 'correct' ? 'rgba(22, 163, 74, 0.85)' : 'rgba(239, 68, 68, 0.85)'
  const emoji =
    outcome === 'correct' ? '✅' : outcome === 'wrong' ? '❌' : '🤷'

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: 'var(--font-handwritten)',
    zIndex: 50,
    // 'auto' — overlay musi POCHŁANIAĆ tapy, inaczej dziecko odpowiada drugi raz
    // na to samo pytanie zanim feedback się skończy.
    pointerEvents: 'auto',
  }

  return (
    <div data-testid="feedback-overlay" data-outcome={outcome} style={overlayStyle}>
      <div style={{ fontSize: 160 }} aria-hidden="true">
        {emoji}
      </div>
      {outcome !== 'correct' && correctValue !== null && (
        <div style={{ fontSize: 96, fontWeight: 800, marginTop: 16 }}>
          {correctValue}
        </div>
      )}
    </div>
  )
}

// Re-export for tests / external usage
export type { SessionStatus }
