import { useCallback, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

// Okno deduplikacji click-po-pointerup — jak w `useTapHandler`. `onPointerDown`
// robi preventDefault (blokada lupy iOS przy long-pressie), więc natywny click
// zwykle nie leci; ale AT (VoiceOver) i syntetyczne kliknięcia go emitują i bez
// dedupe sylaba odezwałaby się dwa razy.
const POINTER_TAP_DEDUP_MS = 300

export type UseSyllablePressOptions = {
  onTap: () => void
  onLongPress: () => void
  longPressMs?: number
  moveTolerancePx?: number
}

export function useSyllablePress({
  onTap,
  onLongPress,
  longPressMs = 500,
  moveTolerancePx = 10,
}: UseSyllablePressOptions) {
  const timer = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const pointerHandledAt = useRef(0)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    start.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault()
      clear()
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      timer.current = window.setTimeout(() => {
        fired.current = true
        timer.current = null
        onLongPress()
      }, longPressMs)
    },
    [onLongPress, longPressMs, clear],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!start.current) return
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > moveTolerancePx) clear()
    },
    [clear, moveTolerancePx],
  )

  const onPointerUp = useCallback(() => {
    // Każda domknięta sekwencja pointera (tap ORAZ long-press) blokuje kolejny
    // click — inaczej long-press wymówiłby jeszcze sylabę po całym słowie.
    pointerHandledAt.current = Date.now()
    if (start.current && !fired.current) onTap()
    clear()
  }, [onTap, clear])

  // Aktywacja bez pointer eventów: VoiceOver / syntetyczny click w teście.
  const onClick = useCallback(
    (_: MouseEvent) => {
      if (Date.now() - pointerHandledAt.current < POINTER_TAP_DEDUP_MS) return
      onTap()
    },
    [onTap],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onClick,
    onContextMenu: (e: PointerEvent | { preventDefault: () => void }) => e.preventDefault(),
  }
}
