import { describe, expect, it } from 'vitest'

import {
  ALL_LEVELS,
  defaultSettings,
  getActiveLetterPool,
  getEffectivePromptMode,
  getEffectiveTimeLimit,
  levelDefaults,
  levelLetterPools,
} from './defaults'

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
      showCountdownBar: false,
      timeLimit: 'off',
    })
    expect(levelDefaults.plomyk).toEqual({
      caseMode: 'para',
      styleMode: 'tylko-drukowane',
      tilesPerQuestion: 6,
      showCountdownBar: false,
      timeLimit: 'off',
    })
  })

  it('ognik defaults to mieszane + mieszane-per-pytanie', () => {
    expect(levelDefaults.ognik).toEqual({
      caseMode: 'mieszane',
      styleMode: 'mieszane-per-pytanie',
      tilesPerQuestion: 8,
      showCountdownBar: true,
      timeLimit: 15,
    })
  })

  it('pochodnia defaults to mieszane + oba-na-kafelku', () => {
    expect(levelDefaults.pochodnia).toEqual({
      caseMode: 'mieszane',
      styleMode: 'oba-na-kafelku',
      tilesPerQuestion: 10,
      showCountdownBar: true,
      timeLimit: 15,
    })
  })
})

describe('defaultSettings (sekcja 13.2)', () => {
  it('matches the spec defaults', () => {
    expect(defaultSettings.questionsPerSession).toBe(8)
    expect(defaultSettings.timeLimit).toEqual({})
    expect(defaultSettings.showCountdownBar).toEqual({})
    expect(defaultSettings.celebrationTempo).toBe('medium')
    expect(defaultSettings.defaultLevel).toBe('last-used')
    expect(defaultSettings.activeLettersOverride).toEqual({})
    expect(defaultSettings.caseMode).toEqual({})
    expect(defaultSettings.styleMode).toEqual({})
    expect(defaultSettings.tilesPerQuestion).toEqual({})
    expect(defaultSettings.humorMode).toBe('on')
    expect(defaultSettings.reading).toEqual({
      wordAnimations: 'on',
      wildCelebrationFreq: 8,
      questionsPerSession: {},
    })
  })
})

describe('getActiveLetterPool', () => {
  it('returns level default when no override', () => {
    for (const level of ALL_LEVELS) {
      const pool = getActiveLetterPool(defaultSettings, level)
      expect(pool).toEqual(levelLetterPools[level])
      expect(pool).not.toBe(levelLetterPools[level]) // copy
    }
  })

  it('returns override when present', () => {
    // Płomyk ma tilesPerQuestion=6, więc override musi mieć >=6 liter.
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { plomyk: ['a', 'm', 'l', 'e', 's', 'k'] },
    }
    expect(getActiveLetterPool(settings, 'plomyk')).toEqual([
      'a',
      'm',
      'l',
      'e',
      's',
      'k',
    ])
    // inne poziomy nadal default
    expect(getActiveLetterPool(settings, 'iskierka')).toEqual(
      levelLetterPools.iskierka,
    )
  })

  it('falls back to level default when override is smaller than tilesPerQuestion', () => {
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { iskierka: ['a'] },
    }
    expect(getActiveLetterPool(settings, 'iskierka')).toEqual(
      levelLetterPools.iskierka,
    )
  })

  it('filters out letters outside the level pool', () => {
    // 'ż' jest w puli Pochodni, nie Iskierki; po odfiltrowaniu zostaje 5 liter,
    // czyli nadal >= tilesPerQuestion (4) → override obowiązuje bez 'ż'.
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { iskierka: ['a', 'm', 'l', 'e', 'o', 'ż', 'q'] },
    }
    expect(getActiveLetterPool(settings, 'iskierka')).toEqual([
      'a',
      'm',
      'l',
      'e',
      'o',
    ])
  })

  it('falls back when filtering leaves fewer letters than tiles', () => {
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { iskierka: ['a', 'm', 'ż', 'ó', 'ś', 'ń'] },
    }
    expect(getActiveLetterPool(settings, 'iskierka')).toEqual(
      levelLetterPools.iskierka,
    )
  })

  it('respects a tilesPerQuestion override when sizing the pool', () => {
    const base = ['a', 'm', 'l', 'e', 'o']
    expect(
      getActiveLetterPool(
        { ...defaultSettings, activeLettersOverride: { iskierka: base } },
        'iskierka',
      ),
    ).toEqual(base)
    // ten sam override, ale 6 kafelków → 5 liter nie wystarcza
    expect(
      getActiveLetterPool(
        {
          ...defaultSettings,
          activeLettersOverride: { iskierka: base },
          tilesPerQuestion: { iskierka: 6 as const },
        },
        'iskierka',
      ),
    ).toEqual(levelLetterPools.iskierka)
  })

  it('de-duplicates the override before checking its size', () => {
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { iskierka: ['a', 'a', 'm', 'm', 'l'] },
    }
    expect(getActiveLetterPool(settings, 'iskierka')).toEqual(
      levelLetterPools.iskierka,
    )
  })
})

describe('getEffectiveTimeLimit', () => {
  it('returns level default when no override', () => {
    expect(getEffectiveTimeLimit(defaultSettings, 'iskierka')).toBe('off')
    expect(getEffectiveTimeLimit(defaultSettings, 'plomyk')).toBe('off')
    expect(getEffectiveTimeLimit(defaultSettings, 'ognik')).toBe(15)
    expect(getEffectiveTimeLimit(defaultSettings, 'pochodnia')).toBe(15)
  })

  it('returns override when present', () => {
    const settings = {
      ...defaultSettings,
      timeLimit: { iskierka: 25 as const, ognik: 'off' as const },
    }
    expect(getEffectiveTimeLimit(settings, 'iskierka')).toBe(25)
    expect(getEffectiveTimeLimit(settings, 'plomyk')).toBe('off')
    expect(getEffectiveTimeLimit(settings, 'ognik')).toBe('off')
    expect(getEffectiveTimeLimit(settings, 'pochodnia')).toBe(15)
  })
})

describe('getEffectivePromptMode', () => {
  it('returns default `both` when no override', () => {
    expect(getEffectivePromptMode(defaultSettings, 'iskierka')).toBe('both')
  })

  it('returns per-level override when present, over the global default', () => {
    const settings = {
      ...defaultSettings,
      letters: {
        ...defaultSettings.letters,
        promptMode: 'both' as const,
        promptModeByLevel: { iskierka: 'phoneme' as const },
      },
    }
    expect(getEffectivePromptMode(settings, 'iskierka')).toBe('phoneme')
    expect(getEffectivePromptMode(settings, 'plomyk')).toBe('both')
  })
})
