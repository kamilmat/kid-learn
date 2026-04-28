import { useEffect, useRef } from 'react'
import type { WildCelebrationDef } from '../data/wildCelebrations'
import type { AudioBus } from '@/shared/audio/AudioBus'

type Props = {
  def: WildCelebrationDef
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onComplete: () => void
}

export function WildCelebration({ def, audioBus, onComplete }: Props) {
  const completedRef = useRef(false)

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

  return <def.Component onComplete={handleComplete} />
}
