import { useEffect, useRef, useState } from 'react'
import { createCountdown } from './countdownTimer'

export type UseCountdownProps = {
  durationMs: number | null
  running: boolean
  onWarning3s?: () => void
  onTimeout?: () => void
}

export type UseCountdownResult = {
  remainingMs: number | null
  /** 0 → świeżo wystartowany, 1 → koniec. `0` gdy nieaktywny. */
  progress: number
}

/**
 * React hook owijający `createCountdown`.
 *
 * - `durationMs=null` lub `running=false` → nie tyka, zwraca `null`/`0`.
 * - Reset gdy `durationMs` się zmienia.
 */
export function useCountdown({
  durationMs,
  running,
  onWarning3s,
  onTimeout,
}: UseCountdownProps): UseCountdownResult {
  const [remainingMs, setRemainingMs] = useState<number | null>(
    durationMs !== null && running ? durationMs : null,
  )

  const onWarningRef = useRef(onWarning3s)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onWarningRef.current = onWarning3s
  }, [onWarning3s])

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (durationMs === null || !running) {
      setRemainingMs(null)
      return
    }

    const countdown = createCountdown(durationMs)
    setRemainingMs(durationMs)

    countdown.start({
      onTick: (r) => setRemainingMs(r),
      onWarning3s: () => onWarningRef.current?.(),
      onTimeout: () => {
        setRemainingMs(0)
        onTimeoutRef.current?.()
      },
    })

    return () => {
      countdown.stop()
    }
  }, [durationMs, running])

  const progress =
    durationMs === null || durationMs <= 0 || remainingMs === null
      ? 0
      : Math.min(1, Math.max(0, 1 - remainingMs / durationMs))

  return { remainingMs, progress }
}
