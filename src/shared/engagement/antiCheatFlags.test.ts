import { describe, expect, it } from 'vitest'
import { analyzeSession } from './antiCheatFlags'
import type { SessionEvent } from '../stats/types'

const answer = (
  ts: number,
  outcome: SessionEvent extends infer T ? (T extends { type: 'answer' } ? T['outcome'] : never) : never,
  responseMs: number,
  chosenPosition?: 0 | 1 | 2 | 3,
): SessionEvent => ({
  type: 'answer',
  ts,
  outcome,
  responseMs,
  ...(chosenPosition !== undefined ? { chosenPosition } : {}),
})

describe('analyzeSession', () => {
  it('zwraca pustą listę dla pustej sesji', () => {
    expect(analyzeSession([])).toEqual([])
  })

  it('flag fast-click przy 3 odpowiedziach <1s pod rząd', () => {
    const events: SessionEvent[] = [
      answer(100, 'correct', 500, 0),
      answer(200, 'correct', 600, 1),
      answer(300, 'wrong', 700, 2),
    ]
    const flags = analyzeSession(events)
    const fast = flags.filter((f) => f.type === 'fast-click')
    expect(fast).toHaveLength(1)
    expect(fast[0]!.relatedEventIndices).toEqual([0, 1, 2])
    expect(fast[0]!.severity).toBe('warning')
  })

  it('nie flag-uje fast-click gdy 1 wolna odpowiedź przerwie łańcuch', () => {
    const events: SessionEvent[] = [
      answer(100, 'correct', 500, 0),
      answer(200, 'correct', 1500, 1),
      answer(300, 'correct', 600, 2),
    ]
    const flags = analyzeSession(events)
    expect(flags.filter((f) => f.type === 'fast-click')).toHaveLength(0)
  })

  it('flag same-position przy 5 tap-ach w slot 0', () => {
    const events: SessionEvent[] = [
      answer(100, 'correct', 1500, 0),
      answer(200, 'correct', 1500, 0),
      answer(300, 'correct', 1500, 0),
      answer(400, 'correct', 1500, 0),
      answer(500, 'correct', 1500, 0),
    ]
    const flags = analyzeSession(events)
    const sp = flags.filter((f) => f.type === 'same-position')
    expect(sp).toHaveLength(1)
    expect(sp[0]!.relatedEventIndices).toEqual([0, 1, 2, 3, 4])
  })

  it('mieszane sloty nie flag-ują same-position', () => {
    const events: SessionEvent[] = [
      answer(100, 'correct', 1500, 0),
      answer(200, 'correct', 1500, 1),
      answer(300, 'correct', 1500, 0),
      answer(400, 'correct', 1500, 1),
      answer(500, 'correct', 1500, 0),
    ]
    expect(analyzeSession(events).filter((f) => f.type === 'same-position')).toHaveLength(0)
  })

  it('flag no-answer przy 2 timeoutach pod rząd', () => {
    const events: SessionEvent[] = [
      answer(100, 'timeout', 5000),
      answer(200, 'timeout', 5000),
    ]
    const flags = analyzeSession(events)
    const na = flags.filter((f) => f.type === 'no-answer')
    expect(na).toHaveLength(1)
    expect(na[0]!.relatedEventIndices).toEqual([0, 1])
  })

  it('flag many-dont-know przy 3 dontKnow pod rząd', () => {
    const events: SessionEvent[] = [
      answer(100, 'dontKnow', 1500),
      answer(200, 'dontKnow', 1500),
      answer(300, 'dontKnow', 1500),
    ]
    const flags = analyzeSession(events)
    const dk = flags.filter((f) => f.type === 'many-dont-know')
    expect(dk).toHaveLength(1)
    expect(dk[0]!.relatedEventIndices).toEqual([0, 1, 2])
  })

  it('flag visibility gdy pause z reason=visibility', () => {
    const events: SessionEvent[] = [
      { type: 'pause', ts: 1000, reason: 'visibility' },
      { type: 'resume', ts: 2000 },
    ]
    const flags = analyzeSession(events)
    const v = flags.filter((f) => f.type === 'visibility')
    expect(v).toHaveLength(1)
    expect(v[0]!.severity).toBe('alert')
    expect(v[0]!.relatedEventIndices).toEqual([0])
  })

  it('nie flag-uje visibility gdy pause z innego powodu', () => {
    const events: SessionEvent[] = [
      { type: 'pause', ts: 1000, reason: 'manual' },
      { type: 'resume', ts: 2000 },
      { type: 'pause', ts: 3000, reason: 'idle' },
      { type: 'resume', ts: 4000 },
    ]
    expect(analyzeSession(events).filter((f) => f.type === 'visibility')).toHaveLength(0)
  })

  it('flag long-inactivity gdy łączna pauza >2 min', () => {
    const events: SessionEvent[] = [
      { type: 'pause', ts: 0, reason: 'idle' },
      { type: 'resume', ts: 90_000 }, // 90s
      { type: 'pause', ts: 100_000, reason: 'manual' },
      { type: 'resume', ts: 140_000 }, // +40s = 130s razem
    ]
    const flags = analyzeSession(events)
    const li = flags.filter((f) => f.type === 'long-inactivity')
    expect(li).toHaveLength(1)
    expect(li[0]!.relatedEventIndices).toEqual([0, 1, 2, 3])
  })

  it('nie flag-uje long-inactivity dla krótkich pauz', () => {
    const events: SessionEvent[] = [
      { type: 'pause', ts: 0, reason: 'idle' },
      { type: 'resume', ts: 30_000 },
    ]
    expect(analyzeSession(events).filter((f) => f.type === 'long-inactivity')).toHaveLength(0)
  })

  it('łączy wiele rodzajów flag w jednej sesji', () => {
    const events: SessionEvent[] = [
      // fast-click
      answer(100, 'correct', 400, 0),
      answer(200, 'correct', 500, 0),
      answer(300, 'correct', 600, 0),
      // visibility
      { type: 'pause', ts: 400, reason: 'visibility' },
      { type: 'resume', ts: 500 },
      // dontKnow streak (3)
      answer(600, 'dontKnow', 1500, 1),
      answer(700, 'dontKnow', 1500, 1),
      answer(800, 'dontKnow', 1500, 1),
    ]
    const types = analyzeSession(events).map((f) => f.type)
    expect(types).toContain('fast-click')
    expect(types).toContain('visibility')
    expect(types).toContain('many-dont-know')
  })

  it('answer bez chosenPosition nie zalicza do same-position streak', () => {
    const events: SessionEvent[] = [
      answer(100, 'correct', 1500, 0),
      answer(200, 'correct', 1500, 0),
      answer(300, 'dontKnow', 1500), // brak chosenPosition
      answer(400, 'correct', 1500, 0),
      answer(500, 'correct', 1500, 0),
      answer(600, 'correct', 1500, 0),
    ]
    expect(analyzeSession(events).filter((f) => f.type === 'same-position')).toHaveLength(0)
  })
})
