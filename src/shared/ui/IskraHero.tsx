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
const VIEWBOX_H = 220
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
        style={{ position: 'absolute', inset: 0, overflow: 'visible', zIndex: 2, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <style>{css}</style>

        <g
          data-testid="iskra-hero-arm-left"
          className={`${uid}-arm-left`}
          style={{ transformOrigin: '85px 155px', transformBox: 'view-box' }}
        >
          {/* Zakrzywione ramie — bezier od shoulder do dłoni */}
          <path
            d="M 85 155 Q 70 178 48 192"
            stroke="#d97706"
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
          {/* Dłoń — większy okrąg w kolorze płomienia z outline */}
          <circle cx={48} cy={192} r={10} fill="#f97316" stroke="#9a3412" strokeWidth={1.5} />
          {/* Refleks dłoni — biały punkt jak w oczach (kawaii spójność) */}
          <circle cx={45} cy={189} r={2} fill="#ffffff" opacity={0.85} />
        </g>
        <g
          data-testid="iskra-hero-arm-right"
          className={`${uid}-arm-right`}
          style={{ transformOrigin: '155px 155px', transformBox: 'view-box' }}
        >
          <path
            d="M 155 155 Q 170 178 192 192"
            stroke="#d97706"
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={192} cy={192} r={10} fill="#f97316" stroke="#9a3412" strokeWidth={1.5} />
          <circle cx={189} cy={189} r={2} fill="#ffffff" opacity={0.85} />
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
        0%, 60%, 100% { transform: rotate(0deg); }
        70% { transform: rotate(-55deg); }
        77% { transform: rotate(-25deg); }
        84% { transform: rotate(-55deg); }
        91% { transform: rotate(-25deg); }
        96% { transform: rotate(-15deg); }
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
