import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FeedbackOverlay } from './FeedbackOverlay'
import type { FeedbackState } from '@/modules/letters/types'

function fb(overrides: Partial<FeedbackState> = {}): FeedbackState {
  return {
    variant: 'correct',
    targetLetter: 'b',
    durationMs: 1500,
    ...overrides,
  }
}

describe('FeedbackOverlay — variants', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders correct variant with iskierki burst', () => {
    render(<FeedbackOverlay feedback={fb({ variant: 'correct' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('iskierki-burst')).toBeInTheDocument()
  })

  it('renders mastery variant with Iskra mascot', () => {
    render(<FeedbackOverlay feedback={fb({ variant: 'mastery' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('iskra-mascot')).toBeInTheDocument()
  })

  it('does not render overlay for wrong variant', () => {
    const { container } = render(
      <FeedbackOverlay feedback={fb({ variant: 'wrong' })} onDismiss={vi.fn()} />,
    )
    expect(screen.queryByTestId('feedback-overlay')).not.toBeInTheDocument()
    expect(container.firstChild).toBeNull()
  })

  it('renders dontKnow variant with association', () => {
    render(<FeedbackOverlay feedback={fb({ variant: 'dontKnow' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('feedback-association')).toBeInTheDocument()
  })

  it('renders timeout variant headline', () => {
    render(<FeedbackOverlay feedback={fb({ variant: 'timeout' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('feedback-headline')).toHaveTextContent(
      'Posłuchaj jeszcze raz',
    )
  })

  it('exposes data-variant attribute on the overlay', () => {
    render(<FeedbackOverlay feedback={fb({ variant: 'dontKnow' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('feedback-overlay')).toHaveAttribute(
      'data-variant',
      'dontKnow',
    )
  })

  it('shows the target letter prominently', () => {
    render(<FeedbackOverlay feedback={fb({ targetLetter: 'm' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('feedback-target-letter')).toHaveTextContent('M')
  })

  it('auto-dismisses after durationMs', () => {
    const onDismiss = vi.fn()
    render(
      <FeedbackOverlay feedback={fb({ durationMs: 2000 })} onDismiss={onDismiss} />,
    )
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
