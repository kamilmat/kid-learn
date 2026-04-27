/**
 * IskraMascot — maskotka Iskra dla Iskierek (sekcja 17 spec).
 *
 * Bazowa forma: kropla/płomień (path SVG) z gradientem pomarańcz→żółty→biały.
 * Stany: 'idle' | 'happy' | 'surprise' | 'dance'.
 * Intensywność (liczba iskier wokół): 'spark' (1) | 'flame' (2) | 'fire' (4) | 'torch' (6).
 *
 * Animacje robione CSS keyframes inline w <style> w SVG — nie wymagamy
 * zewnętrznych bibliotek, działa w jsdom (selektor nie jest sprawdzany).
 *
 * Każda instancja ma unikatowy `instanceId` żeby gradient nie kolidował,
 * a keyframe nie były dzielone między dwie maskotki o różnym `oneshotKey`.
 */

import { useId, useMemo } from 'react'

export type IskraState = 'idle' | 'happy' | 'surprise' | 'dance'
export type IskraIntensity = 'spark' | 'flame' | 'fire' | 'torch'

type IskraMascotProps = {
  size?: number
  state: IskraState
  intensity?: IskraIntensity
  /**
   * Zmiana wartości restartuje animację (re-mount przez `key`).
   * Używać dla efektu "iskra dodana do ściany".
   */
  oneshotKey?: string
}

const INTENSITY_TO_SPARK_COUNT: Record<IskraIntensity, number> = {
  spark: 1,
  flame: 2,
  fire: 4,
  torch: 6,
}

// Punkty kropli/płomienia — viewBox 0 0 100 140.
// Wierzchołek na górze (50,8), brzuch w okolicach y=90, dół zaokrąglony.
const FLAME_PATH =
  'M50 8 ' +
  'C56 28 70 42 78 58 ' +
  'C88 76 92 92 88 108 ' +
  'C84 124 70 134 50 134 ' +
  'C30 134 16 124 12 108 ' +
  'C8 92 12 76 22 58 ' +
  'C30 42 44 28 50 8 Z'

// Mniejszy wewnętrzny "rdzeń" (jaśniejszy)
const FLAME_INNER_PATH =
  'M50 36 ' +
  'C54 50 62 60 68 72 ' +
  'C74 84 76 96 72 106 ' +
  'C68 116 60 122 50 122 ' +
  'C40 122 32 116 28 106 ' +
  'C24 96 26 84 32 72 ' +
  'C38 60 46 50 50 36 Z'

export function IskraMascot({
  size = 160,
  state,
  intensity = 'flame',
  oneshotKey,
}: IskraMascotProps) {
  const reactId = useId()
  // Unikatowy id dla gradientu i nazw keyframes (kropki / dwukropki nie są
  // dozwolone w identifierze SVG/CSS — czyścimy).
  const uid = useMemo(
    () => `iskra-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`,
    [reactId],
  )

  const sparkCount = INTENSITY_TO_SPARK_COUNT[intensity]
  const sparks = useMemo(() => buildSparks(sparkCount), [sparkCount])

  const stateAnimation = stateToBodyAnimation(state, uid)
  const showQuestionMark = state === 'surprise'
  const showSparkRain = state === 'dance'

  const css = buildCss(uid, state, sparks.length)

  return (
    <div
      // Zmiana oneshotKey wymusza remount (restart animacji).
      key={oneshotKey ?? 'static'}
      data-testid="iskra-mascot"
      data-state={state}
      data-intensity={intensity}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        lineHeight: 0,
      }}
    >
      <svg
        role="img"
        aria-label="Iskra"
        viewBox="0 0 200 200"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{css}</style>
        <defs>
          <radialGradient id={`${uid}-grad`} cx="50%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#ffe28a" />
            <stop offset="75%" stopColor="#ffb04a" />
            <stop offset="100%" stopColor="#ef7a1f" />
          </radialGradient>
          <radialGradient id={`${uid}-inner`} cx="50%" cy="65%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fff4c2" />
            <stop offset="100%" stopColor="#ffd06a" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* Iskry "stałe" wokół maskotki — liczba zależna od intensity */}
        <g data-testid="iskra-sparks" className={`${uid}-sparks`}>
          {sparks.map((s, i) => (
            <circle
              key={i}
              data-testid="iskra-spark"
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill="#ffd06a"
              className={`${uid}-spark ${uid}-spark-${i}`}
            />
          ))}
        </g>

        {/* Ciało maskotki: w stanach happy/idle/dance/surprise stosujemy
            inną animację. Owijamy w <g> żeby skalować/przesuwać razem. */}
        <g
          data-testid="iskra-body"
          className={`${uid}-body`}
          style={{
            transformOrigin: '100px 110px',
            transformBox: 'fill-box',
            ...stateAnimation,
          }}
          // Centrujemy: nasze flame path jest 100x140, viewBox 200x200 → translate (50,30)
          transform="translate(50 30)"
        >
          <path d={FLAME_PATH} fill={`url(#${uid}-grad)`} />
          <path d={FLAME_INNER_PATH} fill={`url(#${uid}-inner)`} />
          {/* Oczy (proste — dwa małe punkty, dziecięcy charakter) */}
          <circle data-testid="iskra-eye" cx={40} cy={86} r={4} fill="#2d2d33" />
          <circle data-testid="iskra-eye" cx={60} cy={86} r={4} fill="#2d2d33" />
          {/* Uśmiech (lekki łuk) */}
          <path
            d="M40 100 Q50 108 60 100"
            stroke="#2d2d33"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Surprise: znak zapytania nad głową */}
        {showQuestionMark && (
          <text
            data-testid="iskra-question"
            x={140}
            y={40}
            fontFamily="system-ui, sans-serif"
            fontSize={32}
            fontWeight={700}
            fill="#5b8def"
          >
            ?
          </text>
        )}

        {/* Dance: deszcz iskier — 6 dodatkowych kropelek na orbicie */}
        {showSparkRain && (
          <g data-testid="iskra-spark-rain">
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * Math.PI * 2
              const cx = 100 + Math.cos(angle) * 70
              const cy = 100 + Math.sin(angle) * 70
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#ffb04a"
                  className={`${uid}-rain ${uid}-rain-${i}`}
                />
              )
            })}
          </g>
        )}
      </svg>
    </div>
  )
}

type SparkPos = { cx: number; cy: number; r: number }

function buildSparks(count: number): SparkPos[] {
  const out: SparkPos[] = []
  for (let i = 0; i < count; i++) {
    // Rozkładamy iskry na okręgu wokół maskotki (radius 80 wokół środka 100,100).
    const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2
    const radius = 78
    out.push({
      cx: 100 + Math.cos(angle) * radius,
      cy: 100 + Math.sin(angle) * radius,
      r: 4,
    })
  }
  return out
}

function stateToBodyAnimation(state: IskraState, uid: string): { animation: string } {
  switch (state) {
    case 'idle':
      return { animation: `${uid}-idle 2.4s ease-in-out infinite` }
    case 'happy':
      return { animation: `${uid}-happy 0.8s ease-in-out infinite` }
    case 'surprise':
      return { animation: `${uid}-surprise 0.6s ease-in-out infinite` }
    case 'dance':
      return { animation: `${uid}-dance 1.2s ease-in-out infinite` }
  }
}

function buildCss(uid: string, _state: IskraState, sparkCount: number): string {
  // Każdy keyframe ma prefix `${uid}-` żeby uniknąć kolizji między instancjami.
  const sparkKeyframes = Array.from({ length: sparkCount })
    .map(
      (_, i) => `
        .${uid}-spark-${i} {
          animation: ${uid}-spark 1.6s ease-in-out infinite;
          animation-delay: ${(i * 0.18).toFixed(2)}s;
          transform-origin: center;
        }
      `,
    )
    .join('\n')

  const rainKeyframes = Array.from({ length: 6 })
    .map(
      (_, i) => `
        .${uid}-rain-${i} {
          animation: ${uid}-rain 1.4s ease-in-out infinite;
          animation-delay: ${(i * 0.12).toFixed(2)}s;
          transform-origin: 100px 100px;
        }
      `,
    )
    .join('\n')

  return `
    @keyframes ${uid}-idle {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes ${uid}-happy {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.04); }
    }
    @keyframes ${uid}-surprise {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }
    @keyframes ${uid}-dance {
      0% { transform: translateY(0) rotate(-6deg) scale(1); }
      25% { transform: translateY(-10px) rotate(0deg) scale(1.06); }
      50% { transform: translateY(0) rotate(6deg) scale(1); }
      75% { transform: translateY(-6px) rotate(0deg) scale(1.04); }
      100% { transform: translateY(0) rotate(-6deg) scale(1); }
    }
    @keyframes ${uid}-spark {
      0%, 100% { opacity: 0.5; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes ${uid}-rain {
      0% { opacity: 0; transform: translateY(-12px); }
      40% { opacity: 1; }
      100% { opacity: 0; transform: translateY(12px); }
    }
    ${sparkKeyframes}
    ${rainKeyframes}
  `
}
