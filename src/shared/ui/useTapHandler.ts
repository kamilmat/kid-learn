// useTapHandler — zastępuje natywny `onClick` na tap-targetach z tolerancją
// ruchu. Powstał, bo Apple Pencil / rysik powoduje mikrodrgania między
// touchstart a touchend — browser klasyfikuje to jako drag i nie emituje
// `click`. Pointer Events dają nam pełen ruch i sami decydujemy: jeśli
// odległość < tolerancePx → tap.
//
// API: spread'uj zwracany obiekt na tap-target (button/div/span). Hook
// zwraca też `onClick` żeby zachować klawiaturową dostępność (Enter/Space
// emituje click bez pointer events). Gdy pointerup już obsłużył tap, click
// jest deduplikowany.

import { useCallback, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

const DEFAULT_TOLERANCE_PX = 12
// Krótkie okno deduplikacji click-after-pointerup (browser w niektórych
// przypadkach emituje click po pointerup nawet po preventDefault).
const POINTER_TAP_DEDUP_MS = 300

export type UseTapHandlerOptions = {
  onTap: () => void
  /** Tolerancja w pikselach (default 12). Powyżej traktujemy jako drag, nie tap. */
  tolerancePx?: number
  /** Wyłącz handler (np. gdy button disabled). */
  disabled?: boolean
}

export type TapHandlerProps = {
  onPointerDown: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: () => void
  onPointerLeave: () => void
  onClick: (e: MouseEvent) => void
}

export function useTapHandler({
  onTap,
  tolerancePx = DEFAULT_TOLERANCE_PX,
  disabled = false,
}: UseTapHandlerOptions): TapHandlerProps {
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null)
  const justTappedByPointerRef = useRef<boolean>(false)

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (disabled) return
      startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    },
    [disabled],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (disabled) return
      const start = startRef.current
      startRef.current = null
      if (!start || start.id !== e.pointerId) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.hypot(dx, dy) > tolerancePx) return
      // Pointer-driven tap: wywołujemy ręcznie zamiast polegać na natywnym
      // click event (browser bywa wybredny przy mikroruchach z rysika).
      justTappedByPointerRef.current = true
      onTap()
      window.setTimeout(() => {
        justTappedByPointerRef.current = false
      }, POINTER_TAP_DEDUP_MS)
    },
    [disabled, onTap, tolerancePx],
  )

  const onPointerCancel = useCallback(() => {
    startRef.current = null
  }, [])

  const onPointerLeave = useCallback(() => {
    startRef.current = null
  }, [])

  const onClick = useCallback(
    (_: MouseEvent) => {
      if (justTappedByPointerRef.current) return
      if (disabled) return
      onTap()
    },
    [disabled, onTap],
  )

  return { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onClick }
}
