// Paleta kolorów dla sylab — wzorowana na polskich elementarzach (czerwono-niebieska
// alternacja). Dla 3+ sylab dodajemy zielony i fioletowy.
//
// Kolory wybrane dla wysokiego kontrastu na jasnym tle (#fef9f2):
// niebieski-700, czerwony-600, zielony-600, fioletowy-600.

const SYLLABLE_COLORS = ['#1d4ed8', '#dc2626', '#16a34a', '#9333ea'] as const

export function getSyllableColor(index: number): string {
  return SYLLABLE_COLORS[index % SYLLABLE_COLORS.length] ?? SYLLABLE_COLORS[0]
}
