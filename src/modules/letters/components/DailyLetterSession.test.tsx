import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { defaultSettings, levelLetterPools } from '@/shared/settings/defaults'
import type { Settings } from '@/shared/settings/types'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import type { LetterState } from '@/shared/srs/types'

import { DailyLetterSession } from './DailyLetterSession'

const POOL = levelLetterPools.iskierka
// Pierwsza litera puli byłaby wybrana także „przez przypadek" (kolejność) —
// bierzemy inną, żeby test faktycznie sprawdzał ranking.
const HARD_LETTER = POOL[2] as string

function makeAudioBus() {
  return { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
}

function settingsForTest(): Settings {
  return {
    ...defaultSettings,
    secondAttempt: false,
    timeLimit: { iskierka: 'off', plomyk: 'off', ognik: 'off', pochodnia: 'off' },
  }
}

// Wszystkie litery puli widziane i opanowane, poza jedną „trudną" —
// `pickDailyLetter` musi wskazać właśnie ją.
function lettersMap(now: number): Record<string, LetterState> {
  const out: Record<string, LetterState> = {}
  for (const letter of POOL) {
    out[letter] = {
      ...createInitialLetterState(letter),
      box: letter === HARD_LETTER ? 1 : 5,
      recentWrong: letter === HARD_LETTER ? 3 : 0,
      totalSeen: 5,
      lastSeen: now - 1000,
    }
  }
  return out
}

function answerAll(letter: string, questions: number) {
  for (let i = 0; i < questions; i += 1) {
    // Drugie pytanie mikrosesji jest odwrotne (`forceReverseIndices: [1]`) —
    // odpowiedzią jest tam przycisk ✔ pod kafelkiem 🔊, nie kafelek z literą.
    const isReverse = screen.queryByTestId('reverse-quiz-card') !== null
    const tiles = screen.getAllByRole('button', {
      name: isReverse ? /Wybierz dźwięk/ : /Litera/,
    }) as HTMLElement[]
    const correct = tiles.find((t) => t.dataset.letter === letter)
    expect(correct).toBeDefined()
    act(() => {
      correct!.click()
    })
    act(() => {
      vi.advanceTimersByTime(12_000)
    })
  }
}

describe('DailyLetterSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zadaje dokładnie 4 pytania, wszystkie o tę samą literę', () => {
    const now = new Date(2026, 7, 29, 10, 0, 0).getTime()
    const onSessionComplete = vi.fn()
    const letters = lettersMap(now)

    render(
      <DailyLetterSession
        settings={settingsForTest()}
        letters={letters}
        sessions={[]}
        dailyLetter={null}
        initialStates={letters}
        onPickLetter={vi.fn()}
        onSessionComplete={onSessionComplete}
        onDone={vi.fn()}
        audioBus={makeAudioBus()}
        now={() => now}
      />,
    )

    answerAll(HARD_LETTER, 4)

    expect(onSessionComplete).toHaveBeenCalledTimes(1)
    const log = onSessionComplete.mock.calls[0]![0] as {
      level: string
      events: { type: string; targetLetter?: string }[]
    }
    expect(log.level).toBe('daily')
    const starts = log.events.filter((e) => e.type === 'question-start')
    expect(starts).toHaveLength(4)
    expect(starts.every((e) => e.targetLetter === HARD_LETTER)).toBe(true)
  })

  it('po pytaniach pokazuje kotwicę słowną i wychodzi z kluczem doby', () => {
    const now = new Date(2026, 7, 29, 10, 0, 0).getTime()
    const onDone = vi.fn()
    const letters = lettersMap(now)

    render(
      <DailyLetterSession
        settings={settingsForTest()}
        letters={letters}
        sessions={[]}
        dailyLetter={null}
        initialStates={letters}
        onPickLetter={vi.fn()}
        onDone={onDone}
        audioBus={makeAudioBus()}
        now={() => now}
      />,
    )

    answerAll(HARD_LETTER, 4)
    expect(screen.getByTestId('daily-letter-word')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(onDone).toHaveBeenCalledWith('2026-08-29')
  })

  it('nie przelosowuje litery w tej samej dobie, losuje nową po północy', () => {
    const now = new Date(2026, 7, 29, 10, 0, 0).getTime()
    const letters = lettersMap(now)
    const onPickToday = vi.fn()

    const view = render(
      <DailyLetterSession
        settings={settingsForTest()}
        letters={letters}
        sessions={[]}
        dailyLetter={{ letter: POOL[0] as string, dayKey: '2026-08-29' }}
        initialStates={letters}
        onPickLetter={onPickToday}
        onDone={vi.fn()}
        audioBus={makeAudioBus()}
        now={() => now}
      />,
    )
    // Zapamiętana litera z dziś wygrywa nad rankingiem — bez zapisu do store'u.
    expect(onPickToday).not.toHaveBeenCalled()
    const tiles = screen.getAllByRole('button', { name: /Litera/ }) as HTMLElement[]
    expect(tiles.some((t) => t.dataset.letter === POOL[0])).toBe(true)

    view.unmount()

    const tomorrow = new Date(2026, 7, 30, 10, 0, 0).getTime()
    const onPickTomorrow = vi.fn()
    render(
      <DailyLetterSession
        settings={settingsForTest()}
        letters={letters}
        sessions={[]}
        dailyLetter={{ letter: POOL[0] as string, dayKey: '2026-08-29' }}
        initialStates={letters}
        onPickLetter={onPickTomorrow}
        onDone={vi.fn()}
        audioBus={makeAudioBus()}
        now={() => tomorrow}
      />,
    )
    expect(onPickTomorrow).toHaveBeenCalledWith({
      letter: HARD_LETTER,
      dayKey: '2026-08-30',
    })
  })
})
