// SessionView — orkiestrator UI sesji czytania.
// Phase 6.5: renderuje właściwe ćwiczenie wg poziomu + overlaye.
// Phase 7: mini-scenki słów po poprawnej odpowiedzi (Płomyk/Ognik/Pochodnia).
// Phase 8: IskraMascotAnimated (comic-fail przy wrong/dontKnow, success przy correct).

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Level, Settings } from '@/shared/settings/types'
import { useReadingSession } from '../hooks/useReadingSession'
import { LEVEL_TO_EXERCISE } from '../types'
import { SyllableMatchExercise } from './exercises/SyllableMatchExercise'
import { WordAssemblyExercise } from './exercises/WordAssemblyExercise'
import { WordChoiceExercise } from './exercises/WordChoiceExercise'
import { SyllableFillExercise } from './exercises/SyllableFillExercise'
import { FeedbackOverlay } from './FeedbackOverlay'
import { PauseOverlay } from './PauseOverlay'
import { SessionEnd } from './SessionEnd'
import { WordScene } from './WordScene'
import { pickRandomScene } from '../data/scenes'
import type { Scene } from '../data/scenes'
import { useReading } from '../store/readingStore'
import { useIskraReactions } from '../hooks/useIskraReactions'
import { IskraMascotAnimated } from './IskraMascotAnimated'

export type SessionViewProps = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onAlbum?: () => void
  onSessionComplete?: () => void
}

export function SessionView({
  level,
  audioBus,
  settings,
  onExit,
  onAlbum,
  onSessionComplete,
}: SessionViewProps) {
  const session = useReadingSession({ level, audioBus, settings })
  const seenVariants = useReading(s => s.seenSceneVariants)
  const markSceneSeen = useReading(s => s.markSceneSeen)
  const [activeScene, setActiveScene] = useState<Scene | null>(null)
  const iskra = useIskraReactions()
  const lastFeedbackRef = useRef<typeof session.feedbackVariant>(null)

  // wordAnimations: enabled unless explicitly set to 'off' (Phase 11 will add settings UI)
  const wordAnimationsEnabled = (settings.reading as Record<string, unknown> | undefined)?.wordAnimations !== 'off'

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
      setActiveScene(null)
    }
  }, [session.feedbackVariant, activeScene])

  const handleSceneComplete = useCallback(() => {
    setActiveScene(null)
  }, [])

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
        onExit={onExit}
        onAlbum={onAlbum ?? onExit}
        audioBus={audioBus}
      />
    )
  }

  const exerciseType = LEVEL_TO_EXERCISE[level]
  const q = session.currentQuestion

  return (
    <div data-testid="reading-session-view" style={{ height: '100%', position: 'relative' }}>
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
          onAnswer={session.submitAnswer}
          onDontKnow={session.submitDontKnow}
          onAudioRepeat={session.repeatAudio}
        />
      )}

      {/* WordScene plays above everything as the celebration IS the feedback */}
      {activeScene && (
        <WordScene
          scene={activeScene}
          audioBus={audioBus}
          onComplete={handleSceneComplete}
        />
      )}

      {/* FeedbackOverlay shown only when no active scene (scene replaces it for 'correct') */}
      {session.feedbackVariant !== null && !activeScene && (
        <FeedbackOverlay
          variant={session.feedbackVariant}
          onSkip={session.skipFeedback}
        />
      )}

      {session.paused && (
        <PauseOverlay
          onResume={session.resume}
          onExit={onExit}
        />
      )}
    </div>
  )
}
