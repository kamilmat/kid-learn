// PauseOverlay — wspólny modal "Pauza" dla wszystkich modułów sesyjnych.
// No-text dla dziecka: same ikony (▶ / 🏠) + audio cue z sesji (nav-pause /
// nav-resume). Tap-targety ≥ 60×60. Wyciszenie kolejki robi hook sesji —
// overlay sam nic nie gra.

import { colors, radii } from '@/app/theme'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type PauseOverlayProps = {
  onResume: () => void
  onQuit: () => void
  /**
   * `absolute` gdy overlay ma zostać w kontenerze sesji (Cyferki mają własny
   * stacking context), `fixed` gdy ma przykryć cały ekran.
   */
  position?: 'fixed' | 'absolute'
  /**
   * Domyślnie 2000 — pauza MUSI leżeć nad każdym overlayem feedbacku
   * (50), scenki (1000) i wild celebration (1500). Niżej dziecko nie mogło
   * tapnąć „Wznów" i sesja się zakleszczała.
   */
  zIndex?: number
}

const tapStyleExtras = {
  touchAction: 'manipulation' as const,
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
}

export function PauseOverlay({
  onResume,
  onQuit,
  position = 'fixed',
  zIndex = 2000,
}: PauseOverlayProps) {
  const resumeTap = useTapHandler({ onTap: onResume })
  const quitTap = useTapHandler({ onTap: onQuit })

  return (
    <div
      data-testid="pause-overlay"
      role="dialog"
      aria-label="Pauza"
      style={{
        position,
        inset: 0,
        zIndex,
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
        data-testid="pause-resume"
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
        data-testid="pause-exit"
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
