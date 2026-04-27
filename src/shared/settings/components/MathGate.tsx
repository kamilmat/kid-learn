// MathGate — modal/overlay parent gate (sekcja 13.1 spec).
//
// Renderuje aktualny problem matematyczny (a + b - c, a+b > 10), input,
// "Zatwierdź"; wywołuje `tryUnlockGate` w settings store.
//
// Anti-memorization: nowy problem przy każdej zmianie state-u (po sukcesie,
// porażce, wejściu w cooldown). Cooldown pokazuje countdown timer.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { colors, radii } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { useSettings } from '@/shared/settings/settingsStore'
import {
  cooldownRemainingMs,
  generateMathProblem,
  isCooldown,
} from '@/shared/settings/mathGate'
import type { MathProblem } from '@/shared/settings/types'

export type MathGateProps = {
  onSuccess: () => void
  onCancel: () => void
  /** Opcjonalny tekst u góry modala, np. "aby otworzyć ustawienia". */
  reason?: string
  /** Opcjonalny override generatora — pomocny w testach. */
  generateProblem?: () => MathProblem
  /** Opcjonalny override źródła czasu — pomocny w testach. */
  now?: () => number
}

const FAIL_MESSAGE = 'Nie tym razem, spróbuj ponownie'
const COUNTDOWN_TICK_MS = 1_000

export function MathGate({
  onSuccess,
  onCancel,
  reason,
  generateProblem = generateMathProblem,
  now = () => Date.now(),
}: MathGateProps) {
  const tryUnlockGate = useSettings((s) => s.tryUnlockGate)
  const mathGateState = useSettings((s) => s.mathGateState)

  const [problem, setProblem] = useState<MathProblem>(() => generateProblem())
  const [input, setInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const cooldownMs = cooldownRemainingMs(mathGateState, now())
  const cooldownActive = isCooldown(mathGateState, now())

  // Co sekundę odświeżamy widok kiedy w cooldownie, żeby countdown timer
  // odliczał. useEffect z setInterval sprzątanym przy unmount/zmianie cooldownu.
  useEffect(() => {
    if (!cooldownActive) return
    const id = window.setInterval(() => {
      setTick((t) => t + 1)
    }, COUNTDOWN_TICK_MS)
    return () => {
      window.clearInterval(id)
    }
  }, [cooldownActive])

  // Gdy cooldown wygasł — wygeneruj nowy problem (anti-memorization po pauzie).
  const prevCooldown = useRef(cooldownActive)
  useEffect(() => {
    if (prevCooldown.current && !cooldownActive) {
      setProblem(generateProblem())
      setInput('')
      setErrorMessage(null)
    }
    prevCooldown.current = cooldownActive
  }, [cooldownActive, generateProblem])

  // Autofocus wejścia po wygenerowaniu nowego problemu (jeśli nie cooldown).
  useEffect(() => {
    if (!cooldownActive) {
      inputRef.current?.focus()
    }
  }, [problem, cooldownActive])

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (cooldownActive) return
      const result = tryUnlockGate(input, problem, now())
      if (result.success) {
        setInput('')
        setErrorMessage(null)
        onSuccess()
        return
      }
      // Niepoprawne — generuj nowy problem (anti-memorization).
      setProblem(generateProblem())
      setInput('')
      if (result.reason === 'cooldown') {
        setErrorMessage(null)
      } else {
        setErrorMessage(FAIL_MESSAGE)
      }
    },
    [cooldownActive, generateProblem, input, now, onSuccess, problem, tryUnlockGate],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Akceptujemy tylko cyfry + opcjonalny minus na początku.
    const v = e.target.value
    if (v === '' || /^-?\d*$/.test(v)) {
      setInput(v)
      setErrorMessage(null)
    }
  }

  const cooldownSeconds = useMemo(
    () => Math.ceil(cooldownMs / 1_000),
    [cooldownMs],
  )

  return (
    <div
      data-testid="math-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Brama dla rodzica"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#2d2d33dd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: colors.bg,
          color: colors.text,
          borderRadius: radii.kid,
          padding: 32,
          maxWidth: 480,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          data-testid="math-gate-title"
          style={{ fontSize: 18, fontWeight: 600, color: '#6a6a72' }}
        >
          Tylko dla rodzica{reason ? ` — ${reason}` : ''}
        </div>

        {cooldownActive ? (
          <div
            data-testid="math-gate-cooldown"
            style={{
              fontSize: 24,
              padding: 24,
              background: '#fff4ea',
              border: `2px solid ${colors.accentOrange}`,
              borderRadius: radii.kid,
              textAlign: 'center',
            }}
          >
            Spróbuj za {cooldownSeconds}s
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              data-testid="math-gate-expression"
              style={{
                fontSize: 48,
                fontWeight: 700,
                textAlign: 'center',
                margin: '8px 0 16px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {problem.expression} = ?
            </div>

            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={input}
              onChange={handleInputChange}
              data-testid="math-gate-input"
              aria-label="Twoja odpowiedź"
              disabled={cooldownActive}
              style={{
                width: '100%',
                fontSize: 32,
                padding: 12,
                borderRadius: radii.kid,
                border: `2px solid ${colors.accentBlue}`,
                textAlign: 'center',
                marginBottom: 12,
              }}
            />

            {errorMessage && (
              <div
                data-testid="math-gate-error"
                role="alert"
                style={{
                  color: colors.accentOrange,
                  fontSize: 16,
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={onCancel}
                data-testid="math-gate-cancel"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                variant="primary"
                data-testid="math-gate-submit"
                disabled={cooldownActive || input.trim() === ''}
              >
                Zatwierdź
              </Button>
            </div>
          </form>
        )}

        {cooldownActive && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={onCancel}
              data-testid="math-gate-cancel"
            >
              Anuluj
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
