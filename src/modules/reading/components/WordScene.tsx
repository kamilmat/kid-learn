// WordScene — fullscreen overlay z animowanym emoji + audio dla mini-scenki słów.
// Phase 7: wywołuje onComplete po durationMs, odgrywa sekwencję audio.

import { useEffect, useRef } from 'react'
import type { Scene } from '../data/scenes'
import type { AudioBus } from '@/shared/audio/AudioBus'

type Props = {
  scene: Scene
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onComplete: () => void
}

export function WordScene({ scene, audioBus, onComplete }: Props) {
  const completedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    // Play audio sequence
    const playSeq = async () => {
      for (const audioKey of scene.audio) {
        if (cancelled) break
        try {
          await audioBus.play(audioKey)
        } catch {
          // Missing audio file — log and continue
        }
      }
    }
    void playSeq()

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
  }, [scene, audioBus, onComplete])

  // Inline keyframes via <style> tag (one per scene)
  const keyframesCss = scene.keyframes.map(k => k.css).join('\n')
  const animationName = scene.keyframes[0]?.name
  const animationStyle = animationName
    ? { animation: `${animationName} ${scene.durationMs}ms ease-in-out` }
    : undefined

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
      <style>{keyframesCss}</style>
      <div style={{ fontSize: 200, ...animationStyle }}>
        {scene.emoji}
      </div>
      {scene.effects?.map((effect, i) => (
        <SceneEffect key={i} effect={effect} />
      ))}
    </div>
  )
}

function SceneEffect({ effect }: { effect: string }) {
  if (effect === 'hearts') {
    return (
      <>
        <style>{`@keyframes floatUp { 0% { transform: translateY(20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-100px); opacity: 0; } }`}</style>
        <div style={{ position: 'absolute', top: '50%', left: '40%', fontSize: 32, animation: 'floatUp 1.5s ease-out infinite' }}>💗</div>
        <div style={{ position: 'absolute', top: '50%', left: '55%', fontSize: 32, animation: 'floatUp 1.8s ease-out infinite 0.3s' }}>❤️</div>
      </>
    )
  }
  if (effect === 'stars') {
    return (
      <>
        <style>{`@keyframes sparkle { 0%, 100% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } }`}</style>
        <div style={{ position: 'absolute', top: '30%', left: '30%', fontSize: 28, animation: 'sparkle 1s ease-in-out infinite' }}>⭐</div>
        <div style={{ position: 'absolute', top: '40%', left: '70%', fontSize: 28, animation: 'sparkle 1.2s ease-in-out infinite 0.5s' }}>✨</div>
      </>
    )
  }
  if (effect === 'sparkle') {
    return (
      <>
        <style>{`@keyframes twinkle { 0%, 100% { transform: scale(0.3) rotate(0deg); opacity: 0; } 50% { transform: scale(1) rotate(180deg); opacity: 1; } }`}</style>
        <div style={{ position: 'absolute', top: '25%', left: '25%', fontSize: 32, animation: 'twinkle 1.2s ease-in-out infinite' }}>✨</div>
        <div style={{ position: 'absolute', top: '35%', left: '65%', fontSize: 32, animation: 'twinkle 1.4s ease-in-out infinite 0.4s' }}>💫</div>
        <div style={{ position: 'absolute', top: '65%', left: '45%', fontSize: 28, animation: 'twinkle 1.6s ease-in-out infinite 0.8s' }}>⭐</div>
      </>
    )
  }
  return null
}
