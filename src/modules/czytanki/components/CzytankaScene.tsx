import { useLayoutEffect, useRef, useState } from 'react'
import type { AnimationEvent } from 'react'
import type { Actor, SceneSpec } from '../data/types'
import { SceneBackground } from './backgrounds'
import './scene.css'

// Wysokość sceny, dla której dobrane są rozmiary aktorów w danych (grupa 1
// w landscape). Niższa scena (grupy 3–4, portrait) skaluje emoji w dół, bo
// rozmiary w danych są w px i inaczej aktorzy wychodziliby poza kadr.
const REFERENCE_HEIGHT = 246
const MIN_SCALE = 0.5
const MAX_SCALE = 1.15

// Kilka aktorów w danych ma x do 98 — z translate(-50%) ucinałoby je na krawędzi.
// Dolne 54% zostaje wolne dla paska przycisków (🗣 🔊 🐢 KO|TA A|B ❓), który
// leży NA scenie. Clampujemy pozycję renderowania, dane zostają nietknięte.
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function SceneActor({ actor, scale }: { actor: Actor; scale: number }) {
  const [poke, setPoke] = useState(false)
  const left = clamp(actor.x, 12, 86)
  const top = clamp(actor.y, 12, 46)
  return (
    <div
      className={`cz-actor cz-anim-${actor.anim}${poke ? ' poke' : ''}`}
      style={{ left: `${left}%`, top: `${top}%`, fontSize: Math.round(actor.size * scale), touchAction: 'manipulation' }}
      onPointerDown={() => setPoke(true)}
      aria-hidden="true"
    >
      <span
        className="cz-actor-inner"
        style={{ animationDelay: poke ? '0s' : `${actor.delay ?? 0}s` }}
        onAnimationEnd={(e: AnimationEvent<HTMLSpanElement>) => {
          if (e.animationName === 'cz-poke') setPoke(false)
        }}
      >
        {actor.emoji}
      </span>
    </div>
  )
}

export function CzytankaScene({ scene }: { scene: SceneSpec }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const h = el.clientHeight
      if (h <= 0) return
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, h / REFERENCE_HEIGHT))
      setScale((prev) => (Math.abs(prev - next) < 0.02 ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={boxRef}
      data-testid="czytanka-scene"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 24 }}
    >
      <SceneBackground kind={scene.bg} />
      {scene.actors.map((a, i) => (
        <SceneActor key={i} actor={a} scale={scale} />
      ))}
    </div>
  )
}
