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
  /**
   * `false` = ekran zamrożony (pauza, feedback po drugiej pomyłce, 🤷). Głośne
   * przeliczanie musi wtedy przestać dokładać klipy do kolejki — inaczej
   * dziecko po wznowieniu słyszy „…cztery, pięć" bez nic na ekranie. Wznowienie
   * NIE wznawia przeliczania: dziecko ma 🔊 do powtórki polecenia.
   */
  active?: boolean
}

const OBJECT_SIZE = 72
const BOARD_W = 900
const BOARD_H = 400
const CELL_W = 110
const CELL_H = 130
const JITTER_X = (CELL_W - 96) / 2
const JITTER_Y = (CELL_H - 96) / 2
const RECOUNT_STEP_MS = 700
/** Kafelki nie mogą zostać martwe, gdy audio nie wystartuje (autoplay/404). */
const UNLOCK_SAFETY_MS = 4000

const OBJECT_PCT = (OBJECT_SIZE / BOARD_W) * 100
/** Odstęp środków slotów (96 px na planszy 900) — górna granica rozmiaru obiektu. */
const SLOT_GAP_PCT = (96 / BOARD_W) * 100 - 0.3
/**
 * Plansza skaluje się z szerokością viewportu, więc obiekty żyją w procentach
 * BOARD_W/BOARD_H, a nie w px. Rozmiar: nie mniej niż tap-target 60 px (iPad
 * portrait ma ~724 px na planszę → 8% to tylko 58 px), nie więcej niż odstęp
 * między środkami slotów, żeby na wąskim ekranie sąsiedzi nie nachodzili.
 * `calc(...)` opakowuje `min/max` tylko po to, żeby cssstyle w jsdom nie
 * wyrzuciło całej wartości (nie zna gołego `min()`); w przeglądarce to no-op.
 */
const OBJECT_W_CSS = `calc(min(max(60px, ${OBJECT_PCT}%), ${SLOT_GAP_PCT}%))`
const OBJECT_FONT_CSS = `calc(min(max(36px, ${(44 / BOARD_W) * 100}cqw), ${SLOT_GAP_PCT}cqw))`

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

/** Kolejność „rządkami": wiersz po wierszu, w wierszu od lewej. */
function readingOrder(positions: Pos[]): number[] {
  return positions
    .map((_, i) => i)
    .sort((a, b) => {
      const rowA = Math.round(positions[a]!.y / CELL_H)
      const rowB = Math.round(positions[b]!.y / CELL_H)
      return rowA - rowB || positions[a]!.x - positions[b]!.x
    })
}

type Phase = 'counting' | 'cardinality' | 'recount'

export function CountObjectsExercise({
  audioBus,
  payload,
  onAnswer,
  restrictChoicesTo,
  active = true,
}: Props) {
  const n = clamp(Math.round(payload.n), 1, 10)
  const positions = useMemo(() => layoutPositions(n, payload.seed), [n, payload.seed])

  // n === 1 nie ma czego liczyć — od razu pytanie o kardynalność.
  const [phase, setPhase] = useState<Phase>(() => (n === 1 ? 'cardinality' : 'counting'))
  const [marked, setMarked] = useState<number[]>([])
  const [recountIdx, setRecountIdx] = useState<number | null>(null)
  const [recountOrder, setRecountOrder] = useState<number[]>([])
  // Kafelki cyfr pojawiają się razem z pytaniem, ale nie przyjmują tapu, póki
  // kolejka („…trzy" + „ile ich jest?") nie wybrzmi — inaczej dziecko odpowiada
  // w trakcie pytania i gubi pointę kardynalności.
  const [choicesLocked, setChoicesLocked] = useState(true)
  const activePointerRef = useRef<number | null>(null)
  // Źródło prawdy dla efektów ubocznych taps — updater `setState` bywa w
  // StrictMode wołany dwa razy, a audio „jeden, dwa" nie może się dublować.
  const markedRef = useRef<number[]>([])
  const unlockGenRef = useRef(0)
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Czytane przez tik interwału — `active` nie może być w deps efektu
  // przeliczania, bo restart zagrałby całą sekwencję od nowa.
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  const clearUnlockTimer = useCallback(() => {
    if (unlockTimerRef.current !== null) {
      clearTimeout(unlockTimerRef.current)
      unlockTimerRef.current = null
    }
  }, [])

  /** Odblokuj kafelki gdy `play()` rozstrzygnie (koniec klipu) albo po bezpieczniku. */
  const unlockAfter = useCallback(
    (finished: Promise<boolean>) => {
      const gen = ++unlockGenRef.current
      clearUnlockTimer()
      setChoicesLocked(true)
      const unlock = () => {
        if (gen !== unlockGenRef.current) return
        clearUnlockTimer()
        setChoicesLocked(false)
      }
      unlockTimerRef.current = setTimeout(unlock, UNLOCK_SAFETY_MS)
      // `play()` nigdy nie rzuca (kontrakt AudioBus) — samo `then` wystarczy.
      void finished.then(unlock)
    },
    [clearUnlockTimer],
  )

  useEffect(() => clearUnlockTimer, [clearUnlockTimer])

  useEffect(() => {
    if (n === 1) {
      unlockAfter(audioBus.play('count-objects-howmany'))
      return
    }
    void audioBus.play('count-objects-prompt')
  }, [audioBus, n, unlockAfter])

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
      const counted = audioBus.play(`number-${next.length}`)
      if (next.length === n) {
        setPhase('cardinality')
        // FIFO: `howmany` rozstrzyga się po ostatniej liczbie, więc odblokowanie
        // czeka na całą kolejkę.
        unlockAfter(audioBus.play('count-objects-howmany'))
        return
      }
      void counted
    },
    [audioBus, n, phase, unlockAfter],
  )

  const releasePointer = useCallback((e: ReactPointerEvent) => {
    if (activePointerRef.current === e.pointerId) activePointerRef.current = null
  }, [])

  // Druga próba (kontrakt Fali 1): zanim pokażemy dwa kafelki, lektor przelicza
  // zbiór na głos z podświetleniem — dziecko widzi, gdzie mu się rozjechało.
  const retryKey = restrictChoicesTo?.join(',') ?? ''
  const lastRetryKeyRef = useRef('')
  useEffect(() => {
    if (retryKey === '') {
      lastRetryKeyRef.current = ''
      return
    }
    // StrictMode montuje efekt dwa razy: interwał musi wystartować za każdym
    // razem (cleanup go czyści), ale cue otwierające nie może zagrać podwójnie.
    const isRemount = lastRetryKeyRef.current === retryKey
    lastRetryKeyRef.current = retryKey
    // Podświetlenie idzie kolejnością liczenia dziecka (fallback: rządkami) —
    // po indeksie potasowanej tablicy skakało losowo po planszy.
    setRecountOrder(
      markedRef.current.length === n ? [...markedRef.current] : readingOrder(positions),
    )
    markedRef.current = []
    setMarked([])
    setPhase('recount')
    setChoicesLocked(true)
    let i = 0
    setRecountIdx(0)
    let lastPlay: Promise<boolean> = Promise.resolve(true)
    if (!isRemount) {
      void audioBus.play('count-objects-recount')
      lastPlay = audioBus.play('number-1')
    }
    const timer = setInterval(() => {
      // Pauza / feedback: przerywamy przeliczanie i oddajemy dziecku kafelki,
      // żeby ekran nie został zamrożony w fazie `recount` po wznowieniu.
      if (!activeRef.current) {
        clearInterval(timer)
        setRecountIdx(null)
        setPhase('cardinality')
        clearUnlockTimer()
        unlockGenRef.current += 1
        setChoicesLocked(false)
        return
      }
      i += 1
      if (i >= n) {
        clearInterval(timer)
        setRecountIdx(null)
        setPhase('cardinality')
        unlockAfter(lastPlay)
        return
      }
      setRecountIdx(i)
      lastPlay = audioBus.play(`number-${i + 1}`)
    }, RECOUNT_STEP_MS)
    return () => clearInterval(timer)
  }, [audioBus, clearUnlockTimer, n, positions, retryKey, unlockAfter])

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
        data-testid="count-board"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: BOARD_W,
          aspectRatio: `${BOARD_W} / ${BOARD_H}`,
          maxHeight: '100%',
          containerType: 'inline-size',
        }}
      >
        {positions.map((pos, i) => {
          const isMarked = marked.includes(i)
          const rank = recountOrder.indexOf(i)
          const isRecounting = recountIdx !== null && rank >= 0 && rank <= recountIdx
          const style: CSSProperties = {
            position: 'absolute',
            left: `${(pos.x / BOARD_W) * 100}%`,
            top: `${(pos.y / BOARD_H) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: OBJECT_W_CSS,
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: OBJECT_FONT_CSS,
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
          data-locked={choicesLocked ? 'true' : 'false'}
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
            pointerEvents: choicesLocked ? 'none' : 'auto',
          }}
        >
          {choices.map((d) => (
            <span key={d} data-testid="count-choice">
              <DigitTile
                variant="tap"
                digit={d}
                size="md"
                onTap={(v) => {
                  if (choicesLocked) return
                  onAnswer(v === n ? 'correct' : 'wrong', v)
                }}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
