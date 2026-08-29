import { describe, expect, it } from 'vitest'
import { buildChoices, NEAR_MISS_OFFSETS } from './buildChoices'

// Deterministyczny rng — pozwala porównać dwa przebiegi bez zgadywania wyniku.
function seededRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

describe('buildChoices', () => {
  it('zwraca poprawną odpowiedź wśród domyślnych czterech kafelków', () => {
    for (let correct = 1; correct <= 10; correct++) {
      const choices = buildChoices(correct, { min: 1, max: 10, rng: seededRng(correct) })
      expect(choices).toHaveLength(4)
      expect(choices).toContain(correct)
    }
  })

  it('nie powtarza wartości', () => {
    const choices = buildChoices(7, { min: 1, max: 20, rng: seededRng(99) })
    expect(new Set(choices).size).toBe(choices.length)
  })

  it('trzyma się zakresu [min, max]', () => {
    const choices = buildChoices(20, { min: 0, max: 20, offsets: NEAR_MISS_OFFSETS, rng: seededRng(3) })
    for (const c of choices) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(20)
    }
  })

  it('z offsetami bierze dystraktory tylko z sąsiedztwa', () => {
    const choices = buildChoices(10, { min: 1, max: 20, offsets: NEAR_MISS_OFFSETS, rng: seededRng(11) })
    for (const c of choices) {
      expect(Math.abs(c - 10)).toBeLessThanOrEqual(3)
    }
  })

  it('honoruje count', () => {
    const choices = buildChoices(5, { count: 6, min: 1, max: 30, rng: seededRng(5) })
    expect(choices).toHaveLength(6)
    expect(choices).toContain(5)
  })

  it('nie wywraca się, gdy pula jest mniejsza niż count', () => {
    const choices = buildChoices(1, { min: 1, max: 2, rng: seededRng(7) })
    expect(choices.sort()).toEqual([1, 2])
  })

  it('jest deterministyczne dla tego samego rng', () => {
    const a = buildChoices(4, { min: 1, max: 10, rng: seededRng(42) })
    const b = buildChoices(4, { min: 1, max: 10, rng: seededRng(42) })
    expect(a).toEqual(b)
  })

  it('nie trzyma poprawnej odpowiedzi zawsze na tej samej pozycji', () => {
    const rng = seededRng(2024)
    const positions = new Set<number>()
    for (let i = 0; i < 50; i++) {
      positions.add(buildChoices(5, { min: 1, max: 10, rng }).indexOf(5))
    }
    expect(positions.size).toBe(4)
  })

  describe('restrictChoicesTo (faza retry)', () => {
    it('gdy restrictChoicesTo już zawiera correct, zwraca DOKŁADNIE te wartości (bez unii z lokalnym correct)', () => {
      // correct=5 (lokalne z ćwiczenia) jest już w restrictChoicesTo — nie ma
      // powodu doklejać nic więcej; wynik to dokładnie [5, 8] potasowane.
      const choices = buildChoices(5, {
        min: 1,
        max: 10,
        restrictChoicesTo: [5, 8],
        rng: seededRng(1),
      })
      expect(choices.slice().sort((a, b) => a - b)).toEqual([5, 8])
    })

    it('gdy correct lokalny różni się od restrictChoicesTo (rozjazd), dokleja go jako siatkę bezpieczeństwa', () => {
      // Symuluje rozjazd: lokalny correct (11) nie występuje w restrictChoicesTo
      // (np. session policzyła correct=10, wybór dziecka=8).
      const choices = buildChoices(11, {
        min: 1,
        max: 20,
        restrictChoicesTo: [10, 8],
        rng: seededRng(2),
      })
      expect(choices.slice().sort((a, b) => a - b)).toEqual([8, 10, 11])
    })

    it('deduplikuje, gdy restrictChoicesTo zawiera duplikaty lub duplikat correct', () => {
      const choices = buildChoices(5, {
        min: 1,
        max: 10,
        restrictChoicesTo: [5, 5, 8, 8],
        rng: seededRng(3),
      })
      expect(choices.slice().sort((a, b) => a - b)).toEqual([5, 8])
    })

    it('nie filtruje wyboru dziecka przez [min, max] — retry pokazuje go zawsze', () => {
      const choices = buildChoices(5, {
        min: 1,
        max: 10,
        restrictChoicesTo: [5, 999],
        rng: seededRng(4),
      })
      expect(choices.slice().sort((a, b) => a - b)).toEqual([5, 999])
    })
  })
})
