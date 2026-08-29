import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyllableText } from './SyllableText'
import { getSyllableCue } from '@/shared/ui/syllableColors'
import { colors } from '@/app/theme'

// jsdom normalizuje kolory CSS do rgb() niezależnie od zapisu wejściowego —
// porównujemy przez element pomocniczy zamiast parsować hex ręcznie.
function hexToRgb(hex: string): string {
  const el = document.createElement('div')
  el.style.color = hex
  document.body.appendChild(el)
  const rgb = getComputedStyle(el).color
  document.body.removeChild(el)
  return rgb
}

describe('SyllableText — wygaszanie koloru wg boxa', () => {
  it('box 1: pełny kolor palety, brak opacity', () => {
    render(<SyllableText word="MAMA" syllables={['MA', 'MA']} box={1} />)
    const container = screen.getByTestId('syllable-text')
    const first = container.children[0] as HTMLElement
    expect(first.style.color).toBe(hexToRgb(getSyllableCue(0).color))
    expect(first.style.opacity).toBe('')
  })

  it('box 3: przygaszony (opacity 0.55), kolor palety wciąż widoczny', () => {
    render(<SyllableText word="MAMA" syllables={['MA', 'MA']} box={3} />)
    const container = screen.getByTestId('syllable-text')
    const first = container.children[0] as HTMLElement
    expect(first.style.opacity).toBe('0.55')
    expect(first.style.color).toBe(hexToRgb(getSyllableCue(0).color))
  })

  it('box 5: zwykły czarny druk, brak opacity', () => {
    render(<SyllableText word="MAMA" syllables={['MA', 'MA']} box={5} />)
    const container = screen.getByTestId('syllable-text')
    const first = container.children[0] as HTMLElement
    expect(first.style.color).toBe(hexToRgb(colors.text))
    expect(first.style.opacity).toBe('')
  })

  it('brak box: traktowane jak świeże (pełny kolor)', () => {
    render(<SyllableText word="MAMA" syllables={['MA', 'MA']} />)
    const container = screen.getByTestId('syllable-text')
    const first = container.children[0] as HTMLElement
    expect(first.style.color).toBe(hexToRgb(getSyllableCue(0).color))
    expect(first.style.opacity).toBe('')
  })
})
