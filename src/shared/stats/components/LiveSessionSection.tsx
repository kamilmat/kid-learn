// LiveSessionSection — sekcja 14.3 spec.
//
// Tabela eventów ostatniej sesji z timestampami HH:MM:SS i opisem akcji.

import type { SessionEvent, SessionLog } from '@/shared/stats/types'
import { LEVEL_LABEL } from '@/shared/settings/defaults'
import { toUpper } from '@/modules/letters/data/alphabet'

export type LiveSessionSectionProps = {
  sessions: SessionLog[]
}

const OUTCOME_ICON: Record<'correct' | 'wrong' | 'dontKnow' | 'timeout', string> = {
  correct: '✅',
  wrong: '❌',
  dontKnow: '🤷',
  timeout: '⏱',
}

const PAUSE_REASON_LABEL: Record<'manual' | 'idle' | 'visibility', string> = {
  manual: 'manualnie',
  idle: 'bezczynność',
  visibility: 'utrata focus tabu',
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

type EventRow = {
  ts: number
  icon: string
  description: string
}

/**
 * Buduje wiersze tabeli z eventów. Pierwszy wiersz to "Sesja zaczęta".
 * Każdy `question-start` poprzedza odpowiednią `answer` — łączymy je w jeden
 * wiersz "Pytanie N: prompt X → Y (Z.Zs)" (jak w spec 14.3).
 */
export function buildEventRows(session: SessionLog): EventRow[] {
  const out: EventRow[] = []
  const totalQuestions = session.events.filter((e) => e.type === 'question-start').length
  out.push({
    ts: session.startedAt,
    icon: '▶',
    description: `Sesja zaczęta (${LEVEL_LABEL[session.level]}, ${totalQuestions} pytań)`,
  })

  let questionNum = 0
  let pendingQuestion: {
    target: string
    ts: number
  } | null = null

  for (const ev of session.events as SessionEvent[]) {
    if (ev.type === 'question-start') {
      questionNum++
      pendingQuestion = { target: ev.targetLetter, ts: ev.ts }
    } else if (ev.type === 'answer') {
      const icon = OUTCOME_ICON[ev.outcome]
      const target = pendingQuestion?.target ?? '?'
      const responseS = (ev.responseMs / 1000).toFixed(1)
      let outcomeText: string
      if (ev.outcome === 'correct') {
        outcomeText = `${icon} ${toUpper(target)}`
      } else if (ev.outcome === 'wrong') {
        outcomeText = `${icon} ${ev.chosenLetter ? toUpper(ev.chosenLetter) : '?'}`
      } else if (ev.outcome === 'dontKnow') {
        outcomeText = `${icon}`
      } else {
        outcomeText = `${icon}`
      }
      out.push({
        ts: ev.ts,
        icon,
        description: `Pytanie ${questionNum}: prompt ${toUpper(target)} → ${outcomeText} (${responseS}s)`,
      })
      pendingQuestion = null
    } else if (ev.type === 'pause') {
      out.push({
        ts: ev.ts,
        icon: '⏸',
        description: `Pauza (${PAUSE_REASON_LABEL[ev.reason]})`,
      })
    } else if (ev.type === 'resume') {
      out.push({
        ts: ev.ts,
        icon: '▶',
        description: 'Wznowienie',
      })
    }
  }
  return out
}

export function LiveSessionSection({ sessions }: LiveSessionSectionProps) {
  const last = sessions.length > 0 ? sessions[sessions.length - 1]! : null

  return (
    <section
      data-testid="live-session-section"
      style={{
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e8e0d2',
        borderRadius: 12,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Ostatnia sesja</h2>
      {!last ? (
        <div data-testid="live-session-empty" style={{ color: '#888' }}>
          Brak sesji.
        </div>
      ) : (
        <table
          data-testid="live-session-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: '#6a6a72' }}>
              <th style={{ padding: '4px 8px', width: 90 }}>Czas</th>
              <th style={{ padding: '4px 8px' }}>Zdarzenie</th>
            </tr>
          </thead>
          <tbody>
            {buildEventRows(last).map((row, i) => (
              <tr key={i} data-testid={`live-session-row-${i}`}>
                <td
                  style={{
                    padding: '4px 8px',
                    fontVariantNumeric: 'tabular-nums',
                    color: '#6a6a72',
                  }}
                >
                  {formatTime(row.ts)}
                </td>
                <td style={{ padding: '4px 8px' }}>{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
