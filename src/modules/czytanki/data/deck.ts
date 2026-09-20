/**
 * Talia trybu 🎲 — jedna na grupę. Czytanka nie wraca, dopóki nie padną
 * wszystkie pozostałe z grupy; dopiero wtedy tasujemy od nowa (spec 2026-09-19).
 */
export type Deck = { order: string[]; pos: number }

// Szew między rundami: tyle ostatnich czytanek poprzedniej rundy nie może
// trafić na początek nowej — inaczej po przetasowaniu dziecko dostałoby to,
// co czytało przed chwilą.
export function seamSize(n: number): number {
  return Math.min(50, Math.floor(n / 4))
}

/**
 * Ważone tasowanie (Efraimidis–Spirakis): klucz u^(1/w), malejąco. Waga > 1
 * przesuwa czytankę bliżej początku talii, ale każda i tak pada raz na rundę.
 */
export function buildDeck(
  ids: readonly string[],
  weightOf: (id: string) => number,
  prevTail: readonly string[],
  rand: () => number = Math.random,
): string[] {
  const keyed = ids.map((id) => ({ id, key: Math.pow(rand(), 1 / Math.max(0.01, weightOf(id))) }))
  keyed.sort((a, b) => b.key - a.key)
  const order = keyed.map((k) => k.id)
  const k = seamSize(order.length)
  if (k === 0 || prevTail.length === 0) return order
  // Pierwsze k pozycji wypełniają wyłącznie czytanki spoza ogona poprzedniej
  // rundy; reszta zachowuje wylosowaną kolejność.
  const tail = new Set(prevTail)
  const front: string[] = []
  const back: string[] = []
  for (const id of order) {
    if (front.length < k && !tail.has(id)) front.push(id)
    else back.push(id)
  }
  return [...front, ...back]
}

/** Id spoza puli wypadają, nowe czytanki dochodzą w losowe miejsca nieprzeczytanej części. */
export function reconcileDeck(deck: Deck, ids: readonly string[], rand: () => number = Math.random): Deck {
  const valid = new Set(ids)
  const played = deck.order.slice(0, deck.pos).filter((id) => valid.has(id))
  const remaining = deck.order.slice(deck.pos).filter((id) => valid.has(id))
  const known = new Set([...played, ...remaining])
  for (const id of ids) {
    if (known.has(id)) continue
    remaining.splice(Math.floor(rand() * (remaining.length + 1)), 0, id)
  }
  return { order: [...played, ...remaining], pos: played.length }
}

export function drawFromDeck(
  deck: Deck | undefined,
  ids: readonly string[],
  weightOf: (id: string) => number,
  rand: () => number = Math.random,
): { id: string | null; deck: Deck } {
  if (ids.length === 0) return { id: null, deck: { order: [], pos: 0 } }
  let current = deck ? reconcileDeck(deck, ids, rand) : { order: [] as string[], pos: 0 }
  if (!deck || current.pos >= current.order.length) {
    // `slice(-0)` zwraca CAŁĄ tablicę, więc przy k = 0 ogon musi być pusty.
    const k = seamSize(ids.length)
    const tail = k > 0 ? current.order.slice(-k) : []
    current = { order: buildDeck(ids, weightOf, tail, rand), pos: 0 }
  }
  const id = current.order[current.pos]!
  return { id, deck: { order: current.order, pos: current.pos + 1 } }
}
