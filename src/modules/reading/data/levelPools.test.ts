import { describe, expect, it } from 'vitest'
import { getReadingPool } from './levelPools'

describe('reading level pools', () => {
  it('Iskierka returns 23 syllable ids', () => {
    const pool = getReadingPool('iskierka')
    expect(pool.itemIds).toHaveLength(23)
    expect(pool.itemIds.every(id => id.startsWith('syl-'))).toBe(true)
  })

  it('Płomyk returns 20 word ids', () => {
    const pool = getReadingPool('plomyk')
    expect(pool.itemIds).toHaveLength(20)
    expect(pool.itemIds.every(id => id.startsWith('word-'))).toBe(true)
  })

  it('Ognik returns 25 word ids', () => {
    expect(getReadingPool('ognik').itemIds).toHaveLength(25)
  })

  it('Pochodnia returns 22 word ids', () => {
    expect(getReadingPool('pochodnia').itemIds).toHaveLength(22)
  })

  it('exerciseType matches level', () => {
    expect(getReadingPool('iskierka').exerciseType).toBe('syllable-match')
    expect(getReadingPool('plomyk').exerciseType).toBe('word-assembly')
    expect(getReadingPool('ognik').exerciseType).toBe('word-choice')
    expect(getReadingPool('pochodnia').exerciseType).toBe('syllable-fill')
  })
})
