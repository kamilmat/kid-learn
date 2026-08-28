import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { KidNav } from './KidNav'
import { tapTargets } from '@/app/theme'

function renderNav(props: Parameters<typeof KidNav>[0] = {}) {
  return render(
    <MemoryRouter>
      <KidNav {...props} />
    </MemoryRouter>,
  )
}

/** Renderuje KidNav pod danym URL-em i pokazuje aktualną ścieżkę po nawigacji. */
function renderNavAt(path: string) {
  function Probe() {
    const { pathname } = useLocation()
    return <div data-testid="pathname">{pathname}</div>
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <KidNav />
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
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

  // I11: przy cold starcie z deep-linka (PWA, history.state.idx === 0)
  // navigate(-1) wyszłoby z aplikacji — cofamy się o segment URL-a.
  it('bez historii cofa się o segment URL-a zamiast opuszczać aplikację', () => {
    renderNavAt('/reading/session/plomyk')
    act(() => screen.getByRole('button', { name: 'Wróć' }).click())
    expect(screen.getByTestId('pathname').textContent).toBe('/reading/session')
  })

  it('bez historii z ekranu pierwszego poziomu wraca na Home', () => {
    renderNavAt('/reading')
    act(() => screen.getByRole('button', { name: 'Wróć' }).click())
    expect(screen.getByTestId('pathname').textContent).toBe('/')
  })
})
