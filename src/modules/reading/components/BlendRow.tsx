// Wizualizacja kroku syntezy: sylaby słowa, podświetlana ta, która właśnie
// brzmi. To ILUSTRACJA DŹWIĘKU, nie tekst do przeczytania — stąd
// `aria-hidden` (czytnik i tak nie odda tu tempa) i brak jakiegokolwiek opisu.
//
// Rząd siedzi na jasnym kaflu, a nie wprost na kolorowym tle overlaya: paleta
// `getSyllableCue` ma policzony kontrast względem #fef9f2 i na zielonym/
// grafitowym tle rozjechałaby się poniżej progu.

import type { BlendState } from '../hooks/useReadingSession'
import { getSyllableCue } from '@/shared/ui/syllableColors'

export function BlendRow({ blend }: { blend: BlendState }) {
  if (blend.syllables.length === 0) return null
  return (
    <div
      data-testid="blend-row"
      aria-hidden="true"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        padding: '10px 18px',
        borderRadius: 18,
        background: '#fef9f2',
      }}
    >
      {blend.syllables.map((syllable, i) => {
        const cue = getSyllableCue(i)
        const active = blend.activeIndex === i
        return (
          <span
            key={`${syllable}-${i}`}
            data-testid={`blend-syllable-${i}`}
            data-active={active ? 'true' : 'false'}
            style={{
              fontFamily: 'var(--font-block)',
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.1,
              color: cue.color,
              borderBottom: `4px ${cue.underline} ${cue.color}`,
              padding: '2px 8px',
              borderRadius: 8,
              background: active ? '#fde047' : 'transparent',
              transform: active ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 120ms ease-out, background 120ms ease-out',
            }}
          >
            {syllable}
          </span>
        )
      })}
    </div>
  )
}
