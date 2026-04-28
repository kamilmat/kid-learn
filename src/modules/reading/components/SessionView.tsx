// SessionView — orkiestrator UI sesji czytania.
// Phase 6.5: renderuje właściwe ćwiczenie wg poziomu + overlaye.

import { useEffect } from 'react'
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

export type SessionViewProps = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onSessionComplete?: () => void
}

export function SessionView({
  level,
  audioBus,
  settings,
  onExit,
  onSessionComplete,
}: SessionViewProps) {
  const session = useReadingSession({ level, audioBus, settings })

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
        onAlbum={onExit}
      />
    )
  }

  const exerciseType = LEVEL_TO_EXERCISE[level]
  const q = session.currentQuestion

  return (
    <div data-testid="reading-session-view" style={{ height: '100%', position: 'relative' }}>
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

      {session.feedbackVariant !== null && (
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
