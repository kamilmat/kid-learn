// Eksport raportu rodzica do tekstu Markdown — sekcja 14.6 spec.
//
// Pure function. Generuje cały raport jako string MD. Sekcje takie same jak
// UI (litery, aktywność, sugestie, flagi). Używa tych samych helperów co
// komponenty (sortowanie, agregacja per dzień, generateSuggestions itd.) —
// gwarancja spójności tekst↔UI.

import type { LetterState } from '@/shared/srs/types'
import type { SessionLog } from '@/shared/stats/types'
import type { Settings } from '@/shared/settings/types'
import { getEffectiveTimeLimit } from '@/shared/settings/defaults'
import { toUpper } from '@/modules/letters/data/alphabet'
import {
  masteryPercent,
  sortLettersWeakestFirst,
} from './components/LettersSection'
import {
  aggregatePerDay,
  lastNDays,
  rangeAggregate,
  streakDays,
} from './components/ActivitySection'
import { generateSuggestions } from './components/SuggestionsSection'
import {
  collectFlagsForRecentSessions,
  FLAG_LABEL,
} from './components/AntiCheatSection'

const MS_PER_DAY = 24 * 60 * 60 * 1_000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function fmtMin(ms: number): string {
  return `${Math.round(ms / 60_000)} min`
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

const LEVEL_LABEL = {
  iskierka: 'Iskierka',
  plomyk: 'Płomyk',
  ognik: 'Ognik',
  pochodnia: 'Pochodnia',
} as const

/**
 * Generuje pełny raport rodzica jako Markdown.
 */
export function exportReportToMarkdown(
  letters: Record<string, LetterState>,
  sessions: SessionLog[],
  settings: Settings,
  now: number,
): string {
  const lines: string[] = []
  lines.push('# Raport Iskierki')
  lines.push('')
  lines.push(`Wygenerowano: ${fmtDate(now)}`)
  lines.push('')

  // ---- Litery ----
  lines.push('## Litery')
  lines.push('')
  const sorted = sortLettersWeakestFirst(letters)
  if (sorted.length === 0) {
    lines.push('_Brak danych — dziecko jeszcze nie ćwiczyło żadnej litery._')
    lines.push('')
  } else {
    lines.push('| Litera | ✅ | ❌ | 🤷 | ⏱ | Box | Mastery |')
    lines.push('|---|---:|---:|---:|---:|---:|---:|')
    for (const s of sorted) {
      lines.push(
        `| ${toUpper(s.letter)} | ${s.totalCorrect} | ${s.totalWrong} | ${s.totalDontKnow} | ${s.totalTimeout} | ${s.box} | ${masteryPercent(s)}% |`,
      )
    }
    lines.push('')
  }

  // ---- Aktywność ----
  lines.push('## Aktywność')
  lines.push('')
  const todayStart = startOfDay(now)
  const yesterdayStart = todayStart - MS_PER_DAY
  const weekStart = todayStart - 6 * MS_PER_DAY
  const today = rangeAggregate(sessions, todayStart, todayStart + MS_PER_DAY)
  const yesterday = rangeAggregate(sessions, yesterdayStart, todayStart)
  const week = rangeAggregate(sessions, weekStart, todayStart + MS_PER_DAY)
  const streak = streakDays(sessions, now)
  lines.push(`- Dziś: ${today.questions} pytań / ${fmtMin(today.durationMs)}`)
  lines.push(
    `- Wczoraj: ${yesterday.questions} pytań / ${fmtMin(yesterday.durationMs)}`,
  )
  lines.push(`- Tydzień: ${week.questions} pytań / ${fmtMin(week.durationMs)}`)
  lines.push(`- Streak: ${streak} dni`)
  lines.push('')

  const days = lastNDays(now, 14)
  const agg = aggregatePerDay(sessions)
  lines.push('### Ostatnie 14 dni')
  lines.push('')
  lines.push('| Dzień | Sesje | Pytania | Czas |')
  lines.push('|---|---:|---:|---:|')
  for (const d of days) {
    const a = agg[d.dayKey] ?? {
      sessions: 0,
      questions: 0,
      durationMs: 0,
    }
    lines.push(
      `| ${d.dayKey} | ${a.sessions} | ${a.questions} | ${fmtMin(a.durationMs)} |`,
    )
  }
  lines.push('')

  // ---- Sugestie ----
  lines.push('## Sugestie')
  lines.push('')
  for (const s of generateSuggestions(letters, sessions)) {
    lines.push(`- ${s}`)
  }
  lines.push('')

  // ---- Flagi anti-cheat ----
  lines.push('## Flagi zaangażowania (ostatnie 5 sesji)')
  lines.push('')
  const flags = collectFlagsForRecentSessions(sessions, 5)
  if (flags.length === 0) {
    lines.push('_Brak flag — wygląda na rzetelne ćwiczenie._')
  } else {
    for (const fws of flags) {
      const icon = fws.flag.severity === 'alert' ? '🚨' : '⚠'
      lines.push(
        `- ${icon} ${FLAG_LABEL[fws.flag.type]} — ${fws.flag.severity === 'alert' ? 'alert' : 'ostrzeżenie'} · sesja ${fmtDate(fws.sessionStartedAt)}`,
      )
    }
  }
  lines.push('')

  // ---- Ustawienia (krótko, dla kontekstu nauczyciela) ----
  lines.push('## Ustawienia')
  lines.push('')
  lines.push(`- Długość sesji: ${settings.sessionLength} pytań`)
  lines.push('- Limit czasu (per poziom):')
  for (const lvl of (['iskierka', 'plomyk', 'ognik', 'pochodnia'] as const)) {
    const v = getEffectiveTimeLimit(settings, lvl)
    const label = v === 'off' ? 'wyłączony' : `${v}s`
    lines.push(`  - ${LEVEL_LABEL[lvl]}: ${label}`)
  }
  lines.push(
    `- Domyślny poziom: ${settings.defaultLevel === 'last-used' ? 'ostatnio używany' : LEVEL_LABEL[settings.defaultLevel]}`,
  )
  lines.push('')

  return lines.join('\n')
}
