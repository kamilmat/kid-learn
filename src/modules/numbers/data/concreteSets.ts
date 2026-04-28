export type IconSet = {
  id: string
  emoji: string
  label: string
}

export const CONCRETE_SETS: IconSet[] = [
  { id: 'apple', emoji: '🍎', label: 'jabłko' },
  { id: 'star', emoji: '⭐', label: 'gwiazdka' },
  { id: 'balloon', emoji: '🎈', label: 'balonik' },
  { id: 'car', emoji: '🚗', label: 'autko' },
  { id: 'flower', emoji: '🌸', label: 'kwiatek' },
  { id: 'dog', emoji: '🐶', label: 'piesek' },
  { id: 'cat', emoji: '🐱', label: 'kotek' },
  { id: 'fish', emoji: '🐟', label: 'rybka' },
  { id: 'banana', emoji: '🍌', label: 'banan' },
  { id: 'butterfly', emoji: '🦋', label: 'motyl' },
]

export function pickIconSet(seed: number): IconSet {
  const idx = Math.abs(Math.floor(seed)) % CONCRETE_SETS.length
  return CONCRETE_SETS[idx] ?? CONCRETE_SETS[0]!
}
