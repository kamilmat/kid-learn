import { describe, it, expect } from 'vitest'
import { splitToLetterUnits, DIGRAPHS } from './letterUnits'
import { letterUnitAudioKey } from './audioKeys'
import { CZYTANKI } from './czytanki'
import { POLISH_ALPHABET } from '@/modules/letters/data/alphabet'

describe('splitToLetterUnits', () => {
  it('rozbija sylabę na pojedyncze litery', () => {
    expect(splitToLetterUnits('KO')).toEqual(['K', 'O'])
    expect(splitToLetterUnits('MA')).toEqual(['M', 'A'])
    expect(splitToLetterUnits('O')).toEqual(['O'])
  })

  it('trzyma dwuznaki razem', () => {
    expect(splitToLetterUnits('SZY')).toEqual(['SZ', 'Y'])
    expect(splitToLetterUnits('CHLEB')).toEqual(['CH', 'L', 'E', 'B'])
    expect(splitToLetterUnits('PRZY')).toEqual(['P', 'RZ', 'Y'])
    expect(splitToLetterUnits('DESZCZ')).toEqual(['D', 'E', 'SZ', 'CZ'])
    expect(splitToLetterUnits('DZIEŃ')).toEqual(['DZ', 'I', 'E', 'Ń'])
  })

  it('DŻ i DŹ nie rozpadają się na DZ', () => {
    expect(splitToLetterUnits('DŻA')).toEqual(['DŻ', 'A'])
    expect(splitToLetterUnits('DŹWI')).toEqual(['DŹ', 'W', 'I'])
  })

  it('miękkie „i" zostaje osobną literką', () => {
    expect(splitToLetterUnits('NIE')).toEqual(['N', 'I', 'E'])
    expect(splitToLetterUnits('CIA')).toEqual(['C', 'I', 'A'])
  })

  it('działa na lowercase i zachowuje wielkość liter wejścia', () => {
    expect(splitToLetterUnits('szy')).toEqual(['sz', 'y'])
  })
})

describe('pokrycie audio', () => {
  const LETTERS = new Set(POLISH_ALPHABET)
  const DIGRAPH_SET = new Set<string>(DIGRAPHS)

  it('każda jednostka każdej sylaby czytanek ma znany klucz audio', () => {
    const unknown = new Set<string>()
    for (const cz of CZYTANKI) {
      for (const sent of cz.sentences) {
        for (const word of sent) {
          for (const syl of word.syllables) {
            for (const unit of splitToLetterUnits(syl)) {
              const isLetter = [...unit].length === 1 && LETTERS.has(unit.toLowerCase())
              const isDigraph = DIGRAPH_SET.has(unit.toUpperCase())
              if (!isLetter && !isDigraph) unknown.add(unit)
            }
          }
        }
      }
    }
    expect([...unknown]).toEqual([])
  })

  it('buduje klucze: litery z modułu 1, dwuznaki własne', () => {
    expect(letterUnitAudioKey('K')).toBe('letter-k')
    expect(letterUnitAudioKey('Ą')).toBe('letter-ą')
    expect(letterUnitAudioKey('SZ')).toBe('cz-let-sz')
    expect(letterUnitAudioKey('DŻ')).toBe('cz-let-dz-')
    expect(letterUnitAudioKey('DŹ')).toBe('cz-let-dz_')
  })
})
