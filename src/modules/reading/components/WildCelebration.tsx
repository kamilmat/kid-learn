import { useEffect, useRef } from 'react'
import type { WildCelebrationDef } from '../data/wildCelebrations'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useReducedMotion } from '@/shared/ui/useReducedMotion'

type Props = {
  def: WildCelebrationDef
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onComplete: () => void
}

const STATIC_EMOJI: Record<string, string> = {
  rocket: '🚀',
  fruits: '🍎',
  flip: '✨',
  avocado: '🥑',
  rainbow: '🌈',
}

export function WildCelebration({ def, audioBus, onComplete }: Props) {
  const completedRef = useRef(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    let cancelled = false

    const playAudio = async () => {
      for (const key of def.audio) {
        if (cancelled) break
        try {
          await audioBus.play(key)
        } catch {
          // Missing audio — log silently
        }
      }
    }
    void playAudio()

    return () => { cancelled = true }
  }, [def, audioBus])

  const handleComplete = () => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }

  useEffect(() => {
    if (!reduced) return
    const t = setTimeout(handleComplete, def.durationMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, def])

  if (reduced) {
    return (
      <div
        data-testid="wild-static"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1500,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(254, 249, 242, 0.9)',
          fontSize: 140,
        }}
      >
        {STATIC_EMOJI[def.id] ?? '⭐'}
      </div>
    )
  }

  return <def.Component onComplete={handleComplete} />
}
