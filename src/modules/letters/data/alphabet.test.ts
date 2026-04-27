import { describe, expect, it } from 'vitest'
import { POLISH_ALPHABET, isPolishLetter, toUpper } from './alphabet'

describe('POLISH_ALPHABET', () => {
  it('zawiera 32 litery', () => {
    expect(POLISH_ALPHABET).toHaveLength(32)
  })

  it('jest w kolejności alfabetu polskiego', () => {
    expect([...POLISH_ALPHABET]).toEqual([
      'a',
      'ą',
      'b',
      'c',
      'ć',
      'd',
      'e',
      'ę',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'ł',
      'm',
      'n',
      'ń',
      'o',
      'ó',
      'p',
      'r',
      's',
      'ś',
      't',
      'u',
      'w',
      'y',
      'z',
      'ź',
      'ż',
    ])
  })

  it('wszystkie litery są lowercase i unikalne', () => {
    const set = new Set(POLISH_ALPHABET)
    expect(set.size).toBe(POLISH_ALPHABET.length)
    for (const l of POLISH_ALPHABET) {
      expect(l).toBe(l.toLocaleLowerCase('pl-PL'))
    }
  })

  it('nie zawiera liter spoza polskiego alfabetu (q, v, x)', () => {
    expect(POLISH_ALPHABET).not.toContain('q')
    expect(POLISH_ALPHABET).not.toContain('v')
    expect(POLISH_ALPHABET).not.toContain('x')
  })
})

describe('toUpper', () => {
  it('poprawnie zamienia diakrytyki polskie na wielkie', () => {
    expect(toUpper('ą')).toBe('Ą')
    expect(toUpper('ć')).toBe('Ć')
    expect(toUpper('ę')).toBe('Ę')
    expect(toUpper('ł')).toBe('Ł')
    expect(toUpper('ń')).toBe('Ń')
    expect(toUpper('ó')).toBe('Ó')
    expect(toUpper('ś')).toBe('Ś')
    expect(toUpper('ź')).toBe('Ź')
    expect(toUpper('ż')).toBe('Ż')
  })

  it('zamienia zwykłe litery łacińskie', () => {
    expect(toUpper('a')).toBe('A')
    expect(toUpper('b')).toBe('B')
    expect(toUpper('z')).toBe('Z')
  })

  it('idempotentny dla już-wielkich', () => {
    expect(toUpper('Ą')).toBe('Ą')
    expect(toUpper('A')).toBe('A')
  })
})

describe('isPolishLetter', () => {
  it('true dla każdej litery z alfabetu', () => {
    for (const l of POLISH_ALPHABET) {
      expect(isPolishLetter(l)).toBe(true)
    }
  })

  it('false dla nie-polskich liter i niepoprawnych wartości', () => {
    expect(isPolishLetter('q')).toBe(false)
    expect(isPolishLetter('v')).toBe(false)
    expect(isPolishLetter('x')).toBe(false)
    expect(isPolishLetter('A')).toBe(false) // wielka — alfabet jest lowercase
    expect(isPolishLetter('')).toBe(false)
    expect(isPolishLetter('ab')).toBe(false)
  })
})
