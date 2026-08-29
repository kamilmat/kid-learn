// Paleta Okabe–Ito (color-universal design) z korektą kontrastu: oryginalny
// pomarańcz #E69F00 daje ~2,1:1 na tle #fef9f2 — poniżej progu nawet dla dużego
// tekstu — więc przyciemniony do #B35900. Wszystkie ≥3:1; sylaby mają 40–64 px.
// Kolor NIE MOŻE być jedynym nośnikiem granicy sylaby (WCAG 1.4.1), więc każdy
// indeks ma też własny styl podkreślenia. Rysujemy je przez `borderBottom`, nie
// `text-decoration` — w Lexend dekoracja wchodzi w wydłużenia dolne.
import type { CSSProperties } from 'react'
import { colors } from '@/app/theme'
import type { Box } from '@/shared/srs/types'

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

// Kolor sylab to rusztowanie, nie format docelowy: im pewniejsze słowo,
// tym bliżej zwykłego czarnego druku. `box` undefined (album, brak SRS
// stanu) traktujemy jak świeże — pełny kolor.
export function syllableColorForBox(index: number, box: Box | undefined): CSSProperties {
  const cue = getSyllableCue(index)
  if (box === undefined || box <= 2) {
    return { color: cue.color, borderBottom: `3px ${cue.underline} ${cue.color}` }
  }
  if (box <= 4) {
    return { color: cue.color, opacity: 0.55, borderBottom: `3px ${cue.underline} ${cue.color}` }
  }
  return { color: colors.text }
}
