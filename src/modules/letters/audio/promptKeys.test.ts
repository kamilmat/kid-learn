import { describe, it, expect } from 'vitest'
import { promptAudioKeys } from './promptKeys'
import { levelLetterPools } from '@/shared/settings/defaults'
import type { PromptMode } from '@/shared/settings/types'
import phonemes from '../../../../audio-source/letters-phonemes.json'
import names from '../../../../audio-source/letters-names.json'

describe('promptAudioKeys', () => {
  it('trzy tryby', () => {
    expect(promptAudioKeys('b', 'phoneme')).toEqual(['phon-b'])
    expect(promptAudioKeys('b', 'name')).toEqual(['letter-name-b'])
    // `both`: nazwa identyfikuje, fonem zostaje OSTATNI — jest potrzebny do scalania.
    expect(promptAudioKeys('b', 'both')).toEqual(['letter-name-b', 'phon-b'])
  })
  it('polskie znaki przez slugPl', () => {
    expect(promptAudioKeys('ż', 'both')).toEqual(['letter-name-z-', 'phon-z-'])
    expect(promptAudioKeys('ą', 'phoneme')).toEqual(['phon-a_'])
  })
  it('tryb spoza unii (uszkodzony persist) pada na sam fonem', () => {
    expect(promptAudioKeys('b', 'invalid' as PromptMode)).toEqual(['phon-b'])
  })
  it('każda litera puli Pochodni ma wpis w obu plikach źródłowych', () => {
    for (const letter of levelLetterPools.pochodnia) {
      const nameKey = promptAudioKeys(letter, 'name')[0]!
      const phonKey = promptAudioKeys(letter, 'phoneme')[0]!
      expect(names, letter).toHaveProperty(nameKey)
      expect(phonemes, letter).toHaveProperty(phonKey)
    }
  })
})

describe('promptAudioKeys — samogłoski w trybie both', () => {
  it('nie dubluje bodźca, gdy nazwa litery = fonem', () => {
    expect(promptAudioKeys('a', 'both')).toEqual(['phon-a'])
    expect(promptAudioKeys('ę', 'both')).toEqual(['phon-e_'])
    expect(promptAudioKeys('ó', 'both')).toEqual(['letter-name-o_', 'phon-o_'])
    expect(promptAudioKeys('b', 'both')).toEqual(['letter-name-b', 'phon-b'])
  })
})
