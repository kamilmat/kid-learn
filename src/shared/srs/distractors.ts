import type { LetterState } from './types'

const SHAPE_GROUPS: Record<string, string> = {
  b: 'roundStem',
  d: 'roundStem',
  p: 'roundStem',
  q: 'roundStem',
  g: 'roundStem',
  o: 'round',
  c: 'round',
  e: 'round',
  ó: 'round',
  ć: 'round',
  ę: 'round',
  ą: 'round',
  ś: 'round',
  ź: 'round',
  ż: 'round',
  a: 'round',
  m: 'humps',
  n: 'humps',
  w: 'humps',
  u: 'humps',
  h: 'humps',
  ń: 'humps',
  l: 'tall',
  ł: 'tall',
  t: 'tall',
  k: 'tall',
  f: 'tall',
  i: 'tall',
  j: 'tall',
  y: 'tall',
  s: 'curve',
  z: 'curve',
  r: 'curve',
}

function shapeOf(letter: string): string {
  return SHAPE_GROUPS[letter] ?? 'other'
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = copy[i]
    const b = copy[j]
    if (a !== undefined && b !== undefined) {
      copy[i] = b
      copy[j] = a
    }
  }
  return copy
}

function pickOne<T>(arr: T[], rng: () => number): T | undefined {
  if (arr.length === 0) return undefined
  return arr[Math.floor(rng() * arr.length)]
}

const CONTRASTIVE_PROBABILITY = 0.7
const ERRORLESS_TOTAL_SEEN_THRESHOLD = 2
const DEFAULT_REQUIRED_DISTRACTORS = 3

export function pickDistractors(
  target: string,
  activePool: string[],
  targetState: LetterState,
  contrastivePairs: Readonly<Record<string, readonly string[]>>,
  rng: () => number = Math.random,
  count: number = DEFAULT_REQUIRED_DISTRACTORS,
): string[] {
  const requiredDistractors = count
  const minPoolSize = requiredDistractors + 1
  if (activePool.length < minPoolSize) {
    throw new Error(
      `pickDistractors: active pool too small (${activePool.length}); minimum ${minPoolSize} required`
    )
  }
  if (!activePool.includes(target)) {
    throw new Error('pickDistractors: target not in active pool')
  }

  const candidates = activePool.filter((l) => l !== target)
  const errorless =
    targetState.box === 1 && targetState.totalSeen <= ERRORLESS_TOTAL_SEEN_THRESHOLD

  const partners = new Set(contrastivePairs[target] ?? [])
  const targetShape = shapeOf(target)

  const result: string[] = []

  if (errorless) {
    const distantPool = candidates.filter(
      (l) => !partners.has(l) && shapeOf(l) !== targetShape
    )
    const shuffledDistant = shuffled(distantPool, rng)
    for (const l of shuffledDistant) {
      if (result.length >= requiredDistractors) break
      result.push(l)
    }
    if (result.length < requiredDistractors) {
      const fallback = shuffled(
        candidates.filter((l) => !result.includes(l)),
        rng
      )
      for (const l of fallback) {
        if (result.length >= requiredDistractors) break
        result.push(l)
      }
    }
    return result
  }

  if (rng() < CONTRASTIVE_PROBABILITY) {
    const availablePartners = (contrastivePairs[target] ?? []).filter((p) =>
      activePool.includes(p) && p !== target
    )
    const partner = pickOne(availablePartners, rng)
    if (partner !== undefined) {
      result.push(partner)
    }
  }

  const remainingPool = shuffled(
    candidates.filter((l) => !result.includes(l)),
    rng
  )
  for (const l of remainingPool) {
    if (result.length >= requiredDistractors) break
    result.push(l)
  }

  return result
}
