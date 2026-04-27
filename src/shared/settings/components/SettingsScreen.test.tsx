// localStorage polyfill (potrzebny przez persist middleware).
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}
if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  const memStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: memStorage,
    configurable: true,
    writable: true,
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: memStorage,
      configurable: true,
      writable: true,
    })
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const { SettingsScreen } = await import('./SettingsScreen')
const { useSettings } = await import('@/shared/settings/settingsStore')
type MathProblem = import('@/shared/settings/types').MathProblem

const PROBLEM: MathProblem = {
  a: 7,
  b: 8,
  c: 5,
  answer: 10,
  expression: '7 + 8 - 5',
}

const reset = () => {
  localStorage.clear()
  useSettings.getState()._resetForTests()
}

/**
 * Helper — odblokuj bramę przez bezpośrednią mutację store-u
 * (jak gdyby parent gate przeszedł). Używane po sprawdzeniu początkowego
 * stanu (gate widoczny) w innych testach.
 */
function unlock(now: number) {
  useSettings.getState().tryUnlockGate('10', PROBLEM, now)
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    reset()
  })

  it('shows MathGate when not unlocked', () => {
    render(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 0}
      />,
    )
    expect(screen.getByTestId('math-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-screen')).not.toBeInTheDocument()
  })

  it('shows settings list after unlocking', () => {
    unlock(1_000)
    render(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 1_000}
      />,
    )
    expect(screen.getByTestId('settings-screen')).toBeInTheDocument()
    expect(screen.getByTestId('section-active-letters')).toBeInTheDocument()
    expect(screen.getByTestId('section-session-length')).toBeInTheDocument()
  })

  it('persists changes through useSettings store', () => {
    unlock(1_000)
    render(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 1_000}
      />,
    )
    fireEvent.click(screen.getByTestId('session-length-15'))
    expect(useSettings.getState().settings.sessionLength).toBe(15)

    fireEvent.change(screen.getByTestId('celebration-tempo'), {
      target: { value: 'short' },
    })
    expect(useSettings.getState().settings.celebrationTempo).toBe('short')
  })

  it('toggles time limit and shows countdown bar control conditionally', () => {
    unlock(1_000)
    const { rerender } = render(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 1_000}
      />,
    )
    // Domyślnie timeLimit=15 → countdown bar widoczny.
    expect(screen.getByTestId('section-countdown-bar')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('time-limit-off'))
    expect(useSettings.getState().settings.timeLimit).toBe('off')
    rerender(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 1_000}
      />,
    )
    expect(
      screen.queryByTestId('section-countdown-bar'),
    ).not.toBeInTheDocument()
  })

  it('reset button triggers a SECOND fresh math gate', () => {
    unlock(1_000)
    const onResetConfirmed = vi.fn()
    render(
      <SettingsScreen
        onResetConfirmed={onResetConfirmed}
        now={() => 1_000}
      />,
    )
    expect(screen.getByTestId('settings-screen')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('reset-button'))
    // Po kliknięciu reset — gate powinien się pojawić (lockGate został wywołany).
    expect(screen.getByTestId('math-gate')).toBeInTheDocument()
    // Reset jeszcze nie wywołany.
    expect(onResetConfirmed).not.toHaveBeenCalled()
    expect(useSettings.getState().isUnlocked(1_000)).toBe(false)
  })

  it('cancelling the second reset gate returns to the initial unlock gate', () => {
    // Po kliknięciu Reset → SettingsScreen wywołuje lockGate() i pokazuje
    // drugą bramę. Anulowanie tej bramy zostawia stan zalockowany — kolejne
    // wejście do ekranu wymagałoby nowego unlocku. Komponent po prostu
    // wraca do widoku bramy (bo `isUnlocked` zwraca false).
    unlock(1_000)
    const onResetConfirmed = vi.fn()
    render(
      <SettingsScreen
        onResetConfirmed={onResetConfirmed}
        now={() => 1_000}
      />,
    )
    fireEvent.click(screen.getByTestId('reset-button'))
    expect(screen.getByTestId('math-gate')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('math-gate-cancel'))
    // Cofamy resetStage do 'idle', ale gate pozostał zalockowany — więc
    // pierwszy guard `if (!isUnlocked) return <MathGate>` znowu zadziała.
    expect(screen.getByTestId('math-gate')).toBeInTheDocument()
    expect(onResetConfirmed).not.toHaveBeenCalled()
  })

  it('after second gate succeeds and confirmation is given, calls onResetConfirmed', () => {
    unlock(1_000)
    const onResetConfirmed = vi.fn()
    render(
      <SettingsScreen
        onResetConfirmed={onResetConfirmed}
        now={() => 1_000}
      />,
    )
    fireEvent.click(screen.getByTestId('reset-button'))

    // Symulujemy sukces drugiej bramy: parsujemy wyświetlony problem,
    // wpisujemy poprawną odpowiedź, submitujemy form.
    const expr = screen.getByTestId('math-gate-expression').textContent ?? ''
    const m = expr.match(/(\d+)\s*\+\s*(\d+)\s*-\s*(\d+)/)
    expect(m).not.toBeNull()
    const a = Number(m![1])
    const b = Number(m![2])
    const c = Number(m![3])
    const correct = a + b - c

    const input = screen.getByTestId('math-gate-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: String(correct) } })
    expect(input.value).toBe(String(correct))
    const submit = screen.getByTestId('math-gate-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)

    expect(screen.getByTestId('reset-confirm')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('reset-confirm-button'))
    expect(onResetConfirmed).toHaveBeenCalledTimes(1)
  })

  it('updates caseMode per level', () => {
    unlock(1_000)
    render(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 1_000}
      />,
    )
    fireEvent.change(screen.getByTestId('case-mode-iskierka'), {
      target: { value: 'tylko-duze' },
    })
    expect(useSettings.getState().settings.caseMode.iskierka).toBe('tylko-duze')
  })

  it('navigates to ActiveLettersEditor on tile click', () => {
    unlock(1_000)
    render(
      <SettingsScreen
        onResetConfirmed={vi.fn()}
        now={() => 1_000}
      />,
    )
    fireEvent.click(screen.getByTestId('active-letters-tile-iskierka'))
    expect(screen.getByTestId('active-letters-editor')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-screen')).not.toBeInTheDocument()
  })
})
