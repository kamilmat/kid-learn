import { describe, it, expect } from 'vitest'
import { promptAudioKeys } from './promptKeys'
import { levelLetterPools } from '@/shared/settings/defaults'
import type { PromptMode } from '@/shared/settings/types'
import sounds from '../../../../audio-source/letters.json'
import names from '../../../../audio-source/letters-names.json'

describe('promptAudioKeys', () => {
  it('trzy tryby', () => {
    expect(promptAudioKeys('b', 'phoneme')).toEqual(['letter-b'])
    expect(promptAudioKeys('b', 'name')).toEqual(['letter-name-b'])
    // `both`: nazwa identyfikuje, fonem zostaje OSTATNI — jest potrzebny do scalania.
    expect(promptAudioKeys('b', 'both')).toEqual(['letter-name-b', 'letter-b'])
  })
  it('polskie znaki przez slugPl', () => {
    expect(promptAudioKeys('ż', 'both')).toEqual(['letter-name-z-', 'letter-ż'])
    expect(promptAudioKeys('ą', 'phoneme')).toEqual(['letter-ą'])
  })
  it('tryb spoza unii (uszkodzony persist) pada na sam fonem', () => {
    expect(promptAudioKeys('b', 'invalid' as PromptMode)).toEqual(['letter-b'])
  })
  it('każda litera puli Pochodni ma wpis w obu plikach źródłowych', () => {
    for (const letter of levelLetterPools.pochodnia) {
      const nameKey = promptAudioKeys(letter, 'name')[0]!
      const soundKey = promptAudioKeys(letter, 'phoneme')[0]!
      expect(names, letter).toHaveProperty(nameKey)
      expect(sounds, letter).toHaveProperty(soundKey)
    }
  })
})

describe('promptAudioKeys — samogłoski w trybie both', () => {
  it('nie dubluje bodźca, gdy nazwa litery = fonem', () => {
    expect(promptAudioKeys('a', 'both')).toEqual(['letter-a'])
    expect(promptAudioKeys('ę', 'both')).toEqual(['letter-ę'])
    expect(promptAudioKeys('ó', 'both')).toEqual(['letter-name-o_', 'letter-ó'])
    expect(promptAudioKeys('b', 'both')).toEqual(['letter-name-b', 'letter-b'])
  })
})
