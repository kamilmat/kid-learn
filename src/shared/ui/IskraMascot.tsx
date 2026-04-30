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

        {/* Grzywka 3 iskierek na czubku — każda z desyncronizowanym flicker */}
        <g data-testid="iskra-fringe">
          <circle
            cx={100}
            cy={10}
            r={4}
            fill="#fff8c2"
            className={`${uid}-fringe-spark ${uid}-fringe-spark-a`}
          />
          <circle
            cx={88}
            cy={24}
            r={3}
            fill="#fff8c2"
            className={`${uid}-fringe-spark ${uid}-fringe-spark-b`}
          />
          <circle
            cx={112}
            cy={24}
            r={3}
            fill="#fff8c2"
            className={`${uid}-fringe-spark ${uid}-fringe-spark-c`}
          />
        </g>

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
            inną animację. Owijamy w <g> żeby skalować/przesuwać razem.
            UWAGA: CSS animation transform NADPISUJE SVG attribute transform —
            dlatego translate(50 30) idzie w INNER <g>, animation na outer.
            Bez tego flame renderował się na lewo (transform attr ignored). */}
        <g
          data-testid="iskra-body"
          className={`${uid}-body`}
          style={{
            transformOrigin: '100px 110px',
            transformBox: 'fill-box',
            ...stateAnimation,
          }}
        >
         <g transform="translate(50 30)">
          <path d={FLAME_PATH} fill={`url(#${uid}-grad)`} />
          <path d={FLAME_INNER_PATH} fill={`url(#${uid}-inner)`} />
          {/* Brwi — delikatne kreski wyrażające ekspresję */}
          <path
            d="M30 76 Q37 73 44 76"
            stroke="#2d2d33"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M56 76 Q63 73 70 76"
            stroke="#2d2d33"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
          {/* Oczy z białkiem + źrenicą + connectorem (anime/Kawaii style) */}
          <circle cx={37} cy={88} r={7} fill="#ffffff" />
          <circle cx={63} cy={88} r={7} fill="#ffffff" />
          <circle data-testid="iskra-eye" cx={38} cy={88} r={5} fill="#2d2d33" />
          <circle data-testid="iskra-eye" cx={64} cy={88} r={5} fill="#2d2d33" />
          {/* Refleks w oczach — biały punkt = "iskra życia" */}
          <circle cx={36} cy={86} r={1.8} fill="#ffffff" />
          <circle cx={62} cy={86} r={1.8} fill="#ffffff" />
          {/* Rumieńce — różowe okręgi pod oczami */}
          <ellipse cx={28} cy={102} rx={6} ry={4} fill="#fda4af" opacity={0.55} />
          <ellipse cx={72} cy={102} rx={6} ry={4} fill="#fda4af" opacity={0.55} />
          {/* Wyraźniejszy uśmiech — szerszy łuk */}
          <path
            d="M38 104 Q50 116 62 104"
            stroke="#2d2d33"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
         </g>
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
  @media (prefers-reduced-motion: no-preference) {
    @keyframes ${uid}-idle {
      0%, 100% { transform: scale(1); opacity: 0.96; }
      50% { transform: scale(1.05); opacity: 1.0; }
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
    @keyframes ${uid}-fringe-flicker {
      0%, 100% { opacity: 0.6; transform: scale(0.85); }
      50% { opacity: 1.0; transform: scale(1.1); }
    }
    .${uid}-fringe-spark {
      transform-origin: center;
      transform-box: fill-box;
    }
    .${uid}-fringe-spark-a {
      animation: ${uid}-fringe-flicker 1.6s ease-in-out infinite;
    }
    .${uid}-fringe-spark-b {
      animation: ${uid}-fringe-flicker 2.1s ease-in-out infinite;
      animation-delay: 0.55s;
    }
    .${uid}-fringe-spark-c {
      animation: ${uid}-fringe-flicker 1.9s ease-in-out infinite;
      animation-delay: 1.1s;
    }
    ${sparkKeyframes}
    ${rainKeyframes}
  }
`
}
