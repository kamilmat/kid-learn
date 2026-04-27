import { describe, expect, it } from 'vitest'
import {
  CONTRASTIVE_PAIRS,
  getContrastivePartners,
} from './contrastivePairs'
import { POLISH_ALPHABET } from './alphabet'

describe('CONTRASTIVE_PAIRS', () => {
  it('zawiera wpis dla każdej litery alfabetu', () => {
    for (const letter of POLISH_ALPHABET) {
      expect(CONTRASTIVE_PAIRS[letter]).toBeDefined()
    }
  })

  it('symetria: jeśli a w partnerach b, to b w partnerach a', () => {
    for (const a of POLISH_ALPHABET) {
      for (const b of CONTRASTIVE_PAIRS[a] ?? []) {
        expect(CONTRASTIVE_PAIRS[b]).toContain(a)
      }
    }
  })

  it('brak self-references (litera nie jest swoim partnerem)', () => {
    for (const letter of POLISH_ALPHABET) {
      expect(CONTRASTIVE_PAIRS[letter]).not.toContain(letter)
    }
  })

  it('zawiera kluczowe pary ze spec', () => {
    expect(getContrastivePartners('b')).toEqual(
      expect.arrayContaining(['d', 'p']),
    )
    expect(getContrastivePartners('d')).toEqual(
      expect.arrayContaining(['b', 'p']),
    )
    expect(getContrastivePartners('p')).toEqual(
      expect.arrayContaining(['b', 'd']),
    )
    expect(getContrastivePartners('ł')).toEqual(
      expect.arrayContaining(['l', 't']),
    )
    expect(getContrastivePartners('o')).toContain('ó')
    expect(getContrastivePartners('u')).toContain('y')
    expect(getContrastivePartners('e')).toContain('ę')
    expect(getContrastivePartners('a')).toContain('ą')
    expect(getContrastivePartners('n')).toEqual(
      expect.arrayContaining(['ń', 'm']),
    )
    expect(getContrastivePartners('s')).toContain('ś')
    expect(getContrastivePartners('c')).toContain('ć')
    expect(getContrastivePartners('z')).toEqual(
      expect.arrayContaining(['ż', 'ź']),
    )
    expect(getContrastivePartners('m')).toEqual(
      expect.arrayContaining(['n', 'w']),
    )
  })
})

describe('getContrastivePartners', () => {
  it('zwraca pustą listę dla litery bez par (np. j)', () => {
    // litera j nie jest w żadnej zdefiniowanej parze (fonetyczne i graficzne
    // pary obejmują głównie litery wyżej wymienione)
    expect(getContrastivePartners('j')).toEqual([])
  })

  it('zwraca pustą listę dla nieznanej litery', () => {
    expect(getContrastivePartners('q')).toEqual([])
    expect(getContrastivePartners('@')).toEqual([])
  })

  it('partnerzy są unikalni', () => {
    for (const letter of POLISH_ALPHABET) {
      const partners = getContrastivePartners(letter)
      expect(new Set(partners).size).toBe(partners.length)
    }
  })
})
