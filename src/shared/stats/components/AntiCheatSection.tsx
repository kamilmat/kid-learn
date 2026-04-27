// AntiCheatSection — sekcja 14.5 spec.
//
// Dla ostatnich N (5) sesji wywołuje analyzeSession(events) i pokazuje listę
// flag z timestampem sesji. Severity 'alert' = 🚨, 'warning' = ⚠.

import { useMemo } from 'react'
import {
  analyzeSession,
  type AntiCheatFlag,
  type AntiCheatFlagType,
} from '@/shared/engagement/antiCheatFlags'
import type { SessionLog } from '@/shared/stats/types'

export type AntiCheatSectionProps = {
  sessions: SessionLog[]
  /** Ile ostatnich sesji analizować. Domyślnie 5. */
  recentN?: number
}

export const FLAG_LABEL: Record<AntiCheatFlagType, string> = {
  'fast-click': 'Szybkie klikanie',
  'same-position': 'Powtarzające się pozycje',
  'no-answer': 'Brak odpowiedzi',
  'many-dont-know': 'Wiele „nie wiem"',
  visibility: 'Opuszczenie ekranu',
  'long-inactivity': 'Bardzo długa przerwa',
}

export type FlagWithSession = {
  flag: AntiCheatFlag
  sessionId: string
  sessionStartedAt: number
}

export function collectFlagsForRecentSessions(
  sessions: SessionLog[],
  recentN: number,
): FlagWithSession[] {
  const sliced =
    sessions.length > recentN
      ? sessions.slice(sessions.length - recentN)
      : sessions
  const out: FlagWithSession[] = []
  for (const s of sliced) {
    const flags = analyzeSession(s.events)
    for (const f of flags) {
      out.push({
        flag: f,
        sessionId: s.id,
        sessionStartedAt: s.startedAt,
      })
    }
  }
  return out
}

function formatSessionTs(ts: number): string {
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm} ${hh}:${min}`
}

export function AntiCheatSection({
  sessions,
  recentN = 5,
}: AntiCheatSectionProps) {
  const flags = useMemo(
    () => collectFlagsForRecentSessions(sessions, recentN),
    [sessions, recentN],
  )

  return (
    <section
      data-testid="anticheat-section"
      style={{
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e8e0d2',
        borderRadius: 12,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Flagi zaangażowania</h2>
      {flags.length === 0 ? (
        <div data-testid="anticheat-empty" style={{ color: '#888' }}>
          Brak flag w ostatnich sesjach — wygląda na rzetelne ćwiczenie.
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {flags.map((fws, i) => (
            <li
              key={i}
              data-testid="anticheat-flag"
              data-flag-type={fws.flag.type}
              data-severity={fws.flag.severity}
              style={{
                padding: '6px 0',
                borderBottom: '1px dashed #e8e0d2',
                fontSize: 14,
                display: 'flex',
                gap: 8,
              }}
            >
              <span aria-hidden="true">
                {fws.flag.severity === 'alert' ? '🚨' : '⚠'}
              </span>
              <span>
                <strong>{FLAG_LABEL[fws.flag.type]}</strong>
                {' — '}
                {fws.flag.severity === 'alert' ? 'alert' : 'ostrzeżenie'}
                {' · sesja '}
                {formatSessionTs(fws.sessionStartedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
