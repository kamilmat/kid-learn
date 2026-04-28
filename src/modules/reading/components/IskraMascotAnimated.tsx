// IskraMascotAnimated — wraps IskraMascot z animacją wg IskraReaction.
// Używany w SessionView (status bar) i LevelSelect (tap → easter egg).

import { useEffect, useMemo } from 'react'
import { IskraMascot, type IskraState, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { useIskraReactions, type IskraReaction } from '../hooks/useIskraReactions'
import type { AudioBus } from '@/shared/audio/AudioBus'

const COMIC_FAIL_KEYFRAMES: Record<string, { name: string; css: string }> = {
  scratch: {
    name: 'iskraComicScratch',
    css: '@keyframes iskraComicScratch { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(8deg) translateX(-4px); } }',
  },
  eatBanana: {
    name: 'iskraComicEat',
    css: '@keyframes iskraComicEat { 0%, 30% { transform: scale(1); } 50% { transform: scale(1.1) rotate(-5deg); } 100% { transform: scale(1); } }',
  },
  confusionDance: {
    name: 'iskraComicDance',
    css: '@keyframes iskraComicDance { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg) translateY(-5px); } 75% { transform: rotate(10deg) translateY(-5px); } }',
  },
  sigh: {
    name: 'iskraComicSigh',
    css: '@keyframes iskraComicSigh { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.9) translateY(5px); } }',
  },
  sillyFace: {
    name: 'iskraComicSilly',
    css: '@keyframes iskraComicSilly { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.15) rotate(15deg); } }',
  },
}

function reactionToIskraState(reaction: IskraReaction): IskraState {
  switch (reaction.type) {
    case 'success':
    case 'streak':
    case 'easter-egg':
      return 'happy'
    case 'comic-fail':
      return 'surprise'
    case 'wild':
      return 'dance'
    case 'idle':
    default:
      return 'idle'
  }
}

type Props = {
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
  size?: number
  intensity?: IskraIntensity
  enableEasterEggsOnTap?: boolean
  reactionsHook?: ReturnType<typeof useIskraReactions>   // injected for shared state
}

export function IskraMascotAnimated({
  audioBus,
  size = 80,
  intensity = 'spark',
  enableEasterEggsOnTap = false,
  reactionsHook,
}: Props) {
  const internal = useIskraReactions()
  const { reaction, triggerEasterEgg } = reactionsHook ?? internal

  // Play audio when easter egg fires
  useEffect(() => {
    if (reaction.type === 'easter-egg' && audioBus) {
      void audioBus.play(reaction.egg.audio)
    }
  }, [reaction, audioBus])

  // Determine animation overlay + keyframes CSS for egg / comic-fail
  const { animationStyle, keyframesCss } = useMemo(() => {
    if (reaction.type === 'easter-egg') {
      return {
        animationStyle: { animation: `${reaction.egg.animation.name} ${reaction.egg.durationMs}ms ease-in-out` },
        keyframesCss: reaction.egg.animation.css,
      }
    }
    if (reaction.type === 'comic-fail') {
      const kf = COMIC_FAIL_KEYFRAMES[reaction.variant]
      if (kf) {
        return {
          animationStyle: { animation: `${kf.name} 1000ms ease-in-out` },
          keyframesCss: kf.css,
        }
      }
    }
    return { animationStyle: undefined, keyframesCss: '' }
  }, [reaction])

  const handleTap = enableEasterEggsOnTap ? triggerEasterEgg : () => {}
  const tapHandlers = useTapHandler({ onTap: handleTap })

  const iskraState = reactionToIskraState(reaction)

  return (
    <>
      {keyframesCss && <style>{keyframesCss}</style>}
      <div
        {...tapHandlers}
        data-testid="iskra-mascot-animated"
        style={{
          display: 'inline-block',
          cursor: enableEasterEggsOnTap ? 'pointer' : 'default',
          ...animationStyle,
        }}
      >
        <IskraMascot size={size} state={iskraState} intensity={intensity} />
      </div>
    </>
  )
}
