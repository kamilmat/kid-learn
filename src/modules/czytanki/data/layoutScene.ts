import type { Actor, AnimKind } from './types'

// Sceny czytanek z puli generowanej nie są układane ręcznie — 1900 scen
// rozstawia ta funkcja. Deterministyczna (seed = numer czytanki), żeby scena
// nie przeskakiwała między wizytami ani między renderami.

const SKY = new Set(['☀️', '🌙', '⭐', '☁️', '🌈', '🐦', '🦋', '🎈', '✈️', '🪁', '🌧️', '❄️', '🐝', '🕊️', '🦅', '🚁', '🌤️', '⛅', '🌟', '🐞', '🦉', '🪽', '🌠', '🎆', '🦇'])
const BIG = new Set(['🏠', '🏡', '🌳', '🌲', '🏫', '🏰', '🚗', '🚌', '🚂', '🛝', '⛺', '🏔️', '⛰️', '🚜', '🚒', '🚑', '🚓', '🚲', '🛶', '⛵', '🚢', '🌴', '🏥', '🏪', '🎠', '🛷', '🪟', '🚪', '🛏️', '🛋️', '🌋', '🗼'])
export const PEOPLE: ReadonlySet<string> = new Set(['👧', '👦', '👩', '🧔', '👵', '👴', '👶', '🧒', '👨', '🧑', '👮', '👩‍🍳', '🧑‍🍳', '👨‍🍳', '🧑‍🚒', '👨‍🚒', '👩‍🚒', '👨‍🏫', '👷', '🧑‍🔧', '👨‍🔧', '🧑‍🎄', '🤶', '🦸', '👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '🧑‍🌾', '👩‍🏫', '🧑‍🏫', '🤴', '👸', '🧙', '🎅', '🤡', '🧜', '🧚', '👻', '🤖', '⛄', '☃️'])
const ANIMALS = new Set(['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐤', '🦆', '🐴', '🐺', '🐗', '🐢', '🐍', '🐙', '🐟', '🐠', '🐬', '🐳', '🦈', '🐊', '🦒', '🐘', '🦔', '🐿️', '🐐', '🐑', '🐄', '🐖', '🐕', '🐈', '🐓', '🦃', '🦢', '🦩', '🦜', '🐌', '🐛', '🐜', '🦀', '🦓', '🦌', '🐫', '🦙', '🦛', '🦏', '🐇', '🦫', '🦦', '🐁', '🐀', '🦎', '🦕', '🦖', '🐋', '🐡', '🦭', '🦘', '🐂'])

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

function kindOf(emoji: string): 'sky' | 'big' | 'person' | 'animal' | 'thing' {
  if (SKY.has(emoji)) return 'sky'
  if (BIG.has(emoji)) return 'big'
  if (PEOPLE.has(emoji)) return 'person'
  if (ANIMALS.has(emoji)) return 'animal'
  return 'thing'
}

const ANIMS: Record<ReturnType<typeof kindOf>, readonly AnimKind[]> = {
  sky: ['float', 'pulse'],
  big: ['none', 'sway'],
  person: ['bob', 'sway'],
  animal: ['wiggle', 'bob', 'sway'],
  thing: ['pulse', 'wiggle', 'bob'],
}

const SIZE: Record<ReturnType<typeof kindOf>, readonly [number, number]> = {
  sky: [56, 76],
  big: [106, 120],
  person: [96, 110],
  animal: [78, 96],
  thing: [60, 80],
}

export function layoutScene(emojis: readonly string[], seed: number): Actor[] {
  const rand = mulberry32(seed * 2654435761)
  const ground = emojis.filter((e) => kindOf(e) !== 'sky')
  const sky = emojis.filter((e) => kindOf(e) === 'sky')
  const actors: Actor[] = []
  let order = 0

  // Aktorzy na ziemi rozstawieni równo po szerokości — z lekkim rozrzutem,
  // żeby sceny nie wyglądały jak jedna szablonowa linijka.
  ground.forEach((emoji, i) => {
    const n = ground.length
    const baseX = n === 1 ? 50 : 16 + (i * 68) / (n - 1)
    const kind = kindOf(emoji)
    const [lo, hi] = SIZE[kind]
    actors.push({
      emoji,
      x: Math.round(baseX + (rand() - 0.5) * 8),
      y: Math.round((kind === 'big' ? 56 : 64) + (i % 2) * 8 + rand() * 6),
      size: Math.round(lo + rand() * (hi - lo)),
      anim: pick(rand, ANIMS[kind]),
      delay: Math.round((order++ * 0.4 + rand() * 0.3) * 10) / 10,
    })
  })
  sky.forEach((emoji, i) => {
    const n = sky.length
    const baseX = n === 1 ? 78 : 22 + (i * 60) / (n - 1)
    const [lo, hi] = SIZE.sky
    actors.push({
      emoji,
      x: Math.round(baseX + (rand() - 0.5) * 10),
      y: Math.round(24 + rand() * 14),
      size: Math.round(lo + rand() * (hi - lo)),
      anim: pick(rand, ANIMS.sky),
      delay: Math.round((order++ * 0.4 + rand() * 0.3) * 10) / 10,
    })
  })
  return actors
}
