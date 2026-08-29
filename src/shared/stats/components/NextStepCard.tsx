// Karta „Następny krok" — jedna akcja na górze raportu rodzica.
//
// Reszta raportu to dane; ta karta mówi, co z nimi zrobić dziś.

import { colors } from '@/app/theme'
import type { Suggestion } from '@/shared/stats/suggestions'

export type NextStepCardProps = {
  suggestion: Suggestion
}

export function NextStepCard({ suggestion }: NextStepCardProps) {
  return (
    <section
      data-testid="next-step-card"
      data-suggestion-id={suggestion.id}
      style={{
        padding: 16,
        background: '#ffffff',
        border: `2px solid ${colors.accentGreen}`,
        borderRadius: 12,
        color: colors.text,
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 15, color: '#6b7280' }}>
        Następny krok
      </h2>
      <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>
        {suggestion.text}
      </p>
      <p style={{ margin: 0, fontSize: 15, color: '#6b7280' }}>
        {suggestion.why}
      </p>
    </section>
  )
}
