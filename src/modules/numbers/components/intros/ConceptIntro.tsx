import { useEffect, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'
import type { ConceptId } from '../../types'
import { CONCEPTS } from '../../data/concepts'

type Props = {
  conceptId: ConceptId
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onContinue: () => void
}

export function ConceptIntro({ conceptId, audioBus, onContinue }: Props) {
  const def = CONCEPTS[conceptId]
  const [audioFinished, setAudioFinished] = useState(false)
  const tap = useTapHandler({ onTap: onContinue })

  useEffect(() => {
    audioBus.stop()
    void audioBus.play(def.introAudioKey)
    // Fallback timer — po 4s pozwól kliknąć dalej nawet jeśli audio nie skończyło
    const t = setTimeout(() => setAudioFinished(true), 4000)
    return () => clearTimeout(t)
  }, [audioBus, def.introAudioKey])

  return (
    <div
      data-testid={`concept-intro-${conceptId}`}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 32,
      }}
    >
      <div style={{ fontSize: 120 }} aria-hidden="true">
        💡
      </div>
      <button
        type="button"
        data-testid="concept-intro-continue"
        aria-label="Dalej"
        {...tap}
        disabled={!audioFinished}
        style={{
          minHeight: 72,
          minWidth: 200,
          padding: '0 32px',
          borderRadius: radii.kid,
          background: audioFinished ? colors.accentBlue : '#cbd5e1',
          color: '#fff',
          border: 'none',
          fontSize: 32,
          fontFamily: 'var(--font-handwritten)',
          cursor: audioFinished ? 'pointer' : 'not-allowed',
          opacity: audioFinished ? 1 : 0.5,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        →
      </button>
    </div>
  )
}
