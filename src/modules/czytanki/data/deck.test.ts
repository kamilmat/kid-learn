import { describe, expect, it } from 'vitest'
import { buildDeck, drawFromDeck, reconcileDeck, seamSize, type Deck } from './deck'

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a * 1103515245 + 12345) % 2147483648
    return a / 2147483648
  }
}

const ids = Array.from({ length: 200 }, (_, i) => `cz-${i + 101}`)
const flat = () => 1

describe('talia czytanek', () => {
  it('runda: każda czytanka dokładnie raz, zanim cokolwiek się powtórzy', () => {
    const rand = seeded(7)
    let deck: Deck | undefined
    const drawn: string[] = []
    for (let i = 0; i < ids.length; i++) {
      const r = drawFromDeck(deck, ids, flat, rand)
      deck = r.deck
      drawn.push(r.id!)
    }
    expect(new Set(drawn).size).toBe(ids.length)
  })

  it('szew: początek nowej rundy nie zawiera końcówki poprzedniej', () => {
    const rand = seeded(11)
    let deck: Deck | undefined
    const drawn: string[] = []
    for (let i = 0; i < ids.length * 3; i++) {
      const r = drawFromDeck(deck, ids, flat, rand)
      deck = r.deck
      drawn.push(r.id!)
    }
    const k = seamSize(ids.length)
    for (const round of [1, 2]) {
      const start = round * ids.length
      const prevTail = new Set(drawn.slice(start - k, start))
      const nextHead = drawn.slice(start, start + k)
      expect(nextHead.filter((id) => prevTail.has(id))).toEqual([])
    }
  })

  it('pogodzenie z pulą: znikające id wypadają, nowe dochodzą do nieprzeczytanej części', () => {
    const deck: Deck = { order: ['a', 'b', 'x', 'c'], pos: 2 }
    const r = reconcileDeck(deck, ['a', 'b', 'c', 'd'], seeded(3))
    expect(r.pos).toBe(2)
    expect(r.order.slice(0, 2)).toEqual(['a', 'b'])
    expect([...r.order.slice(2)].sort()).toEqual(['c', 'd'])
  })

  it('ważenie: czytanki z trudnymi słowami trafiają średnio wcześniej', () => {
    const heavy = new Set(ids.slice(0, 20))
    let heavyPos = 0
    let lightPos = 0
    for (let s = 1; s <= 30; s++) {
      const order = buildDeck(ids, (id) => (heavy.has(id) ? 3 : 1), [], seeded(s))
      order.forEach((id, i) => {
        if (heavy.has(id)) heavyPos += i
        else lightPos += i
      })
    }
    expect(heavyPos / (20 * 30)).toBeLessThan(lightPos / (180 * 30))
  })
})
