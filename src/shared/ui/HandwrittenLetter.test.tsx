import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { HandwrittenLetter } from './HandwrittenLetter'

function getSvg(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('SVG not rendered')
  return svg as SVGSVGElement
}

describe('HandwrittenLetter', () => {
  it('renders an SVG with exactly 4 helper lines', () => {
    const { container } = render(<HandwrittenLetter letter="b" />)
    const svg = getSvg(container)
    const lines = svg.querySelectorAll('line')
    expect(lines).toHaveLength(4)
  })

  it('renders the letter as a <text> element with baseline y = size * 0.7', () => {
    const size = 120
    const { container } = render(<HandwrittenLetter letter="b" size={size} />)
    const svg = getSvg(container)
    const text = svg.querySelector('text')
    expect(text).not.toBeNull()
    expect(text?.textContent).toBe('b')
    expect(text?.getAttribute('y')).toBe(String(size * 0.7))
    expect(text?.getAttribute('dominant-baseline')).toBe('alphabetic')
    expect(text?.getAttribute('text-anchor')).toBe('middle')
  })

  it('uses the cursive font-family stack', () => {
    const { container } = render(<HandwrittenLetter letter="b" />)
    const text = getSvg(container).querySelector('text')
    expect(text?.getAttribute('font-family')).toBe('var(--font-handwritten)')
  })

  it('default size=120 yields expected line positions and font-size', () => {
    const { container } = render(<HandwrittenLetter letter="a" />)
    const svg = getSvg(container)
    expect(svg.getAttribute('height')).toBe('120')

    const baseline = svg.querySelector('line[data-line="baseline"]')
    const upperHelper = svg.querySelector('line[data-line="upper-helper"]')
    const top = svg.querySelector('line[data-line="top"]')
    const bottom = svg.querySelector('line[data-line="bottom"]')

    // ratios: top=0, upper-helper=0.3, baseline=0.7, bottom=1.0
    expect(upperHelper?.getAttribute('y1')).toBe(String(120 * 0.3))
    expect(baseline?.getAttribute('y1')).toBe(String(120 * 0.7))
    // top + bottom są przesunięte o pół-grubość żeby kreska nie wychodziła poza SVG
    expect(Number(top?.getAttribute('y1'))).toBeLessThan(2)
    expect(Number(bottom?.getAttribute('y1'))).toBeGreaterThan(118)

    const text = svg.querySelector('text')
    expect(text?.getAttribute('font-size')).toBe(String(120 * 0.7))
  })

  it('renders the upper-helper line with stroke-dasharray', () => {
    const { container } = render(<HandwrittenLetter letter="a" />)
    const svg = getSvg(container)
    const upperHelper = svg.querySelector('line[data-line="upper-helper"]')
    expect(upperHelper?.getAttribute('stroke-dasharray')).toBeTruthy()
  })

  it('renders the baseline as a solid (non-dashed) line', () => {
    const { container } = render(<HandwrittenLetter letter="a" />)
    const baseline = getSvg(container).querySelector('line[data-line="baseline"]')
    expect(baseline?.getAttribute('stroke-dasharray')).toBeNull()
  })

  it('applies custom lineColor to top + bottom lines', () => {
    const { container } = render(<HandwrittenLetter letter="a" lineColor="#123456" />)
    const svg = getSvg(container)
    expect(svg.querySelector('line[data-line="top"]')?.getAttribute('stroke')).toBe('#123456')
    expect(svg.querySelector('line[data-line="bottom"]')?.getAttribute('stroke')).toBe('#123456')
  })

  it('applies custom accentColor to upper-helper + baseline', () => {
    const { container } = render(<HandwrittenLetter letter="a" accentColor="#abcdef" />)
    const svg = getSvg(container)
    expect(svg.querySelector('line[data-line="upper-helper"]')?.getAttribute('stroke')).toBe('#abcdef')
    expect(svg.querySelector('line[data-line="baseline"]')?.getAttribute('stroke')).toBe('#abcdef')
  })

  it('renders a wider SVG for "Bb" pair than for single "B"', () => {
    const single = render(<HandwrittenLetter letter="B" />)
    const pair = render(<HandwrittenLetter letter="Bb" />)
    const wSingle = Number(getSvg(single.container).getAttribute('width'))
    const wPair = Number(getSvg(pair.container).getAttribute('width'))
    expect(wPair).toBeGreaterThan(wSingle)
  })

  it('honors explicit width prop overriding length-based estimate', () => {
    const { container } = render(<HandwrittenLetter letter="B" width={300} />)
    expect(getSvg(container).getAttribute('width')).toBe('300')
  })

  it('renders deterministically for the same props', () => {
    const a = render(<HandwrittenLetter letter="ż" size={80} />)
    const b = render(<HandwrittenLetter letter="ż" size={80} />)
    expect(getSvg(a.container).outerHTML).toBe(getSvg(b.container).outerHTML)
  })
})
