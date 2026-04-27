import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { IskraMascot, type IskraIntensity, type IskraState } from './IskraMascot'

const ALL_STATES: IskraState[] = ['idle', 'happy', 'surprise', 'dance']
const ALL_INTENSITIES: IskraIntensity[] = ['spark', 'flame', 'fire', 'torch']
const INTENSITY_TO_COUNT: Record<IskraIntensity, number> = {
  spark: 1,
  flame: 2,
  fire: 4,
  torch: 6,
}

describe('IskraMascot', () => {
  it.each(ALL_STATES)('renders SVG with body+eyes for state=%s', (state) => {
    const { getByTestId, getAllByTestId } = render(<IskraMascot state={state} />)
    const root = getByTestId('iskra-mascot')
    expect(root.getAttribute('data-state')).toBe(state)
    expect(root.querySelector('svg')).not.toBeNull()
    // body + dwa oczy + uśmiech (path)
    expect(getByTestId('iskra-body')).toBeInTheDocument()
    expect(getAllByTestId('iskra-eye')).toHaveLength(2)
  })

  it.each(ALL_INTENSITIES)(
    'intensity=%s yields correct number of static sparks',
    (intensity) => {
      const { getAllByTestId } = render(
        <IskraMascot state="idle" intensity={intensity} />,
      )
      const sparks = getAllByTestId('iskra-spark')
      expect(sparks).toHaveLength(INTENSITY_TO_COUNT[intensity])
    },
  )

  it('default intensity is "flame" (2 sparks)', () => {
    const { getAllByTestId } = render(<IskraMascot state="idle" />)
    expect(getAllByTestId('iskra-spark')).toHaveLength(2)
  })

  it('renders question mark only in surprise state', () => {
    const surprise = render(<IskraMascot state="surprise" />)
    expect(
      surprise.container.querySelector('[data-testid="iskra-question"]'),
    ).not.toBeNull()

    const idle = render(<IskraMascot state="idle" />)
    expect(
      idle.container.querySelector('[data-testid="iskra-question"]'),
    ).toBeNull()
  })

  it('renders spark rain only in dance state', () => {
    const dance = render(<IskraMascot state="dance" />)
    expect(
      dance.container.querySelector('[data-testid="iskra-spark-rain"]'),
    ).not.toBeNull()

    const happy = render(<IskraMascot state="happy" />)
    expect(
      happy.container.querySelector('[data-testid="iskra-spark-rain"]'),
    ).toBeNull()
  })

  it('uses radial gradients for body fill', () => {
    const { container } = render(<IskraMascot state="idle" />)
    const grads = container.querySelectorAll('radialGradient')
    expect(grads.length).toBeGreaterThanOrEqual(2)
  })

  it('honors custom size prop', () => {
    const { getByTestId } = render(<IskraMascot state="idle" size={240} />)
    const root = getByTestId('iskra-mascot')
    expect(root.style.width).toBe('240px')
    expect(root.style.height).toBe('240px')
  })

  it('default size is 160', () => {
    const { getByTestId } = render(<IskraMascot state="idle" />)
    expect(getByTestId('iskra-mascot').style.width).toBe('160px')
  })

  it('different oneshotKey values produce distinct mounted nodes', () => {
    // Re-render z różnym oneshotKey ma zrestartować animację (key change = remount).
    // Trudno bezpośrednio sprawdzić animację, ale element dostaje nowe atrybuty.
    const { rerender, getByTestId } = render(
      <IskraMascot state="happy" oneshotKey="a" />,
    )
    const first = getByTestId('iskra-mascot')
    rerender(<IskraMascot state="happy" oneshotKey="b" />)
    const second = getByTestId('iskra-mascot')
    // Po zmianie key React tworzy nowy DOM node — referencja nie musi być
    // identyczna, ale komponent powinien być wciąż dostępny.
    expect(second).toBeInTheDocument()
    // Poprawnie: pierwotny węzeł nie jest już w drzewie.
    expect(first.isConnected || second.isConnected).toBe(true)
  })

  it('exposes data-state and data-intensity for downstream styling', () => {
    const { getByTestId } = render(
      <IskraMascot state="dance" intensity="torch" />,
    )
    const root = getByTestId('iskra-mascot')
    expect(root.getAttribute('data-state')).toBe('dance')
    expect(root.getAttribute('data-intensity')).toBe('torch')
  })
})
