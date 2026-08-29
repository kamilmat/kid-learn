// ErrorBoundary — ostatnia siatka bezpieczeństwa wokół routes.
//
// Bez niej każdy wyjątek w renderze (np. litera bez `LetterState`) daje dziecku
// BIAŁY EKRAN bez wyjścia — a dziecko nie przeczyta komunikatu i nie otworzy
// devtoolsów. Fallback jest więc bez tekstu: dwa duże przyciski, „spróbuj
// jeszcze raz" (↻ przeładowanie) i „do domu" (🏠). Etykiety `aria-label` są po
// polsku dla rodzica/czytnika ekranu, dziecko widzi same ikony.

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { colors, radii, tapTargets } from '@/app/theme'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

const BUTTON_STYLE = {
  minWidth: tapTargets.minSize,
  minHeight: tapTargets.minSize,
  width: 96,
  height: 96,
  fontSize: 44,
  lineHeight: 1,
  border: 'none',
  borderRadius: radii.kid,
  background: '#fff',
  color: colors.text,
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
} as const

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Jedyny ślad, jaki rodzic może nam potem podać — konsola przeglądarki.
    console.error('Iskierki — nieobsłużony błąd renderu', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        data-testid="error-boundary-fallback"
        style={{
          flex: 1,
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tapTargets.minMargin * 2,
          background: colors.bg,
        }}
      >
        <button
          type="button"
          onClick={this.handleReload}
          aria-label="Spróbuj jeszcze raz"
          style={BUTTON_STYLE}
        >
          <span aria-hidden="true">↻</span>
        </button>
        {/* Twardy href zamiast <Link> — router mógł paść razem z drzewem. */}
        <a href={import.meta.env.BASE_URL} aria-label="Wróć na ekran główny" style={BUTTON_STYLE}>
          <span aria-hidden="true">🏠</span>
        </a>
      </div>
    )
  }
}
