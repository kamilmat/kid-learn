// SessionView — orkiestrator UI sesji czytania.
// Phase 6.5: renderuje właściwe ćwiczenie wg poziomu + overlaye.
// Phase 7: mini-scenki słów po poprawnej odpowiedzi (Płomyk/Ognik/Pochodnia).
// Phase 8: IskraMascotAnimated (comic-fail przy wrong/dontKnow, success przy correct).
// Phase 10: WildCelebration — 5 absurdalnych celebracji co wildCelebrationFreq correct.
// Phase 12: status bar (iskierki + kropki postępu + pauza), onboarding intro, anti-cheat.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { WildCelebration } from './WildCelebration'
import { pickRandomWildCelebration, type WildCelebrationDef } from '../data/wildCelebrations'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Level, Settings } from '@/shared/settings/types'
import { useReadingSession } from '../hooks/useReadingSession'
import type { QuestionOutcome } from '../hooks/useReadingSession'
import { LEVEL_TO_EXERCISE } from '../types'
import { SyllableMatchExercise } from './exercises/SyllableMatchExercise'
import { WordAssemblyExercise } from './exercises/WordAssemblyExercise'
import { WordChoiceExercise } from './exercises/WordChoiceExercise'
import { SyllableFillExercise } from './exercises/SyllableFillExercise'
import { FeedbackOverlay } from './FeedbackOverlay'
import { PauseOverlay } from '@/shared/ui/PauseOverlay'
import { SessionEnd } from './SessionEnd'
import { WordScene } from './WordScene'
import { pickRandomScene } from '../data/scenes'
import type { Scene } from '../data/scenes'
import { useReading } from '../store/readingStore'
import { useIskraReactions } from '../hooks/useIskraReactions'
import { IskraMascotAnimated } from './IskraMascotAnimated'
import { useIdleDetector } from '@/shared/engagement/useIdleDetector'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type SessionViewProps = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onAlbum?: () => void
  onSessionComplete?: () => void
  /**
   * Ref, do którego sesja wpina „zapisz częściowy postęp". KidNav w routingu
   * modułu woła go zanim odejdzie z ekranu — ⬅️/🏠 nie mogą gubić SRS.
   */
  quitRef?: RefObject<(() => void) | null>
}

function getDotColor(
  i: number,
  currentQuestionIndex: number,
  questionOutcomes: QuestionOutcome[],
): string {
  if (i < currentQuestionIndex) {
    const outcome = questionOutcomes[i]
    return outcome === 'correct' ? '#10b981' : '#f59e0b'
  }
  // aktualne lub przyszłe — szare
  return '#d1d5db'
}

export function SessionView({
  level,
  audioBus,
  settings,
  onExit,
  onAlbum,
  onSessionComplete,
  quitRef,
}: SessionViewProps) {
  const session = useReadingSession({ level, audioBus, settings })
  const seenVariants = useReading(s => s.seenSceneVariants)
  const markSceneSeen = useReading(s => s.markSceneSeen)
  // Box celu — rusztowanie koloru sylab gaśnie wraz z opanowaniem (Task 6).
  const targetWordText =
    session.currentQuestion?.type === 'syllable-fill' ? session.currentQuestion.targetWord : null
  const targetWordBox = useReading(s => (targetWordText ? s.words[`word-${targetWordText}`]?.box : undefined))
  const [activeScene, setActiveScene] = useState<Scene | null>(null)
  const [activeWildCelebration, setActiveWildCelebration] = useState<WildCelebrationDef | null>(null)
  const iskra = useIskraReactions()
  const lastFeedbackRef = useRef<typeof session.feedbackVariant>(null)

  // Id scenki, której audio już poszło. Ref (nie state) przeżywa remount po
  // pauzie — dzięki temu wznowienie nie dokłada klipu słowa drugi raz.
  const scenePlayedRef = useRef<string | null>(null)

  const wordAnimationsEnabled = settings.reading.wordAnimations !== 'off'

  // Onboarding głosowy poziomu odpala się w `session.start()` — kolejka FIFO
  // (intro -> prompt), inaczej `stop()` ze start() ucinał intro w tym samym mouncie.

  // Anti-cheat: idle detection — auto-pauza po 20s bez interakcji.
  // Także podczas feedbacku: overlay auto-znika, ale dziecko może odejść w trakcie.
  //
  // WYJĄTEK `session.blend !== null`: trwa krok syntezy („Składamy: MA… MA… MAMA"),
  // czyli to aplikacja mówi, a dziecko ma słuchać. Detektor liczy tylko tapy, więc
  // bez tego wyjątku najdłuższe słowa (LOKOMOTYWA) potrafiłyby przekroczyć próg
  // i wpaść w auto-pauzę w środku zdania — za karę za grzeczne słuchanie.
  //
  // NIEZMIENNIK: składanie musi zmieścić się w `MAX_FEEDBACK_MS` (20 s w
  // `FeedbackOverlay`) — to jedyny zawór, który domyka feedback, gdy sekwencja
  // nie dojdzie do końca. Wydłużając `BLEND_PAUSE_MS` albo dokładając klipy,
  // sprawdź oba progi razem.
  useIdleDetector({
    thresholdMs: 20_000,
    enabled:
      (session.status === 'asking' ||
        session.status === 'retry' ||
        session.status === 'feedback') &&
      session.blend === null,
    onIdle: () => session.pause(),
  })

  // Anti-cheat: page visibility — auto-pauza gdy dziecko opuszcza tab
  usePageVisibility({
    enabled:
      session.status === 'asking' ||
      session.status === 'retry' ||
      session.status === 'feedback',
    onHidden: () => session.pause(),
    onVisible: () => {
      // pauza pozostaje aktywna — dziecko musi tapnąć Wznów (celowe)
    },
  })

  const pauseHandlers = useTapHandler({ onTap: () => session.pause() })

  // `session` to nowy obiekt co render — flush trzymamy w refie, żeby efekt
  // unmountu miał zawsze aktualną wersję i nie restartował się co render.
  const flushFnRef = useRef(session.flush)
  flushFnRef.current = session.flush
  const flush = useCallback(() => {
    flushFnRef.current()
  }, [])

  // Wyjście dowolną drogą (KidNav ⬅️/🏠, wstecz przeglądarki, zmiana route'a)
  // musi utrwalić częściowy postęp. `flush` jest idempotentne.
  useEffect(() => {
    if (quitRef) quitRef.current = flush
    return () => {
      flush()
      if (quitRef) quitRef.current = null
    }
  }, [flush, quitRef])

  // Startuj sesję przy mounto
  useEffect(() => {
    session.start()
    // mount-only — session.start jest stable, ale nie chcemy rerunować
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Powiadom rodzica gdy sesja zakończona
  useEffect(() => {
    if (session.status === 'complete' && session.results) {
      onSessionComplete?.()
    }
  }, [session.status, session.results, onSessionComplete])

  // Iskra reaguje na feedback: comic-fail przy wrong/dontKnow, success przy correct
  useEffect(() => {
    if (session.feedbackVariant === lastFeedbackRef.current) return
    lastFeedbackRef.current = session.feedbackVariant
    if (session.feedbackVariant === 'wrong' || session.feedbackVariant === 'dontKnow') {
      iskra.triggerComicFail()
    } else if (session.feedbackVariant === 'correct') {
      iskra.triggerSuccess()
    }
  // iskra jest stable (useCallback), ale nie potrzebujemy go w deps — zmieniamy state, nie odczytujemy
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.feedbackVariant])

  // Trigger scene on correct answer for non-Iskierka exercises
  useEffect(() => {
    if (
      session.feedbackVariant === 'correct' &&
      session.currentQuestion !== null &&
      session.currentQuestion.type !== 'syllable-match' &&
      activeScene === null &&
      wordAnimationsEnabled
    ) {
      const q = session.currentQuestion
      let wordText: string | null = null
      if (q.type === 'word-assembly' || q.type === 'word-choice' || q.type === 'syllable-fill') {
        wordText = q.targetWord
      }
      if (wordText) {
        const seen = seenVariants[wordText] ?? []
        const scene = pickRandomScene(wordText, seen)
        if (scene) {
          markSceneSeen(wordText, scene.id)
          setActiveScene(scene)
        }
      }
    }
  // activeScene intentionally not in deps — we only want to fire once per correct transition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.feedbackVariant, session.currentQuestion, wordAnimationsEnabled])

  // Reset activeScene when feedback is dismissed
  useEffect(() => {
    if (session.feedbackVariant === null && activeScene !== null) {
      scenePlayedRef.current = null
      setActiveScene(null)
    }
  }, [session.feedbackVariant, activeScene])

  // Trigger wild celebration when feedbackVariant='wild'
  useEffect(() => {
    if (session.feedbackVariant === 'wild' && !activeWildCelebration) {
      setActiveWildCelebration(pickRandomWildCelebration())
    }
    if (session.feedbackVariant === null && activeWildCelebration) {
      setActiveWildCelebration(null)
    }
  // activeWildCelebration intentionally handled via early-return pattern above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.feedbackVariant])

  const handleSceneComplete = useCallback(() => {
    scenePlayedRef.current = null
    setActiveScene(null)
  }, [])

  const noteSceneAudioFn = session.noteSceneAudio
  const handleSceneAudio = useCallback(
    (audio: Promise<void>) => {
      noteSceneAudioFn(audio)
    },
    [noteSceneAudioFn],
  )

  // Wyjście w trakcie sesji — zapisz częściowy postęp SRS zanim odejdziemy
  const handleExit = useCallback(() => {
    session.quit()
    onExit()
  // session nie jest stabilny (nowy obiekt co render) — quit odczytuje refy
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onExit, session.quit])

  if (session.status === 'idle') {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Ładowanie…
      </div>
    )
  }

  if (session.status === 'complete' && session.results) {
    return (
      <SessionEnd
        results={session.results}
        onExit={handleExit}
        onAlbum={onAlbum ?? handleExit}
        audioBus={audioBus}
      />
    )
  }

  const exerciseType = LEVEL_TO_EXERCISE[level]
  const q = session.currentQuestion

  return (
    <div data-testid="reading-session-view" style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes reading-dot-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }`}</style>

      {/* Status bar — iskierki + kropki postępu + pauza */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#fef9f2',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        {/* Licznik iskierek */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 18 }}>
          <span>💎</span>
          <span>{session.iskierkiEarned}</span>
        </div>

        {/* Kropki postępu */}
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: session.totalQuestions }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: getDotColor(i, session.currentQuestionIndex, session.questionOutcomes),
                animation: i === session.currentQuestionIndex ? 'reading-dot-pulse 1s ease-in-out infinite' : undefined,
              }}
            />
          ))}
        </div>

        {/* Pauza */}
        <button
          {...pauseHandlers}
          aria-label="Pauza"
          style={{
            width: 60,
            height: 60,
            fontSize: 28,
            borderRadius: 14,
            background: '#f3f4f6',
            border: '2px solid #d1d5db',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ⏸
        </button>
      </div>

      {/* Ćwiczenie + overlaye — wypełniają resztę ekranu */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Iskra w górnym rogu — reaguje na feedback (comic-fail / success) */}
        <div style={{ position: 'fixed', top: 80, right: 16, zIndex: 100 }}>
          <IskraMascotAnimated audioBus={audioBus} size={60} intensity="flame" reactionsHook={iskra} />
        </div>
        {q && exerciseType === 'syllable-match' && q.type === 'syllable-match' && (
          <SyllableMatchExercise
            targetSyllable={q.targetSyllable}
            choices={q.choices}
            onAnswer={session.submitAnswer}
            onDontKnow={session.submitDontKnow}
            onAudioRepeat={session.repeatAudio}
          />
        )}
        {q && exerciseType === 'word-assembly' && q.type === 'word-assembly' && (
          <WordAssemblyExercise
            targetWord={q.targetWord}
            syllables={q.syllables}
            distractors={q.distractors}
            onComplete={() => session.submitAnswer(q.targetWord)}
            onDropError={session.recordDropError}
            onDontKnow={session.submitDontKnow}
            onAudioRepeat={session.repeatAudio}
          />
        )}
        {q && exerciseType === 'word-choice' && q.type === 'word-choice' && (
          <WordChoiceExercise
            targetWord={q.targetWord}
            choices={q.choices}
            onAnswer={session.submitAnswer}
            onDontKnow={session.submitDontKnow}
            onAudioRepeat={session.repeatAudio}
          />
        )}
        {q && exerciseType === 'syllable-fill' && q.type === 'syllable-fill' && (
          <SyllableFillExercise
            targetWord={q.targetWord}
            visibleSyllables={q.visibleSyllables}
            missingPosition={q.missingPosition}
            missingSyllable={q.missingSyllable}
            choices={q.choices}
            box={targetWordBox}
            onAnswer={session.submitAnswer}
            onDontKnow={session.submitDontKnow}
            onAudioRepeat={session.repeatAudio}
          />
        )}

        {/* WordScene plays above everything as the celebration IS the feedback.
            Na pauzie nie renderujemy overlayów feedbacku — inaczej blokowały
            tapy w PauseOverlay i sesja się zakleszczała. */}
        {activeScene && !activeWildCelebration && !session.paused && (
          <WordScene
            scene={activeScene}
            audioBus={audioBus}
            onComplete={handleSceneComplete}
            blend={session.blend}
            playedRef={scenePlayedRef}
            onAudioSequence={handleSceneAudio}
          />
        )}

        {/* FeedbackOverlay shown only when no active scene and not wild (scene/wild replace it) */}
        {session.feedbackVariant !== null && session.feedbackVariant !== 'wild' && !activeScene && !activeWildCelebration && !session.paused && (
          <FeedbackOverlay
            variant={session.feedbackVariant}
            onSkip={session.skipFeedback}
            waitForAudio={session.waitForFeedbackAudio}
            paused={session.paused}
            blend={session.blend}
          />
        )}

        {/* WildCelebration — z-index 1500, renders above everything */}
        {activeWildCelebration && !session.paused && (
          <WildCelebration
            def={activeWildCelebration}
            audioBus={audioBus}
            onComplete={() => {
              setActiveWildCelebration(null)
              session.skipFeedback()
            }}
          />
        )}

        {session.paused && (
          <PauseOverlay onResume={session.resume} onQuit={handleExit} />
        )}
      </div>
    </div>
  )
}
