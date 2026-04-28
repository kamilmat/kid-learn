import { describe, expect, it } from 'vitest'
import { EASTER_EGGS, pickRandomEasterEgg } from './easterEggs'

describe('easterEggs', () => {
  it('has 8 easter eggs', () => {
    expect(EASTER_EGGS).toHaveLength(8)
  })

  it('all have unique ids', () => {
    const ids = EASTER_EGGS.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains 6 mild + 2 silly', () => {
    expect(EASTER_EGGS.filter(e => e.category === 'mild')).toHaveLength(6)
    expect(EASTER_EGGS.filter(e => e.category === 'silly')).toHaveLength(2)
  })

  it('each has audio key, animation, durationMs', () => {
    for (const e of EASTER_EGGS) {
      expect(e.audio).toBeTruthy()
      expect(e.animation.name).toBeTruthy()
      expect(e.animation.css).toContain('@keyframes')
      expect(e.durationMs).toBeGreaterThan(0)
    }
  })

  it('humorMode=on includes silly', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      seen.add(pickRandomEasterEgg('on', () => i / 100).id)
    }
    expect(Array.from(seen).some(id => id === 'burp' || id === 'sparkle-fart')).toBe(true)
  })

  it('humorMode=off excludes silly', () => {
    for (let i = 0; i < 30; i++) {
      const egg = pickRandomEasterEgg('off', () => i / 30)
      expect(egg.category).toBe('mild')
    }
  })
})
