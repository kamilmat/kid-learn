// PauseOverlay — modal "Pauza" dla modułu czytania.
// Phase 6.6.2: pełnoekranowy overlay z przyciskami wznowienia i wyjścia.

import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

export type PauseOverlayProps = {
  onResume: () => void
  onExit: () => void
}

const tapStyleExtras = {
  touchAction: 'manipulation' as const,
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
}

export function PauseOverlay({ onResume, onExit }: PauseOverlayProps) {
  const resumeTap = useTapHandler({ onTap: onResume })
  const exitTap = useTapHandler({ onTap: onExit })

  return (
    <div
      data-testid="reading-pause-overlay"
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
      <div aria-hidden="true" style={{ fontSize: 96, color: '#ffffff' }}>
        ⏸
      </div>
      <button
        type="button"
        aria-label="Wznów"
        data-testid="reading-resume-button"
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
        data-testid="reading-exit-button"
        {...exitTap}
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
