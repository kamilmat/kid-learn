// ReportScreen — sekcja 14 spec.
//
// Główny ekran raportu rodzica. Bez unlocku → MathGate. Po unlocku → 5
// scrollowalnych sekcji + przycisk "Skopiuj raport" w toolbar.

import { useCallback, useState } from 'react'
import { colors, radii } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { MathGate } from '@/shared/settings/components/MathGate'
import { useSettings } from '@/shared/settings/settingsStore'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { exportReportToMarkdown } from '@/shared/stats/exporter'
import { LettersSection } from './LettersSection'
import { ActivitySection } from './ActivitySection'
import { LiveSessionSection } from './LiveSessionSection'
import { SuggestionsSection } from './SuggestionsSection'
import { AntiCheatSection } from './AntiCheatSection'

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
      </div>

      {/* Marker dla `radii.kid` żeby utrzymać typowanie spójne — */}
      <span style={{ display: 'none' }} data-radii={radii.kid} />
    </div>
  )
}
