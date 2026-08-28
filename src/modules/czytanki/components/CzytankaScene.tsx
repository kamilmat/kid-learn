import { useState } from 'react'
import type { AnimationEvent } from 'react'
import type { Actor, SceneSpec } from '../data/types'
import { SceneBackground } from './backgrounds'
import './scene.css'

// Kilka aktorów w danych ma x do 98 — z translate(-50%) ucinałoby je na krawędzi.
// Clampujemy pozycję renderowania, dane w src/modules/czytanki/data zostają nietknięte.
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function SceneActor({ actor }: { actor: Actor }) {
  const [poke, setPoke] = useState(false)
  const left = clamp(actor.x, 8, 92)
  const top = clamp(actor.y, 15, 85)
  return (
    <div
      className={`cz-actor cz-anim-${actor.anim}${poke ? ' poke' : ''}`}
      style={{ left: `${left}%`, top: `${top}%`, fontSize: actor.size, touchAction: 'manipulation' }}
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
  return (
    <div
      data-testid="czytanka-scene"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 24 }}
    >
      <SceneBackground kind={scene.bg} />
      {scene.actors.map((a, i) => (
        <SceneActor key={i} actor={a} />
      ))}
    </div>
  )
}
