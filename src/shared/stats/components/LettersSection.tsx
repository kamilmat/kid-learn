// LettersSection — sekcja 14.1 spec.
//
// Lista wszystkich liter z mapy `letters`, posortowana od najsłabszej do
// najmocniejszej. Każdy wiersz: litera, ✅/❌/🤷/⏱, mastery bar 0-100%, kolor
// tła wg box Leitnera. Klik → ekspander z trendem (sparkline z eventów),
// avgResponseMs, top-3 confusedWith, per-style i per-case split.

import { useMemo, useState } from 'react'
import type { Box, LetterState } from '@/shared/srs/types'
import type { SessionEvent, SessionLog } from '@/shared/stats/types'
import { POLISH_ALPHABET, toUpper } from '@/modules/letters/data/alphabet'

export type LettersSectionProps = {
  letters: Record<string, LetterState>
  sessions: SessionLog[]
}

/**
 * Tła wg box Leitnera (sekcja 14.1). Odcienie pastelowe — czytelne na light bg.
 */
const BOX_BG: Record<Box, string> = {
  1: '#f6c5c5', // czerwony
  2: '#fbd9b3', // pomarańczowy
  3: '#faecb1', // żółty
  4: '#cce6c0', // zielony
  5: '#bcc4e0', // granat (jasny)
}

const BOX_LABEL: Record<Box, string> = {
  1: 'box 1 (świeża)',
  2: 'box 2',
  3: 'box 3',
  4: 'box 4',
  5: 'box 5 (opanowana)',
}

/**
 * Score słabości — większy = słabsza. (totalWrong + totalDontKnow + totalTimeout
 * − totalCorrect). Litery nigdy nie widziane (totalSeen=0) trafiają na koniec.
 */
export function weaknessScore(s: LetterState): number {
  if (s.totalSeen === 0) return -Infinity
  return s.totalWrong + s.totalDontKnow + s.totalTimeout - s.totalCorrect
}

/**
 * Sortuje litery od najsłabszej (wysoki score) do najmocniejszej. Litery nie
 * oglądane na końcu, w kolejności alfabetu polskiego (stabilność).
 */
export function sortLettersWeakestFirst(
  letters: Record<string, LetterState>,
): LetterState[] {
  const arr = Object.values(letters)
  return arr.sort((a, b) => {
    const sa = weaknessScore(a)
    const sb = weaknessScore(b)
    if (sa === sb) {
      // Stabilność po alfabecie
      const ia = POLISH_ALPHABET.indexOf(a.letter as (typeof POLISH_ALPHABET)[number])
      const ib = POLISH_ALPHABET.indexOf(b.letter as (typeof POLISH_ALPHABET)[number])
      return ia - ib
    }
    return sb - sa
  })
}

/**
 * Procent mastery 0-100. Heurystyka:
 *   masteryPct = 100 * box-1 / 4   (box=1 → 0%, box=5 → 100%)
 * Dla liter nie widzianych → 0%.
 */
export function masteryPercent(s: LetterState): number {
  if (s.totalSeen === 0) return 0
  return Math.round(((s.box - 1) / 4) * 100)
}

/**
 * Wyciąga sekwencję outcome'ów z eventów dla danej litery. Używana przez
 * sparkline. Zwracamy ostatnie `limit` ekspozycji.
 */
export function lastExposures(
  letter: string,
  sessions: SessionLog[],
  limit = 30,
): Array<'correct' | 'wrong' | 'dontKnow' | 'timeout'> {
  const out: Array<'correct' | 'wrong' | 'dontKnow' | 'timeout'> = []
  // Iterujemy od najnowszej sesji wstecz.
  for (let s = sessions.length - 1; s >= 0; s--) {
    const events = sessions[s]!.events
    let pendingTarget: string | null = null
    // Iterujemy od końca eventów wstecz, ale z prawdziwą semantyką par
    // (question-start → answer). Łatwiej iść od początku i zbierać, potem
    // wziąć ogon `limit`.
    for (const ev of events) {
      if (ev.type === 'question-start') {
        pendingTarget = ev.targetLetter
      } else if (ev.type === 'answer' && pendingTarget !== null) {
        if (pendingTarget === letter) {
          out.push(ev.outcome)
        }
        pendingTarget = null
      }
    }
  }
  // Zwracamy ostatnie `limit`
  return out.slice(-limit)
}

function topConfused(
  s: LetterState,
  n = 3,
): Array<{ letter: string; count: number }> {
  return Object.entries(s.confusedWith)
    .map(([letter, count]) => ({ letter, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

type SparklineProps = {
  outcomes: ReadonlyArray<'correct' | 'wrong' | 'dontKnow' | 'timeout'>
  width?: number
  height?: number
}

function Sparkline({ outcomes, width = 240, height = 20 }: SparklineProps) {
  if (outcomes.length === 0) {
    return (
      <div data-testid="sparkline-empty" style={{ color: '#888', fontSize: 12 }}>
        brak ekspozycji
      </div>
    )
  }
  const r = 3
  const stepX =
    outcomes.length === 1 ? width / 2 : (width - 2 * r) / (outcomes.length - 1)
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Sparkline ${outcomes.length} ekspozycji`}
      data-testid="sparkline"
    >
      {outcomes.map((o, i) => {
        const cx = outcomes.length === 1 ? width / 2 : r + i * stepX
        const cy = height / 2
        const fill =
          o === 'correct'
            ? '#7cc36a'
            : o === 'wrong'
              ? '#d04a4a'
              : o === 'dontKnow'
                ? '#e89a4f'
                : '#888888' // timeout
        return <circle key={i} cx={cx} cy={cy} r={r} fill={fill} />
      })}
    </svg>
  )
}

type RowProps = {
  state: LetterState
  sessions: SessionLog[]
  expanded: boolean
  onToggle: () => void
}

function LetterRow({ state, sessions, expanded, onToggle }: RowProps) {
  const bg = BOX_BG[state.box]
  const pct = masteryPercent(state)
  const exposures = useMemo(
    () => lastExposures(state.letter, sessions, 30),
    [state.letter, sessions],
  )
  const confused = useMemo(() => topConfused(state, 3), [state])

  const rowId = `letter-row-${state.letter}`
  return (
    <div
      data-testid={rowId}
      data-letter={state.letter}
      data-box={state.box}
      style={{
        background: bg,
        borderRadius: 10,
        padding: 12,
        marginBottom: 6,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`${rowId}-detail`}
        data-testid={`${rowId}-toggle`}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '40px 1fr 140px',
          alignItems: 'center',
          gap: 12,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          color: '#2d2d33',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          {toUpper(state.letter)}
        </div>
        <div style={{ fontSize: 14 }}>
          <span aria-label="poprawne">✅ {state.totalCorrect}</span>{'  '}
          <span aria-label="błędne">❌ {state.totalWrong}</span>{'  '}
          <span aria-label="nie wiem">🤷 {state.totalDontKnow}</span>{'  '}
          <span aria-label="timeout">⏱ {state.totalTimeout}</span>
        </div>
        <div
          aria-label={`mastery ${pct}%, ${BOX_LABEL[state.box]}`}
          data-testid={`${rowId}-mastery`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13,
          }}
        >
          <div
            style={{
              width: 80,
              height: 8,
              background: '#ffffff77',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: '#2d2d33',
              }}
            />
          </div>
          <span>{pct}%</span>
        </div>
      </button>

      {expanded && (
        <div
          id={`${rowId}-detail`}
          data-testid={`${rowId}-detail`}
          style={{
            marginTop: 10,
            padding: 12,
            background: '#ffffffcc',
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <strong>Trend ostatnich {exposures.length || 0} ekspozycji:</strong>{' '}
              <Sparkline outcomes={exposures} />
            </div>
            <div>
              <strong>Średni czas odpowiedzi:</strong>{' '}
              {state.avgResponseMs > 0
                ? `${(state.avgResponseMs / 1000).toFixed(1)}s`
                : 'brak danych'}
            </div>
            <div>
              <strong>Mylone z:</strong>{' '}
              {confused.length === 0
                ? 'brak danych'
                : confused
                    .map(
                      (c) =>
                        `${toUpper(state.letter)} mylone z ${toUpper(c.letter)} ${c.count} razy`,
                    )
                    .join(', ')}
            </div>
            <div>
              <strong>Styl pisma:</strong> drukowane{' '}
              {state.perStyle.print.correct}/
              {state.perStyle.print.correct + state.perStyle.print.wrong}, pisane{' '}
              {state.perStyle.handwritten.correct}/
              {state.perStyle.handwritten.correct +
                state.perStyle.handwritten.wrong}
            </div>
            <div>
              <strong>Wielkość:</strong> wielkie {state.perCase.upper.correct}/
              {state.perCase.upper.correct + state.perCase.upper.wrong}, małe{' '}
              {state.perCase.lower.correct}/
              {state.perCase.lower.correct + state.perCase.lower.wrong}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function LettersSection({ letters, sessions }: LettersSectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const sorted = useMemo(() => sortLettersWeakestFirst(letters), [letters])

  return (
    <section
      data-testid="letters-section"
      style={{
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e8e0d2',
        borderRadius: 12,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Litery</h2>
      {sorted.length === 0 ? (
        <div data-testid="letters-empty" style={{ color: '#888' }}>
          Brak danych — dziecko jeszcze nie ćwiczyło żadnej litery.
        </div>
      ) : (
        sorted.map((s) => (
          <LetterRow
            key={s.letter}
            state={s}
            sessions={sessions}
            expanded={expanded === s.letter}
            onToggle={() =>
              setExpanded((cur) => (cur === s.letter ? null : s.letter))
            }
          />
        ))
      )}
    </section>
  )
}

// Eksport pomocnika dla testów / exporter
export function eventsForLetterFromSessions(
  letter: string,
  sessions: SessionLog[],
): Array<{ outcome: 'correct' | 'wrong' | 'dontKnow' | 'timeout'; ts: number }> {
  const out: Array<{ outcome: 'correct' | 'wrong' | 'dontKnow' | 'timeout'; ts: number }> = []
  for (const session of sessions) {
    let pendingTarget: string | null = null
    let pendingTs = 0
    for (const ev of session.events as SessionEvent[]) {
      if (ev.type === 'question-start') {
        pendingTarget = ev.targetLetter
        pendingTs = ev.ts
      } else if (ev.type === 'answer' && pendingTarget !== null) {
        if (pendingTarget === letter) {
          out.push({ outcome: ev.outcome, ts: pendingTs })
        }
        pendingTarget = null
      }
    }
  }
  return out
}
