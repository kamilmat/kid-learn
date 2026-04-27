import { describe, expect, it } from 'vitest'

import { defaultSettings } from './defaults'
import {
  MIN_ACTIVE_LETTERS,
  isActiveLettersValid,
  validateAndApplyOverride,
} from './activeLettersValidation'

describe('isActiveLettersValid', () => {
  it('rejects fewer than 4 unique letters', () => {
    expect(isActiveLettersValid([])).toBe(false)
    expect(isActiveLettersValid(['a'])).toBe(false)
    expect(isActiveLettersValid(['a', 'b', 'c'])).toBe(false)
    // duplikaty nie liczą się jako unikalne
    expect(isActiveLettersValid(['a', 'a', 'a', 'a'])).toBe(false)
  })

  it('accepts 4+ unique letters', () => {
    expect(isActiveLettersValid(['a', 'b', 'c', 'd'])).toBe(true)
    expect(isActiveLettersValid(['a', 'm', 'l', 'e', 'o', 't'])).toBe(true)
  })

  it('exposes MIN_ACTIVE_LETTERS = 4', () => {
    expect(MIN_ACTIVE_LETTERS).toBe(4)
  })
})

describe('validateAndApplyOverride', () => {
  it('rejects when fewer than 4 letters', () => {
    const result = validateAndApplyOverride(
      'iskierka',
      ['a', 'm'],
      defaultSettings,
    )
    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toMatch(/minimum/i)
    }
  })

  it('rejects letters outside the level pool', () => {
    const result = validateAndApplyOverride(
      'iskierka',
      ['a', 'm', 'l', 'e', 'ą'], // ą nie w iskierka
      defaultSettings,
    )
    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toMatch(/spoza puli/i)
      expect(result.error).toContain('ą')
    }
  })

  it('applies valid override and preserves other settings', () => {
    const result = validateAndApplyOverride(
      'plomyk',
      ['a', 'm', 'l', 'e'],
      defaultSettings,
    )
    expect(result).not.toHaveProperty('error')
    if (!('error' in result)) {
      expect(result.activeLettersOverride.plomyk).toEqual(['a', 'm', 'l', 'e'])
      expect(result.sessionLength).toBe(defaultSettings.sessionLength)
      // nie mutuje wejścia
      expect(defaultSettings.activeLettersOverride).toEqual({})
    }
  })

  it('deduplicates letters before saving', () => {
    const result = validateAndApplyOverride(
      'plomyk',
      ['a', 'a', 'm', 'l', 'e'],
      defaultSettings,
    )
    expect(result).not.toHaveProperty('error')
    if (!('error' in result)) {
      expect(result.activeLettersOverride.plomyk).toEqual(['a', 'm', 'l', 'e'])
    }
  })

  it('preserves overrides for other levels', () => {
    const settings = {
      ...defaultSettings,
      activeLettersOverride: { iskierka: ['a', 'm', 'l', 'e'] },
    }
    const result = validateAndApplyOverride(
      'plomyk',
      ['a', 'm', 'l', 'e', 's', 'k'],
      settings,
    )
    expect(result).not.toHaveProperty('error')
    if (!('error' in result)) {
      expect(result.activeLettersOverride.iskierka).toEqual([
        'a',
        'm',
        'l',
        'e',
      ])
      expect(result.activeLettersOverride.plomyk).toEqual([
        'a',
        'm',
        'l',
        'e',
        's',
        'k',
      ])
    }
  })
})
