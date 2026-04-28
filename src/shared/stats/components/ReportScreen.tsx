// ReportScreen — sekcja 14 spec.
//
// Główny ekran raportu rodzica. Bez unlocku → MathGate. Po unlocku → 5
// scrollowalnych sekcji + przycisk "Skopiuj raport" w toolbar.

import { useCallback, useState } from 'react'
import { colors } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { MathGate } from '@/shared/settings/components/MathGate'
import { useSettings } from '@/shared/settings/settingsStore'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { useReading } from '@/modules/reading/store/readingStore'
import { ALL_WORDS } from '@/modules/reading/data/words'
import { exportReportToMarkdown } from '@/shared/stats/exporter'
import { LettersSection } from './LettersSection'
import { ActivitySection } from './ActivitySection'
import { LiveSessionSection } from './LiveSessionSection'
import { SuggestionsSection } from './SuggestionsSection'
import { AntiCheatSection } from './AntiCheatSection'

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

  const syllableEntries = Object.values(syllables)
  const masteredSyl = syllableEntries.filter((s) => s.box >= 5)
  const difficultSyl = syllableEntries.filter(
    (s) => s.recentWrong > 0 || s.box <= 2,
  )

  const heatmap = PHONEMES.map((p) => {
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
  })

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
          Opanowane: {masteredSyl.length} / {syllableEntries.length}
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

  // Rerender hook dla MathGate sukcesu
  const [, setUnlockTick] = useState(0)
  const [copyStatus, setCopyStatus] = useState<
    'idle' | 'copied' | 'error'
  >('idle')

  const unlocked = isUnlocked(now())

  const handleCopy = useCallback(async () => {
    const md = exportReportToMarkdown(letters, sessions, settings, now())
    try {
      await copyToClipboard(md)
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), COPY_FEEDBACK_MS)
    } catch {
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus('idle'), COPY_FEEDBACK_MS)
    }
  }, [copyToClipboard, letters, sessions, settings, now])

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
        <LettersSection letters={letters} sessions={sessions} />
        <ActivitySection sessions={sessions} now={now()} />
        <LiveSessionSection sessions={sessions} />
        <SuggestionsSection letters={letters} sessions={sessions} />
        <AntiCheatSection sessions={sessions} />
        <ReadingStats />
      </div>

    </div>
  )
}
