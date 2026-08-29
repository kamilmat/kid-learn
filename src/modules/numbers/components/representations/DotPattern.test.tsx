import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DotPattern } from './DotPattern'

const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

describe('DotPattern', () => {
  it.each(COUNTS)('rysuje dokładnie %i kropek (scattered)', (n) => {
    render(<DotPattern count={n} pattern="scattered" />)
    expect(screen.getAllByTestId('dotpattern-dot')).toHaveLength(n)
  })

  it.each(COUNTS)('rysuje dokładnie %i kropek (dice + fallback powyżej 6)', (n) => {
    render(<DotPattern count={n} />)
    expect(screen.getAllByTestId('dotpattern-dot')).toHaveLength(n)
  })

  // Sampler z odrzuceniem zależy od ziarna — żadne nie może gubić kropek.
  it.each([1, 7, 42, 1234, 99999])('trzyma 10 kropek dla ziarna %i', (seed) => {
    render(<DotPattern count={10} pattern="scattered" seed={seed} />)
    expect(screen.getAllByTestId('dotpattern-dot')).toHaveLength(10)
  })
})
