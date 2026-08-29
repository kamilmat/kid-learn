import { describe, expect, it } from 'vitest'
import { CZYTANKI } from './czytanki'
import { AUDIO_KEY_RE, questionAudioKey } from './audioKeys'

describe('comprehension', () => {
  it('wszystkie 60 czytanek mają pytanie', () => {
    expect(CZYTANKI.length).toBe(60)
    for (const c of CZYTANKI) expect(c.comprehension, c.id).toBeDefined()
  })

  it('3 różne emoji, answer w zakresie, ≤5 słów, znak zapytania, bez przeczeń', () => {
    for (const c of CZYTANKI) {
      const q = c.comprehension!
      expect(q.options.length, c.id).toBe(3)
      expect(new Set(q.options).size, c.id).toBe(3)
      expect([0, 1, 2]).toContain(q.answer)
      expect(q.question.trim().split(/\s+/).length, c.id).toBeLessThanOrEqual(5)
      expect(q.question.endsWith('?'), c.id).toBe(true)
      expect(/\bnie\b|dlaczego/i.test(q.question), c.id).toBe(false)
      expect(questionAudioKey(c.id)).toMatch(AUDIO_KEY_RE)
      for (const o of q.options) expect(/[\u{1F3FB}-\u{1F3FF}]/u.test(o), `${c.id} ${o}`).toBe(false)
    }
  })

  it('pozycja poprawnej odpowiedzi rozłożona: każdy indeks ≥15 razy', () => {
    const counts = [0, 0, 0]
    for (const c of CZYTANKI) counts[c.comprehension!.answer]! += 1
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(15)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(60)
  })

  it('klucze audio pytań są unikalne i lowercase', () => {
    const keys = CZYTANKI.map((c) => questionAudioKey(c.id))
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k).toBe(k.toLowerCase())
  })
})
