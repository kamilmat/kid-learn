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
      const [nameKey, phonKey] = promptAudioKeys(letter, 'both')
      expect(names, letter).toHaveProperty(nameKey!)
      expect(phonemes, letter).toHaveProperty(phonKey!)
    }
  })
})
