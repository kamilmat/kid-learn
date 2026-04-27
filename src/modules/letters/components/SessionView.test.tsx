import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SessionView } from './SessionView'
import { defaultSettings } from '@/shared/settings/defaults'
import type { Settings } from '@/shared/settings/types'

function makeAudioBus() {
  return {
    play: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  }
}

function settingsForTest(overrides: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings,
    sessionLength: 5,
    timeLimit: 'off',
    ...overrides,
  }
}

describe('SessionView — integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-starts and renders QuizCard with first question', () => {
    const audioBus = makeAudioBus()
    render(
      <SessionView
        level="iskierka"
        settings={settingsForTest()}
        onExit={vi.fn()}
        audioBus={audioBus}
      />,
    )
    expect(screen.getByTestId('quiz-card')).toBeInTheDocument()
    expect(screen.getByTestId('tile-grid').children).toHaveLength(4)
  })

  it('clicking a correct tile triggers feedback overlay', () => {
    const audioBus = makeAudioBus()
    render(
      <SessionView
        level="iskierka"
        settings={settingsForTest()}
        onExit={vi.fn()}
        audioBus={audioBus}
      />,
    )
    // Find the correct tile by inspecting data-letter on tiles vs the audio
    // button label — easier: pick all tiles, find one whose letter the bus
    // last requested via 'letter-x'.
    const tiles = screen.getAllByRole('button', { name: /Litera/ }) as HTMLElement[]
    // znajdź target letter na podstawie wywołań audioBus.play (key = 'letter-x')
    const audioCalls = audioBus.play.mock.calls.map((c) => c[0])
    const letterCall = audioCalls.find((k) => k.startsWith('letter-'))
    expect(letterCall).toBeDefined()
    const target = letterCall!.replace('letter-', '')
    const correctTile = tiles.find((t) => t.dataset.letter === target)
    expect(correctTile).toBeDefined()
    act(() => {
      correctTile!.click()
    })
    expect(screen.getByTestId('feedback-overlay')).toBeInTheDocument()
  })

  it('progresses to next question after feedback duration', () => {
    const audioBus = makeAudioBus()
    render(
      <SessionView
        level="iskierka"
        settings={settingsForTest({ celebrationTempo: 'medium' })}
        onExit={vi.fn()}
        audioBus={audioBus}
      />,
    )
    const tiles = screen.getAllByRole('button', { name: /Litera/ }) as HTMLElement[]
    const target = audioBus.play.mock.calls
      .map((c) => c[0])
      .find((k) => k.startsWith('letter-'))!
      .replace('letter-', '')
    const correctTile = tiles.find((t) => t.dataset.letter === target)!
    act(() => {
      correctTile.click()
    })
    expect(screen.getByTestId('feedback-overlay')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.queryByTestId('feedback-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('quiz-card')).toBeInTheDocument()
  })

  it('finishes session after configured length and shows SessionEnd', () => {
    const audioBus = makeAudioBus()
    const onSessionComplete = vi.fn()
    render(
      <SessionView
        level="iskierka"
        settings={settingsForTest({ sessionLength: 5 })}
        onExit={vi.fn()}
        onSessionComplete={onSessionComplete}
        audioBus={audioBus}
      />,
    )
    // Klikamy "Nie wiem" 5 razy, każde z advance feedback timer (3000ms dla dontKnow @medium)
    for (let i = 0; i < 5; i++) {
      act(() => {
        screen.getByTestId('dont-know-button').click()
      })
      act(() => {
        vi.advanceTimersByTime(3000)
      })
    }
    expect(screen.getByTestId('session-end')).toBeInTheDocument()
    expect(onSessionComplete).toHaveBeenCalledTimes(1)
  })

  it('opens pause overlay on pause and resumes', () => {
    const audioBus = makeAudioBus()
    render(
      <SessionView
        level="iskierka"
        settings={settingsForTest()}
        onExit={vi.fn()}
        audioBus={audioBus}
      />,
    )
    act(() => {
      screen.getByTestId('pause-button').click()
    })
    expect(screen.getByTestId('pause-overlay')).toBeInTheDocument()
    act(() => {
      screen.getByTestId('resume-button').click()
    })
    expect(screen.queryByTestId('pause-overlay')).not.toBeInTheDocument()
  })
})
