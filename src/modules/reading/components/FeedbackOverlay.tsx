// FeedbackOverlay — overlay po odpowiedzi w module czytania.
// Phase 6.6.1: warianty correct / wrong / dontKnow / wild.
//
// Zamyka się sam gdy kolejka audio feedbacku wybrzmi (i minie MIN_FEEDBACK_MS),
// tap w overlay skraca czekanie. Bez auto-dismiss ekran potrafił stać w
// nieskończoność — dziecko nie umie przeczytać "Dotknij żeby kontynuować",
// więc zamiast prozy jest ikona (👉 + maskotka) i cue audio przy tapie.

import { useEffect, useRef } from 'react'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import type { IskraState } from '@/shared/ui/IskraMascot'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { MIN_FEEDBACK_MS } from '../hooks/useReadingSession'
import type { FeedbackVariant } from '../hooks/useReadingSession'

export type FeedbackOverlayProps = {
  variant: NonNullable<FeedbackVariant>
  /** `viaTap=true` gdy dziecko tapnęło; `false` przy auto-advance. */
  onSkip: (viaTap: boolean) => void
  /** Rozwiązuje się gdy audio feedbacku wybrzmiało. Brak = tylko minimalny czas. */
  waitForAudio?: () => Promise<void>
  /** Wstrzymuje auto-advance (pauza) — po wznowieniu odliczanie startuje od nowa. */
  paused?: boolean
  minDurationMs?: number
}

type VariantConfig = {
  background: string
  icon: string
  mascot: IskraState
}

function configFor(variant: NonNullable<FeedbackVariant>): VariantConfig {
  switch (variant) {
    case 'correct':
      return { background: 'rgba(16, 185, 129, 0.88)', icon: '✅', mascot: 'happy' }
    case 'wrong':
      return { background: 'rgba(245, 158, 11, 0.88)', icon: '👂', mascot: 'surprise' }
    case 'dontKnow':
      return { background: 'rgba(45, 45, 51, 0.90)', icon: '🤷', mascot: 'idle' }
    case 'wild':
      return {
        background:
          'linear-gradient(135deg, #f43f5e88 0%, #a855f788 33%, #3b82f688 66%, #10b98188 100%)',
        icon: '🎉',
        mascot: 'dance',
      }
  }
}

export function FeedbackOverlay({
  variant,
  onSkip,
  waitForAudio,
  paused = false,
  minDurationMs = MIN_FEEDBACK_MS,
}: FeedbackOverlayProps) {
  const cfg = configFor(variant)
  const tapHandlers = useTapHandler({ onTap: () => onSkip(true) })

  // Refy zamiast deps: `onSkip`/`waitForAudio` z hooka nie są stabilne między
  // renderami, a przeładowanie efektu restartowałoby odliczanie w kółko.
  const onSkipRef = useRef(onSkip)
  onSkipRef.current = onSkip
  const waitRef = useRef(waitForAudio)
  waitRef.current = waitForAudio

  useEffect(() => {
    if (paused) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const audioDone = waitRef.current?.() ?? Promise.resolve()
    const minElapsed = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, minDurationMs)
    })
    void Promise.all([audioDone, minElapsed]).then(() => {
      if (!cancelled) onSkipRef.current(false)
    })
    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [variant, paused, minDurationMs])

  return (
    <div
      data-testid="reading-feedback-overlay"
      data-variant={variant}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: cfg.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        color: '#ffffff',
        textAlign: 'center',
        padding: 24,
        cursor: 'pointer',
      }}
      {...tapHandlers}
    >
      <div aria-hidden="true" style={{ fontSize: 96, lineHeight: 1 }}>
        {cfg.icon}
      </div>
      <IskraMascot size={96} state={cfg.mascot} intensity={variant === 'wild' ? 'torch' : 'flame'} />
      {variant === 'correct' && (
        <div aria-hidden="true" style={{ fontSize: 48 }}>
          ✨ ✨ ✨
        </div>
      )}
      {/* Zamiast prozy "Dotknij żeby kontynuować" — ikona afordancji tapu */}
      <div
        data-testid="feedback-continue-hint"
        aria-hidden="true"
        style={{ marginTop: 16, fontSize: 40, opacity: 0.85 }}
      >
        👉 ▶
      </div>
    </div>
  )
}
