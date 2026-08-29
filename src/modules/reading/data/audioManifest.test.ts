// Sonda po artefaktach buildu, nie test jednostkowy logiki: każdy klucz audio
// używany przez krok syntezy ma swój plik w `public/audio`. Trzymamy ją osobno
// od `blendSequence.test.ts`, żeby tamten pozostał czystym testem funkcji.

import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { blendAudioKeys } from '../hooks/blendSequence'
import { ALL_WORDS } from './words'

// `process.cwd()` to root repo (vitest odpala z root) — `import.meta.url`
// pod jsdom nie jest schematem `file:`.
const AUDIO_DIR = join(process.cwd(), 'public', 'audio')

describe('audio manifest — krok syntezy', () => {
  it('każdy klucz składania (prefiks, sylaby, całe słowo) ma plik mp3', () => {
    for (const w of ALL_WORDS) {
      for (const k of blendAudioKeys(w.text)) {
        expect(existsSync(join(AUDIO_DIR, `${k}.mp3`)), `${w.text} ${k}`).toBe(true)
      }
    }
  })
})
