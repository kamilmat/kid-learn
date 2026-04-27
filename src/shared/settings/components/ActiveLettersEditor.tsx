// ActiveLettersEditor — sub-ekran ustawień (sekcja 13.2 spec).
//
// Pokazuje pełen polski alfabet (32 litery) jako siatkę checkboxów.
// Domyślnie zaznaczone: aktualny override LUB pula poziomu (jeśli brak override).
// Walidacja: min 4 (komunikat błędu jeśli próba zapisać mniej).
// Save wywołuje validateAndApplyOverride przez settings store.

import { useMemo, useState } from 'react'
import { colors, radii } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { POLISH_ALPHABET, toUpper } from '@/modules/letters/data/alphabet'
import { useSettings } from '@/shared/settings/settingsStore'
import { levelLetterPools } from '@/shared/settings/defaults'
import {
  MIN_ACTIVE_LETTERS,
  isActiveLettersValid,
  validateAndApplyOverride,
} from '@/shared/settings/activeLettersValidation'
import type { Level } from '@/shared/settings/types'

export type ActiveLettersEditorProps = {
  level: Level
  onSave: (letters: string[]) => void
  onCancel: () => void
}

const LEVEL_LABELS: Record<Level, string> = {
  iskierka: 'Iskierka',
  plomyk: 'Płomyk',
  ognik: 'Ognik',
  pochodnia: 'Pochodnia',
}

export function ActiveLettersEditor({
  level,
  onSave,
  onCancel,
}: ActiveLettersEditorProps) {
  const settings = useSettings((s) => s.settings)
  const setSettings = useSettings((s) => s.setSettings)

  // Aktualnie aktywne litery dla poziomu — override lub pula poziomu.
  const initialSelected = useMemo<Set<string>>(() => {
    const override = settings.activeLettersOverride[level]
    if (override !== undefined) return new Set(override)
    return new Set(levelLetterPools[level])
  }, [level, settings.activeLettersOverride])

  const [selected, setSelected] = useState<Set<string>>(initialSelected)
  const [error, setError] = useState<string | null>(null)

  // Pula poziomu — informacyjnie pokazujemy które litery są w domyślnej puli.
  // Wszystkie 32 polskie litery można jednak zaznaczyć/odznaczyć.
  const levelPool = useMemo<Set<string>>(
    () => new Set(levelLetterPools[level]),
    [level],
  )

  const toggle = (letter: string) => {
    setError(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(letter)) {
        next.delete(letter)
      } else {
        next.add(letter)
      }
      return next
    })
  }

  const handleSave = () => {
    const arr = Array.from(selected)
    if (!isActiveLettersValid(arr)) {
      setError(
        `Wybierz co najmniej ${MIN_ACTIVE_LETTERS} liter (wybrano ${arr.length}).`,
      )
      return
    }
    const result = validateAndApplyOverride(level, arr, settings)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setSettings(result)
    onSave(arr)
  }

  const selectedCount = selected.size

  return (
    <div
      data-testid="active-letters-editor"
      style={{
        padding: 24,
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <h2 style={{ fontSize: 24, margin: 0 }}>
        Aktywne litery — {LEVEL_LABELS[level]}
      </h2>
      <div style={{ fontSize: 14, color: '#6a6a72' }}>
        Zaznaczone litery będą używane w sesji. Litery wyszarzone nie należą do
        puli tego poziomu. Wybierz co najmniej {MIN_ACTIVE_LETTERS}.
      </div>
      <div data-testid="selected-count" style={{ fontSize: 14 }}>
        Wybrano: <strong>{selectedCount}</strong> / {levelPool.size}
      </div>

      <div
        data-testid="letters-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
          gap: 8,
        }}
      >
        {POLISH_ALPHABET.map((letter) => {
          const inPool = levelPool.has(letter)
          const isChecked = selected.has(letter)
          return (
            <label
              key={letter}
              data-testid={`letter-row-${letter}`}
              data-in-pool={inPool ? 'true' : 'false'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 8,
                borderRadius: radii.kid,
                border: `2px solid ${
                  isChecked ? colors.accentBlue : '#d8d8de'
                }`,
                background: inPool ? '#ffffff' : '#f0f0f4',
                color: inPool ? colors.text : '#a0a0a8',
                cursor: inPool ? 'pointer' : 'not-allowed',
                opacity: inPool ? 1 : 0.6,
                fontSize: 18,
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!inPool}
                onChange={() => toggle(letter)}
                data-testid={`letter-checkbox-${letter}`}
                aria-label={`Litera ${toUpper(letter)}`}
              />
              <span aria-hidden="true">
                {toUpper(letter)}
                {letter}
              </span>
            </label>
          )
        })}
      </div>

      {error && (
        <div
          data-testid="active-letters-error"
          role="alert"
          style={{ color: colors.accentOrange, fontSize: 14 }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          onClick={onCancel}
          data-testid="active-letters-cancel"
        >
          Anuluj
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          data-testid="active-letters-save"
        >
          Zapisz
        </Button>
      </div>
    </div>
  )
}
