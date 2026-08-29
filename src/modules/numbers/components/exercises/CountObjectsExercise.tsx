import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii } from '@/app/theme'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'
import { buildChoices, NEAR_MISS_OFFSETS } from '../../utils/buildChoices'
import { clamp } from '../../utils/clamp'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { n: number; emoji: string; seed: number }
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
}

const OBJECT_SIZE = 72
const BOARD_W = 900
const BOARD_H = 400
const CELL_W = 110
const CELL_H = 130
const JITTER_X = (CELL_W - 96) / 2
const JITTER_Y = (CELL_H - 96) / 2
const RECOUNT_STEP_MS = 700

/** Deterministyczny PRNG — układ obiektów musi przeżyć re-render bez zmiany. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Pos = { x: number; y: number }

/**
 * Nieregularny układ: slot z siatki + jitter. WHY siatka zamiast czystego
 * losowania — gwarantuje ≥96 px między środkami (czyli ≥24 px przerwy między
 * 72-pikselowymi tap-targetami) bez rejection samplingu, który przy 10
 * obiektach potrafi się nie zbiec. Losowa kolejność slotów sprawia, że
 * porządek liczenia narzuca dziecko, a nie rząd na ekranie.
 */
function layoutPositions(n: number, seed: number): Pos[] {
  const rng = mulberry32(seed)
  const cols = Math.floor(BOARD_W / CELL_W)
  const rows = Math.floor(BOARD_H / CELL_H)
  const slots: Pos[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) slots.push({ x: c, y: r })
  }
  // Fisher-Yates na slotach.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = slots[i]!
    const b = slots[j]!
    slots[i] = b
    slots[j] = a
  }
  return slots.slice(0, n).map((s) => ({
    x: s.x * CELL_W + CELL_W / 2 + (rng() * 2 - 1) * JITTER_X,
    y: s.y * CELL_H + CELL_H / 2 + (rng() * 2 - 1) * JITTER_Y,
  }))
}

type Phase = 'counting' | 'cardinality' | 'recount'

export function CountObjectsExercise({ audioBus, payload, onAnswer, restrictChoicesTo }: Props) {
  const n = clamp(Math.round(payload.n), 1, 10)
  const positions = useMemo(() => layoutPositions(n, payload.seed), [n, payload.seed])

  // n === 1 nie ma czego liczyć — od razu pytanie o kardynalność.
  const [phase, setPhase] = useState<Phase>(() => (n === 1 ? 'cardinality' : 'counting'))
  const [marked, setMarked] = useState<number[]>([])
  const [recountIdx, setRecountIdx] = useState<number | null>(null)
  const activePointerRef = useRef<number | null>(null)
  // Źródło prawdy dla efektów ubocznych taps — updater `setState` bywa w
  // StrictMode wołany dwa razy, a audio „jeden, dwa" nie może się dublować.
  const markedRef = useRef<number[]>([])

  useEffect(() => {
    void audioBus.play(n === 1 ? 'count-objects-howmany' : 'count-objects-prompt')
  }, [audioBus, n])

  const handlePointerDown = useCallback(
    (index: number) => (e: ReactPointerEvent) => {
      if (phase !== 'counting') return
      // Multi-touch: liczy się palec, który dotknął pierwszy — dziecko kładące
      // dłoń na ekranie nie może „policzyć" pięciu obiektów naraz.
      if (activePointerRef.current !== null && activePointerRef.current !== e.pointerId) return
      activePointerRef.current = e.pointerId
      if (markedRef.current.includes(index)) return
      const next = [...markedRef.current, index]
      markedRef.current = next
      setMarked(next)
      // Bez `stop()` — FIFO ma zachować kolejność „jeden, dwa, trzy…".
      void audioBus.play(`number-${next.length}`)
      if (next.length === n) {
        setPhase('cardinality')
        void audioBus.play('count-objects-howmany')
      }
    },
    [audioBus, n, phase],
  )

  const releasePointer = useCallback((e: ReactPointerEvent) => {
    if (activePointerRef.current === e.pointerId) activePointerRef.current = null
  }, [])

  // Druga próba (kontrakt Fali 1): zanim pokażemy dwa kafelki, lektor przelicza
  // zbiór na głos z podświetleniem — dziecko widzi, gdzie mu się rozjechało.
  const retryKey = restrictChoicesTo?.join(',') ?? ''
  useEffect(() => {
    if (retryKey === '') return
    markedRef.current = []
    setMarked([])
    setPhase('recount')
    void audioBus.play('count-objects-recount')
    let i = 0
    setRecountIdx(0)
    void audioBus.play('number-1')
    const timer = setInterval(() => {
      i += 1
      if (i >= n) {
        clearInterval(timer)
        setRecountIdx(null)
        setPhase('cardinality')
        return
      }
      setRecountIdx(i)
      void audioBus.play(`number-${i + 1}`)
    }, RECOUNT_STEP_MS)
    return () => clearInterval(timer)
  }, [audioBus, n, retryKey])

  const choices = useMemo(
    () =>
      buildChoices(n, {
        ...(restrictChoicesTo !== undefined ? { restrictChoicesTo } : {}),
        min: 1,
        max: 10,
        offsets: NEAR_MISS_OFFSETS,
      }),
    [n, restrictChoicesTo],
  )

  return (
    <div
      data-testid="exercise-count-objects"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: 16,
        gap: 8,
        minHeight: 0,
      }}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
    >
      <div
        style={{
          position: 'relative',
          width: BOARD_W,
          height: BOARD_H,
          maxWidth: '100%',
          transformOrigin: 'top center',
        }}
      >
        {positions.map((pos, i) => {
          const isMarked = marked.includes(i)
          const isRecounting = recountIdx !== null && i <= recountIdx
          const style: CSSProperties = {
            position: 'absolute',
            left: pos.x - OBJECT_SIZE / 2,
            top: pos.y - OBJECT_SIZE / 2,
            width: OBJECT_SIZE,
            height: OBJECT_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            lineHeight: 1,
            borderRadius: radii.kid,
            border: `4px solid ${isMarked || isRecounting ? colors.text : 'transparent'}`,
            background: isMarked || isRecounting ? '#fef3c7' : 'transparent',
            opacity: isMarked ? 0.45 : 1,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            cursor: phase === 'counting' ? 'pointer' : 'default',
          }
          return (
            <div
              key={i}
              data-testid="count-object"
              data-marked={isMarked ? 'true' : 'false'}
              aria-hidden
              style={style}
              onPointerDown={handlePointerDown(i)}
            >
              {payload.emoji}
            </div>
          )
        })}
      </div>
      {phase === 'cardinality' && (
        <div
          data-testid="count-cardinality"
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {choices.map((d) => (
            <span key={d} data-testid="count-choice">
              <DigitTile
                variant="tap"
                digit={d}
                size="md"
                onTap={(v) => onAnswer(v === n ? 'correct' : 'wrong', v)}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
