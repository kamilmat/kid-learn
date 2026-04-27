// localStorage polyfill (potrzebny przez persist middleware w settingsStore).
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

const { ActiveLettersEditor } = await import('./ActiveLettersEditor')
const { useSettings } = await import('@/shared/settings/settingsStore')
const { POLISH_ALPHABET } = await import('@/modules/letters/data/alphabet')
const { levelLetterPools } = await import('@/shared/settings/defaults')

const reset = () => {
  localStorage.clear()
  useSettings.getState()._resetForTests()
}

describe('ActiveLettersEditor', () => {
  beforeEach(() => {
    reset()
  })

  it('renders all 32 polish letters as a grid', () => {
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByTestId('letters-grid')).toBeInTheDocument()
    for (const letter of POLISH_ALPHABET) {
      expect(screen.getByTestId(`letter-row-${letter}`)).toBeInTheDocument()
    }
  })

  it('initially selects level pool when no override exists', () => {
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    for (const letter of levelLetterPools.iskierka) {
      const cb = screen.getByTestId(
        `letter-checkbox-${letter}`,
      ) as HTMLInputElement
      expect(cb.checked).toBe(true)
    }
    // Litery spoza puli iskierki mają być odznaczone i disabled.
    const outOfPool = POLISH_ALPHABET.filter(
      (l) => !levelLetterPools.iskierka.includes(l),
    )
    for (const letter of outOfPool) {
      const cb = screen.getByTestId(
        `letter-checkbox-${letter}`,
      ) as HTMLInputElement
      expect(cb.checked).toBe(false)
      expect(cb.disabled).toBe(true)
    }
  })

  it('initially selects override when present', () => {
    useSettings.getState().updateSetting('activeLettersOverride', {
      iskierka: ['a', 'm', 'l', 'e'],
    })
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      (screen.getByTestId('letter-checkbox-a') as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (screen.getByTestId('letter-checkbox-m') as HTMLInputElement).checked,
    ).toBe(true)
    // 'o' i 't' są w puli ale nie w override → odznaczone.
    expect(
      (screen.getByTestId('letter-checkbox-o') as HTMLInputElement).checked,
    ).toBe(false)
    expect(
      (screen.getByTestId('letter-checkbox-t') as HTMLInputElement).checked,
    ).toBe(false)
  })

  it('toggles selection on click', () => {
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const cb = screen.getByTestId('letter-checkbox-a') as HTMLInputElement
    expect(cb.checked).toBe(true)
    fireEvent.click(cb)
    expect(cb.checked).toBe(false)
    fireEvent.click(cb)
    expect(cb.checked).toBe(true)
  })

  it('shows error and does NOT save when fewer than 4 letters selected', () => {
    const onSave = vi.fn()
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    // Odznacz wszystkie aktualnie zaznaczone (pula ma 6).
    for (const letter of levelLetterPools.iskierka) {
      fireEvent.click(screen.getByTestId(`letter-checkbox-${letter}`))
    }
    // Zaznacz tylko 3.
    fireEvent.click(screen.getByTestId('letter-checkbox-a'))
    fireEvent.click(screen.getByTestId('letter-checkbox-m'))
    fireEvent.click(screen.getByTestId('letter-checkbox-l'))
    fireEvent.click(screen.getByTestId('active-letters-save'))

    expect(screen.getByTestId('active-letters-error')).toHaveTextContent(
      /Wybierz co najmniej 4/,
    )
    expect(onSave).not.toHaveBeenCalled()
    // Override nie został ustawiony.
    expect(
      useSettings.getState().settings.activeLettersOverride.iskierka,
    ).toBeUndefined()
  })

  it('saves and calls onSave with sorted-unique letters when ≥4 selected', () => {
    const onSave = vi.fn<(letters: string[]) => void>()
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    // Pula iskierki ma 6 — zostawmy 4.
    fireEvent.click(screen.getByTestId('letter-checkbox-o')) // odznacz
    fireEvent.click(screen.getByTestId('letter-checkbox-t')) // odznacz
    fireEvent.click(screen.getByTestId('active-letters-save'))

    expect(onSave).toHaveBeenCalledTimes(1)
    const arg = onSave.mock.calls[0]![0]
    expect(arg.length).toBe(4)
    expect(new Set(arg)).toEqual(new Set(['a', 'm', 'l', 'e']))
    // Override został zapisany w store.
    expect(
      useSettings.getState().settings.activeLettersOverride.iskierka,
    ).toEqual(arg)
  })

  it('cancel calls onCancel without persisting', () => {
    const onCancel = vi.fn()
    render(
      <ActiveLettersEditor
        level="iskierka"
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByTestId('letter-checkbox-a'))
    fireEvent.click(screen.getByTestId('active-letters-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(
      useSettings.getState().settings.activeLettersOverride.iskierka,
    ).toBeUndefined()
  })
})
