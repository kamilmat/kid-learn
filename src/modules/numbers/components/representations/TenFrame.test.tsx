import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TenFrame, lighten } from './TenFrame'

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

  it('struktura 5: pierwsze 5 kropek kolorem A, kolejne kolorem B', () => {
    render(
      <TenFrame count={7} dotColor="#aa0000" dotColorSecond="#00aa00" />,
    )
    const filled = screen.getAllByTestId('tenframe-dot-filled')
    const colorsOf = filled.map((d) => d.style.background)
    expect(colorsOf.slice(0, 5)).toEqual(Array(5).fill('rgb(170, 0, 0)'))
    expect(colorsOf.slice(5)).toEqual(Array(2).fill('rgb(0, 170, 0)'))
  })

  it('fiveStructure={false}: wszystkie kropki jednym kolorem', () => {
    render(
      <TenFrame
        count={7}
        dotColor="#aa0000"
        dotColorSecond="#00aa00"
        fiveStructure={false}
      />,
    )
    const colorsOf = screen
      .getAllByTestId('tenframe-dot-filled')
      .map((d) => d.style.background)
    expect(new Set(colorsOf)).toEqual(new Set(['rgb(170, 0, 0)']))
  })

  it('bez dotColorSecond druga piątka dostaje rozjaśniony dotColor', () => {
    render(<TenFrame count={7} dotColor="#aa0000" />)
    const colorsOf = screen
      .getAllByTestId('tenframe-dot-filled')
      .map((d) => d.style.background)
    expect(colorsOf[0]).toBe('rgb(170, 0, 0)')
    expect(colorsOf[5]).not.toBe(colorsOf[0])
  })

  it('lighten miesza z bielą, a nie-hex zwraca bez zmian', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080')
    expect(lighten('#fff', 0.5)).toBe('#ffffff')
    expect(lighten('rgba(1,2,3,0.5)', 0.25)).toBe('rgba(1,2,3,0.5)')
  })
})
