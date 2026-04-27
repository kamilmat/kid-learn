// PauseOverlay — modal "Pauza".
// Sekcja 6.7 spec: pełnoekranowy duży przycisk wznowienia + wyjście.
// No-text dla dziecka — same ikony + audio cue.

import { colors, radii } from '@/app/theme'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type PauseOverlayProps = {
  onResume: () => void
  onQuit: () => void
}

const tapStyleExtras = {
  touchAction: 'manipulation' as const,
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
}

export function PauseOverlay({ onResume, onQuit }: PauseOverlayProps) {
  const resumeTap = useTapHandler({ onTap: onResume })
  const quitTap = useTapHandler({ onTap: onQuit })
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
        {...resumeTap}
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
          ...tapStyleExtras,
        }}
      >
        <span aria-hidden="true">▶</span>
      </button>
      <button
        type="button"
        aria-label="Wyjdź"
        data-testid="quit-button"
        {...quitTap}
        style={{
          width: 80,
          height: 80,
          borderRadius: radii.kid,
          background: '#ffffff',
          border: `3px solid ${colors.accentOrange}`,
          fontSize: 36,
          cursor: 'pointer',
          ...tapStyleExtras,
        }}
      >
        <span aria-hidden="true">🏠</span>
      </button>
    </div>
  )
}
