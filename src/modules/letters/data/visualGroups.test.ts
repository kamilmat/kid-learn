import { describe, expect, it } from 'vitest'
import { areVisuallyDistant, getVisualGroups } from './visualGroups'

describe('getVisualGroups', () => {
  it('przypisuje b i d do tall-stick', () => {
    expect(getVisualGroups('b')).toContain('tall-stick')
    expect(getVisualGroups('d')).toContain('tall-stick')
  })

  it('o, c, e w grupie round', () => {
    expect(getVisualGroups('o')).toContain('round')
    expect(getVisualGroups('c')).toContain('round')
    expect(getVisualGroups('e')).toContain('round')
  })

  it('g i p w descender', () => {
    expect(getVisualGroups('g')).toContain('descender')
    expect(getVisualGroups('p')).toContain('descender')
  })

  it('m i w w triangular', () => {
    expect(getVisualGroups('m')).toContain('triangular')
    expect(getVisualGroups('w')).toContain('triangular')
  })

  it('litera może należeć do wielu grup (np. ą — round + descender)', () => {
    const groups = getVisualGroups('ą')
    expect(groups).toContain('round')
    expect(groups).toContain('descender')
  })

  it('zwraca pustą listę dla nieznanej litery', () => {
    expect(getVisualGroups('@')).toEqual([])
  })
})

describe('areVisuallyDistant', () => {
  it('false dla b/d (oba tall-stick)', () => {
    expect(areVisuallyDistant('b', 'd')).toBe(false)
  })

  it('true dla o/t (round vs tall-stick — brak wspólnej)', () => {
    expect(areVisuallyDistant('o', 't')).toBe(true)
  })

  it('false dla pary identycznej litery', () => {
    expect(areVisuallyDistant('a', 'a')).toBe(false)
  })

  it('true dla nieznanej litery (bezpieczny default)', () => {
    expect(areVisuallyDistant('a', '@')).toBe(true)
  })

  it('symetria: areVisuallyDistant(a, b) === areVisuallyDistant(b, a)', () => {
    const pairs: Array<[string, string]> = [
      ['b', 'd'],
      ['o', 't'],
      ['m', 'w'],
      ['a', 'p'],
      ['e', 'l'],
    ]
    for (const [a, b] of pairs) {
      expect(areVisuallyDistant(a, b)).toBe(areVisuallyDistant(b, a))
    }
  })
})
