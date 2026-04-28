// SettingsScreen — ekran ustawień (sekcja 13.2 spec).
//
// Nie renderuje sam siebie bez przejścia bramy: jeśli `!isUnlocked(now)` —
// pokazuje <MathGate>. Po unlocku — lista ustawień, zmiany od razu zapisywane
// przez `useSettings().updateSetting(...)`.
//
// Reset postępów wymaga **drugiej, świeżej** bramy + potwierdzenia. Reset jest
// eksponowany jako prop `onResetConfirmed` — parent realizuje sam reset
// (letters store + settings store).
//
// To NIE jest kid-friendly screen — może mieć normalny rozmiar inputów.

import { useState } from 'react'
import { colors, radii } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { useSettings } from '@/shared/settings/settingsStore'
import { ALL_LEVELS, LEVEL_LABEL, levelLetterPools, levelDefaults, getEffectiveShowCountdownBar, getEffectiveTimeLimit } from '@/shared/settings/defaults'
import type {
  CaseMode,
  CelebrationTempo,
  DefaultLevelSetting,
  HumorMode,
  Level,
  SessionLength,
  StyleMode,
  TilesPerQuestion,
  TimeLimit,
  WordAnimations,
} from '@/shared/settings/types'
import { ActiveLettersEditor } from './ActiveLettersEditor'
import { MathGate } from './MathGate'

function ToggleField({
  label,
  description,
  value,
  onChange,
  testId,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
  testId?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {description}
          </div>
        )}
      </div>
      <button
        data-testid={testId}
        onClick={() => onChange(!value)}
        aria-checked={value}
        role="switch"
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          border: 'none',
          cursor: 'pointer',
          background: value ? '#10b981' : '#d1d5db',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 22 : 2,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.18s',
          }}
        />
      </button>
    </div>
  )
}

function SliderField({
  label,
  description,
  min,
  max,
  value,
  onChange,
  testId,
}: {
  label: string
  description?: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  testId?: string
}) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ fontWeight: 600, fontSize: 16 }}>
        {label}:{' '}
        <span style={{ color: '#f59e0b' }}>{value}</span>
      </div>
      {description && (
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          {description}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: '100%', marginTop: 8 }}
      />
    </div>
  )
}

export type SettingsScreenProps = {
  /**
   * Wywoływane po przejściu **drugiej**, świeżej bramy + potwierdzeniu.
   * Parent powinien tu zrealizować reset stanu liter (i ewentualnie settingsów).
   */
  onResetConfirmed: () => void
  /** Opcjonalne źródło czasu — pomocne w testach. */
  now?: () => number
}

const LEVELS: readonly Level[] = ALL_LEVELS
const LEVEL_LABELS = LEVEL_LABEL

const CASE_LABELS: Record<CaseMode, string> = {
  'tylko-duze': 'tylko duże',
  'tylko-male': 'tylko małe',
  para: 'para Aa',
  mieszane: 'mieszane',
}
const CASE_OPTIONS: CaseMode[] = ['tylko-duze', 'tylko-male', 'para', 'mieszane']

const STYLE_LABELS: Record<StyleMode, string> = {
  'tylko-drukowane': 'tylko drukowane',
  'tylko-pisane': 'tylko pisane',
  'mieszane-per-pytanie': 'mieszane (per pytanie)',
  'oba-na-kafelku': 'oba na kafelku',
}
const STYLE_OPTIONS: StyleMode[] = [
  'tylko-drukowane',
  'tylko-pisane',
  'mieszane-per-pytanie',
  'oba-na-kafelku',
]

const SESSION_LENGTH_OPTIONS: SessionLength[] = [5, 10, 15]
const TIME_LIMIT_OPTIONS: TimeLimit[] = ['off', 10, 15, 20, 25]
const TILES_PER_QUESTION_OPTIONS: TilesPerQuestion[] = [3, 4, 5, 6, 8, 10]
const CELEBRATION_OPTIONS: CelebrationTempo[] = ['short', 'medium', 'long']
const CELEBRATION_LABELS: Record<CelebrationTempo, string> = {
  short: 'krótka',
  medium: 'średnia',
  long: 'długa',
}
const DEFAULT_LEVEL_OPTIONS: DefaultLevelSetting[] = [
  'iskierka',
  'plomyk',
  'ognik',
  'pochodnia',
  'last-used',
]
const DEFAULT_LEVEL_LABELS: Record<DefaultLevelSetting, string> = {
  ...LEVEL_LABEL,
  'last-used': 'ostatnio użyty',
}

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
  padding: 16,
  background: '#ffffff',
  border: '1px solid #e2e2e8',
  borderRadius: radii.kid,
}

const labelStyle = {
  fontSize: 16,
  fontWeight: 600,
}

const selectStyle = {
  fontSize: 16,
  padding: 8,
  borderRadius: 8,
  border: '1px solid #d8d8de',
  background: '#ffffff',
}

export function SettingsScreen({
  onResetConfirmed,
  now = () => Date.now(),
}: SettingsScreenProps) {
  const isUnlocked = useSettings((s) => s.isUnlocked)
  const lockGate = useSettings((s) => s.lockGate)
  const settings = useSettings((s) => s.settings)
  const updateSetting = useSettings((s) => s.updateSetting)

  const [, setUnlockTick] = useState(0)
  const [editingLevel, setEditingLevel] = useState<Level | null>(null)

  // Reset flow — wymaga drugiej, świeżej bramy + potwierdzenia.
  const [resetStage, setResetStage] = useState<
    'idle' | 'gate' | 'confirm'
  >('idle')

  // Reset gate ma priorytet nad zwykłą bramą: kiedy user klika Reset,
  // lockGate() wymusza świeżą bramę. Bez tego priorytetu wpadlibyśmy w
  // guard `!isUnlocked` i pokazali bramę "aby otworzyć ustawienia",
  // a po jej przejściu rendowali bramę resetową — czyli 2× zamiast 1× po
  // już otwartym ustawieniu. Reset gate widoczny od razu po kliknięciu.
  if (resetStage === 'gate') {
    return (
      <MathGate
        reason="aby zresetować postępy"
        onSuccess={() => setResetStage('confirm')}
        onCancel={() => setResetStage('idle')}
        now={now}
      />
    )
  }

  if (!isUnlocked(now())) {
    return (
      <MathGate
        reason="aby otworzyć ustawienia"
        onSuccess={() => {
          // Trigger re-render — selector na isUnlocked nie zmienia się sam,
          // bo `now()` jest zewnętrzne. Inkrementujemy tick, żeby wymusić
          // re-render, albo polegamy na zmianie parentGateUnlockedUntil.
          setUnlockTick((t) => t + 1)
        }}
        onCancel={() => {
          // brak unlock-u — parent powinien zamknąć screen; my po prostu
          // pozostajemy. Konsument ma zarządzać nawigacją.
          setUnlockTick((t) => t + 1)
        }}
        now={now}
      />
    )
  }

  if (editingLevel) {
    return (
      <ActiveLettersEditor
        level={editingLevel}
        onSave={() => setEditingLevel(null)}
        onCancel={() => setEditingLevel(null)}
      />
    )
  }

  const handleResetClick = () => {
    // Wymagamy świeżej bramy — locknij wcześniejszą sesję żeby nie reusować
    // już rozgrzanego unlocku z otwierania ustawień.
    lockGate()
    setUnlockTick((t) => t + 1)
    setResetStage('gate')
  }

  return (
    <div
      data-testid="settings-screen"
      style={{
        padding: 16,
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h1 style={{ fontSize: 24, margin: 0 }}>Ustawienia</h1>

      {/* Aktywne litery per poziom */}
      <section style={sectionStyle} data-testid="section-active-letters">
        <div style={labelStyle}>Aktywne litery</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LEVELS.map((level) => {
            const override = settings.activeLettersOverride[level]
            const count = override
              ? override.length
              : levelLetterPools[level].length
            const isOverridden = override !== undefined
            return (
              <button
                key={level}
                type="button"
                data-testid={`active-letters-tile-${level}`}
                onClick={() => setEditingLevel(level)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d8d8de',
                  background: '#fafaff',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                <span>{LEVEL_LABELS[level]}</span>
                <span style={{ color: '#6a6a72' }}>
                  {count} {isOverridden ? '(custom)' : '(domyślne)'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Wielkość liter — per poziom */}
      <section style={sectionStyle} data-testid="section-case-mode">
        <div style={labelStyle}>Wielkość liter (per poziom)</div>
        {LEVELS.map((level) => {
          const value =
            settings.caseMode[level] ?? levelDefaults[level].caseMode
          return (
            <label
              key={level}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{LEVEL_LABELS[level]}</span>
              <select
                data-testid={`case-mode-${level}`}
                value={value}
                onChange={(e) => {
                  updateSetting('caseMode', {
                    ...settings.caseMode,
                    [level]: e.target.value as CaseMode,
                  })
                }}
                style={selectStyle}
              >
                {CASE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {CASE_LABELS[opt]}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </section>

      {/* Styl pisma — per poziom */}
      <section style={sectionStyle} data-testid="section-style-mode">
        <div style={labelStyle}>Styl pisma (per poziom)</div>
        {LEVELS.map((level) => {
          const value =
            settings.styleMode[level] ?? levelDefaults[level].styleMode
          return (
            <label
              key={level}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{LEVEL_LABELS[level]}</span>
              <select
                data-testid={`style-mode-${level}`}
                value={value}
                onChange={(e) => {
                  updateSetting('styleMode', {
                    ...settings.styleMode,
                    [level]: e.target.value as StyleMode,
                  })
                }}
                style={selectStyle}
              >
                {STYLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {STYLE_LABELS[opt]}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </section>

      {/* Długość sesji */}
      <section style={sectionStyle} data-testid="section-session-length">
        <div style={labelStyle}>Długość sesji</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SESSION_LENGTH_OPTIONS.map((opt) => (
            <label
              key={opt}
              style={{
                display: 'flex',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${
                  settings.sessionLength === opt
                    ? colors.accentBlue
                    : '#d8d8de'
                }`,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="sessionLength"
                value={opt}
                checked={settings.sessionLength === opt}
                onChange={() => updateSetting('sessionLength', opt)}
                data-testid={`session-length-${opt}`}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Liczba kafelków na pytanie — per poziom */}
      <section
        style={sectionStyle}
        data-testid="section-tiles-per-question"
      >
        <div style={labelStyle}>Liczba kafelków na pytanie (per poziom)</div>
        {LEVELS.map((level) => {
          const value =
            settings.tilesPerQuestion[level] ??
            levelDefaults[level].tilesPerQuestion
          return (
            <div
              key={level}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>{LEVEL_LABELS[level]}</span>
              <div
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                role="radiogroup"
                aria-label={`Liczba kafelków na pytanie dla poziomu ${LEVEL_LABELS[level]}`}
              >
                {TILES_PER_QUESTION_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    style={{
                      display: 'flex',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1px solid ${
                        value === opt ? colors.accentBlue : '#d8d8de'
                      }`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name={`tilesPerQuestion-${level}`}
                      value={opt}
                      checked={value === opt}
                      onChange={() =>
                        updateSetting('tilesPerQuestion', {
                          ...settings.tilesPerQuestion,
                          [level]: opt,
                        })
                      }
                      data-testid={`tiles-per-question-${level}-${opt}`}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      {/* Limit czasu — per poziom */}
      <section style={sectionStyle} data-testid="section-time-limit">
        <div style={labelStyle}>Limit czasu na odpowiedź (per poziom)</div>
        {LEVELS.map((level) => {
          const value = getEffectiveTimeLimit(settings, level)
          return (
            <div
              key={level}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span>{LEVEL_LABELS[level]}</span>
              <div
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                role="radiogroup"
                aria-label={`Limit czasu dla poziomu ${LEVEL_LABELS[level]}`}
              >
                {TIME_LIMIT_OPTIONS.map((opt) => (
                  <label
                    key={String(opt)}
                    style={{
                      display: 'flex',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1px solid ${
                        value === opt ? colors.accentBlue : '#d8d8de'
                      }`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name={`time-limit-${level}`}
                      value={String(opt)}
                      checked={value === opt}
                      onChange={() =>
                        updateSetting('timeLimit', {
                          ...settings.timeLimit,
                          [level]: opt,
                        })
                      }
                      data-testid={`time-limit-${level}-${opt}`}
                    />
                    <span>{opt === 'off' ? 'wyłączony' : `${opt}s`}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      {/* Pasek odliczania — per poziom; checkbox disabled gdy poziom ma timer off */}
      <section style={sectionStyle} data-testid="section-countdown-bar">
        <div style={labelStyle}>Pokaż pasek czasu (per poziom)</div>
        <div data-testid="show-countdown-per-level" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {LEVELS.map((lvl) => {
            const timerOff = getEffectiveTimeLimit(settings, lvl) === 'off'
            const effective = getEffectiveShowCountdownBar(settings, lvl)
            const hintId = `countdown-hint-${lvl}`
            return (
              <label key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: timerOff ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  checked={effective}
                  disabled={timerOff}
                  onChange={(e) => {
                    const next = { ...settings.showCountdownBar, [lvl]: e.target.checked }
                    updateSetting('showCountdownBar', next)
                  }}
                  data-testid={`show-countdown-${lvl}`}
                  aria-describedby={timerOff ? hintId : undefined}
                />
                <span>
                  {LEVEL_LABELS[lvl]}
                  {timerOff && (
                    <span id={hintId} style={{ color: '#7a7a82', marginLeft: 6 }}>
                      (timer wyłączony)
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </section>

      {/* Tempo celebracji */}
      <section style={sectionStyle} data-testid="section-celebration-tempo">
        <div style={labelStyle}>Tempo celebracji</div>
        <select
          data-testid="celebration-tempo"
          value={settings.celebrationTempo}
          onChange={(e) =>
            updateSetting('celebrationTempo', e.target.value as CelebrationTempo)
          }
          style={selectStyle}
        >
          {CELEBRATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {CELEBRATION_LABELS[opt]}
            </option>
          ))}
        </select>
      </section>

      {/* Domyślny poziom */}
      <section style={sectionStyle} data-testid="section-default-level">
        <div style={labelStyle}>Domyślny poziom</div>
        <select
          data-testid="default-level"
          value={settings.defaultLevel}
          onChange={(e) =>
            updateSetting(
              'defaultLevel',
              e.target.value as DefaultLevelSetting,
            )
          }
          style={selectStyle}
        >
          {DEFAULT_LEVEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {DEFAULT_LEVEL_LABELS[opt]}
            </option>
          ))}
        </select>
      </section>

      {/* Czytanie (moduł 2) */}
      <section style={sectionStyle} data-testid="section-reading">
        <div style={labelStyle}>Czytanie (moduł 2)</div>
        <ToggleField
          label="Animacje słów"
          description="Mini-scenki po poprawnej odpowiedzi pokazujące znaczenie słowa"
          value={settings.reading.wordAnimations !== 'off'}
          onChange={(v) =>
            updateSetting('reading', {
              ...settings.reading,
              wordAnimations: (v ? 'on' : 'off') as WordAnimations,
            })
          }
          testId="reading-word-animations"
        />
        <ToggleField
          label="Humor (apsik, czkawka, beknięcie)"
          description="Śmieszne reakcje Iskry przy błędach i easter-eggach"
          value={settings.humorMode !== 'off'}
          onChange={(v) =>
            updateSetting('humorMode', (v ? 'on' : 'off') as HumorMode)
          }
          testId="reading-humor-mode"
        />
        <SliderField
          label="Częstotliwość wielkich celebracji"
          description="Co ile poprawnych odpowiedzi pojawia się wielka celebracja (3 = często, 15 = rzadko)"
          min={3}
          max={15}
          value={settings.reading.wildCelebrationFreq}
          onChange={(v) =>
            updateSetting('reading', {
              ...settings.reading,
              wildCelebrationFreq: v,
            })
          }
          testId="reading-wild-celebration-freq"
        />
      </section>

      {/* Reset postępów */}
      <section style={sectionStyle} data-testid="section-reset">
        <div style={labelStyle}>Reset postępów</div>
        {resetStage === 'confirm' ? (
          <div
            data-testid="reset-confirm"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 12,
              border: `2px solid ${colors.accentOrange}`,
              borderRadius: 8,
              background: '#fff4ea',
            }}
          >
            <div>Na pewno wszystko skasować?</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => setResetStage('idle')}
                data-testid="reset-cancel"
              >
                Anuluj
              </Button>
              <Button
                variant="primary"
                data-testid="reset-confirm-button"
                style={{ background: colors.accentOrange, borderColor: colors.accentOrange }}
                onClick={() => {
                  onResetConfirmed()
                  setResetStage('idle')
                }}
              >
                Tak, skasuj
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={handleResetClick}
            data-testid="reset-button"
            style={{ background: colors.accentOrange, borderColor: colors.accentOrange }}
          >
            Resetuj postępy
          </Button>
        )}
      </section>
    </div>
  )
}
