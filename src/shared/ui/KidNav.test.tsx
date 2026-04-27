import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { KidNav } from './KidNav'
import { tapTargets } from '@/app/theme'

function renderNav(props: Parameters<typeof KidNav>[0] = {}) {
  return render(
    <MemoryRouter>
      <KidNav {...props} />
    </MemoryRouter>,
  )
}

describe('KidNav', () => {
  it('renders two icon-only buttons each at least 60x60', () => {
    renderNav()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.style.width).toBe(`${tapTargets.minSize}px`)
      expect(button.style.height).toBe(`${tapTargets.minSize}px`)
    }
  })

  it('exposes back and home with accessible labels but no visible text', () => {
    renderNav()
    expect(screen.getByRole('button', { name: 'Wróć' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strona główna' })).toBeInTheDocument()
  })

  it('invokes onBack override when provided', () => {
    const onBack = vi.fn()
    renderNav({ onBack })
    screen.getByRole('button', { name: 'Wróć' }).click()
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
