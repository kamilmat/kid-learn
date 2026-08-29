// Eksport raportu rodzica do tekstu Markdown — sekcja 14.6 spec.
//
// Pure function. Generuje cały raport jako string MD. Sekcje takie same jak
// UI (litery, aktywność, sugestie, flagi). Używa tych samych helperów co
// komponenty (sortowanie, agregacja per dzień, generateSuggestions itd.) —
// gwarancja spójności tekst↔UI.

import type { LetterState } from '@/shared/srs/types'
import type { Settings } from '@/shared/settings/types'
import { ALL_LEVELS, LEVEL_LABEL, getEffectiveTimeLimit } from '@/shared/settings/defaults'
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
import { completedSessionsToday } from './todaySessions'
import { collectFlagsForRecentSessions } from './components/AntiCheatSection'
import { antiCheatFlagText } from '@/shared/engagement/antiCheatFlags'
import {
  FALLBACK_SUGGESTION,
  generateSuggestions as generateNextSteps,
  type SuggestionReadingSnapshot,
} from './suggestions'
import {
  STATS_MODULE_LABEL,
  type StatsModuleId,
  type UnifiedSession,
} from './aggregate'
import { CONCEPTS } from '@/modules/numbers/data/concepts'
import { CONCEPT_LABELS } from '@/modules/numbers/data/conceptLabels'
import { formatFactId } from './components/NumbersStats'
import type {
  ConceptId,
  ConceptMastery,
  MathFactState,
} from '@/modules/numbers/types'
import { CZYTANKI, GROUP_ORDER, getCzytankiByGroup } from '@/modules/czytanki/data/czytanki'
import { wordAudioKey } from '@/modules/czytanki/data/audioKeys'

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

// LEVEL_LABEL importowany z settings/defaults — single source of truth.

/**
 * Generuje pełny raport rodzica jako Markdown.
 */
export type NumbersSnapshot = {
  facts: Record<string, MathFactState>
  concepts: Partial<Record<ConceptId, ConceptMastery>>
}

export type CzytankiSnapshot = {
  openedIds: string[]
  wordTaps?: Record<string, Record<string, number>>
  timeMs?: Record<string, number>
  /** id czytanki → ile razy przeczytana (wejścia na ekran). */
  readCounts?: Record<string, number>
}


/**
 * Slug audio → tekst słowa z sylabami (`WIE-WIÓR-KA`). Budowane leniwie raz —
 * 60 czytanek × kilkanaście słów, a raport otwiera się wielokrotnie.
 */
let wordLabelBySlug: Map<string, string> | null = null

function getWordLabelBySlug(): Map<string, string> {
  if (wordLabelBySlug) return wordLabelBySlug
  const map = new Map<string, string>()
  for (const cz of CZYTANKI) {
    for (const sentence of cz.sentences) {
      for (const word of sentence) {
        const slug = wordAudioKey(word.syllables).replace('cz-word-', '')
        if (!map.has(slug)) map.set(slug, word.syllables.join('-'))
      }
    }
  }
  wordLabelBySlug = map
  return map
}

export type TappedWord = { slug: string; label: string; count: number }

/** Top 5 najczęściej dotykanych słów, malejąco. Remisy rozstrzyga slug (stabilność). */
export function topTappedWords(
  wordTaps: Record<string, Record<string, number>>,
  limit = 5,
): TappedWord[] {
  const totals = new Map<string, number>()
  for (const perCzytanka of Object.values(wordTaps)) {
    for (const [slug, n] of Object.entries(perCzytanka)) {
      totals.set(slug, (totals.get(slug) ?? 0) + n)
    }
  }
  const labels = getWordLabelBySlug()
  return Array.from(totals.entries())
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([slug, count]) => ({ slug, label: labels.get(slug) ?? slug, count }))
}

const MODULE_ORDER: StatsModuleId[] = ['letters', 'reading', 'numbers']

export function exportReportToMarkdown(
  letters: Record<string, LetterState>,
  allSessions: UnifiedSession[],
  settings: Settings,
  now: number,
  numbersSnapshot?: NumbersSnapshot,
  czytankiSnapshot?: CzytankiSnapshot,
  readingSnapshot?: SuggestionReadingSnapshot,
): string {
  // Sugestie działają wyłącznie na SRS liter — filtrujemy sesje modułu 1,
  // reszta sekcji (Aktywność, Flagi) używa scalonej listy ze wszystkich modułów.
  const sessions = allSessions.filter((s) => s.module === 'letters')
  const lines: string[] = []
  lines.push('# Raport Iskierki')
  lines.push('')
  lines.push(`Wygenerowano: ${fmtDate(now)}`)
  lines.push('')

  // ---- Następny krok ----
  // Ten sam silnik co karta w UI — kontrakt „treść UI ≡ markdown".
  const nextSteps = generateNextSteps({
    now,
    letters,
    allSessions,
    ...(readingSnapshot ? { reading: readingSnapshot } : {}),
    ...(numbersSnapshot ? { numbers: numbersSnapshot } : {}),
    ...(czytankiSnapshot
      ? {
          czytanki: {
            openedIds: czytankiSnapshot.openedIds,
            readCounts: czytankiSnapshot.readCounts ?? {},
          },
        }
      : {}),
  })
  const nextStep = nextSteps[0] ?? FALLBACK_SUGGESTION
  lines.push('## Następny krok')
  lines.push('')
  lines.push(`**${nextStep.text}**`)
  lines.push('')
  lines.push(nextStep.why)
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
  const today = rangeAggregate(allSessions, todayStart, todayStart + MS_PER_DAY)
  const yesterday = rangeAggregate(allSessions, yesterdayStart, todayStart)
  const week = rangeAggregate(allSessions, weekStart, todayStart + MS_PER_DAY)
  const streak = streakDays(allSessions, now)
  lines.push(`- Dziś: ${today.questions} pytań / ${fmtMin(today.durationMs)}`)
  lines.push(
    `- Wczoraj: ${yesterday.questions} pytań / ${fmtMin(yesterday.durationMs)}`,
  )
  lines.push(`- Tydzień: ${week.questions} pytań / ${fmtMin(week.durationMs)}`)
  lines.push(`- Streak: ${streak} dni`)
  lines.push('')

  // Rozbicie wyników na poprawne / błędne / „nie wiem" — `rangeAggregate`
  // liczy tylko pytania i czas, a „nie wiem" nie jest pomyłką.
  const outcomeRollup = (
    scoped: UnifiedSession[],
    fromTs: number,
    toTs: number,
  ): { correct: number; wrong: number; dontKnow: number } => {
    let correct = 0
    let wrong = 0
    let dontKnow = 0
    for (const s of scoped) {
      if (s.startedAt < fromTs || s.startedAt >= toTs) continue
      correct += s.correct
      wrong += s.wrong
      dontKnow += s.dontKnow
    }
    return { correct, wrong, dontKnow }
  }
  const weekOutcomes = outcomeRollup(
    allSessions,
    weekStart,
    todayStart + MS_PER_DAY,
  )
  lines.push(
    `- Tydzień — wyniki: ${weekOutcomes.correct} poprawnych, ${weekOutcomes.wrong} błędnych, ${weekOutcomes.dontKnow}× „nie wiem"`,
  )

  const todayByModule = MODULE_ORDER.map((m) => ({
    m,
    agg: rangeAggregate(
      allSessions.filter((s) => s.module === m),
      todayStart,
      todayStart + MS_PER_DAY,
    ),
  })).filter((x) => x.agg.sessions > 0)
  if (todayByModule.length > 0) {
    lines.push('- Dziś wg modułu:')
    for (const { m, agg: a } of todayByModule) {
      lines.push(`  - ${STATS_MODULE_LABEL[m]}: ${a.sessions} sesji, ${a.questions} pytań`)
    }
  }
  const weekByModule = MODULE_ORDER.map((m) => ({
    m,
    agg: rangeAggregate(
      allSessions.filter((s) => s.module === m),
      weekStart,
      todayStart + MS_PER_DAY,
    ),
  })).filter((x) => x.agg.sessions > 0)
  if (weekByModule.length > 0) {
    lines.push('- Tydzień wg modułu:')
    for (const { m, agg: a } of weekByModule) {
      const o = outcomeRollup(
        allSessions.filter((s) => s.module === m),
        weekStart,
        todayStart + MS_PER_DAY,
      )
      lines.push(
        `  - ${STATS_MODULE_LABEL[m]}: ${a.sessions} sesji, ${a.questions} pytań (${o.correct} ✓ / ${o.wrong} ✗ / ${o.dontKnow}× „nie wiem")`,
      )
    }
  }
  lines.push('')

  const days = lastNDays(now, 14)
  const agg = aggregatePerDay(allSessions)
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
  // Te same pozycje co „Więcej sugestii" w UI — karta (`[0]`) już wyżej.
  for (const s of nextSteps.slice(1)) {
    lines.push(`- ${s.text} — ${s.why}`)
  }
  // Ta sama funkcja karmi UI i markdown — treść musi być identyczna, więc
  // nudge „druga sesja wieczorem" liczymy tu tak samo jak w `ReportScreen`.
  for (const s of generateSuggestions(
    letters,
    sessions,
    completedSessionsToday(allSessions, now),
  )) {
    lines.push(`- ${s}`)
  }
  lines.push('')

  // ---- Flagi anti-cheat ----
  lines.push('## Flagi zaangażowania (ostatnie 5 sesji)')
  lines.push('')
  const flags = collectFlagsForRecentSessions(allSessions, 5)
  const sessionById = new Map(allSessions.map((s) => [s.id, s]))
  if (flags.length === 0) {
    lines.push('_Brak flag — wygląda na rzetelne ćwiczenie._')
  } else {
    for (const fws of flags) {
      const icon = fws.flag.severity === 'alert' ? '🚨' : '⚠'
      const moduleLabel = sessionById.get(fws.sessionId)?.moduleLabel ?? ''
      const { title, hint } = antiCheatFlagText(fws.flag.type)
      lines.push(
        `- ${icon} ${title} ${hint} · ${moduleLabel} · sesja ${fmtDate(fws.sessionStartedAt)}`,
      )
    }
  }
  lines.push('')

  // ---- Ustawienia (krótko, dla kontekstu nauczyciela) ----
  lines.push('## Ustawienia')
  lines.push('')
  lines.push(`- Długość sesji: ${settings.questionsPerSession} pytań`)
  lines.push('- Limit czasu (per poziom):')
  for (const lvl of ALL_LEVELS) {
    const limit = getEffectiveTimeLimit(settings, lvl)
    const label = limit === 'off' ? 'wyłączony' : `${limit}s`
    lines.push(`  - ${LEVEL_LABEL[lvl]}: ${label}`)
  }
  lines.push(
    `- Domyślny poziom: ${settings.defaultLevel === 'last-used' ? 'ostatnio używany' : LEVEL_LABEL[settings.defaultLevel]}`,
  )
  lines.push(
    `- Druga próba po błędzie: ${settings.secondAttempt ? 'włączona' : 'wyłączona'}`,
  )
  lines.push('')

  // ---- Matematyka ----
  if (numbersSnapshot) {
    lines.push('## Matematyka')
    lines.push('')
    const allConcepts = Object.values(CONCEPTS)
    const masteredCount = allConcepts.filter(
      (c) => numbersSnapshot.concepts[c.id]?.state === 'mastered',
    ).length
    const learningCount = allConcepts.filter(
      (c) => numbersSnapshot.concepts[c.id]?.state === 'learning',
    ).length
    lines.push(
      `- **Koncepty**: opanowane ${masteredCount}/${allConcepts.length}, w nauce ${learningCount}`,
    )
    const masteredLabels = allConcepts
      .filter((c) => numbersSnapshot.concepts[c.id]?.state === 'mastered')
      .map((c) => CONCEPT_LABELS[c.id])
    if (masteredLabels.length > 0) {
      lines.push(`  - Opanowane: ${masteredLabels.join(', ')}`)
    }
    const factStates = Object.values(numbersSnapshot.facts)
    const difficult = factStates
      .filter((f) => f.recentWrong > 0)
      .sort((a, b) => {
        if (b.recentWrong !== a.recentWrong) return b.recentWrong - a.recentWrong
        return a.box - b.box
      })
      .slice(0, 10)
    if (difficult.length > 0) {
      lines.push(
        `- **Najtrudniejsze fakty (top 10)**: ${difficult
          .map((f) => `${formatFactId(f.id)} (${f.recentWrong}×wrong)`)
          .join(', ')}`,
      )
    } else {
      lines.push('- **Najtrudniejsze fakty**: brak — wszystko idzie!')
    }
    lines.push('')
  }

  // ---- Czytanki ----
  if (czytankiSnapshot) {
    lines.push('## Czytanki')
    lines.push('')
    lines.push(`- **Otwarte**: ${czytankiSnapshot.openedIds.length}/${CZYTANKI.length}`)
    for (const g of GROUP_ORDER) {
      const inGroup = getCzytankiByGroup(g)
      const n = inGroup.filter((c) => czytankiSnapshot.openedIds.includes(c.id)).length
      lines.push(`  - Grupa ${g}: ${n}/${inGroup.length}`)
    }
    // Kontrakt: te dwie linie muszą mówić to samo co sekcja Czytanki w UI raportu.
    const readCounts = czytankiSnapshot.readCounts ?? {}
    const repeats = CZYTANKI.filter((c) => (readCounts[c.id] ?? 0) >= 2)
    lines.push(`- **Przeczytane ≥2×**: ${repeats.length}`)
    if (repeats.length > 0) {
      lines.push(`  - ${repeats.map((c) => `${c.emoji} ${c.title}`).join(', ')}`)
    }
    const topTaps = topTappedWords(czytankiSnapshot.wordTaps ?? {})
    if (topTaps.length > 0) {
      lines.push(
        `- **Najczęściej dotykane**: ${topTaps.map((t) => `${t.label} — ${t.count}×`).join(', ')}`,
      )
    }
    const totalMs = Object.values(czytankiSnapshot.timeMs ?? {}).reduce((a, b) => a + b, 0)
    if (totalMs > 0) {
      lines.push(`- **Łączny czas czytania**: ${Math.round(totalMs / 60000)} min`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
