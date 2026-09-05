import { describe, expect, it } from 'vitest'
import { CZYTANKI } from './czytanki'
import { AUDIO_KEY_RE, questionAudioKey } from './audioKeys'

// cz-12 („PADA I PADA.") nie ma rzeczownika — każde pytanie o „co?" miałoby dwie
// poprawne odpowiedzi (deszcz/śnieg), więc świadomie zostaje bez `comprehension`.
const WITHOUT_QUESTION = ['cz-12']

const withQuestion = CZYTANKI.filter((c) => c.comprehension)

function sceneEmoji(id: string): string[] {
  const c = CZYTANKI.find((x) => x.id === id)!
  return c.scene.actors.map((a) => a.emoji)
}

describe('comprehension', () => {
  it('każda czytanka z rzeczownikiem ma pytanie', () => {
    expect(CZYTANKI.length).toBe(100)
    expect(withQuestion.length).toBe(100 - WITHOUT_QUESTION.length)
    const missing = CZYTANKI.filter((c) => !c.comprehension).map((c) => c.id)
    expect(missing).toEqual(WITHOUT_QUESTION)
  })

  it('3 różne emoji, answer w zakresie, ≤5 słów, znak zapytania, bez przeczeń', () => {
    for (const c of withQuestion) {
      const q = c.comprehension!
      expect(q.options.length, c.id).toBe(3)
      expect(new Set(q.options).size, c.id).toBe(3)
      expect([0, 1, 2]).toContain(q.answer)
      expect(q.question.trim().split(/\s+/).length, c.id).toBeLessThanOrEqual(5)
      expect(q.question.endsWith('?'), c.id).toBe(true)
      // `\b` liczy tylko ASCII-słowa, więc „rośnie"/„ciepłe" wyglądały jak
      // przeczenie „nie" (granica wypada po diakrytyku). Lookaround po \p{L}
      // patrzy na litery WSZYSTKICH alfabetów i łapie realne „nie".
      expect(/(?<!\p{L})nie(?!\p{L})|dlaczego/iu.test(q.question), c.id).toBe(false)
      expect(questionAudioKey(c.id)).toMatch(AUDIO_KEY_RE)
      for (const o of q.options) expect(/[\u{1F3FB}-\u{1F3FF}]/u.test(o), `${c.id} ${o}`).toBe(false)
    }
  })

  // Zakaz three-cueing: gdyby scena pokazywała wyłącznie poprawną odpowiedź,
  // dziecko trafiałoby z obrazka, bez czytania.
  it('co najmniej jeden dystraktor jest widoczny w scenie', () => {
    for (const c of withQuestion) {
      const q = c.comprehension!
      const scene = sceneEmoji(c.id)
      const shown = q.options.filter((o, i) => i !== q.answer && scene.includes(o))
      expect(shown.length, c.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('poprawna odpowiedź jest pokazana w scenie albo na kafelku', () => {
    for (const c of withQuestion) {
      const q = c.comprehension!
      const shown = [...sceneEmoji(c.id), c.emoji]
      expect(shown, c.id).toContain(q.options[q.answer])
    }
  })

  it('pozycja poprawnej odpowiedzi rozłożona: każdy indeks ≥15 razy', () => {
    const counts = [0, 0, 0]
    for (const c of withQuestion) counts[c.comprehension!.answer]! += 1
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(15)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(5)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(withQuestion.length)
  })

  it('klucze audio pytań są unikalne i lowercase', () => {
    const keys = withQuestion.map((c) => questionAudioKey(c.id))
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k).toBe(k.toLowerCase())
  })
})
