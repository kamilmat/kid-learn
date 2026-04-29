import type { AudioBus } from '@/shared/audio/AudioBus'
import type { ConceptId } from '../../types'
import { CONCEPTS } from '../../data/concepts'
import { IntroFrame } from './IntroFrame'
import { INTRO_ANIMATIONS } from './animations'

type Props = {
  conceptId: ConceptId
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onContinue: () => void
}

export function ConceptIntro({ conceptId, audioBus, onContinue }: Props) {
  const def = CONCEPTS[conceptId]
  const Animation = INTRO_ANIMATIONS[conceptId]
  return (
    <IntroFrame
      introAudioKey={def.introAudioKey}
      audioBus={audioBus}
      onContinue={onContinue}
      Animation={Animation}
    />
  )
}
