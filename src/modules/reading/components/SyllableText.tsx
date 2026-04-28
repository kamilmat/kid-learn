// SyllableText — renderuje słowo z kolorowaniem sylab wg pozycji.
// Fallback: jeśli brak syllables albo długości się nie zgadzają — zwykły tekst.

import { getSyllableColor } from '../utils/syllableColors'

export type SyllableTextProps = {
  word: string
  syllables?: readonly string[]
}

export function SyllableText({ word, syllables }: SyllableTextProps) {
  if (!syllables || syllables.length === 0) {
    return <>{word}</>
  }
  return (
    <span aria-hidden="true">
      {syllables.map((syl, i) => (
        <span key={i} style={{ color: getSyllableColor(i) }}>
          {syl}
        </span>
      ))}
    </span>
  )
}
