import { describe, it, expect } from 'vitest'
import { slugPl, syllableAudioKey, wordAudioKey, AUDIO_KEY_RE } from './audioKeys'

describe('audioKeys', () => {
  it('slugPl mapuje polskie znaki i lowercase', () => {
    expect(slugPl('ŻĄDŁO')).toBe('z-a_dl_o')
    expect(slugPl('Łąka')).toBe('l_a_ka')
    expect(slugPl('MA')).toBe('ma')
  })
  it('klucze mają prefixy i przechodzą regex', () => {
    expect(syllableAudioKey('KO')).toBe('cz-syl-ko')
    expect(wordAudioKey(['KO', 'TA'])).toBe('cz-word-kota')
    expect(AUDIO_KEY_RE.test(wordAudioKey(['GĘŚ']))).toBe(true)
  })
})
