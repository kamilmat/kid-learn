import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TenFrame } from './TenFrame'

describe('TenFrame', () => {
  it('renders 10 cells when count=0', () => {
    render(<TenFrame count={0} />)
    const cells = screen.getAllByTestId('tenframe-cell')
    expect(cells).toHaveLength(10)
  })

  it('marks first 7 cells as filled when count=7', () => {
    render(<TenFrame count={7} />)
    const filled = screen.getAllByTestId('tenframe-dot-filled')
    expect(filled).toHaveLength(7)
  })

  it('renders 2 frames (20 cells) when count >10', () => {
    render(<TenFrame count={13} />)
    const cells = screen.getAllByTestId('tenframe-cell')
    expect(cells).toHaveLength(20)
  })

  it('clamps count to 0-20', () => {
    render(<TenFrame count={25} />)
    const filled = screen.getAllByTestId('tenframe-dot-filled')
    expect(filled).toHaveLength(20)
  })
})
