// SyllableText — renderuje słowo z kolorowaniem sylab wg pozycji.
// Fallback: jeśli brak syllables albo długości się nie zgadzają — zwykły tekst.
// `box` gasi kolor wraz z opanowaniem słowa (patrz `syllableColorForBox`) —
// rusztowanie znika, gdy nie jest już potrzebne. Album nigdy nie przekazuje
// `box` (ani `syllables`) — jest wystawą, zawsze czarny druk.

import { syllableColorForBox } from '@/shared/ui/syllableColors'
import type { Box } from '@/shared/srs/types'

export type SyllableTextProps = {
  word: string
  syllables?: readonly string[]
  box?: Box | undefined
}

export function SyllableText({ word, syllables, box }: SyllableTextProps) {
  if (!syllables || syllables.length === 0) {
    return <>{word}</>
  }
  return (
    <span data-testid="syllable-text" aria-hidden="true">
      {syllables.map((syl, i) => (
        <span key={i} style={syllableColorForBox(i, box)}>
          {syl}
        </span>
      ))}
    </span>
  )
}
