// levelSuggestion — informacyjna sugestia awansu/cofnięcia poziomu na SessionEnd.
// Niczego nie blokuje ani nie przełącza; wybór poziomu zostaje na ReadingLevelSelect.

const UP_RATIO = 0.8
const UP_AVG_BOX = 3.5
const DOWN_RATIO = 0.4

export function suggestLevel(input: {
  correctRatio: number
  avgBox: number
  previousRatios: number[]
}): 'up' | 'down' | null {
  if (input.correctRatio >= UP_RATIO && input.avgBox >= UP_AVG_BOX) return 'up'
  const prev = input.previousRatios[input.previousRatios.length - 1]
  if (input.correctRatio <= DOWN_RATIO && prev !== undefined && prev <= DOWN_RATIO) return 'down'
  return null
}
