import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { UpdatePrompt } from './UpdatePrompt'
import { setUpdateReady, clearUpdateReady, resetUpdateStateForTests } from './swUpdate'

describe('UpdatePrompt', () => {
  afterEach(() => {
    resetUpdateStateForTests()
  })

  it('nie pokazuje nic, dopóki nie czeka nowa wersja', () => {
    render(<UpdatePrompt />)
    expect(screen.queryByTestId('update-prompt')).toBeNull()
  })

  it('pokazuje ↻, gdy nowa wersja czeka, i przeładowuje po tapie', () => {
    const apply = vi.fn()
    render(<UpdatePrompt />)
    act(() => setUpdateReady(apply))
    const btn = screen.getByTestId('update-prompt')
    act(() => btn.click())
    expect(apply).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('update-prompt')).toBeNull()
  })

  it('znika, gdy aktualizacja weszła sama (powrót na Home)', () => {
    render(<UpdatePrompt />)
    act(() => setUpdateReady(vi.fn()))
    expect(screen.getByTestId('update-prompt')).toBeTruthy()
    act(() => clearUpdateReady())
    expect(screen.queryByTestId('update-prompt')).toBeNull()
  })
})
