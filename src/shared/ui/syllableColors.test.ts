import { describe, it, expect } from 'vitest'
import { getSyllableColor, getSyllableCue } from './syllableColors'

describe('syllableColors', () => {
  it('4 kolory i 4 style, cyklicznie', () => {
    const cues = [0, 1, 2, 3].map(getSyllableCue)
    expect(new Set(cues.map((c) => c.color)).size).toBe(4)
    expect(new Set(cues.map((c) => c.underline)).size).toBe(4)
    expect(getSyllableCue(4)).toEqual(getSyllableCue(0))
  })

  it('wrapper zgodny z cue', () => {
    expect(getSyllableColor(2)).toBe(getSyllableCue(2).color)
  })
})
