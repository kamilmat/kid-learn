// Paleta Okabe–Ito (color-universal design) z korektą kontrastu: oryginalny
// pomarańcz #E69F00 daje ~2,1:1 na tle #fef9f2 — poniżej progu nawet dla dużego
// tekstu — więc przyciemniony do #B35900. Wszystkie ≥3:1; sylaby mają 40–64 px.
// Kolor NIE MOŻE być jedynym nośnikiem granicy sylaby (WCAG 1.4.1), więc każdy
// indeks ma też własny styl podkreślenia. Rysujemy je przez `borderBottom`, nie
// `text-decoration` — w Lexend dekoracja wchodzi w wydłużenia dolne.
export type SyllableUnderline = 'solid' | 'dotted' | 'dashed' | 'double'
export type SyllableCue = { color: string; underline: SyllableUnderline }

const SYLLABLE_CUES: readonly SyllableCue[] = [
  { color: '#0072B2', underline: 'solid' },
  { color: '#B35900', underline: 'dotted' },
  { color: '#009E73', underline: 'dashed' },
  { color: '#CC79A7', underline: 'double' },
]

export function getSyllableCue(index: number): SyllableCue {
  const n = SYLLABLE_CUES.length
  return SYLLABLE_CUES[((index % n) + n) % n]!
}
/** Wrapper zgodności — nowy kod bierze `getSyllableCue`. */
export function getSyllableColor(index: number): string {
  return getSyllableCue(index).color
}
