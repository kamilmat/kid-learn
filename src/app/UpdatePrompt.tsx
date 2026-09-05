import { useSyncExternalStore } from 'react'
import { colors } from '@/app/theme'
import { applyUpdate, isUpdateReady, subscribeUpdate } from '@/app/swUpdate'

/**
 * Dyskretny ↻ w prawym górnym rogu, widoczny tylko gdy czeka nowa wersja.
 * Adresat to rodzic, nie dziecko: mały (44 px, poniżej dziecięcego minimum
 * 60 px), stonowany i w rogu, którego żaden ekran nie używa — ma być do
 * znalezienia, gdy się go szuka, a nie do klikania w trakcie czytanki.
 */
export function UpdatePrompt() {
  const ready = useSyncExternalStore(subscribeUpdate, isUpdateReady, () => false)
  if (!ready) return null
  return (
    <button
      type="button"
      data-testid="update-prompt"
      onClick={applyUpdate}
      aria-label="Nowa wersja — odśwież"
      title="Nowa wersja — odśwież"
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 3000,
        width: 44,
        height: 44,
        borderRadius: 22,
        border: `2px solid ${colors.accentBlue}`,
        background: '#fff',
        color: colors.text,
        fontSize: 22,
        lineHeight: 1,
        opacity: 0.85,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span aria-hidden="true">↻</span>
    </button>
  )
}
