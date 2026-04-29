import { useEffect, useRef, useState, type ComponentType } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

export type Scene = { stage: number; offsetMs: number }

export type IntroAnimation = ComponentType<{ stage: number }> & {
  SCENES: readonly Scene[]
}

type Props = {
  introAudioKey: string
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onContinue: () => void
  Animation: IntroAnimation
}

const FALLBACK_FINISH_MS = 4000

export function IntroFrame({ introAudioKey, audioBus, onContinue, Animation }: Props) {
  const [stage, setStage] = useState(0)
  const [audioFinished, setAudioFinished] = useState(false)
  const tap = useTapHandler({ onTap: onContinue })
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    audioBus.stop()
    const fallback = window.setTimeout(
      () => setAudioFinished(true),
      FALLBACK_FINISH_MS,
    )
    timeoutsRef.current.push(fallback)

    audioBus
      .play(introAudioKey)
      .then(() => setAudioFinished(true))
      .catch(() => setAudioFinished(true))

    for (const scene of Animation.SCENES) {
      const id = window.setTimeout(() => setStage(scene.stage), scene.offsetMs)
      timeoutsRef.current.push(id)
    }

    return () => {
      for (const id of timeoutsRef.current) window.clearTimeout(id)
      timeoutsRef.current = []
    }
  }, [audioBus, introAudioKey, Animation])

  return (
    <div
      data-testid="intro-frame"
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
      <div
        data-testid="intro-animation-host"
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Animation stage={stage} />
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
