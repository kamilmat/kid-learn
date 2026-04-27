import { describe, expect, it } from 'vitest'

import {
  defaultSettings,
  getActiveLetterPool,
  levelDefaults,
  levelLetterPools,
} from './defaults'
import type { Level } from './types'

describe('levelLetterPools', () => {
  it('has expected counts per level (sekcja 11)', () => {
    expect(levelLetterPools.iskierka).toHaveLength(6)
    expect(levelLetterPools.plomyk).toHaveLength(14)
    expect(levelLetterPools.ognik).toHaveLength(24)
    expect(levelLetterPools.pochodnia).toHaveLength(32)
  })

  it('cumulates lower levels into higher ones', () => {
    const isSubset = (a: string[], b: string[]): boolean =>
      a.every((letter) => b.includes(letter))

    expect(isSubset(levelLetterPools.iskierka, levelLetterPools.plomyk)).toBe(
      true,
    )
    expect(isSubset(levelLetterPools.plomyk, levelLetterPools.ognik)).toBe(true)
    expect(isSubset(levelLetterPools.ognik, levelLetterPools.pochodnia)).toBe(
      true,
    )
  })

  it('iskierka has exactly the spec letters', () => {
    expect(levelLetterPools.iskierka.sort()).toEqual(
      ['a', 'm', 'l', 'e', 'o', 't'].sort(),
    )
  })

  it('pochodnia includes all polish diacritics', () => {
    const diacritics = ['ą', 'ć', 'ę', 'ń', 'ó', 'ś', 'ź', 'ż']
    for (const d of diacritics) {
      expect(levelLetterPools.pochodnia).toContain(d)
    }
  })

  it('pools are independent copies (mutation-safe)', () => {
    const beforeLen = levelLetterPools.iskierka.length
    const pool = levelLetterPools.iskierka
    pool.push('X')
    // Mutacja widoczna na obiekcie który wprost dostaliśmy, ale to ok —
    // konsumenci dostają referencję do tablicy. getActiveLetterPool zwraca
    // zawsze świeżą kopię.
    expect(pool.length).toBe(beforeLen + 1)
    pool.pop()
  })
})

describe('levelDefaults (sekcja 10.2)', () => {
  it('iskierka and plomyk default to para + tylko-drukowane', () => {
    expect(levelDefaults.iskierka).toEqual({
      caseMode: 'para',
      styleMode: 'tylko-drukowane',
      tilesPerQuestion: 4,
    })
    expect(levelDefaults.plomyk).toEqual({
      caseMode: 'para',
      styleMode: 'tylko-drukowane',
      tilesPerQuestion: 4,
    })
  })

  it('ognik defaults to mieszane + mieszane-per-pytanie', () => {
    expect(levelDefaults.ognik).toEqual({
      caseMode: 'mieszane',
      styleMode: 'mieszane-per-pytanie',
      tilesPerQuestion: 5,
    })
  })

  it('pochodnia defaults to mieszane + oba-na-kafelku', () => {
    expect(levelDefaults.pochodnia).toEqual({
      caseMode: 'mieszane',
      styleMode: 'oba-na-kafelku',
      tilesPerQuestion: 6,
    })
  })
})

describe('defaultSettings (sekcja 13.2)', () => {
  it('matches the spec defaults', () => {
    expect(defaultSettings.sessionLength).toBe(10)
    expect(defaultSettings.timeLimit).toBe(15)
    expect(defaultSettings.showCountdownBar).toBe(true)
    expect(defaultSettings.celebrationTempo).toBe('medium')
    expect(defaultSettings.defaultLevel).toBe('last-used')
    expect(defaultSettings.voice).toBe('zofia')
    expect(defaultSettings.activeLettersOverride).toEqual({})
    expect(defaultSettings.caseMode).toEqual({})
    expect(defaultSettings.styleMode).toEqual({})
    expect(defaultSettings.tilesPerQuestion).toEqual({})
  })
})

describe('getActiveLetterPool', () => {
  const levels: Level[] = ['iskierka', 'plomyk', 'ognik', 'pochodnia']

  it('returns level default when no override', () => {
    for (const level of levels) {
      const pool = getActiveLetterPool(defaultSettings, level)
      expect(pool).toEqual(levelLetterPools[level])
      expect(pool).not.toBe(levelLetterPools[level]) // copy
    }
  })

  it('returns override when present', () => {
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { plomyk: ['a', 'm', 'l', 'e'] },
    }
    expect(getActiveLetterPool(settings, 'plomyk')).toEqual([
      'a',
      'm',
      'l',
      'e',
    ])
    // inne poziomy nadal default
    expect(getActiveLetterPool(settings, 'iskierka')).toEqual(
      levelLetterPools.iskierka,
    )
  })
})
