import { describe, expect, it, vi } from 'vitest'
import { createCountdown, type CountdownScheduler } from './countdownTimer'

/**
 * Manualny scheduler — pełna kontrola nad czasem dla deterministycznych testów.
 */
function createTestScheduler(initialNow: number = 0): {
  scheduler: CountdownScheduler
  advance: (ms: number) => void
  setNow: (ms: number) => void
  intervals: Array<{ cb: () => void; ms: number; handle: number; active: boolean }>
} {
  let now = initialNow
  let nextHandle = 1
  const intervals: Array<{
    cb: () => void
    ms: number
    handle: number
    active: boolean
  }> = []

  const scheduler: CountdownScheduler = {
    setInterval: (cb, ms) => {
      const entry = { cb, ms, handle: nextHandle++, active: true }
      intervals.push(entry)
      return entry.handle
    },
    clearInterval: (h) => {
      const entry = intervals.find((e) => e.handle === h)
      if (entry) entry.active = false
    },
    now: () => now,
  }

  return {
    scheduler,
    setNow: (ms) => {
      now = ms
    },
    advance: (ms) => {
      const target = now + ms
      // Symulujemy tick-i: dla każdego aktywnego intervala wywołujemy cb co `ms`.
      // Aby wynik był deterministyczny, idziemy step-po-step.
      while (now < target) {
        // Znajdź minimalny czas do najbliższego tick-a wśród aktywnych.
        const active = intervals.filter((i) => i.active)
        if (active.length === 0) {
          now = target
          break
        }
        // Każdy interval ma swój wewnętrzny licznik — uproszczenie: bierzemy `ms` jako stały krok.
        // Tutaj zakładamy że wszystkie aktywne intervale mają ten sam ms (tak jest w countdownTimer).
        const step = Math.min(...active.map((i) => i.ms))
        const nextNow = Math.min(target, now + step)
        now = nextNow
        if (nextNow - (target - ms) >= step) {
          for (const i of [...active]) {
            if (i.active) i.cb()
          }
        }
      }
    },
    intervals,
  }
}

describe('createCountdown', () => {
  it('odlicza tick-i i kończy się timeout-em', () => {
    const { scheduler, advance } = createTestScheduler(0)
    const onTick = vi.fn()
    const onTimeout = vi.fn()

    const cd = createCountdown(1000, 100, scheduler)
    cd.start({ onTick, onTimeout })

    advance(500)
    expect(onTick).toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()

    advance(600)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('odpala onWarning3s gdy zostaje <=3000ms (raz)', () => {
    const { scheduler, advance } = createTestScheduler(0)
    const onTick = vi.fn()
    const onWarning = vi.fn()
    const onTimeout = vi.fn()

    const cd = createCountdown(5000, 100, scheduler)
    cd.start({ onTick, onWarning3s: onWarning, onTimeout })

    advance(1500)
    expect(onWarning).not.toHaveBeenCalled()

    advance(800) // teraz upłynęło 2300ms → remaining = 2700 ≤ 3000
    expect(onWarning).toHaveBeenCalledTimes(1)

    advance(1000) // dalsze tick-i nie odpalają warning ponownie
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('pause/resume nie liczy czasu pauzy', () => {
    const { scheduler, advance, setNow } = createTestScheduler(0)
    const onTick = vi.fn()
    const onTimeout = vi.fn()

    const cd = createCountdown(1000, 100, scheduler)
    cd.start({ onTick, onTimeout })

    advance(400) // remaining ~= 600
    expect(cd.getRemaining()).toBe(600)

    cd.pause()
    setNow(5000) // czas leci, ale countdown pauzowany
    expect(cd.getRemaining()).toBe(600)

    cd.resume()
    advance(400) // teraz remaining ~= 200
    expect(cd.getRemaining()).toBeLessThanOrEqual(200)
    expect(cd.getRemaining()).toBeGreaterThanOrEqual(199)

    advance(300)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('stop() zatrzymuje i nie wywołuje callback-ów', () => {
    const { scheduler, advance } = createTestScheduler(0)
    const onTick = vi.fn()
    const onTimeout = vi.fn()

    const cd = createCountdown(1000, 100, scheduler)
    cd.start({ onTick, onTimeout })
    advance(300)
    cd.stop()
    onTick.mockClear()
    advance(2000)
    expect(onTick).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('getRemaining przed start zwraca durationMs', () => {
    const { scheduler } = createTestScheduler(0)
    const cd = createCountdown(1500, 100, scheduler)
    expect(cd.getRemaining()).toBe(1500)
  })

  it('warning od razu gdy duration <= 3000', () => {
    const { scheduler } = createTestScheduler(0)
    const onWarning = vi.fn()
    const cd = createCountdown(2000, 100, scheduler)
    cd.start({ onTick: () => {}, onWarning3s: onWarning, onTimeout: () => {} })
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('podwójny pause to no-op', () => {
    const { scheduler, advance } = createTestScheduler(0)
    const cd = createCountdown(1000, 100, scheduler)
    cd.start({ onTick: () => {}, onTimeout: () => {} })
    advance(200)
    cd.pause()
    cd.pause() // no-op
    expect(cd.getRemaining()).toBe(800)
  })

  it('resume bez pause to no-op', () => {
    const { scheduler, advance } = createTestScheduler(0)
    const onTimeout = vi.fn()
    const cd = createCountdown(500, 100, scheduler)
    cd.start({ onTick: () => {}, onTimeout })
    cd.resume() // no-op
    advance(600)
    expect(onTimeout).toHaveBeenCalled()
  })
})
