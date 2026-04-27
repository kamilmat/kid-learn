export type CountdownCallbacks = {
  onTick: (remainingMs: number) => void
  onWarning3s?: () => void
  onTimeout: () => void
}

export type CountdownScheduler = {
  setInterval: (cb: () => void, ms: number) => unknown
  clearInterval: (handle: unknown) => void
  now: () => number
}

export type Countdown = {
  start(callbacks: CountdownCallbacks): void
  pause(): void
  resume(): void
  stop(): void
  getRemaining(): number
}

const defaultScheduler: CountdownScheduler = {
  setInterval: (cb, ms) => globalThis.setInterval(cb, ms),
  clearInterval: (h) => globalThis.clearInterval(h as Parameters<typeof globalThis.clearInterval>[0]),
  now: () => Date.now(),
}

/**
 * Pure logic countdown z injectable schedulerem (dla testowalności).
 *
 * - `start(callbacks)` startuje odliczanie od `durationMs`.
 * - `onWarning3s` wywoływane gdy `remaining <= 3000ms` (raz na sesję timera).
 * - `onTimeout` wywoływane gdy `remaining <= 0` — automatycznie zatrzymuje interval.
 * - `pause()` / `resume()` — czas pauzy nie jest liczony.
 * - `stop()` — zatrzymuje i czyści state (kolejny `start` zacznie od nowa).
 */
export function createCountdown(
  durationMs: number,
  tickMs: number = 50,
  scheduler: CountdownScheduler = defaultScheduler,
): Countdown {
  let handle: unknown = null
  let callbacks: CountdownCallbacks | null = null
  let startedAt: number | null = null
  let pausedAt: number | null = null
  let pausedAccum = 0
  let warningFired = false
  let finished = false

  const computeRemaining = (): number => {
    if (startedAt === null) return durationMs
    const referenceNow = pausedAt !== null ? pausedAt : scheduler.now()
    const elapsed = referenceNow - startedAt - pausedAccum
    return Math.max(0, durationMs - elapsed)
  }

  const clear = () => {
    if (handle !== null) {
      scheduler.clearInterval(handle)
      handle = null
    }
  }

  const tick = () => {
    if (callbacks === null || finished) return
    const remaining = computeRemaining()
    callbacks.onTick(remaining)

    if (!warningFired && remaining <= 3000 && remaining > 0) {
      warningFired = true
      callbacks.onWarning3s?.()
    }

    if (remaining <= 0) {
      finished = true
      clear()
      // Edge: warning się nie odpalił bo durationMs<=3000 i od razu poszedł timeout.
      // Zgodnie ze spec: "raz na sesję" — nie odpalamy jeśli już 0.
      callbacks.onTimeout()
    }
  }

  return {
    start(cbs: CountdownCallbacks): void {
      clear()
      callbacks = cbs
      startedAt = scheduler.now()
      pausedAt = null
      pausedAccum = 0
      warningFired = false
      finished = false

      // Edge: jeśli durationMs <= 3000 — odpal warning od razu (przed timeout-em).
      if (durationMs <= 3000 && durationMs > 0) {
        warningFired = true
        cbs.onWarning3s?.()
      }

      handle = scheduler.setInterval(tick, tickMs)
    },
    pause(): void {
      if (startedAt === null || pausedAt !== null || finished) return
      pausedAt = scheduler.now()
      clear()
    },
    resume(): void {
      if (pausedAt === null || finished || callbacks === null) return
      pausedAccum += scheduler.now() - pausedAt
      pausedAt = null
      handle = scheduler.setInterval(tick, tickMs)
    },
    stop(): void {
      clear()
      callbacks = null
      startedAt = null
      pausedAt = null
      pausedAccum = 0
      warningFired = false
      finished = false
    },
    getRemaining(): number {
      return computeRemaining()
    },
  }
}
