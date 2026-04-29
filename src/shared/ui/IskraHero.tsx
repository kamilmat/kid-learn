import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  IskraMascot,
  type IskraIntensity,
  type IskraState,
} from './IskraMascot'

export type IskraHeroProps = {
  size?: number
  state?: IskraState
  intensity?: IskraIntensity
  /** 'wave' = prawa rączka macha co 4.5s (tylko gdy state='idle') */
  idleVariant?: 'static' | 'wave'
  oneshotKey?: string
}

const VIEWBOX_W = 240
const VIEWBOX_H = 280
const MASCOT_OFFSET_TOP = 20
const MASCOT_RATIO = 200 / VIEWBOX_W

export function IskraHero({
  size = 180,
  state = 'idle',
  intensity = 'fire',
  idleVariant = 'static',
  oneshotKey,
}: IskraHeroProps) {
  const reactId = useId()
  const uid = useMemo(
    () => `iskra-hero-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`,
    [reactId],
  )

  const heroHeight = (size * VIEWBOX_H) / VIEWBOX_W
  const mascotSize = size * MASCOT_RATIO

  const css = buildHeroCss(uid, state, idleVariant)

  return (
    <div
      data-testid="iskra-hero"
      data-state={state}
      data-idle-variant={idleVariant}
      style={{
        width: size,
        height: heroHeight,
        position: 'relative',
        display: 'inline-block',
        lineHeight: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        width={size}
        height={heroHeight}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        aria-hidden="true"
      >
        <style>{css}</style>

        <ellipse
          data-testid="iskra-hero-shadow"
          cx={120}
          cy={280}
          rx={45}
          ry={7}
          fill="rgba(0,0,0,0.28)"
        />

        <g data-testid="iskra-hero-leg-left">
          <line
            x1={104}
            y1={235}
            x2={102}
            y2={275}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={102} cy={277} r={6} fill="#3a2010" />
        </g>
        <g data-testid="iskra-hero-leg-right">
          <line
            x1={136}
            y1={235}
            x2={138}
            y2={275}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={138} cy={277} r={6} fill="#3a2010" />
        </g>

        <g
          data-testid="iskra-hero-arm-left"
          className={`${uid}-arm-left`}
          style={{ transformOrigin: '78px 160px', transformBox: 'fill-box' }}
        >
          <line
            x1={78}
            y1={160}
            x2={58}
            y2={178}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={58} cy={180} r={7} fill="#3a2010" />
        </g>
        <g
          data-testid="iskra-hero-arm-right"
          className={`${uid}-arm-right`}
          style={{ transformOrigin: '162px 160px', transformBox: 'fill-box' }}
        >
          <line
            x1={162}
            y1={160}
            x2={182}
            y2={178}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={182} cy={180} r={7} fill="#3a2010" />
        </g>
      </svg>

      <div
        className={`${uid}-body-wrapper`}
        style={{
          position: 'absolute',
          top: MASCOT_OFFSET_TOP * (size / VIEWBOX_W),
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <IskraMascot
          size={mascotSize}
          state={state}
          intensity={intensity}
          {...(oneshotKey !== undefined ? { oneshotKey } : {})}
        />
      </div>
    </div>
  )
}

function buildHeroCss(uid: string, state: IskraState, idleVariant: 'static' | 'wave'): string {
  const armRightAnimation =
    state === 'idle' && idleVariant === 'wave'
      ? `animation: ${uid}-arm-wave 4.5s ease-in-out infinite;`
      : ''

  const cheerArms =
    state === 'happy'
      ? `
        .${uid}-arm-left { transform: rotate(-50deg); }
        .${uid}-arm-right { transform: rotate(50deg); }
        .${uid}-body-wrapper {
          animation: ${uid}-cheer-lift 0.9s ease-out forwards;
        }
      `
      : ''

  const danceAnimations =
    state === 'dance'
      ? `
        .${uid}-arm-left {
          animation: ${uid}-dance-arm-left 0.6s ease-in-out infinite;
        }
        .${uid}-arm-right {
          animation: ${uid}-dance-arm-right 0.6s ease-in-out infinite;
          animation-delay: 0.3s;
        }
        .${uid}-body-wrapper {
          animation: ${uid}-dance-body 0.6s ease-in-out infinite;
        }
      `
      : ''

  return `
    @media (prefers-reduced-motion: no-preference) {
      .${uid}-arm-right { ${armRightAnimation} }
      ${cheerArms}
      ${danceAnimations}

      @keyframes ${uid}-arm-wave {
        0%, 70%, 100% { transform: rotate(0deg); }
        80% { transform: rotate(-25deg); }
        90% { transform: rotate(10deg); }
      }
      @keyframes ${uid}-dance-arm-left {
        0%, 100% { transform: rotate(-15deg); }
        50% { transform: rotate(15deg); }
      }
      @keyframes ${uid}-dance-arm-right {
        0%, 100% { transform: rotate(15deg); }
        50% { transform: rotate(-15deg); }
      }
      @keyframes ${uid}-dance-body {
        0%, 100% { transform: translateX(calc(-50% - 8px)); }
        50% { transform: translateX(calc(-50% + 8px)); }
      }
      @keyframes ${uid}-cheer-lift {
        0% { transform: translateX(-50%) translateY(0); }
        44% { transform: translateX(-50%) translateY(-12px); }
        100% { transform: translateX(-50%) translateY(-12px); }
      }
    }
  `
}

export function useIskraReaction(): {
  state: IskraState
  cheer: () => void
  dance: () => void
} {
  const [state, setState] = useState<IskraState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback((next: IskraState, durationMs: number) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }
    setState(next)
    timeoutRef.current = setTimeout(() => {
      setState('idle')
      timeoutRef.current = null
    }, durationMs)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const cheer = useCallback(() => trigger('happy', 900), [trigger])
  const dance = useCallback(() => trigger('dance', 4000), [trigger])

  return { state, cheer, dance }
}
