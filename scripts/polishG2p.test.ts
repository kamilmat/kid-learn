import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { AZURE_PL_IPA_CHARS, toIpa } from './polishG2p'

// Znaki mylące się wizualnie z ASCII — w oczekiwaniach zapisane jawnie.
const G = 'ɡ' // U+0261
const TIE = '͡' // U+0361
const NAS = '̃' // U+0303
const PAL = 'ʲ' // U+02B2
const S = 'ˈ' // U+02C8

describe('toIpa — sylaby otwarte', () => {
  it.each([
    ['ka', `k${S}a`],
    ['lo', `l${S}ɔ`],
    ['ry', `r${S}ɨ`],
    ['ko', `k${S}ɔ`],
    ['ła', `w${S}a`],
    ['że', `ʐ${S}ɛ`],
    ['rze', `ʐ${S}ɛ`],
    ['szy', `ʂ${S}ɨ`],
    ['czy', `t${TIE}ʂ${S}ɨ`],
    ['dze', `d${TIE}z${S}ɛ`],
    ['dża', `d${TIE}ʐ${S}a`],
  ])('%s → %s', (input, expected) => {
    expect(toIpa(input)).toBe(expected)
  })
})

describe('toIpa — zmiękczenia przez "i"', () => {
  it.each([
    ['dzi', `d${TIE}ʑ${S}i`],
    ['dzie', `d${TIE}ʑ${S}ɛ`],
    ['ci', `t${TIE}ɕ${S}i`],
    ['cie', `t${TIE}ɕ${S}ɛ`],
    ['sie', `ɕ${S}ɛ`],
    ['nie', `ɲ${S}ɛ`],
    ['kie', `k${PAL}${S}ɛ`],
    ['gie', `${G}${PAL}${S}ɛ`],
    ['bia', `b${PAL}${S}a`],
    // "i" przed spółgłoską jest samogłoską sylaby, nie tylko znakiem miękkości
    ['nich', `ɲ${S}ix`],
    ['sil', `ɕ${S}il`],
  ])('%s → %s', (input, expected) => {
    expect(toIpa(input)).toBe(expected)
  })
})

describe('toIpa — "drz" to d + rz, nie afrykata', () => {
  it('drze → dʐɛ (bez łuku)', () => {
    expect(toIpa('drze')).toBe(`dʐ${S}ɛ`)
  })
})

describe('toIpa — nosówki', () => {
  it.each([
    ['są', `s${S}ɔ${NAS}`], // wygłos → nosówka zostaje
    ['gęś', `${G}${S}ɛ${NAS}ɕ`], // przed szczelinową → nosówka zostaje
    ['dąb', `d${S}ɔmp`], // przed wargową zwartą → ɔm
    ['ząb', `z${S}ɔmp`],
    ['ciąg', `t${TIE}ɕ${S}ɔŋk`], // przed tylnojęzykową → ɔŋ
    ['ręka', `r${S}ɛŋka`],
    ['ręcz', `r${S}ɛnt${TIE}ʂ`], // przed afrykatą dziąsłową → ɛn
    ['zdjął', `zdj${S}ɔw`], // przed ł nosowość ginie
  ])('%s → %s', (input, expected) => {
    expect(toIpa(input)).toBe(expected)
  })
})

describe('toIpa — dźwięczność', () => {
  it.each([
    ['chleb', `xl${S}ɛp`], // ubezdźwięcznienie wygłosowe
    ['wóz', `v${S}us`],
    ['znów', `zn${S}uf`],
    ['wsko', `fsk${S}ɔ`], // regresywna asymilacja
    ['gwiazd', `${G}v${PAL}${S}ast`],
    ['twa', `tf${S}a`], // progresywne ubezdźwięcznienie /v/
    ['kwia', `kf${PAL}${S}a`],
    ['przy', `pʂ${S}ɨ`], // progresywne ubezdźwięcznienie /ʐ/
    ['wpadł', `fp${S}adw`],
    ['świe', `ɕf${PAL}${S}ɛ`],
  ])('%s → %s', (input, expected) => {
    expect(toIpa(input)).toBe(expected)
  })
})

describe('toIpa — zbitki i wygłos', () => {
  it.each([
    ['ptak', `pt${S}ak`],
    ['deszcz', `d${S}ɛʂt${TIE}ʂ`],
    ['iść', `${S}iɕt${TIE}ɕ`],
    ['wiatr', `v${PAL}${S}atr`],
    ['au', `${S}au`],
  ])('%s → %s', (input, expected) => {
    expect(toIpa(input)).toBe(expected)
  })
})

describe('toIpa — izolowane spółgłoski', () => {
  it('w → v (bez akcentu i bez ubezdźwięcznienia)', () => {
    expect(toIpa('w')).toBe('v')
  })

  it('z → z (bez ubezdźwięcznienia wygłosowego)', () => {
    expect(toIpa('z')).toBe('z')
  })
})

describe('toIpa — opcje', () => {
  it('tieBar: false usuwa łuk afrykaty', () => {
    expect(toIpa('czy', { tieBar: false })).toBe(`tʂ${S}ɨ`)
    expect(toIpa('dzi', { tieBar: false })).toBe(`dʑ${S}i`)
  })

  it('normalizuje wielkość liter i rozłożone diakrytyki', () => {
    expect(toIpa('KA')).toBe(toIpa('ka'))
    expect(toIpa('gęś'.normalize('NFD'))).toBe(toIpa('gęś'))
  })

  it('rzuca na nieznanym znaku', () => {
    expect(() => toIpa('qa')).toThrow(/nieznany znak/)
  })
})

describe('toIpa — wszystkie sylaby czytanek', () => {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const source = JSON.parse(
    readFileSync(join(ROOT, 'audio-source', 'czytanki-syllables.json'), 'utf8'),
  ) as Record<string, string>
  const entries = Object.entries(source).filter(([key]) => !key.startsWith('_'))
  const VOWELS = new Set(['a', 'ɛ', 'i', 'ɔ', 'u', 'ɨ'])

  it('plik zawiera wyłącznie klucze sylab', () => {
    expect(entries.length).toBeGreaterThan(300)
    expect(entries.every(([key]) => key.startsWith('cz-syl-'))).toBe(true)
  })

  it('każda sylaba daje IPA ze zbioru Azure pl-PL i z samogłoską', () => {
    const problems: string[] = []
    for (const [key, text] of entries) {
      const ipa = toIpa(text)
      if (ipa.length === 0) problems.push(`${key}: puste IPA`)
      for (const char of ipa) {
        if (!AZURE_PL_IPA_CHARS.has(char)) {
          problems.push(`${key} (${text} → ${ipa}): znak spoza zbioru Azure "${char}"`)
        }
      }
      // Sylaba ma samogłoskę; wyjątkiem są samotne spółgłoski ("w", "z").
      const hasVowel = [...ipa].some((char) => VOWELS.has(char))
      if (!hasVowel && text.length > 1) problems.push(`${key} (${text} → ${ipa}): brak samogłoski`)
    }
    expect(problems).toEqual([])
  })
})
