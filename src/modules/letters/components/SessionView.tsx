// SessionView — composer dla całego ekranu sesji.
// Trzyma `useSession` i renderuje QuizCard / PauseOverlay / FeedbackOverlay /
// SessionEnd zgodnie ze status'em.

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { useIdleDetector } from '@/shared/engagement/useIdleDetector'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import {
  defaultSettings,
  getActiveLetterPool,
  getEffectivePromptMode,
  getEffectiveShowCountdownBar,
  getEffectiveTilesPerQuestion,
  getEffectiveTimeLimit,
  levelDefaults,
} from '@/shared/settings/defaults'
import type {
  CaseMode,
  Level,
  Settings,
  StyleMode,
} from '@/shared/settings/types'
import { promptAudioKeys, soundKey } from '@/modules/letters/audio/promptKeys'
import { useSession } from '@/modules/letters/hooks/useSession'
import type { LetterTileState } from './LetterTile'
import { FeedbackOverlay } from './FeedbackOverlay'
import { PauseOverlay } from '@/shared/ui/PauseOverlay'
import { QuizCard } from './QuizCard'
import { ReverseQuizCard } from './ReverseQuizCard'
import { SessionEnd } from './SessionEnd'
import type { SessionMode } from '@/shared/stats/types'
import type {
  LetterState,
  SessionLog,
  Slot,
} from '@/modules/letters/types'

export type SessionViewProps = {
  /** Poziom, z którego bierzemy pulę liter i config (case/style/kafelki). */
  level: Level
  /**
   * Czym była sesja w logu — domyślnie `level`. Tryby powtórki (`hard`)
   * używają configu poziomu, ale muszą zapisać się w raporcie pod swoją nazwą.
   */
  mode?: SessionMode
  /** Pula celów pytań (powtórka). Brak → cała pula poziomu. */
  targetPool?: string[]
  /** Nadpisanie `settings.questionsPerSession` (powtórka ma tyle pytań ile liter). */
  sessionLength?: number
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
  /** Co które pytanie jest wariantem odwrotnym (`letter-to-sound`). Default 5. */
  reverseEvery?: number
  /** Indeksy pytań wymuszone jako odwrotne (mikrosesje o własnej długości). */
  forceReverseIndices?: number[]
  /**
   * Ref, do którego sesja wpina „zapisz częściowy postęp". KidNav w routingu
   * modułu woła go zanim odejdzie z ekranu — ⬅️/🏠 nie mogą gubić SRS.
   */
  quitRef?: RefObject<(() => void) | null>
}

function resolveCaseMode(settings: Settings, level: Level): CaseMode {
  return settings.caseMode[level] ?? levelDefaults[level].caseMode
}

function resolveStyleMode(settings: Settings, level: Level): StyleMode {
  return settings.styleMode[level] ?? levelDefaults[level].styleMode
}

export function SessionView({
  level,
  mode,
  targetPool,
  sessionLength,
  settings = defaultSettings,
  initialStates,
  onExit,
  onSessionComplete,
  audioBus = defaultAudioBus,
  autoStart = true,
  reverseEvery,
  forceReverseIndices,
  quitRef,
}: SessionViewProps) {
  const activeLetters = useMemo(() => getActiveLetterPool(settings, level), [settings, level])
  const caseMode = resolveCaseMode(settings, level)
  const styleMode = resolveStyleMode(settings, level)
  const promptMode = getEffectivePromptMode(settings, level)

  const effectiveSessionLength = sessionLength ?? settings.questionsPerSession

  const session = useSession({
    level: mode ?? level,
    activeLetters,
    ...(targetPool !== undefined ? { targetPool } : {}),
    sessionLength: effectiveSessionLength,
    timeLimit: getEffectiveTimeLimit(settings, level),
    showCountdownBar: getEffectiveShowCountdownBar(settings, level),
    caseMode,
    styleMode,
    celebrationTempo: settings.celebrationTempo,
    tilesPerQuestion: getEffectiveTilesPerQuestion(settings, level),
    secondAttempt: settings.secondAttempt,
    ...(reverseEvery !== undefined ? { reverseEvery } : {}),
    ...(forceReverseIndices !== undefined ? { forceReverseIndices } : {}),
    promptMode,
    ...(initialStates !== undefined ? { initialStates } : {}),
    ...(onSessionComplete !== undefined ? { onSessionEnd: onSessionComplete } : {}),
    audioBus,
  })

  // `session` to nowy obiekt co render — flush trzymamy w refie, żeby efekt
  // unmountu miał zawsze aktualną wersję i nie restartował się co render.
  const flushFnRef = useRef(session.flush)
  flushFnRef.current = session.flush
  const flush = useCallback(() => {
    flushFnRef.current()
  }, [])

  // Wyjście dowolną drogą (KidNav ⬅️/🏠, wstecz przeglądarki, zmiana route'a)
  // musi utrwalić częściowy postęp. `flush` jest idempotentne — po normalnym
  // końcu sesji ani po `quit()` nie zapisuje drugi raz.
  useEffect(() => {
    if (quitRef) quitRef.current = flush
    return () => {
      flush()
      if (quitRef) quitRef.current = null
    }
  }, [flush, quitRef])

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
    enabled: session.status === 'playing' || session.status === 'retry',
    onIdle: () => session.pause('idle'),
  })

  // Anti-cheat: page visibility — auto-pauza gdy dziecko opuszcza tab.
  usePageVisibility({
    enabled:
      session.status === 'playing' ||
      session.status === 'feedback' ||
      session.status === 'retry',
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

  // Wariant odwrotny: odsłuch kandydata NIE jest odpowiedzią, tylko podglądem
  // dźwięku. `stop()` przed play — dziecko przeskakuje między kandydatami
  // szybciej niż trwa klip, kolejkowanie dałoby kakofonię z opóźnieniem.
  //
  // Idle-timer: tap kafelka emituje natywne `pointerdown`, które bąbelkuje do
  // `document` — tam słucha `useIdleDetector` i restartuje odliczanie. Dziecko
  // słuchające trzech kandydatów przez pół minuty nie dostanie auto-pauzy.
  // Kandydat gra ZAWSZE sam dźwięk (`soundKey`, nagranie rodzica), niezależnie
  // od `promptMode`: w trybie `both`/`name` prompt zaczyna się od nazwy litery
  // („em"), a nazwa zdradza odpowiedź szybciej niż dziecko zdąży posłuchać
  // dźwięku — cała trudność wariantu odwrotnego by wyparowała.
  const playCandidate = useCallback(
    (letter: string) => {
      audioBus.stop()
      void audioBus.play(soundKey(letter))
    },
    [audioBus],
  )

  if (session.status === 'finished') {
    return (
      <SessionEnd
        iskierki={session.iskierki}
        totalQuestions={session.totalQuestions}
        sessionLength={effectiveSessionLength}
        events={session.sessionEvents}
        onRestart={session.start}
        onExit={onExit}
        audioBus={audioBus}
      />
    )
  }

  const isReverse = session.currentQuestion?.kind === 'letter-to-sound'

  return (
    <div data-testid="session-view">
      {session.currentQuestion !== null && isReverse && (
        <ReverseQuizCard
          question={session.currentQuestion}
          caseMode={caseMode}
          styleMode={styleMode}
          questionNumber={session.questionNumber}
          totalQuestions={session.totalQuestions}
          iskierki={session.iskierki}
          wrongCount={session.wrongCount}
          dontKnowCount={session.dontKnowCount + session.timeoutCount}
          mascotIntensity={session.mascotIntensity}
          interactive={session.status === 'playing' || session.status === 'retry'}
          {...(tileState !== undefined ? { tileState } : {})}
          onPlayCandidate={playCandidate}
          onTileClick={(letter, slot) => session.answer(letter, slot)}
          onDontKnow={() => session.dontKnow()}
          onPause={() => session.pause('manual')}
        />
      )}
      {session.currentQuestion !== null && !isReverse && (
        <QuizCard
          question={session.currentQuestion}
          caseMode={caseMode}
          styleMode={styleMode}
          questionNumber={session.questionNumber}
          totalQuestions={session.totalQuestions}
          iskierki={session.iskierki}
          wrongCount={session.wrongCount}
          dontKnowCount={session.dontKnowCount + session.timeoutCount}
          mascotIntensity={session.mascotIntensity}
          lastWrongSlot={session.lastFeedback?.variant === 'wrong' ? session.lastFeedback.chosenSlot ?? null : null}
          countdownMs={session.countdownMs}
          countdownTotalMs={session.countdownTotalMs}
          interactive={session.status === 'playing' || session.status === 'retry'}
          {...(tileState !== undefined ? { tileState } : {})}
          onTileClick={(letter, slot) => session.answer(letter, slot)}
          onPlayAudio={() => {
            if (session.currentQuestion) {
              // Stop przed play — bez tego wielokrotne kliknięcia w 🔊
              // dorzucały kolejne kopie do FIFO queue, które grały sekwencyjnie
              // z opóźnieniem ("powtórz" powinno restartować, nie kolejkować).
              audioBus.stop()
              for (const key of promptAudioKeys(
                session.currentQuestion.targetLetter,
                promptMode,
              )) {
                void audioBus.play(key)
              }
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
          onSkip={session.skipFeedback}
          onDismiss={() => {
            // useSession pilnuje timera. onDismiss jest no-op dla zgodności
            // z FeedbackOverlay API (overlay nie planuje własnego setTimeout).
          }}
        />
      )}
      {session.status === 'paused' && (
        <PauseOverlay onResume={session.resume} onQuit={() => session.quit()} />
      )}
    </div>
  )
}
