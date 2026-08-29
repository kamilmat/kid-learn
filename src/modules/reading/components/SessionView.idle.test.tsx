// Anti-cheat vs krok syntezy: gdy aplikacja mówi („Składamy: MA… MA… MAMA"),
// detektor bezczynności musi być WYŁĄCZONY — inaczej grzeczne słuchanie
// kończyło się auto-pauzą w środku sekwencji.

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import type { BlendState } from '../hooks/useReadingSession'

const hoisted = vi.hoisted(() => ({
  idleEnabled: [] as boolean[],
  blend: null as BlendState | null,
}))

vi.mock('@/shared/engagement/useIdleDetector', () => ({
  useIdleDetector: ({ enabled }: { enabled: boolean }) => {
    hoisted.idleEnabled.push(enabled)
  },
}))

// Partial mock: `FeedbackOverlay` importuje z tego modułu stałą MIN_FEEDBACK_MS.
vi.mock('../hooks/useReadingSession', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useReadingSession: () => ({
    status: 'feedback',
    totalQuestions: 5,
    currentQuestionIndex: 0,
    currentQuestion: null,
    feedbackVariant: 'correct',
    paused: false,
    results: null,
    iskierkiEarned: 1,
    questionOutcomes: [],
    blend: hoisted.blend,
    start: vi.fn(),
    submitAnswer: vi.fn(),
    submitDontKnow: vi.fn(),
    recordDropError: vi.fn(),
    skipFeedback: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    repeatAudio: vi.fn(),
    quit: vi.fn(),
    flush: vi.fn(),
    waitForFeedbackAudio: () => new Promise<void>(() => {}),
    noteSceneAudio: vi.fn(),
    pickedScene: null,
  }),
}))

const { SessionView } = await import('./SessionView')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const settings: any = {
  secondAttempt: true,
  reading: { wordAnimations: 'off', wildCelebrationFreq: 99, questionsPerSession: {} },
}

function renderView() {
  return render(
    <SessionView
      level="ognik"
      audioBus={{ play: vi.fn().mockResolvedValue(true), stop: vi.fn() }}
      settings={settings}
      onExit={vi.fn()}
    />,
  )
}

describe('SessionView — idle detector a krok syntezy', () => {
  beforeEach(() => {
    hoisted.idleEnabled.length = 0
  })

  it('bez składania detektor działa, w trakcie składania jest wyłączony', () => {
    hoisted.blend = null
    renderView()
    expect(hoisted.idleEnabled.at(-1)).toBe(true)

    hoisted.idleEnabled.length = 0
    hoisted.blend = { syllables: ['MA', 'MA'], activeIndex: 0 }
    renderView()
    expect(hoisted.idleEnabled.at(-1)).toBe(false)
  })
})
