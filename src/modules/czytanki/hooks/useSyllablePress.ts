import { useCallback, useRef } from 'react'
import type { PointerEvent } from 'react'

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
    if (start.current && !fired.current) onTap()
    clear()
  }, [onTap, clear])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: PointerEvent | { preventDefault: () => void }) => e.preventDefault(),
  }
}
