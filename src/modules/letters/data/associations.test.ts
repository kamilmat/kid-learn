import { describe, expect, it } from 'vitest'
import {
  ASSOCIATIONS,
  ASSOCIATIONS_LIST,
  getAssociation,
} from './associations'
import { POLISH_ALPHABET } from './alphabet'

describe('ASSOCIATIONS', () => {
  it('zawiera wpis dla każdej z 32 liter', () => {
    expect(Object.keys(ASSOCIATIONS)).toHaveLength(32)
    for (const letter of POLISH_ALPHABET) {
      expect(ASSOCIATIONS[letter]).toBeDefined()
    }
  })

  it('słowa zgodne ze spec sekcja 12', () => {
    expect(ASSOCIATIONS.a?.word).toBe('arbuz')
    expect(ASSOCIATIONS.ą?.word).toBe('dąb')
    expect(ASSOCIATIONS.b?.word).toBe('balon')
    expect(ASSOCIATIONS.c?.word).toBe('cebula')
    expect(ASSOCIATIONS.ć?.word).toBe('ćma')
    expect(ASSOCIATIONS.d?.word).toBe('dom')
    expect(ASSOCIATIONS.e?.word).toBe('ekran')
    expect(ASSOCIATIONS.ę?.word).toBe('gęś')
    expect(ASSOCIATIONS.f?.word).toBe('foka')
    expect(ASSOCIATIONS.g?.word).toBe('góra')
    expect(ASSOCIATIONS.h?.word).toBe('hak')
    expect(ASSOCIATIONS.i?.word).toBe('iskra')
    expect(ASSOCIATIONS.j?.word).toBe('jabłko')
    expect(ASSOCIATIONS.k?.word).toBe('kot')
    expect(ASSOCIATIONS.l?.word).toBe('lampa')
    expect(ASSOCIATIONS.ł?.word).toBe('łyżwa')
    expect(ASSOCIATIONS.m?.word).toBe('miś')
    expect(ASSOCIATIONS.n?.word).toBe('nos')
    expect(ASSOCIATIONS.ń?.word).toBe('koń')
    expect(ASSOCIATIONS.o?.word).toBe('osa')
    expect(ASSOCIATIONS.ó?.word).toBe('ósemka')
    expect(ASSOCIATIONS.p?.word).toBe('piłka')
    expect(ASSOCIATIONS.r?.word).toBe('ryba')
    expect(ASSOCIATIONS.s?.word).toBe('słońce')
    expect(ASSOCIATIONS.ś?.word).toBe('śliwka')
    expect(ASSOCIATIONS.t?.word).toBe('tort')
    expect(ASSOCIATIONS.u?.word).toBe('ucho')
    expect(ASSOCIATIONS.w?.word).toBe('woda')
    expect(ASSOCIATIONS.y?.word).toBe('dym')
    expect(ASSOCIATIONS.z?.word).toBe('zegar')
    expect(ASSOCIATIONS.ź?.word).toBe('źrebak')
    expect(ASSOCIATIONS.ż?.word).toBe('żaba')
  })

  it('pozycje zgodne ze spec', () => {
    expect(ASSOCIATIONS.ą?.position).toBe('middle')
    expect(ASSOCIATIONS.ę?.position).toBe('middle')
    expect(ASSOCIATIONS.y?.position).toBe('middle')
    expect(ASSOCIATIONS.ń?.position).toBe('end')
    // sekcja 12: ó oznaczone jako start (choć "ósemka" — litera zaczyna)
    expect(ASSOCIATIONS.ó?.position).toBe('start')
    expect(ASSOCIATIONS.b?.position).toBe('start')
    expect(ASSOCIATIONS.m?.position).toBe('start')
  })

  it('imagePath/audioKey/phraseAudioKey generowane jednolicie', () => {
    for (const letter of POLISH_ALPHABET) {
      const a = ASSOCIATIONS[letter]!
      expect(a.imagePath).toBe(`/images/letters/${letter}.svg`)
      expect(a.audioKey).toBe(`word-${a.word}`)
      expect(a.phraseAudioKey).toBe(`assoc-${letter}`)
    }
  })

  it('letter w obiekcie zgadza się z kluczem', () => {
    for (const letter of POLISH_ALPHABET) {
      expect(ASSOCIATIONS[letter]?.letter).toBe(letter)
    }
  })
})

describe('ASSOCIATIONS_LIST', () => {
  it('zawiera 32 wpisy w kolejności alfabetu polskiego', () => {
    expect(ASSOCIATIONS_LIST).toHaveLength(32)
    expect(ASSOCIATIONS_LIST.map((a) => a.letter)).toEqual([
      ...POLISH_ALPHABET,
    ])
  })
})

describe('getAssociation', () => {
  it('zwraca asocjację dla istniejącej litery', () => {
    expect(getAssociation('b').word).toBe('balon')
  })

  it('rzuca dla litery spoza alfabetu', () => {
    expect(() => getAssociation('q')).toThrow()
  })
})
