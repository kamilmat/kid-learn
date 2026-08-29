// SyllableText — renderuje słowo z kolorowaniem sylab wg pozycji.
// Fallback: jeśli brak syllables albo długości się nie zgadzają — zwykły tekst.

import { getSyllableCue } from '@/shared/ui/syllableColors'

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
      {syllables.map((syl, i) => {
        const cue = getSyllableCue(i)
        return (
          <span key={i} style={{ color: cue.color, borderBottom: `3px ${cue.underline} ${cue.color}` }}>
            {syl}
          </span>
        )
      })}
    </span>
  )
}
