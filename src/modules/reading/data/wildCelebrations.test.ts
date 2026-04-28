import { describe, expect, it } from 'vitest'
import { WILD_CELEBRATIONS, pickRandomWildCelebration } from './wildCelebrations'

describe('wildCelebrations', () => {
  it('has 5 celebrations', () => {
    expect(WILD_CELEBRATIONS).toHaveLength(5)
  })

  it('all have unique ids', () => {
    const ids = WILD_CELEBRATIONS.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all have valid durations and components', () => {
    for (const w of WILD_CELEBRATIONS) {
      expect(w.durationMs).toBeGreaterThan(0)
      expect(w.Component).toBeDefined()
      expect(w.audio.length).toBeGreaterThan(0)
    }
  })

  it('pickRandomWildCelebration returns a valid celebration', () => {
    const w = pickRandomWildCelebration(() => 0.5)
    expect(WILD_CELEBRATIONS).toContain(w)
  })
})
