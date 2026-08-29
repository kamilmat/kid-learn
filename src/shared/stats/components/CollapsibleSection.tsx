// Zwijana sekcja raportu rodzica.
//
// WHY: raport urósł do ośmiu sekcji i „Następny krok" ginął pod tabelami.
// Wszystko poza kartą startuje zwinięte, a nagłówek niesie jednolinijkowe
// podsumowanie, więc rodzic widzi stan bez rozwijania czegokolwiek.
// Stan otwarcia świadomie w `useState` — to wybór na jedno spojrzenie, nie
// preferencja do persistu.

import { useId, useState, type ReactNode } from 'react'
import { colors } from '@/app/theme'

export type CollapsibleSectionProps = {
  title: string
  /** Jedna linijka widoczna bez rozwijania, np. „Litery — 18/35 opanowanych". */
  summary: string
  children: ReactNode
  defaultOpen?: boolean
  testId?: string
}

const HEADER_MIN_HEIGHT = 44

export function CollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = false,
  testId,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = `${useId()}-content`

  return (
    <section
      data-testid={testId}
      style={{
        background: '#ffffff',
        border: '1px solid #e8e0d2',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Nagłówek jest nagłówkiem także dla czytnika ekranu — bez <h2> raport
          rodzica nie ma żadnej struktury do przeskakiwania. */}
      <h2 style={{ margin: 0 }}>
        <button
          type="button"
          data-testid={testId ? `${testId}-toggle` : undefined}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%',
            minHeight: HEADER_MIN_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            color: colors.text,
            font: 'inherit',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: 14,
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 120ms ease',
            }}
          >
            ▶
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
            <span style={{ fontSize: 14, color: '#6b7280' }}>{summary}</span>
          </span>
        </button>
      </h2>
      {/* Kontener istnieje zawsze (cel `aria-controls`), ale dzieci renderują
          się dopiero po rozwinięciu — raport ma osiem ciężkich sekcji. */}
      <div id={contentId} style={open ? { padding: '0 14px 14px' } : undefined}>
        {open && children}
      </div>
    </section>
  )
}
