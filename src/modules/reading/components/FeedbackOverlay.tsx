// FeedbackOverlay — overlay po odpowiedzi w module czytania.
// Phase 6.6.1: warianty correct / wrong / dontKnow / wild. Dumb component.

import { useTapHandler } from '@/shared/ui/useTapHandler'
import type { FeedbackVariant } from '../hooks/useReadingSession'

export type FeedbackOverlayProps = {
  variant: NonNullable<FeedbackVariant>
  onSkip: () => void
}

type VariantConfig = {
  background: string
  icon: string
  headline: string
}

function configFor(variant: NonNullable<FeedbackVariant>): VariantConfig {
  switch (variant) {
    case 'correct':
      return { background: 'rgba(16, 185, 129, 0.88)', icon: '✅', headline: 'Brawo!' }
    case 'wrong':
      return { background: 'rgba(245, 158, 11, 0.88)', icon: '❌', headline: 'Spróbuj jeszcze raz' }
    case 'dontKnow':
      return { background: 'rgba(45, 45, 51, 0.90)', icon: '🤷', headline: 'Nie szkodzi' }
    case 'wild':
      return {
        background:
          'linear-gradient(135deg, #f43f5e88 0%, #a855f788 33%, #3b82f688 66%, #10b98188 100%)',
        icon: '🎉',
        headline: 'ŁAAŁ!',
      }
  }
}

export function FeedbackOverlay({ variant, onSkip }: FeedbackOverlayProps) {
  const cfg = configFor(variant)
  const tapHandlers = useTapHandler({ onTap: onSkip })

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
      <div
        data-testid="feedback-headline"
        style={{ fontSize: 36, fontWeight: 700 }}
      >
        {cfg.headline}
      </div>
      {variant === 'correct' && (
        <div aria-hidden="true" style={{ fontSize: 48 }}>
          ✨ ✨ ✨
        </div>
      )}
      <div
        style={{
          marginTop: 24,
          fontSize: 18,
          opacity: 0.8,
        }}
      >
        Dotknij żeby kontynuować
      </div>
    </div>
  )
}
