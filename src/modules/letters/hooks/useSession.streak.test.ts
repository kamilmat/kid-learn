import { describe, it, expect } from 'vitest'
import {
  streakIntensity,
  streakAudioKey,
  detectPerfectSession,
} from './useSession.pickers'
import type { SessionEvent } from '@/modules/letters/types'

describe('streakIntensity', () => {
  it('returns spark for streak < 3', () => {
    expect(streakIntensity(0)).toBe('spark')
    expect(streakIntensity(1)).toBe('spark')
    expect(streakIntensity(2)).toBe('spark')
  })
  it('returns flame for 3 ≤ streak < 5', () => {
    expect(streakIntensity(3)).toBe('flame')
    expect(streakIntensity(4)).toBe('flame')
  })
  it('returns fire for 5 ≤ streak < 7', () => {
    expect(streakIntensity(5)).toBe('fire')
    expect(streakIntensity(6)).toBe('fire')
  })
  it('returns torch for streak ≥ 7', () => {
    expect(streakIntensity(7)).toBe('torch')
    expect(streakIntensity(20)).toBe('torch')
  })
})

describe('streakAudioKey', () => {
  it('returns null for streak < 3', () => {
    expect(streakAudioKey(0)).toBeNull()
    expect(streakAudioKey(2)).toBeNull()
  })
  it('returns streak-3 exactly at 3', () => {
    expect(streakAudioKey(3)).toBe('streak-3')
  })
  it('returns null between 4 and 4 (no audio for non-threshold)', () => {
    expect(streakAudioKey(4)).toBeNull()
  })
  it('returns streak-5 exactly at 5', () => {
    expect(streakAudioKey(5)).toBe('streak-5')
  })
  it('returns null at 6', () => {
    expect(streakAudioKey(6)).toBeNull()
  })
  it('returns streak-7-plus at 7', () => {
    expect(streakAudioKey(7)).toBe('streak-7-plus')
  })
  it('returns streak-7-plus for every milestone above 7 (10, 15)', () => {
    expect(streakAudioKey(10)).toBe('streak-7-plus')
    expect(streakAudioKey(15)).toBe('streak-7-plus')
  })
})

describe('detectPerfectSession', () => {
  function answer(outcome: 'correct' | 'wrong' | 'dontKnow' | 'timeout'): SessionEvent {
    return { type: 'answer', ts: 0, outcome, responseMs: 100 }
  }
  function questionStart(letter: string): SessionEvent {
    return {
      type: 'question-start',
      ts: 0,
      targetLetter: letter,
      distractors: [],
      positions: [0, 1, 2, 3],
      style: 'print',
      case: 'upper',
    }
  }

  it('returns false when answer count !== sessionLength', () => {
    const events: SessionEvent[] = [questionStart('a'), answer('correct')]
    expect(detectPerfectSession(events, 10)).toBe(false)
  })

  it('returns false when sessionLength events all correct but length wrong', () => {
    // 3 correct ale sessionLength=10 → exploit "1 correct + quit"
    const events: SessionEvent[] = [
      questionStart('a'), answer('correct'),
      questionStart('b'), answer('correct'),
      questionStart('c'), answer('correct'),
    ]
    expect(detectPerfectSession(events, 10)).toBe(false)
  })

  it('returns true when length === sessionLength and all correct', () => {
    const events: SessionEvent[] = []
    for (let i = 0; i < 5; i++) {
      events.push(questionStart('a'), answer('correct'))
    }
    expect(detectPerfectSession(events, 5)).toBe(true)
  })

  it('returns false when one answer is wrong even at correct length', () => {
    const events: SessionEvent[] = []
    for (let i = 0; i < 4; i++) {
      events.push(questionStart('a'), answer('correct'))
    }
    events.push(questionStart('a'), answer('wrong'))
    expect(detectPerfectSession(events, 5)).toBe(false)
  })
})
