import { useLayoutEffect, useRef, useState } from 'react'
import type { AnimationEvent } from 'react'
import type { Actor, SceneSpec } from '../data/types'
import { SceneBackground } from './backgrounds'
import './scene.css'

// Wysokość sceny, dla której dobrane są rozmiary aktorów w danych (grupa 1
// w landscape). Niższa scena (grupy 3–4, portrait) skaluje emoji w dół — rozmiary
// w danych są w px, więc inaczej aktorzy wychodziliby poza kadr.
const REFERENCE_HEIGHT = 246
const MIN_SCALE = 0.5
const MAX_SCALE = 1.15
// Rząd przycisków (🗣 🔊 🐢 KO|TA A|B ❓) leży NA scenie, przy dolnej krawędzi:
// 72 px wysokości + 8 px marginesu. Aktorzy muszą zmieścić się nad nim.
const CONTROLS_BAND = 80
const EDGE_PADDING = 4

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function SceneActor({ actor, size, top }: { actor: Actor; size: number; top: number }) {
  const [poke, setPoke] = useState(false)
  // Kilka aktorów w danych ma x do 98 — z translate(-50%) ucinałoby je na krawędzi.
  const left = clamp(actor.x, 12, 86)
  return (
    <div
      className={`cz-actor cz-anim-${actor.anim}${poke ? ' poke' : ''}`}
      style={{ left: `${left}%`, top: `${Math.round(top)}px`, fontSize: size, touchAction: 'manipulation' }}
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

/**
 * Układ pionowy liczony w PIKSELACH z realnej wysokości sceny. Procenty z danych
 * mówią tylko, kto stoi wyżej, a kto niżej — same w sobie nie wiedzą ani o
 * rozmiarze emoji, ani o rzędzie przycisków leżącym na scenie. Dlatego zakres
 * scenariusza jest MAPOWANY na dostępny pas: przy wysokiej scenie zostaje
 * głębia, przy niskiej (grupy 3–4, portrait) wszystko zjeżdża proporcjonalnie,
 * zamiast zbić się w jedną linię albo zniknąć pod przyciskami.
 */
function layout(actors: readonly Actor[], sceneHeight: number, scale: number): number[] {
  const sizes = actors.map((a) => a.size * scale)
  const half = Math.max(...sizes, 0) / 2
  const bandTop = half + EDGE_PADDING
  const bandBottom = sceneHeight - CONTROLS_BAND - half
  if (bandBottom <= bandTop) {
    const mid = Math.max(bandTop, (sceneHeight - CONTROLS_BAND) / 2)
    return actors.map(() => mid)
  }
  const ys = actors.map((a) => a.y)
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  return actors.map((a) => {
    const frac = hi > lo ? (a.y - lo) / (hi - lo) : 0.5
    return bandTop + frac * (bandBottom - bandTop)
  })
}

export function CzytankaScene({ scene }: { scene: SceneSpec }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const h = el.clientHeight
      if (h > 0) setHeight((prev) => (Math.abs(prev - h) < 2 ? prev : h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = height > 0 ? clamp(height / REFERENCE_HEIGHT, MIN_SCALE, MAX_SCALE) : 1
  const tops = height > 0 ? layout(scene.actors, height, scale) : null

  return (
    <div
      ref={boxRef}
      data-testid="czytanka-scene"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 24 }}
    >
      <SceneBackground kind={scene.bg} />
      {/* Aktorzy dopiero po pomiarze — inaczej pierwsza klatka rysuje ich w złym
          miejscu i widać przeskok. */}
      {tops &&
        scene.actors.map((a, i) => (
          <SceneActor key={i} actor={a} size={Math.round(a.size * scale)} top={tops[i]!} />
        ))}
    </div>
  )
}
