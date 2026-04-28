import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Settings, Level } from '@/shared/settings/types'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'
import { useNumbersSession, type SessionStatus } from '../hooks/useNumbersSession'
import { useNumbers } from '../store/numbersStore'
import type { AnswerOutcome, ExerciseType, Question } from '../types'
import { ConceptIntro } from './intros/ConceptIntro'
import { SessionEnd } from './SessionEnd'
import { PauseOverlay } from './PauseOverlay'
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

const FEEDBACK_DURATION_MS = 2200

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
        onPause={session.pause}
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
          audioBus={audioBus}
          onResume={session.resume}
          onExit={onExit}
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
          width: 44,
          height: 44,
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

function FeedbackOverlay({
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
  useEffect(() => {
    audioBus.stop()
    if (outcome === 'correct') {
      const praise = PRAISE_KEYS[Math.floor(Math.random() * PRAISE_KEYS.length)]
      void audioBus.play(praise!)
    } else if (outcome === 'wrong') {
      void audioBus.play('try-again-soft')
      if (correctValue !== null) {
        // Hypercorrection — krótka pauza, potem pokazanie poprawnego
        const t = setTimeout(() => {
          void audioBus.play(`correct-show-${correctValue}`)
        }, 900)
        return () => clearTimeout(t)
      }
    } else {
      void audioBus.play('try-again')
      if (correctValue !== null) {
        const t = setTimeout(() => {
          void audioBus.play(`correct-show-${correctValue}`)
        }, 900)
        return () => clearTimeout(t)
      }
    }
    return undefined
  }, [outcome, correctValue, audioBus])

  useEffect(() => {
    const t = setTimeout(onAdvance, FEEDBACK_DURATION_MS)
    return () => clearTimeout(t)
  }, [onAdvance])

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
    pointerEvents: 'none',
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

function extractCorrectValue(question: Question): number | null {
  const args = (question.payload as { args: number[] }).args
  switch (question.exerciseType) {
    case 'subitize-flash':
    case 'match-digit-dots':
      return args[0] ?? null
    case 'number-rhythm':
      return args[0] ?? null
    case 'concrete-add':
      return (args[0] ?? 0) + (args[1] ?? 0)
    case 'number-bond-builder':
      return args[0] ?? null  // whole
    case 'ten-frame-fill':
      return args[1] ?? null  // missing
    case 'concrete-add-subtract': {
      const op = (question.payload as { op?: '+' | '-' }).op ?? '+'
      const a = args[0] ?? 0
      const b = args[1] ?? 0
      return op === '-' ? a - b : a + b
    }
    case 'fact-family-triangle':
      return args[2] ?? null  // whole
    case 'doubles':
      return (args[0] ?? 0) * 2
    case 'near-doubles':
      return (args[0] ?? 0) + (args[1] ?? 0)
    case 'make-10':
      return (args[0] ?? 0) + (args[1] ?? 0)
    case 'equal-groups':
      return (args[0] ?? 0) * (args[1] ?? 0)
    case 'skip-count-chase':
      return args[2] ?? null  // nextValue
    case 'array-match':
      return (args[0] ?? 0) * (args[1] ?? 0)
    case 'subtract-maintenance':
      return (args[0] ?? 0) - (args[1] ?? 0)
  }
}

// Re-export for tests / external usage
export type { SessionStatus }
