import { describe, expect, it } from 'vitest'

import type { NumbersSessionLog } from '@/modules/numbers/types'
import type { SessionLog } from './types'
import {
  readingTargetLabel,
  toUnifiedSessions,
  type ReadingSessionLog,
} from './aggregate'

const T = new Date(2024, 0, 15, 10, 0, 0).getTime()

const lettersLog: SessionLog = {
  id: 'letters-1',
  startedAt: T + 60_000,
  endedAt: T + 120_000,
  level: 'iskierka',
  events: [
    {
      type: 'question-start',
      ts: T + 61_000,
      targetLetter: 'a',
      distractors: ['m', 'l', 'e'],
      positions: [0, 1, 2, 3],
      style: 'print',
      case: 'upper',
    },
    { type: 'answer', ts: T + 63_000, outcome: 'correct', responseMs: 2_000 },
    { type: 'pause', ts: T + 64_000, reason: 'visibility' },
    { type: 'resume', ts: T + 65_000 },
    {
      type: 'question-start',
      ts: T + 66_000,
      targetLetter: 'm',
      distractors: ['a'],
      positions: [0, 1],
      style: 'print',
      case: 'upper',
    },
    {
      type: 'answer',
      ts: T + 67_000,
      outcome: 'wrong',
      chosenLetter: 'a',
      responseMs: 1_000,
    },
  ],
}

const readingLog: ReadingSessionLog = {
  startedAt: T,
  endedAt: T + 30_000,
  level: 'plomyk',
  events: [
    {
      questionIndex: 0,
      exerciseType: 'word-assembly',
      targetId: 'word-SOWA',
      outcome: 'correct',
      responseMs: 3_000,
      timestamp: T + 5_000,
    },
    {
      questionIndex: 1,
      exerciseType: 'word-assembly',
      targetId: 'syl-SO',
      outcome: 'dontKnow',
      responseMs: 4_000,
      timestamp: T + 12_000,
    },
  ],
}

const numbersLog: NumbersSessionLog = {
  startedAt: T + 300_000,
  endedAt: T + 360_000,
  level: 'ognik',
  events: [
    {
      factId: 'add-5-2',
      conceptId: 'ognik-doubles',
      exerciseType: 'doubles',
      outcome: 'wrong',
      responseMs: 1_500,
      timestamp: T + 310_000,
    },
  ],
  antiCheatEvents: [
    { type: 'pause', ts: T + 305_000, reason: 'idle' },
    { type: 'resume', ts: T + 306_000 },
  ],
}

describe('readingTargetLabel', () => {
  it('strips the syl-/word- prefix and leaves anything else alone', () => {
    expect(readingTargetLabel('syl-MA')).toBe('MA')
    expect(readingTargetLabel('word-MAMA')).toBe('MAMA')
    expect(readingTargetLabel('add-5-2')).toBe('add-5-2')
    expect(readingTargetLabel('MA')).toBe('MA')
  })
})

describe('toUnifiedSessions', () => {
  const combined = toUnifiedSessions({
    letters: [lettersLog],
    reading: [readingLog],
    numbers: [numbersLog],
  })

  it('combines all three modules sorted by start time', () => {
    expect(combined).toHaveLength(3)
    expect(combined.map((s) => s.module)).toEqual([
      'reading',
      'letters',
      'numbers',
    ])
    const starts = combined.map((s) => s.startedAt)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('labels each session with its module', () => {
    expect(combined.map((s) => s.moduleLabel)).toEqual([
      'Czytanie',
      'Litery',
      'Cyferki',
    ])
  })

  it('keeps timestamps and levels from the source logs', () => {
    const reading = combined[0]!
    expect(reading.startedAt).toBe(readingLog.startedAt)
    expect(reading.endedAt).toBe(readingLog.endedAt)
    expect(reading.level).toBe('plomyk')
  })

  it('counts questions and outcomes per session', () => {
    expect(combined.map((s) => s.questions)).toEqual([2, 2, 1])
    expect(combined.map((s) => s.correct)).toEqual([1, 1, 0])
    expect(combined.map((s) => s.wrong)).toEqual([1, 1, 1])
  })

  it('gives every session a unique id', () => {
    const ids = combined.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('synthesizes question-start/answer pairs for reading', () => {
    const events = combined[0]!.events
    expect(events).toHaveLength(4)
    expect(events[0]).toMatchObject({
      type: 'question-start',
      targetLetter: 'SOWA',
      ts: T + 5_000 - 3_000,
    })
    expect(events[1]).toMatchObject({
      type: 'answer',
      outcome: 'correct',
      responseMs: 3_000,
    })
    expect(events[2]).toMatchObject({ targetLetter: 'SO' })
  })

  it('merges numbers anti-cheat events into the timeline in order', () => {
    const numbers = combined[2]!
    expect(numbers.events.map((e) => e.type)).toEqual([
      'pause',
      'resume',
      'question-start',
      'answer',
    ])
    expect(numbers.events[0]).toMatchObject({ reason: 'idle' })
  })

  it('tolerates missing modules and logs without anti-cheat events', () => {
    expect(toUnifiedSessions({})).toEqual([])
    const { antiCheatEvents: _drop, ...noFlags } = numbersLog
    const only = toUnifiedSessions({ numbers: [noFlags] })
    expect(only).toHaveLength(1)
    expect(only[0]!.events.map((e) => e.type)).toEqual([
      'question-start',
      'answer',
    ])
  })
})
