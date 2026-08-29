// WordScene — fullscreen overlay z animowanym emoji + audio dla mini-scenki słów.
// Phase 7: wywołuje onComplete po durationMs, odgrywa sekwencję audio.

import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Scene } from '../data/scenes'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { BlendState } from '../hooks/useReadingSession'
import { BlendRow } from './BlendRow'
import { useReducedMotion } from '@/shared/ui/useReducedMotion'

type Props = {
  scene: Scene
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onComplete: () => void
  /** Krok syntezy leci dalej, gdy scenka zasłania FeedbackOverlay. */
  blend?: BlendState | null
  /**
   * Ref przeżywający remount: pauza chowa scenkę, wznowienie montuje ją na nowo
   * — a wtedy klip słowa wpadał do FIFO DRUGI raz, między „Składamy:" a pierwszą
   * sylabą. Trzyma id scenki, której audio już poszło. Bez propa scenka pilnuje
   * się tylko w obrębie jednego mountu (własny ref).
   */
  playedRef?: MutableRefObject<string | null>
  /**
   * Oddaje obietnicę sekwencji audio scenki — `resume()` czeka na nią, zanim
   * zacznie składanie. Przy pominiętym audio (już grało) to gotowa obietnica.
   */
  onAudioSequence?: (audio: Promise<void>) => void
}

export function WordScene({
  scene,
  audioBus,
  onComplete,
  blend = null,
  playedRef,
  onAudioSequence,
}: Props) {
  const completedRef = useRef(false)
  const ownPlayedRef = useRef<string | null>(null)
  const effectivePlayedRef = playedRef ?? ownPlayedRef
  const reduced = useReducedMotion()

  useEffect(() => {
    let cancelled = false

    const alreadyPlayed = effectivePlayedRef.current === scene.id

    // Play audio sequence. Stamp playedRef only once the sequence actually
    // completes (not cancelled) — a StrictMode phantom first run gets
    // cancelled before it finishes, so it must NOT stamp the ref, otherwise
    // the real second run would see `alreadyPlayed === true` and skip audio.
    // The leading microtask yield matters too: StrictMode's mount → cleanup
    // → remount cycle runs synchronously, so without the yield the phantom
    // run would already call audioBus.play() before its own cleanup flips
    // `cancelled` — this way it bails out before ever touching the bus.
    const playSeq = async () => {
      await Promise.resolve()
      if (cancelled) return
      for (const audioKey of scene.audio) {
        if (cancelled) break
        try {
          await audioBus.play(audioKey)
        } catch {
          // Missing audio file — log and continue
        }
      }
      if (!cancelled) {
        effectivePlayedRef.current = scene.id
      }
    }
    const audioDone = alreadyPlayed ? Promise.resolve() : playSeq()
    onAudioSequence?.(audioDone)
    void audioDone

    // Auto-dismiss timer
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, scene.durationMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [scene, audioBus, onComplete, effectivePlayedRef, onAudioSequence])

  // Inline keyframes via <style> tag (one per scene) — skipped entirely when
  // reduced, so the emoji simply sits static at its resting layout position.
  const keyframesCss = scene.keyframes.map(k => k.css).join('\n')
  const animationName = scene.keyframes[0]?.name
  const animationStyle = !reduced && animationName
    ? { animation: `${animationName} ${scene.durationMs}ms ease-in-out` }
    : { transition: 'none' }

  return (
    <div
      data-testid="word-scene"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(254, 249, 242, 0.95)',
        zIndex: 1000,
        gap: 16,
      }}
    >
      {!reduced && <style>{keyframesCss}</style>}
      <div style={{ fontSize: 200, ...animationStyle }}>
        {scene.emoji}
      </div>
      {blend !== null && <BlendRow blend={blend} />}
      {scene.effects?.map((effect, i) => (
        <SceneEffect key={i} effect={effect} reduced={reduced} />
      ))}
    </div>
  )
}

function SceneEffect({ effect, reduced }: { effect: string; reduced: boolean }) {
  if (effect === 'hearts') {
    return (
      <>
        {!reduced && <style>{`@keyframes floatUp { 0% { transform: translateY(20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-100px); opacity: 0; } }`}</style>}
        <div style={{ position: 'absolute', top: '50%', left: '40%', fontSize: 32, transition: 'none', ...(reduced ? {} : { animation: 'floatUp 1.5s ease-out infinite' }) }}>💗</div>
        <div style={{ position: 'absolute', top: '50%', left: '55%', fontSize: 32, transition: 'none', ...(reduced ? {} : { animation: 'floatUp 1.8s ease-out infinite 0.3s' }) }}>❤️</div>
      </>
    )
  }
  if (effect === 'stars') {
    return (
      <>
        {!reduced && <style>{`@keyframes sparkle { 0%, 100% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } }`}</style>}
        <div style={{ position: 'absolute', top: '30%', left: '30%', fontSize: 28, transition: 'none', ...(reduced ? {} : { animation: 'sparkle 1s ease-in-out infinite' }) }}>⭐</div>
        <div style={{ position: 'absolute', top: '40%', left: '70%', fontSize: 28, transition: 'none', ...(reduced ? {} : { animation: 'sparkle 1.2s ease-in-out infinite 0.5s' }) }}>✨</div>
      </>
    )
  }
  if (effect === 'sparkle') {
    return (
      <>
        {!reduced && <style>{`@keyframes twinkle { 0%, 100% { transform: scale(0.3) rotate(0deg); opacity: 0; } 50% { transform: scale(1) rotate(180deg); opacity: 1; } }`}</style>}
        <div style={{ position: 'absolute', top: '25%', left: '25%', fontSize: 32, transition: 'none', ...(reduced ? {} : { animation: 'twinkle 1.2s ease-in-out infinite' }) }}>✨</div>
        <div style={{ position: 'absolute', top: '35%', left: '65%', fontSize: 32, transition: 'none', ...(reduced ? {} : { animation: 'twinkle 1.4s ease-in-out infinite 0.4s' }) }}>💫</div>
        <div style={{ position: 'absolute', top: '65%', left: '45%', fontSize: 28, transition: 'none', ...(reduced ? {} : { animation: 'twinkle 1.6s ease-in-out infinite 0.8s' }) }}>⭐</div>
      </>
    )
  }
  return null
}
