import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FeedbackOverlay } from './FeedbackOverlay'

describe('FeedbackOverlay (moduł czytania)', () => {
  it('auto-advance po wybrzmieniu audio i minimalnym czasie', async () => {
    const onSkip = vi.fn()
    let resolveAudio: () => void = () => {}
    const audioDone = new Promise<void>((r) => { resolveAudio = r })

    render(
      <FeedbackOverlay
        variant="correct"
        onSkip={onSkip}
        waitForAudio={() => audioDone}
        minDurationMs={5}
      />,
    )

    // audio jeszcze gra — nie przechodzimy dalej mimo upływu minimalnego czasu
    await new Promise((r) => setTimeout(r, 20))
    expect(onSkip).not.toHaveBeenCalled()

    resolveAudio()
    await waitFor(() => expect(onSkip).toHaveBeenCalledWith(false))
  })

  it('tap w overlay przechodzi dalej z viaTap=true', () => {
    const onSkip = vi.fn()
    render(
      <FeedbackOverlay
        variant="wrong"
        onSkip={onSkip}
        waitForAudio={() => new Promise(() => {})}
        minDurationMs={5}
      />,
    )
    screen.getByTestId('reading-feedback-overlay').click()
    expect(onSkip).toHaveBeenCalledWith(true)
  })

  it('pauza wstrzymuje auto-advance', async () => {
    const onSkip = vi.fn()
    render(
      <FeedbackOverlay
        variant="dontKnow"
        onSkip={onSkip}
        waitForAudio={() => Promise.resolve()}
        minDurationMs={5}
        paused
      />,
    )
    await new Promise((r) => setTimeout(r, 30))
    expect(onSkip).not.toHaveBeenCalled()
  })

  it('brak prozy do czytania — zamiast niej ikona afordancji', () => {
    render(<FeedbackOverlay variant="wrong" onSkip={vi.fn()} minDurationMs={100000} />)
    expect(screen.getByTestId('feedback-continue-hint')).toBeInTheDocument()
    expect(screen.queryByText(/Dotknij/i)).toBeNull()
  })
})
