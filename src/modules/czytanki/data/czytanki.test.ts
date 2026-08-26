import { describe, it, expect } from 'vitest'
import { CZYTANKI, getCzytankiByGroup, getCzytankaById } from './czytanki'
import { AUDIO_KEY_RE, syllableAudioKey, wordAudioKey } from './audioKeys'

const OPEN_CV = /^[BCDFGHJKLŁMNPRSTWZ]?[AEIOUYÓ]$/u

describe('CZYTANKI', () => {
  it('60 sztuk, unikalne id cz-NN, 15 na grupę', () => {
    expect(CZYTANKI).toHaveLength(60)
    const ids = new Set(CZYTANKI.map((c) => c.id))
    expect(ids.size).toBe(60)
    for (const c of CZYTANKI) expect(c.id).toMatch(/^cz-\d{2}$/)
    for (const g of [1, 2, 3, 4] as const) expect(getCzytankiByGroup(g)).toHaveLength(15)
  })
  it('grupa 1: dokładnie 1 zdanie × 3 słowa, tylko sylaby otwarte', () => {
    for (const c of getCzytankiByGroup(1)) {
      expect(c.sentences).toHaveLength(1)
      expect(c.sentences[0]).toHaveLength(3)
      for (const w of c.sentences[0]!) for (const s of w.syllables) expect(s, `${c.id} ${s}`).toMatch(OPEN_CV)
    }
  })
  it('każde zdanie kończy się punct, sylaby niepuste, klucze audio poprawne', () => {
    for (const c of CZYTANKI) {
      expect(c.sentences.length).toBeGreaterThan(0)
      for (const sent of c.sentences) {
        expect(sent.length).toBeGreaterThan(0)
        expect(sent[sent.length - 1]!.punct).toBeDefined()
        for (const w of sent) {
          expect(w.syllables.length).toBeGreaterThan(0)
          for (const s of w.syllables) {
            expect(s.length).toBeGreaterThan(0)
            expect(syllableAudioKey(s)).toMatch(AUDIO_KEY_RE)
          }
          expect(wordAudioKey(w.syllables)).toMatch(AUDIO_KEY_RE)
        }
      }
    }
  })
  it('sceny: 1–5 aktorów, pozycje 0–100', () => {
    for (const c of CZYTANKI) {
      expect(c.scene.actors.length).toBeGreaterThanOrEqual(1)
      expect(c.scene.actors.length).toBeLessThanOrEqual(5)
      for (const a of c.scene.actors) {
        expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThanOrEqual(100)
        expect(a.y).toBeGreaterThanOrEqual(0); expect(a.y).toBeLessThanOrEqual(100)
      }
    }
  })
  it('getCzytankaById', () => {
    expect(getCzytankaById('cz-01')?.group).toBe(1)
    expect(getCzytankaById('nope')).toBeUndefined()
  })
})
