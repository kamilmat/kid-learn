import { useEffect, useMemo, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii } from '@/app/theme'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

type Equation = {
  id: string
  text: string
  isTrue: boolean
}

export function FactFamilyTriangle({ audioBus, payload, onAnswer }: Props) {
  const a = clamp(payload.args[0] ?? 1, 1, 19)
  const b = clamp(payload.args[1] ?? 1, 1, 19)
  const whole = clamp(payload.args[2] ?? a + b, 2, 20)

  const [tappedTrue, setTappedTrue] = useState<Set<string>>(new Set())
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-build-bond')
  }, [audioBus])

  const equations = useMemo(() => buildEquations(a, b, whole), [a, b, whole])
  const trueIds = useMemo(
    () => new Set(equations.filter((e) => e.isTrue).map((e) => e.id)),
    [equations],
  )

  const handleTap = (eq: Equation) => {
    if (resolved) return
    if (!eq.isTrue) {
      setResolved(true)
      void audioBus.play('try-again')
      onAnswer('wrong')
      return
    }
    const next = new Set(tappedTrue)
    next.add(eq.id)
    setTappedTrue(next)
    if (next.size === trueIds.size) {
      setResolved(true)
      void audioBus.play('praise-precision')
      onAnswer('correct')
    }
  }

  return (
    <div
      data-testid="exercise-fact-family-triangle"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: 24,
        gap: 24,
      }}
    >
      <Triangle a={a} b={b} whole={whole} />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          maxWidth: 720,
        }}
      >
        {equations.map((eq) => {
          const tapped = tappedTrue.has(eq.id)
          return (
            <button
              key={eq.id}
              type="button"
              data-testid={`eq-${eq.id}`}
              onClick={() => handleTap(eq)}
              disabled={resolved || tapped}
              style={{
                minWidth: 160,
                minHeight: 64,
                padding: '12px 20px',
                fontSize: 28,
                fontFamily: 'var(--font-block)',
                fontWeight: 700,
                color: colors.text,
                background: tapped ? '#dcfce7' : '#fff',
                border: `4px solid ${tapped ? '#16a34a' : colors.text + '22'}`,
                borderRadius: radii.kid,
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                cursor: resolved ? 'default' : 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {eq.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Triangle({ a, b, whole }: { a: number; b: number; whole: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 240,
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="240"
        height="200"
        viewBox="0 0 240 200"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      >
        <polygon
          points="120,16 24,184 216,184"
          fill="none"
          stroke={colors.text}
          strokeWidth="3"
        />
      </svg>
      <Corner value={whole} top={-8} left={88} background="#fff" border={colors.text} />
      <Corner value={a} top={144} left={-8} background="#fee2e2" border="#dc2626" />
      <Corner value={b} top={144} left={184} background="#dbeafe" border="#1d4ed8" />
    </div>
  )
}

function Corner({
  value,
  top,
  left,
  background,
  border,
}: {
  value: number
  top: number
  left: number
  background: string
  border: string
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        width: 64,
        height: 64,
        borderRadius: '50%',
        background,
        border: `4px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-block)',
        fontSize: 36,
        fontWeight: 700,
        color: colors.text,
      }}
    >
      {value}
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function buildEquations(a: number, b: number, whole: number): Equation[] {
  const trueEquations: Equation[] = [
    { id: 'add-ab', text: `${a} + ${b} = ${whole}`, isTrue: true },
    { id: 'sub-wa', text: `${whole} − ${a} = ${b}`, isTrue: true },
    { id: 'sub-wb', text: `${whole} − ${b} = ${a}`, isTrue: true },
  ]
  // Gdy a !== b dodaj komutację b+a=whole jako 4-tą prawdziwą
  if (a !== b) {
    trueEquations.splice(1, 0, {
      id: 'add-ba',
      text: `${b} + ${a} = ${whole}`,
      isTrue: true,
    })
  }

  // Fałszywe równania: użyj wartości z trójki ale w niepoprawnych kombinacjach
  const falseCandidates: Equation[] = [
    { id: 'false-aw', text: `${a} + ${whole} = ${b}`, isTrue: false },
    { id: 'false-ab-sub', text: `${a} − ${b} = ${whole}`, isTrue: false },
    { id: 'false-bw', text: `${b} + ${whole} = ${a}`, isTrue: false },
    { id: 'false-wsum', text: `${whole} + ${a} = ${b}`, isTrue: false },
  ].filter((eq) => !isAccidentallyTrue(eq.text))

  const shuffled = falseCandidates.sort(() => Math.random() - 0.5)
  const falseCount = Math.min(3, shuffled.length)
  const falseEquations = shuffled.slice(0, falseCount)

  return [...trueEquations, ...falseEquations].sort(() => Math.random() - 0.5)
}

function isAccidentallyTrue(text: string): boolean {
  // Parsuje "x op y = z" i sprawdza czy faktycznie prawda; zabezpieczenie przed
  // edge case np. a===b===0 gdzie fałszywe stają się trywialne.
  const match = text.match(/^(\d+)\s*([+−])\s*(\d+)\s*=\s*(\d+)$/)
  if (!match) return false
  const [, xs, op, ys, zs] = match
  const x = Number(xs)
  const y = Number(ys)
  const z = Number(zs)
  const computed = op === '+' ? x + y : x - y
  return computed === z
}
