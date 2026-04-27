// SessionView — composer dla całego ekranu sesji.
// Trzyma `useSession` i renderuje QuizCard / PauseOverlay / FeedbackOverlay /
// SessionEnd zgodnie ze status'em.

import { useEffect, useMemo } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { useIdleDetector } from '@/shared/engagement/useIdleDetector'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import {
  defaultSettings,
  getActiveLetterPool,
  getEffectiveShowCountdownBar,
  getEffectiveTilesPerQuestion,
  levelDefaults,
} from '@/shared/settings/defaults'
import type {
  CaseMode,
  Level,
  Settings,
  StyleMode,
} from '@/shared/settings/types'
import { useSession } from '@/modules/letters/hooks/useSession'
import type { LetterTileState } from './LetterTile'
import { FeedbackOverlay } from './FeedbackOverlay'
import { PauseOverlay } from './PauseOverlay'
import { QuizCard } from './QuizCard'
import { SessionEnd } from './SessionEnd'
import type {
  LetterState,
  SessionLog,
  Slot,
} from '@/modules/letters/types'

export type SessionViewProps = {
  level: Level
  /** Override settings (np. z store). Domyślnie defaults. */
  settings?: Settings
  /** Inicjalne LetterState'y z lettersStore. */
  initialStates?: Record<string, LetterState>
  onExit: () => void
  onSessionComplete?: (
    log: SessionLog,
    updatedStates: Record<string, LetterState>,
  ) => void
  /** Wstrzykiwany audioBus dla testów. */
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
  /** Jeśli `true`, sesja sama się startuje przy mounto. */
  autoStart?: boolean
}

function resolveCaseMode(settings: Settings, level: Level): CaseMode {
  return settings.caseMode[level] ?? levelDefaults[level].caseMode
}

function resolveStyleMode(settings: Settings, level: Level): StyleMode {
  return settings.styleMode[level] ?? levelDefaults[level].styleMode
}

export function SessionView({
  level,
  settings = defaultSettings,
  initialStates,
  onExit,
  onSessionComplete,
  audioBus = defaultAudioBus,
  autoStart = true,
}: SessionViewProps) {
  const activeLetters = useMemo(() => getActiveLetterPool(settings, level), [settings, level])
  const caseMode = resolveCaseMode(settings, level)
  const styleMode = resolveStyleMode(settings, level)

  const session = useSession({
    level,
    activeLetters,
    sessionLength: settings.sessionLength,
    timeLimit: settings.timeLimit,
    showCountdownBar: getEffectiveShowCountdownBar(settings, level),
    caseMode,
    styleMode,
    celebrationTempo: settings.celebrationTempo,
    tilesPerQuestion: getEffectiveTilesPerQuestion(settings, level),
    ...(initialStates !== undefined ? { initialStates } : {}),
    ...(onSessionComplete !== undefined ? { onSessionEnd: onSessionComplete } : {}),
    audioBus,
  })

  // Auto-start
  useEffect(() => {
    if (autoStart && session.status === 'preparing') {
      session.start()
    }
    // start jest stable poza sesją; rerunujemy tylko po zmianie statusu na 'preparing'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, session.status])

  // Anti-cheat: idle detection — auto-pauza po 20s bez interakcji.
  useIdleDetector({
    thresholdMs: 20_000,
    enabled: session.status === 'playing',
    onIdle: () => session.pause('idle'),
  })

  // Anti-cheat: page visibility — auto-pauza gdy dziecko opuszcza tab.
  usePageVisibility({
    enabled: session.status === 'playing' || session.status === 'feedback',
    onHidden: () => session.pause('visibility'),
    onVisible: () => {
      // gdy wraca i jesteśmy w pause z reason='visibility' — sam zostaje
      // pauza; dziecko musi tapnąć Wznów. To celowe (anti-cheat).
    },
  })

  // Compute tileState dla feedbacku
  const tileState = useMemo<Partial<Record<Slot, LetterTileState>> | undefined>(() => {
    if (session.status !== 'feedback' || !session.lastFeedback || !session.currentQuestion) {
      return undefined
    }
    const fb = session.lastFeedback
    const q = session.currentQuestion
    const out: Partial<Record<Slot, LetterTileState>> = {}
    if (fb.variant === 'correct' || fb.variant === 'mastery') {
      if (fb.chosenSlot !== undefined) out[fb.chosenSlot] = 'correct'
    } else if (fb.variant === 'wrong') {
      if (fb.chosenSlot !== undefined) out[fb.chosenSlot] = 'wrong'
      out[q.targetSlot] = 'highlighted-correct'
    } else {
      // dontKnow / timeout
      out[q.targetSlot] = 'highlighted-correct'
    }
    return out
  }, [session.status, session.lastFeedback, session.currentQuestion])

  if (session.status === 'finished') {
    return (
      <SessionEnd
        iskierki={session.iskierki}
        totalQuestions={session.totalQuestions}
        events={session.sessionEvents}
        onRestart={session.start}
        onExit={onExit}
        audioBus={audioBus}
      />
    )
  }

  return (
    <div data-testid="session-view">
      {session.currentQuestion !== null && (
        <QuizCard
          question={session.currentQuestion}
          caseMode={caseMode}
          styleMode={styleMode}
          questionNumber={session.questionNumber}
          totalQuestions={session.totalQuestions}
          iskierki={session.iskierki}
          currentStreak={session.currentStreak}
          mascotIntensity={session.mascotIntensity}
          lastWrongSlot={session.lastFeedback?.variant === 'wrong' ? session.lastFeedback.chosenSlot ?? null : null}
          countdownMs={session.countdownMs}
          countdownTotalMs={session.countdownTotalMs}
          interactive={session.status === 'playing'}
          {...(tileState !== undefined ? { tileState } : {})}
          onTileClick={(letter, slot) => session.answer(letter, slot)}
          onPlayAudio={() => {
            if (session.currentQuestion) {
              void audioBus.play(`letter-${session.currentQuestion.targetLetter}`)
            }
          }}
          onDontKnow={() => session.dontKnow()}
          onPause={() => session.pause('manual')}
        />
      )}
      {session.status === 'feedback' && session.lastFeedback !== null && (
        <FeedbackOverlay
          feedback={session.lastFeedback}
          caseMode={caseMode}
          styleMode={styleMode}
          chosenCase={session.currentQuestion?.chosenCase ?? 'upper'}
          onDismiss={() => {
            // FeedbackOverlay sam się dismissuje — useSession pilnuje timera.
            // Tu nic nie robimy; obecność onDismiss jest tylko dla lokalnego efektu.
          }}
        />
      )}
      {session.status === 'paused' && (
        <PauseOverlay onResume={session.resume} onQuit={() => session.quit()} />
      )}
    </div>
  )
}
