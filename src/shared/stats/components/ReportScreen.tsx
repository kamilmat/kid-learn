// ReportScreen — sekcja 14 spec.
//
// Główny ekran raportu rodzica. Bez unlocku → MathGate. Po unlocku → 5
// scrollowalnych sekcji + przycisk "Skopiuj raport" w toolbar.

import { useCallback, useMemo, useState } from 'react'
import { colors } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { MathGate } from '@/shared/settings/components/MathGate'
import { useSettings } from '@/shared/settings/settingsStore'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { useReading } from '@/modules/reading/store/readingStore'
import { useNumbers } from '@/modules/numbers/store/numbersStore'
import { useCzytanki } from '@/modules/czytanki/store/czytankiStore'
import { ALL_WORDS } from '@/modules/reading/data/words'
import { ALL_SYLLABLES } from '@/modules/reading/data/syllables'
import { CZYTANKI, GROUP_ORDER, getCzytankiByGroup } from '@/modules/czytanki/data/czytanki'
import { exportReportToMarkdown, topTappedWords } from '@/shared/stats/exporter'
import { toUnifiedSessions } from '@/shared/stats/aggregate'
import {
  FALLBACK_SUGGESTION,
  generateSuggestions,
} from '@/shared/stats/suggestions'
import { POLISH_ALPHABET } from '@/modules/letters/data/alphabet'
import { CONCEPTS } from '@/modules/numbers/data/concepts'
import { LettersSection } from './LettersSection'
import { CollapsibleSection } from './CollapsibleSection'
import { NextStepCard } from './NextStepCard'
import { ActivitySection, streakDays } from './ActivitySection'
import { LiveSessionSection } from './LiveSessionSection'
import { SuggestionsSection } from './SuggestionsSection'
import { AntiCheatSection, collectFlagsForRecentSessions } from './AntiCheatSection'
import { NumbersStats } from './NumbersStats'

const PHONEMES = [
  { fonem: 'SZ', label: 'SZ' },
  { fonem: 'CZ', label: 'CZ' },
  { fonem: 'RZ', label: 'RZ' },
  { fonem: 'CH', label: 'CH' },
  { fonem: 'Ś', label: 'Ś' },
  { fonem: 'Ć', label: 'Ć' },
  { fonem: 'Ź', label: 'Ź' },
  { fonem: 'Ń', label: 'Ń' },
  { fonem: 'Ó', label: 'Ó' },
  { fonem: 'Ż', label: 'Ż' },
] as const

function ReadingStats() {
  const syllables = useReading((s) => s.syllables)
  const words = useReading((s) => s.words)
  const albumUnlocked = useReading((s) => s.albumUnlocked)

  const syllableEntries = useMemo(() => Object.values(syllables), [syllables])
  const masteredSyl = useMemo(
    () => syllableEntries.filter((s) => s.box >= 5),
    [syllableEntries],
  )
  const difficultSyl = useMemo(
    () => syllableEntries.filter((s) => s.recentWrong > 0 || s.box <= 2),
    [syllableEntries],
  )

  // Skan 10 fonemów × 67 słów — przelicza się tylko gdy zmieni się stan słów,
  // nie przy każdym renderze raportu.
  const heatmap = useMemo(
    () =>
      PHONEMES.map((p) => {
        const wordsContaining = ALL_WORDS.filter((w) =>
          w.text.toUpperCase().includes(p.fonem),
        )
        const states = wordsContaining
          .map((w) => words[w.id])
          .filter((s): s is NonNullable<typeof s> => s !== undefined)
        if (states.length === 0)
          return { ...p, difficulty: null as number | null, sampleSize: 0 }
        const avgDifficulty =
          states.reduce((sum, s) => sum + (s.recentWrong + (5 - s.box)), 0) /
          states.length
        return { ...p, difficulty: avgDifficulty, sampleSize: states.length }
      }),
    [words],
  )

  const sectionStyle = {
    padding: 16,
    background: '#ffffff',
    border: '1px solid #e2e2e8',
    borderRadius: 12,
  }

  return (
    <section
      data-testid="reading-stats-section"
      style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}
    >
      <h2 style={{ margin: 0, fontSize: 20 }}>Czytanie (moduł 2)</h2>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Sylaby</h3>
        <p style={{ margin: '0 0 4px' }}>
          Opanowane: {masteredSyl.length} / {ALL_SYLLABLES.length}
        </p>
        {difficultSyl.length > 0 && (
          <p style={{ margin: 0, color: '#dc2626' }}>
            Trudne:{' '}
            {difficultSyl
              .map((s) => s.id)
              .slice(0, 20)
              .join(', ')}
            {difficultSyl.length > 20 ? ` +${difficultSyl.length - 20}` : ''}
          </p>
        )}
        {difficultSyl.length === 0 && syllableEntries.length > 0 && (
          <p style={{ margin: 0, color: '#059669' }}>Brak trudnych sylab!</p>
        )}
        {syllableEntries.length === 0 && (
          <p style={{ margin: 0, color: '#6b7280' }}>
            Brak danych (sesja nie została jeszcze rozpoczęta)
          </p>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Słowa (Album)</h3>
        <p style={{ margin: 0 }}>
          Odblokowane: {albumUnlocked.length} / {ALL_WORDS.length}
        </p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
          Heatmapa fonemów polskich
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Kolor: zielony = łatwy, żółty = średni, czerwony = trudny. n = liczba
          słów z danymi.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
          }}
        >
          {heatmap.map((p) => (
            <div
              key={p.fonem}
              data-testid={`phoneme-cell-${p.fonem}`}
              style={{
                padding: 8,
                borderRadius: 8,
                textAlign: 'center' as const,
                fontWeight: 700,
                fontSize: 18,
                background:
                  p.difficulty === null
                    ? '#f3f4f6'
                    : p.difficulty <= 1
                      ? '#d1fae5'
                      : p.difficulty <= 3
                        ? '#fef3c7'
                        : '#fee2e2',
              }}
            >
              {p.label}
              <div style={{ fontSize: 10, fontWeight: 400 }}>
                n={p.sampleSize}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CzytankiStats() {
  const openedIds = useCzytanki((s) => s.openedIds)
  const wordTaps = useCzytanki((s) => s.wordTaps)
  const timeMs = useCzytanki((s) => s.timeMs)
  const readCounts = useCzytanki((s) => s.readCounts)

  // Powtórne czytanie tej samej czytanki to sygnał płynności, nie nudy —
  // rodzic widzi, co dziecko wraca czytać samo.
  const repeatList = useMemo(
    () => CZYTANKI.filter((c) => (readCounts[c.id] ?? 0) >= 2),
    [readCounts],
  )

  const topTaps = useMemo(() => topTappedWords(wordTaps), [wordTaps])
  const totalMinutes = useMemo(
    () => Math.round(Object.values(timeMs).reduce((a, b) => a + b, 0) / 60000),
    [timeMs],
  )

  const openedList = useMemo(
    () => CZYTANKI.filter((c) => openedIds.includes(c.id)),
    [openedIds],
  )

  const sectionStyle = {
    padding: 16,
    background: '#ffffff',
    border: '1px solid #e2e2e8',
    borderRadius: 12,
  }

  return (
    <section
      data-testid="czytanki-stats-section"
      style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}
    >
      <h2 style={{ margin: 0, fontSize: 20 }}>Czytanki (moduł 4)</h2>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Otwarte czytanki</h3>
        <p style={{ margin: '0 0 4px' }}>
          Otwarte: {openedIds.length} / {CZYTANKI.length}
        </p>
        {GROUP_ORDER.map((g) => {
          const inGroup = getCzytankiByGroup(g)
          const n = inGroup.filter((c) => openedIds.includes(c.id)).length
          return (
            <p key={g} style={{ margin: '0 0 2px', fontSize: 13, color: '#6b7280' }}>
              Grupa {g}: {n}/{inGroup.length}
            </p>
          )
        })}
        <p style={{ margin: '4px 0 0' }} data-testid="czytanki-repeats">
          Przeczytane ≥2×: {repeatList.length}
        </p>
        {repeatList.length > 0 && (
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {repeatList.map((c) => `${c.emoji} ${c.title}`).join(', ')}
          </p>
        )}
        {openedList.length > 0 ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
            {openedList.map((c) => `${c.emoji} ${c.title}`).join(', ')}
          </p>
        ) : (
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
            Brak danych (żadna czytanka nie została jeszcze otwarta)
          </p>
        )}
      </div>

      {(topTaps.length > 0 || totalMinutes > 0) && (
        <div style={sectionStyle} data-testid="czytanki-taps">
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Najczęściej dotykane</h3>
          {topTaps.length > 0 ? (
            topTaps.map((t) => (
              <p key={t.slug} style={{ margin: '0 0 2px', fontSize: 13 }}>
                {t.label} — {t.count}×
              </p>
            ))
          ) : (
            <p style={{ margin: '0 0 2px', color: '#6b7280' }}>Brak danych</p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
            Łączny czas czytania: {totalMinutes} min
          </p>
        </div>
      )}
    </section>
  )
}

export type ReportScreenProps = {
  onExit?: () => void
  /** Wstrzykiwane dla determinizmu testów. */
  now?: () => number
  /** Override clipboard writer dla testów. */
  copyToClipboard?: (text: string) => Promise<void>
}

const COPY_FEEDBACK_MS = 2_000

async function defaultCopyToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(text)
    return
  }
  // jsdom / brak clipboard — silent fallback (test env). Throw, żeby wywołujący
  // wiedział że nie zadziałało; ReportScreen łapie i pokazuje "Nie udało się".
  throw new Error('clipboard-unavailable')
}

export function ReportScreen({
  onExit,
  now = () => Date.now(),
  copyToClipboard = defaultCopyToClipboard,
}: ReportScreenProps) {
  // Używamy isUnlocked(now) — to selektor z store, który zwraca boolean.
  const isUnlocked = useSettings((s) => s.isUnlocked)
  const lockGate = useSettings((s) => s.lockGate)
  const settings = useSettings((s) => s.settings)
  const letters = useLetters((s) => s.letters)
  const sessions = useLetters((s) => s.sessions)
  const readingSessions = useReading((s) => s.sessions)
  const numbersSessions = useNumbers((s) => s.sessions)
  // Snapshoty wszystkich modułów — karmią silnik „Następny krok" i podsumowania
  // w nagłówkach zwiniętych sekcji.
  const syllables = useReading((s) => s.syllables)
  const readingWords = useReading((s) => s.words)
  const numbersFacts = useNumbers((s) => s.facts)
  const numbersConcepts = useNumbers((s) => s.concepts)
  const czytankiOpenedIds = useCzytanki((s) => s.openedIds)
  const czytankiReadCounts = useCzytanki((s) => s.readCounts)
  const czytankiLastCountedAt = useCzytanki((s) => s.lastCountedAt)

  // Raport rodzica pokazuje całą aplikację, nie tylko moduł 1 — Aktywność,
  // Ostatnia sesja i Flagi zaangażowania jadą na scalonej liście sesji.
  const allSessions = useMemo(
    () =>
      toUnifiedSessions({
        letters: sessions,
        reading: readingSessions,
        numbers: numbersSessions,
      }),
    [sessions, readingSessions, numbersSessions],
  )

  // Rerender hook dla MathGate sukcesu
  const [, setUnlockTick] = useState(0)
  const [copyStatus, setCopyStatus] = useState<
    'idle' | 'copied' | 'error'
  >('idle')

  const unlocked = isUnlocked(now())
  // Kwantyzacja do pełnej minuty: raport agreguje per dzień, a stabilna wartość
  // sprawia, że tik cooldownu MathGate (co sekundę) nie unieważnia useMemo
  // w sekcjach zależnych od `now`.
  const nowMs = Math.floor(now() / 60_000) * 60_000

  // Jedno policzenie: `[0]` idzie na kartę, reszta do „Więcej sugestii".
  const nextSteps = useMemo(
    () =>
      generateSuggestions({
        now: nowMs,
        letters,
        allSessions,
        reading: { syllables, words: readingWords },
        numbers: { facts: numbersFacts, concepts: numbersConcepts },
        czytanki: {
          openedIds: czytankiOpenedIds,
          readCounts: czytankiReadCounts,
          lastCountedAt: czytankiLastCountedAt,
        },
      }),
    [
      nowMs,
      letters,
      allSessions,
      syllables,
      readingWords,
      numbersFacts,
      numbersConcepts,
      czytankiOpenedIds,
      czytankiReadCounts,
      czytankiLastCountedAt,
    ],
  )

  const handleCopy = useCallback(async () => {
    const numbersSnapshot = {
      facts: useNumbers.getState().facts,
      concepts: useNumbers.getState().concepts,
    }
    const czytankiSnapshot = {
      openedIds: useCzytanki.getState().openedIds,
      wordTaps: useCzytanki.getState().wordTaps,
      timeMs: useCzytanki.getState().timeMs,
      readCounts: useCzytanki.getState().readCounts,
      lastCountedAt: useCzytanki.getState().lastCountedAt,
    }
    const readingSnapshot = {
      syllables: useReading.getState().syllables,
      words: useReading.getState().words,
    }
    const md = exportReportToMarkdown(
      letters,
      allSessions,
      settings,
      now(),
      numbersSnapshot,
      czytankiSnapshot,
      readingSnapshot,
    )
    try {
      await copyToClipboard(md)
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), COPY_FEEDBACK_MS)
    } catch {
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus('idle'), COPY_FEEDBACK_MS)
    }
  }, [copyToClipboard, letters, allSessions, settings, now])

  const handleCancel = useCallback(() => {
    if (onExit) onExit()
  }, [onExit])

  const handleClose = useCallback(() => {
    lockGate()
    if (onExit) onExit()
  }, [lockGate, onExit])

  if (!unlocked) {
    return (
      <MathGate
        reason="aby zobaczyć raport"
        onSuccess={() => setUnlockTick((t) => t + 1)}
        onCancel={handleCancel}
      />
    )
  }

  // Jednolinijkowe podsumowania nagłówków — rodzic ma zobaczyć stan każdej
  // sekcji BEZ rozwijania jej.
  const masteredLetters = Object.values(letters).filter((l) => l.box >= 5).length
  const lettersSummary = `${masteredLetters}/${POLISH_ALPHABET.length} opanowanych`

  const dayStart = new Date(nowMs)
  dayStart.setHours(0, 0, 0, 0)
  const todayQuestions = allSessions
    .filter((s) => s.startedAt >= dayStart.getTime())
    .reduce((n, s) => n + s.questions, 0)
  const activitySummary = `Dziś ${todayQuestions} pytań · streak ${streakDays(allSessions, nowMs)} dni`

  const lastSession = allSessions[allSessions.length - 1]
  const lastSessionSummary = lastSession
    ? `${lastSession.moduleLabel} — ${lastSession.correct}/${lastSession.questions} poprawnych`
    : 'Brak sesji'

  const suggestionsSummary =
    nextSteps.length > 1
      ? `${nextSteps.length - 1} dodatkowych wskazówek`
      : 'Wskazówki dla rodzica'

  const flagCount = useMemo(
    () => collectFlagsForRecentSessions(allSessions, 5).length,
    [allSessions],
  )
  const flagsSummary =
    flagCount === 0
      ? 'Brak flag w ostatnich sesjach'
      : `${flagCount} flag w ostatnich 5 sesjach`

  const masteredSyllables = Object.values(syllables).filter(
    (s) => s.box >= 5,
  ).length
  const readingSummary = `${masteredSyllables}/${ALL_SYLLABLES.length} sylab opanowanych`

  const allConcepts = Object.values(CONCEPTS)
  const masteredConcepts = allConcepts.filter(
    (c) => numbersConcepts[c.id]?.state === 'mastered',
  ).length
  const numbersSummary = `${masteredConcepts}/${allConcepts.length} konceptów opanowanych`

  const czytankiSummary = `${czytankiOpenedIds.length}/${CZYTANKI.length} otwartych`

  return (
    <div
      data-testid="report-screen"
      style={{
        background: colors.bg,
        color: colors.text,
        minHeight: '100vh',
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Raport</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {copyStatus === 'copied' && (
            <span
              data-testid="copy-feedback-success"
              role="status"
              style={{ color: colors.accentGreen, fontSize: 14 }}
            >
              Skopiowano!
            </span>
          )}
          {copyStatus === 'error' && (
            <span
              data-testid="copy-feedback-error"
              role="alert"
              style={{ color: colors.accentOrange, fontSize: 14 }}
            >
              Nie udało się skopiować
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleCopy}
            data-testid="copy-report-button"
          >
            Skopiuj raport
          </Button>
          {onExit && (
            <Button
              variant="secondary"
              onClick={handleClose}
              data-testid="close-report-button"
            >
              Zamknij
            </Button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 880,
          margin: '0 auto',
          paddingBottom: 24,
        }}
      >
        <NextStepCard suggestion={nextSteps[0] ?? FALLBACK_SUGGESTION} />

        <CollapsibleSection
          title="Litery"
          summary={lettersSummary}
          testId="collapsible-letters"
        >
          <LettersSection letters={letters} sessions={sessions} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Aktywność"
          summary={activitySummary}
          testId="collapsible-activity"
        >
          <ActivitySection sessions={allSessions} now={nowMs} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Ostatnia sesja"
          summary={lastSessionSummary}
          testId="collapsible-live"
        >
          <LiveSessionSection sessions={allSessions} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Sugestie"
          summary={suggestionsSummary}
          testId="collapsible-suggestions"
        >
          <SuggestionsSection
            letters={letters}
            sessions={sessions}
            nextSteps={nextSteps}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Flagi zaangażowania"
          summary={flagsSummary}
          testId="collapsible-anticheat"
        >
          <AntiCheatSection sessions={allSessions} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Czytanie"
          summary={readingSummary}
          testId="collapsible-reading"
        >
          <ReadingStats />
        </CollapsibleSection>

        <CollapsibleSection
          title="Cyferki"
          summary={numbersSummary}
          testId="collapsible-numbers"
        >
          <NumbersStats />
        </CollapsibleSection>

        <CollapsibleSection
          title="Czytanki"
          summary={czytankiSummary}
          testId="collapsible-czytanki"
        >
          <CzytankiStats />
        </CollapsibleSection>
      </div>

    </div>
  )
}
