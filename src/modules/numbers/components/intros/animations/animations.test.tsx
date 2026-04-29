import { describe, it, expect } from 'vitest'
import { CONCEPTS } from '../../../data/concepts'
import { INTRO_ANIMATIONS } from './index'

describe('INTRO_ANIMATIONS registry', () => {
  it('ma entry dla każdego ConceptId z CONCEPTS', () => {
    const conceptIds = Object.keys(CONCEPTS) as Array<keyof typeof CONCEPTS>
    for (const id of conceptIds) {
      const anim = INTRO_ANIMATIONS[id]
      expect(anim, `Brak animacji dla ${id}`).toBeDefined()
      expect(typeof anim).toBe('function')
      expect(anim.SCENES).toBeDefined()
      expect(Array.isArray(anim.SCENES)).toBe(true)
    }
  })
})
