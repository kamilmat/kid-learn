import { useEffect, useRef } from 'react'

export type UseIdleDetectorProps = {
  thresholdMs: number
  onIdle: () => void
  onResume?: () => void
  enabled: boolean
}

const EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

/**
 * Hook wykrywający bezczynność użytkownika.
 *
 * - Słucha `pointerdown`, `keydown`, `touchstart` na `document`.
 * - Po `thresholdMs` bez interakcji → `onIdle()`.
 * - Pierwsza interakcja po wejściu w stan idle → `onResume()`.
 * - `enabled=false` całkowicie wyłącza listenery (cleanup).
 * - Każda interakcja resetuje timer.
 */
export function useIdleDetector({
  thresholdMs,
  onIdle,
  onResume,
  enabled,
}: UseIdleDetectorProps): void {
  // Trzymamy callbacki w refach, by nie restartować listenerów przy każdym renderze.
  const onIdleRef = useRef(onIdle)
  const onResumeRef = useRef(onResume)
  const thresholdRef = useRef(thresholdMs)

  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    onResumeRef.current = onResume
  }, [onResume])

  useEffect(() => {
    thresholdRef.current = thresholdMs
  }, [thresholdMs])

  useEffect(() => {
    if (!enabled) return

    let timerId: ReturnType<typeof setTimeout> | null = null
    let isIdle = false

    const fireIdle = () => {
      isIdle = true
      onIdleRef.current()
    }

    const startTimer = () => {
      if (timerId !== null) clearTimeout(timerId)
      timerId = setTimeout(fireIdle, thresholdRef.current)
    }

    const handleInteraction = () => {
      if (isIdle) {
        isIdle = false
        onResumeRef.current?.()
      }
      startTimer()
    }

    for (const evt of EVENTS) {
      document.addEventListener(evt, handleInteraction, { passive: true })
    }
    startTimer()

    return () => {
      if (timerId !== null) clearTimeout(timerId)
      for (const evt of EVENTS) {
        document.removeEventListener(evt, handleInteraction)
      }
    }
  }, [enabled])
}
