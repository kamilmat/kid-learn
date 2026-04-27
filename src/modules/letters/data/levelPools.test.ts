import { describe, expect, it } from 'vitest'
import { LEVEL_POOLS, getLevelPool } from './levelPools'
import { POLISH_ALPHABET } from './alphabet'

describe('LEVEL_POOLS', () => {
  it('Iskierka ma 6 liter', () => {
    expect(LEVEL_POOLS.iskierka).toHaveLength(6)
    expect([...LEVEL_POOLS.iskierka]).toEqual(['a', 'm', 'l', 'e', 'o', 't'])
  })

  it('Płomyk ma 14 liter', () => {
    expect(LEVEL_POOLS.plomyk).toHaveLength(14)
  })

  it('Ognik ma 24 litery', () => {
    expect(LEVEL_POOLS.ognik).toHaveLength(24)
  })

  it('Pochodnia ma 32 litery (cały alfabet)', () => {
    expect(LEVEL_POOLS.pochodnia).toHaveLength(32)
    expect(new Set(LEVEL_POOLS.pochodnia)).toEqual(new Set(POLISH_ALPHABET))
  })

  it('kumulacja: Iskierka ⊆ Płomyk ⊆ Ognik ⊆ Pochodnia', () => {
    const isk = new Set(LEVEL_POOLS.iskierka)
    const plo = new Set(LEVEL_POOLS.plomyk)
    const ogn = new Set(LEVEL_POOLS.ognik)
    const poc = new Set(LEVEL_POOLS.pochodnia)
    for (const l of isk) expect(plo.has(l)).toBe(true)
    for (const l of plo) expect(ogn.has(l)).toBe(true)
    for (const l of ogn) expect(poc.has(l)).toBe(true)
  })

  it('każda pula zawiera tylko unikalne litery', () => {
    for (const level of ['iskierka', 'plomyk', 'ognik', 'pochodnia'] as const) {
      const pool = LEVEL_POOLS[level]
      expect(new Set(pool).size).toBe(pool.length)
    }
  })
})

describe('getLevelPool', () => {
  it('zwraca pulę dla każdego poziomu', () => {
    expect(getLevelPool('iskierka')).toBe(LEVEL_POOLS.iskierka)
    expect(getLevelPool('plomyk')).toBe(LEVEL_POOLS.plomyk)
    expect(getLevelPool('ognik')).toBe(LEVEL_POOLS.ognik)
    expect(getLevelPool('pochodnia')).toBe(LEVEL_POOLS.pochodnia)
  })
})
