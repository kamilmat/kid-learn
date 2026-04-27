// Heurystyka grup wizualnych — sekcja 8.1 reguła 1 spec ("errorless start").
// Każda litera może należeć do wielu grup (cech). `areVisuallyDistant` zwraca
// `true` gdy obie litery NIE dzielą żadnej grupy — używane przez generator
// dystraktorów do wybierania bezpiecznych dystraktorów dla świeżych liter.

export type VisualGroup =
  | 'round'
  | 'tall-stick'
  | 'descender'
  | 'triangular'
  | 'cross-diag'

const GROUPS: Record<VisualGroup, readonly string[]> = {
  // krągłe (oparte o "okrąg" w x-height)
  round: ['o', 'c', 'e', 'a', 'ą'],
  // wysoka laska — dotykają górnej linii
  'tall-stick': ['l', 't', 'k', 'h', 'b', 'd', 'ł', 'f', 'i', 'j'],
  // ogonek schodzący poniżej linii podstawowej
  descender: ['g', 'p', 'y', 'j', 'ż', 'ź', 'ę', 'ą'],
  // kształt trójkątny / "domek"
  triangular: ['w', 'm', 'n', 'ń'],
  // krzyżujące / diagonalne — uproszczenie spec (x nie w polskim alfabecie,
  // ale zostawiamy w mapie dla kompletności heurystyki)
  'cross-diag': ['x', 'z', 'k'],
} as const

function buildLetterToGroups(): Record<string, readonly VisualGroup[]> {
  const acc: Record<string, Set<VisualGroup>> = {}
  for (const groupName of Object.keys(GROUPS) as VisualGroup[]) {
    for (const letter of GROUPS[groupName]) {
      if (acc[letter] === undefined) {
        acc[letter] = new Set<VisualGroup>()
      }
      acc[letter].add(groupName)
    }
  }
  const out: Record<string, readonly VisualGroup[]> = {}
  for (const [letter, set] of Object.entries(acc)) {
    out[letter] = Object.freeze([...set])
  }
  return out
}

const LETTER_TO_GROUPS: Record<string, readonly VisualGroup[]> =
  buildLetterToGroups()

/**
 * Zwraca grupy wizualne, do których należy dana litera. Pusta lista, jeśli
 * litera nie jest skategoryzowana (ostatecznie traktujemy ją jako "wizualnie
 * odległą od wszystkiego" — bezpieczny default dla errorless start).
 */
export function getVisualGroups(letter: string): readonly VisualGroup[] {
  return LETTER_TO_GROUPS[letter] ?? []
}

/**
 * `true` gdy litery nie dzielą ŻADNEJ wspólnej grupy wizualnej. Używane przy
 * doborze dystraktorów dla świeżych liter (errorless start, sekcja 8.1#1).
 *
 * Litera porównywana sama ze sobą zwraca `false` — dwie identyczne litery
 * dzielą wszystkie grupy.
 */
export function areVisuallyDistant(a: string, b: string): boolean {
  if (a === b) {
    return false
  }
  const ga = getVisualGroups(a)
  const gb = getVisualGroups(b)
  if (ga.length === 0 || gb.length === 0) {
    // brak danych z którejś strony — traktujemy jako odlegle (bezpieczny default)
    return true
  }
  const setB = new Set<VisualGroup>(gb)
  for (const g of ga) {
    if (setB.has(g)) {
      return false
    }
  }
  return true
}
