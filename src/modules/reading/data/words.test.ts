import { describe, expect, it } from 'vitest'
import { ALL_WORDS, getWordsByLevel, getWordById } from './words'

describe('words data', () => {
  it('has 67 words total', () => {
    expect(ALL_WORDS).toHaveLength(67)
  })

  it('Płomyk has 20 words', () => {
    expect(getWordsByLevel('plomyk')).toHaveLength(20)
  })

  it('Ognik has 25 words', () => {
    expect(getWordsByLevel('ognik')).toHaveLength(25)
  })

  it('Pochodnia has 22 words', () => {
    expect(getWordsByLevel('pochodnia')).toHaveLength(22)
  })

  it('every word has albumEmoji defined', () => {
    for (const w of ALL_WORDS) {
      expect(w.albumEmoji).toBeTruthy()
    }
  })

  it('every word has unique id', () => {
    const ids = ALL_WORDS.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Płomyk words decompose to 2 syllables from Iskierka pool', () => {
    const plomyk = getWordsByLevel('plomyk')
    for (const w of plomyk) {
      expect(w.syllables).toHaveLength(2)
    }
  })

  it('getWordById returns the word', () => {
    expect(getWordById('word-MAMA')?.text).toBe('MAMA')
  })
})
