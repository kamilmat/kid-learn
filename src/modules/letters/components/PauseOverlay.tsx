// PauseOverlay — modal "Pauza".
// Sekcja 6.7 spec: pełnoekranowy duży przycisk wznowienia + wyjście.
// No-text dla dziecka — same ikony + audio cue.

import { colors, radii } from '@/app/theme'

export type PauseOverlayProps = {
  onResume: () => void
  onQuit: () => void
}

export function PauseOverlay({ onResume, onQuit }: PauseOverlayProps) {
  return (
    <div
      data-testid="pause-overlay"
      role="dialog"
      aria-label="Pauza"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: '#2d2d33dd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 96, color: '#ffffff' }}>⏸</div>
      <button
        type="button"
        aria-label="Wznów"
        data-testid="resume-button"
        onClick={onResume}
        style={{
          width: 140,
          height: 140,
          borderRadius: radii.kid,
          background: colors.accentGreen,
          border: 'none',
          fontSize: 72,
          color: '#ffffff',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <span aria-hidden="true">▶</span>
      </button>
      <button
        type="button"
        aria-label="Wyjdź"
        data-testid="quit-button"
        onClick={onQuit}
        style={{
          width: 80,
          height: 80,
          borderRadius: radii.kid,
          background: '#ffffff',
          border: `3px solid ${colors.accentOrange}`,
          fontSize: 36,
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">🏠</span>
      </button>
    </div>
  )
}
