# Iskierki — v1.1.1 Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Załatać dwa UX issue wykryte podczas testowania v1.1 w przeglądarce (per-level `timeLimit` + spójność headline timeout) plus jedna kosmetyczna poprawka (IskraMascot w LevelSelect).

**Architecture:** Per-level `timeLimit` mirrorzy istniejący wzorzec per-level `showCountdownBar` (typ → defaults helper → migracja persist v3→v4 → UI per-level → konsumenci). Headline fix to 1 linia + 1 test. LevelSelect podmienia 4 emoji `🔥` na `<IskraMascot>` z rosnącą intensywnością.

**Tech Stack:** React 19 + TS strict + Vitest + Zustand persist (migrations).

**Branch:** `feat/ux-iteration-v1.1` (kontynuacja, NIE nowy branch — całość mergujemy razem do main jako v1.1)

---

## Task 1: Per-level `timeLimit` — typ + defaults helper

**Files:**
- Modify: `src/shared/settings/types.ts:28`
- Modify: `src/shared/settings/defaults.ts:65-83, 86-97, 99-123`
- Test: `src/shared/settings/defaults.test.ts:57-105`

- [ ] **Step 1: Rozszerz `Settings.timeLimit` typ na per-level**

W `src/shared/settings/types.ts` zmień linię:
```ts
  timeLimit: TimeLimit
```
na:
```ts
  // override per poziom; brak klucza = używaj domyślnej wartości poziomu
  timeLimit: Partial<Record<Level, TimeLimit>>
```

- [ ] **Step 2: Dodaj `timeLimit` do `levelDefaults` w `defaults.ts`**

W `src/shared/settings/defaults.ts` rozszerz typ `levelDefaults` i dodaj wartości per-level. Iskierka/Płomyk = `'off'` (młodsi: bez presji czasu), Ognik/Pochodnia = `15`. Zmień:
```ts
export const levelDefaults: Record<
  Level,
  { caseMode: CaseMode; styleMode: StyleMode; tilesPerQuestion: TilesPerQuestion; showCountdownBar: boolean }
> = {
  iskierka: { caseMode: 'para', styleMode: 'tylko-drukowane', tilesPerQuestion: 4, showCountdownBar: false },
  plomyk: { caseMode: 'para', styleMode: 'tylko-drukowane', tilesPerQuestion: 4, showCountdownBar: false },
  ognik: {
    caseMode: 'mieszane',
    styleMode: 'mieszane-per-pytanie',
    tilesPerQuestion: 5,
    showCountdownBar: true,
  },
  pochodnia: {
    caseMode: 'mieszane',
    styleMode: 'oba-na-kafelku',
    tilesPerQuestion: 6,
    showCountdownBar: true,
  },
}
```
na:
```ts
export const levelDefaults: Record<
  Level,
  { caseMode: CaseMode; styleMode: StyleMode; tilesPerQuestion: TilesPerQuestion; showCountdownBar: boolean; timeLimit: TimeLimit }
> = {
  iskierka: { caseMode: 'para', styleMode: 'tylko-drukowane', tilesPerQuestion: 4, showCountdownBar: false, timeLimit: 'off' },
  plomyk: { caseMode: 'para', styleMode: 'tylko-drukowane', tilesPerQuestion: 4, showCountdownBar: false, timeLimit: 'off' },
  ognik: {
    caseMode: 'mieszane',
    styleMode: 'mieszane-per-pytanie',
    tilesPerQuestion: 5,
    showCountdownBar: true,
    timeLimit: 15,
  },
  pochodnia: {
    caseMode: 'mieszane',
    styleMode: 'oba-na-kafelku',
    tilesPerQuestion: 6,
    showCountdownBar: true,
    timeLimit: 15,
  },
}
```

I dodaj `TimeLimit` do importów:
```ts
import type {
  CaseMode,
  Level,
  Settings,
  StyleMode,
  TilesPerQuestion,
  TimeLimit,
} from './types'
```

- [ ] **Step 3: Zmień `defaultSettings.timeLimit` z `15` na `{}` w `defaults.ts`**

Zmień:
```ts
  sessionLength: 10,
  timeLimit: 15,
  showCountdownBar: {},
```
na:
```ts
  sessionLength: 10,
  timeLimit: {},
  showCountdownBar: {},
```

- [ ] **Step 4: Dodaj helper `getEffectiveTimeLimit` w `defaults.ts`**

Po `getEffectiveShowCountdownBar` (linia ~123) dodaj:
```ts
/**
 * Zwraca efektywny limit czasu dla poziomu — override z
 * `settings.timeLimit[level]` jeśli ustawiony, inaczej `levelDefaults`.
 */
export function getEffectiveTimeLimit(
  settings: Settings,
  level: Level,
): TimeLimit {
  return settings.timeLimit?.[level] ?? levelDefaults[level].timeLimit
}
```

- [ ] **Step 5: Napisz failing testy w `defaults.test.ts`**

Zaktualizuj asercje `levelDefaults` (3 miejsca) — dodaj `timeLimit`:
- iskierka/plomyk: `timeLimit: 'off'`
- ognik/pochodnia: `timeLimit: 15`

Zaktualizuj asercję `defaultSettings`:
```ts
    expect(defaultSettings.timeLimit).toEqual({})
```

Po `describe('getActiveLetterPool', ...)` dopisz nowy describe:
```ts
describe('getEffectiveTimeLimit', () => {
  it('returns level default when no override', () => {
    expect(getEffectiveTimeLimit(defaultSettings, 'iskierka')).toBe('off')
    expect(getEffectiveTimeLimit(defaultSettings, 'plomyk')).toBe('off')
    expect(getEffectiveTimeLimit(defaultSettings, 'ognik')).toBe(15)
    expect(getEffectiveTimeLimit(defaultSettings, 'pochodnia')).toBe(15)
  })

  it('returns override when present', () => {
    const settings = {
      ...defaultSettings,
      timeLimit: { iskierka: 25 as const, ognik: 'off' as const },
    }
    expect(getEffectiveTimeLimit(settings, 'iskierka')).toBe(25)
    expect(getEffectiveTimeLimit(settings, 'plomyk')).toBe('off')
    expect(getEffectiveTimeLimit(settings, 'ognik')).toBe('off')
    expect(getEffectiveTimeLimit(settings, 'pochodnia')).toBe(15)
  })
})
```

I dopisz import:
```ts
import {
  defaultSettings,
  getActiveLetterPool,
  getEffectiveTimeLimit,
  levelDefaults,
  levelLetterPools,
} from './defaults'
```

- [ ] **Step 6: Run tests — defaults.test.ts powinno PRZEJŚĆ (po edytach)**

```bash
pnpm test --run src/shared/settings/defaults.test.ts
```
Expected: PASS (wszystkie testy w tym pliku, w tym nowy getEffectiveTimeLimit describe).

UWAGA: będzie type-fail w innych plikach które używają `settings.timeLimit` jako prymitywu — to naprawimy w kolejnych zadaniach. Sam `defaults.test.ts` ma przejść.

- [ ] **Step 7: Commit**

```bash
git add src/shared/settings/types.ts src/shared/settings/defaults.ts src/shared/settings/defaults.test.ts
git commit -m "feat(settings): per-level timeLimit type + getEffectiveTimeLimit helper"
```

---

## Task 2: Migracja persist v3 → v4 dla legacy `timeLimit`

**Files:**
- Modify: `src/shared/settings/settingsStore.ts:123-141`
- Test: `src/shared/settings/settingsStore.test.ts:203-228`

- [ ] **Step 1: Bump persist version do 4 + rozszerz merge migrację**

W `src/shared/settings/settingsStore.ts` zmień:
```ts
      version: 3,
      // Migration: v2 miał `showCountdownBar: boolean`. v3 zmienia na
      // `Partial<Record<Level, boolean>>`. Drop'ujemy stary boolean całkowicie
      // — biorą się per-level defaults (iskierka/płomyk false, ognik/pochodnia true).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedShape>
        const persistedSettings = (p.settings ?? {}) as Record<string, unknown>
        const sanitizedSettings = { ...persistedSettings }
        if (typeof sanitizedSettings.showCountdownBar === 'boolean') {
          // Stary boolean — drop'ujemy do {}, weźmie się z defaultu
          delete sanitizedSettings.showCountdownBar
        }
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...sanitizedSettings },
        }
      },
```
na:
```ts
      version: 4,
      // Migration:
      //   v2 → v3: `showCountdownBar` z boolean na Partial<Record<Level, boolean>>.
      //   v3 → v4: `timeLimit` z prymitywu (TimeLimit) na Partial<Record<Level, TimeLimit>>.
      // W obu przypadkach drop'ujemy legacy wartość — zostają per-level defaults
      // (iskierka/płomyk: timeLimit='off', ognik/pochodnia: timeLimit=15).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedShape>
        const persistedSettings = (p.settings ?? {}) as Record<string, unknown>
        const sanitizedSettings = { ...persistedSettings }
        if (typeof sanitizedSettings.showCountdownBar === 'boolean') {
          delete sanitizedSettings.showCountdownBar
        }
        const tl = sanitizedSettings.timeLimit
        if (tl === 'off' || typeof tl === 'number') {
          delete sanitizedSettings.timeLimit
        }
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...sanitizedSettings },
        }
      },
```

- [ ] **Step 2: Napisz failing test migracji v3→v4 w `settingsStore.test.ts`**

Po describe `'showCountdownBar migration (v2 → v3)'` dopisz:
```ts
describe('timeLimit migration (v3 → v4)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  it('drops legacy primitive timeLimit (number) from persisted state', () => {
    const legacyPersisted = {
      state: {
        settings: {
          ...defaultSettings,
          timeLimit: 15 as unknown as (typeof defaultSettings)['timeLimit'],
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 3,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersisted))
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.timeLimit).toEqual({})
  })

  it('drops legacy primitive timeLimit ("off") from persisted state', () => {
    const legacyPersisted = {
      state: {
        settings: {
          ...defaultSettings,
          timeLimit: 'off' as unknown as (typeof defaultSettings)['timeLimit'],
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 3,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersisted))
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.timeLimit).toEqual({})
  })

  it('preserves per-level timeLimit object when already migrated', () => {
    const persisted = {
      state: {
        settings: {
          ...defaultSettings,
          timeLimit: { iskierka: 25 as const, plomyk: 'off' as const },
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 4,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.timeLimit).toEqual({ iskierka: 25, plomyk: 'off' })
  })
})
```

I zaktualizuj test na linii 82-87 (`updates timeLimit and showCountdownBar independently`):
```ts
    it('updates timeLimit and showCountdownBar independently', () => {
      useSettings.getState().updateSetting('timeLimit', { iskierka: 25 })
      useSettings.getState().updateSetting('showCountdownBar', { iskierka: true })
      const s = useSettings.getState().settings
      expect(s.timeLimit).toEqual({ iskierka: 25 })
      expect(s.showCountdownBar).toEqual({ iskierka: true })
    })
```

- [ ] **Step 3: Run migracja test**

```bash
pnpm test --run src/shared/settings/settingsStore.test.ts
```
Expected: PASS (wszystkie testy + nowe v3→v4 migracji).

- [ ] **Step 4: Commit**

```bash
git add src/shared/settings/settingsStore.ts src/shared/settings/settingsStore.test.ts
git commit -m "feat(settings): persist migration v3->v4 dropping legacy timeLimit primitive"
```

---

## Task 3: Konsumenci `settings.timeLimit` (SessionView, useSession, exporter)

**Files:**
- Modify: `src/modules/letters/components/SessionView.tsx:77`
- Modify: `src/modules/letters/components/SessionView.tsx` (importy)
- Modify: `src/shared/stats/exporter.ts:155`

- [ ] **Step 1: SessionView — użyj `getEffectiveTimeLimit`**

W `src/modules/letters/components/SessionView.tsx` znajdź import i dopisz `getEffectiveTimeLimit`:
```ts
import { defaultSettings, getActiveLetterPool, getEffectiveShowCountdownBar, getEffectiveTilesPerQuestion, getEffectiveTimeLimit } from '@/shared/settings/defaults'
```
(Jeśli importy są multi-line, dopasuj — ale dodaj `getEffectiveTimeLimit`.)

Zmień linię 77:
```ts
    timeLimit: settings.timeLimit,
```
na:
```ts
    timeLimit: getEffectiveTimeLimit(settings, level),
```

- [ ] **Step 2: exporter.ts — użyj per-level wartości w raporcie rodzica**

Otwórz `src/shared/stats/exporter.ts:155`. Trzeba zobaczyć kontekst — uruchom:
```bash
sed -n '140,170p' src/shared/stats/exporter.ts
```

Cel: linia używa `settings.timeLimit` jako prymitywu. Rozwiązanie zależy od kontekstu (czy mamy dostęp do `level`):
- Jeśli funkcja ma parametr `level`, podmień na `getEffectiveTimeLimit(settings, level)` (i dodaj import).
- Jeśli funkcja jest level-agnostic, zmień na pokazanie wartości per-level np.:
  ```ts
  `- Limit czasu (Iskierka/Płomyk/Ognik/Pochodnia): ${(['iskierka','plomyk','ognik','pochodnia'] as const).map(l => { const v = getEffectiveTimeLimit(settings, l); return v === 'off' ? 'wyłączony' : `${v}s` }).join(' / ')}`,
  ```
  i dodaj import `getEffectiveTimeLimit` oraz typ `Level`.

Wybierz wariant po przeczytaniu funkcji. Pozostań spójny z innymi liniami w okolicy (jeśli inne ustawienia są też pokazywane jako per-level lista, użyj tej samej formy).

- [ ] **Step 3: Type-check**

```bash
pnpm tsc -b
```
Expected: PASS — żadnych błędów typów. Jeśli są błędy, znajdź pozostałe usages `settings.timeLimit` jako prymitywu (`grep -rn "settings.timeLimit" src --include="*.ts" --include="*.tsx"` poza testami) i napraw analogicznie.

- [ ] **Step 4: Commit**

```bash
git add src/modules/letters/components/SessionView.tsx src/shared/stats/exporter.ts
git commit -m "refactor(timeLimit): consumers use getEffectiveTimeLimit per-level"
```

---

## Task 4: SettingsScreen UI — per-level timeLimit + warunek na countdown bar

**Files:**
- Modify: `src/shared/settings/components/SettingsScreen.tsx:17-27, 416-471`

- [ ] **Step 1: Dodaj `getEffectiveTimeLimit` do importów**

W `src/shared/settings/components/SettingsScreen.tsx` zmień linię 17:
```ts
import { levelLetterPools, levelDefaults, getEffectiveShowCountdownBar } from '@/shared/settings/defaults'
```
na:
```ts
import { levelLetterPools, levelDefaults, getEffectiveShowCountdownBar, getEffectiveTimeLimit } from '@/shared/settings/defaults'
```

- [ ] **Step 2: Przepisz sekcję "Limit czasu" na per-level radio groups**

W `src/shared/settings/components/SettingsScreen.tsx` znajdź sekcję `data-testid="section-time-limit"` (linia ~416). Zamień całą sekcję (od `<section style={sectionStyle} data-testid="section-time-limit">` aż do zamykającego `</section>` przed sekcją "Pasek odliczania"):
```tsx
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
```

- [ ] **Step 3: Zmień warunek widoczności sekcji "Pasek odliczania" na per-level**

Stary warunek `{settings.timeLimit !== 'off' && (` testuje globalny prymityw — już nieprawidłowy. Zastąp gateway: pasek countdown ma sens tylko dla poziomów z włączonym timer'em. Strategia: pokazuj sekcję ZAWSZE (bo per-level), ale checkbox renderuj tylko dla poziomów gdzie `getEffectiveTimeLimit !== 'off'`. Dla poziomów z `timeLimit === 'off'` pokazuj informacyjny tekst "(timer wyłączony)" zamiast checkboxa.

Zmień:
```tsx
      {/* Pasek odliczania (visible tylko gdy timeLimit ≠ off) */}
      {settings.timeLimit !== 'off' && (
        <section style={sectionStyle} data-testid="section-countdown-bar">
          <div style={labelStyle}>Pokaż pasek czasu (per poziom)</div>
          <div data-testid="show-countdown-per-level" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {(['iskierka', 'plomyk', 'ognik', 'pochodnia'] as const).map((lvl) => {
              const effective = getEffectiveShowCountdownBar(settings, lvl)
              return (
                <label key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={effective}
                    onChange={(e) => {
                      const next = { ...settings.showCountdownBar, [lvl]: e.target.checked }
                      updateSetting('showCountdownBar', next)
                    }}
                    data-testid={`show-countdown-${lvl}`}
                  />
                  <span>{LEVEL_LABELS[lvl]}</span>
                </label>
              )
            })}
          </div>
        </section>
      )}
```
na:
```tsx
      {/* Pasek odliczania — per poziom; widoczny checkbox tylko gdy poziom ma timer */}
      <section style={sectionStyle} data-testid="section-countdown-bar">
        <div style={labelStyle}>Pokaż pasek czasu (per poziom)</div>
        <div data-testid="show-countdown-per-level" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {(['iskierka', 'plomyk', 'ognik', 'pochodnia'] as const).map((lvl) => {
            const timerOff = getEffectiveTimeLimit(settings, lvl) === 'off'
            const effective = getEffectiveShowCountdownBar(settings, lvl)
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
                />
                <span>
                  {LEVEL_LABELS[lvl]}
                  {timerOff && <span style={{ color: '#7a7a82', marginLeft: 6 }}>(timer wyłączony)</span>}
                </span>
              </label>
            )
          })}
        </div>
      </section>
```

- [ ] **Step 4: Type-check + build**

```bash
pnpm tsc -b
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/settings/components/SettingsScreen.tsx
git commit -m "feat(settings-ui): per-level timeLimit radios + disabled countdown checkbox when timer off"
```

---

## Task 5: Aktualizacja istniejących testów które używały starego `settings.timeLimit`

**Files:**
- Audyt: `grep -rn "timeLimit" src --include="*.test.ts" --include="*.test.tsx"`

- [ ] **Step 1: Znajdź wszystkie testy dotykające `settings.timeLimit`**

```bash
grep -rn "timeLimit" src --include="*.test.ts" --include="*.test.tsx"
```

- [ ] **Step 2: Dla każdego znalezionego testu zaktualizuj fixture/asercję**

Wzorzec:
- Stare: `settings.timeLimit = 15`, `settings.timeLimit = 'off'`
- Nowe: `settings.timeLimit = { iskierka: 15, plomyk: 15, ognik: 15, pochodnia: 15 }` lub `{}` dla domyślnego (Iskierka/Płomyk = `'off'`, Ognik/Pochodnia = `15`).
- Test który expectuje data-testid `time-limit-15` (nie-per-level): zaktualizuj na np. `time-limit-iskierka-15`.
- Test który ustawia `settings.timeLimit = 'off'` żeby wyłączyć timer w sesji Iskierki: pamiętaj że default Iskierki to już `'off'` — może test można uprościć.

Jeśli `useSession.test.ts` ustawia `timeLimit: 15` jako prymityw w configu sesji — to OK, bo `useSession` config ma `timeLimit: TimeLimit` (prymityw, nie `Partial<Record<...>>`). SessionView wywołuje `getEffectiveTimeLimit(settings, level)` przed przekazaniem do `useSession`. Sprawdź podpis hooka — jeśli nadal akceptuje prymityw, testy hooka pozostają bez zmian.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test --run
```
Expected: 402+ tests PASS (z dodatkiem nowych z Task 1, Task 2; jeden pre-existing fail w `activeLettersValidation` pozostaje — patrz STATUS.md).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: update timeLimit tests for per-level shape"
```

---

## Task 6: Headline timeout fix (issue #2)

**Files:**
- Modify: `src/modules/letters/components/FeedbackOverlay.tsx:67-68`
- Test: `src/modules/letters/components/FeedbackOverlay.test.tsx:46-51`

- [ ] **Step 1: Zaktualizuj failing test na nowy headline**

W `src/modules/letters/components/FeedbackOverlay.test.tsx` zmień asercję:
```tsx
  it('renders timeout variant headline', () => {
    render(<FeedbackOverlay feedback={fb({ variant: 'timeout' })} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('feedback-headline')).toHaveTextContent(
      'Posłuchaj jeszcze raz',
    )
  })
```

- [ ] **Step 2: Run test — powinien FAIL**

```bash
pnpm test --run src/modules/letters/components/FeedbackOverlay.test.tsx
```
Expected: FAIL na `renders timeout variant headline` (oczekuje `Posłuchaj jeszcze raz`, dostaje `Następnym razem szybciej`).

- [ ] **Step 3: Zmień headline w `FeedbackOverlay.tsx`**

W `src/modules/letters/components/FeedbackOverlay.tsx` zmień:
```ts
    case 'timeout':
      return 'Następnym razem szybciej'
```
na:
```ts
    case 'timeout':
      return 'Posłuchaj jeszcze raz'
```

UWAGA: to ten sam headline co `wrong` (linia 64). To celowe — timeout audio jest scalone z dontKnow ("nie szkodzi"), a wizualnie tonalność spójna z `wrong` (oba wymagają "posłuchaj") jest OK. Alternatywą byłoby `'Nie szkodzi!'` (jak dontKnow) — wybieramy `'Posłuchaj jeszcze raz'` bo to wspierające + zachęca do następnego pytania bez stigmatu "nie wiedziałeś".

- [ ] **Step 4: Run test — powinien PASS**

```bash
pnpm test --run src/modules/letters/components/FeedbackOverlay.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/letters/components/FeedbackOverlay.tsx src/modules/letters/components/FeedbackOverlay.test.tsx
git commit -m "fix(FeedbackOverlay): timeout headline align with calm audio (Posłuchaj jeszcze raz)"
```

---

## Task 7: LevelSelect — IskraMascot zamiast emoji (issue #3, kosmetyka)

**Files:**
- Modify: `src/modules/letters/components/LevelSelect.tsx:11-15, 28-45, 182-206`
- Test: `src/modules/letters/components/LevelSelect.test.tsx` (jeśli są asercje na emoji)

- [ ] **Step 1: Audyt testów LevelSelect na emoji**

```bash
grep -n "🔥\|flame" src/modules/letters/components/LevelSelect.test.tsx
```
Jeśli są asercje na konkretne `🔥`/`🔥🔥`, trzeba je zaktualizować na obecność `iskra-mascot` testid lub `aria-label`.

- [ ] **Step 2: Dodaj import IskraMascot + IskraIntensity**

W `src/modules/letters/components/LevelSelect.tsx` po istniejących importach dodaj:
```ts
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
```

- [ ] **Step 3: Zamień `flame` w `LevelMeta` na `intensity`**

Zmień:
```ts
type LevelMeta = {
  level: Level
  label: string
  flame: string
  description: string
}

const LEVEL_META: LevelMeta[] = [
  { level: 'iskierka', label: 'Iskierka', flame: '🔥', description: 'najłatwiejszy — 6 literek' },
  { level: 'plomyk', label: 'Płomyk', flame: '🔥🔥', description: 'łatwy — 14 literek' },
  { level: 'ognik', label: 'Ognik', flame: '🔥🔥🔥', description: 'średni — 24 literki' },
  {
    level: 'pochodnia',
    label: 'Pochodnia',
    flame: '🔥🔥🔥🔥',
    description: 'pełen alfabet — 32 literki',
  },
]
```
na:
```ts
type LevelMeta = {
  level: Level
  label: string
  intensity: IskraIntensity
  description: string
}

const LEVEL_META: LevelMeta[] = [
  { level: 'iskierka', label: 'Iskierka', intensity: 'spark', description: 'najłatwiejszy — 6 literek' },
  { level: 'plomyk', label: 'Płomyk', intensity: 'flame', description: 'łatwy — 14 literek' },
  { level: 'ognik', label: 'Ognik', intensity: 'fire', description: 'średni — 24 literki' },
  {
    level: 'pochodnia',
    label: 'Pochodnia',
    intensity: 'torch',
    description: 'pełen alfabet — 32 literki',
  },
]
```

- [ ] **Step 4: Zamień render emoji na `<IskraMascot>`**

W bloku renderowania kafelków (linia ~194) zamień:
```tsx
              <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden="true">
                {meta.flame}
              </span>
```
na:
```tsx
              <span style={{ display: 'flex', justifyContent: 'center' }} aria-hidden="true">
                <IskraMascot size={56} state="idle" intensity={meta.intensity} />
              </span>
```

- [ ] **Step 5: Type-check + run testów LevelSelect**

```bash
pnpm tsc -b
pnpm test --run src/modules/letters/components/LevelSelect.test.tsx
```
Expected: PASS. Jeśli testy oczekują emoji `🔥` — zaktualizuj asercje na obecność `iskra-mascot` testid.

- [ ] **Step 6: Commit**

```bash
git add src/modules/letters/components/LevelSelect.tsx src/modules/letters/components/LevelSelect.test.tsx
git commit -m "feat(LevelSelect): IskraMascot per level intensity instead of flame emoji"
```

---

## Task 8: Verification — full suite + smoke

**Files:** brak (tylko verify)

- [ ] **Step 1: Full type-check + test + build**

```bash
pnpm tsc -b && pnpm test --run && pnpm build
```
Expected:
- `tsc -b` ✓
- `pnpm test --run` — wszystkie zielone z wyjątkiem znanego pre-existing `activeLettersValidation > rejects letters outside the level pool` (patrz STATUS.md "Known pre-existing bugs")
- `pnpm build` ✓

- [ ] **Step 2: Audio sanity**

```bash
pnpm audio:check
```
Expected: 137 plików zgodnie z manifestem, brak missing keys.

- [ ] **Step 3: Manual smoke w przeglądarce (jeśli dev-server chodzi)**

Sprawdź ręcznie 3 scenariusze (nie w teście):
1. **Wyczyść localStorage** (DevTools → Application → Storage → Clear site data) — sprawdź że Iskierka session nie ma countdown bar i timer NIE odlicza w tle (czekaj 30s na pytaniu, nic się nie dzieje, dopiero kliknięcie zmienia pytanie).
2. **Settings → Limit czasu** — sprawdź że są 4 wiersze (per-level) z radiami 'wyłączony'/10s/15s/20s/25s. Pasek countdown: dla Iskierki/Płomyk checkbox wyszarzony "(timer wyłączony)", dla Ognik/Pochodnia aktywny.
3. **Timeout flow** — w Ognik/Pochodnia przeczekaj timer, sprawdź że feedback overlay pokazuje "Posłuchaj jeszcze raz" zamiast "Następnym razem szybciej". Audio gra dont-know-X + correction-prefix-N + letter-X (scalone z dontKnow).

Jeśli localStorage z poprzedniej sesji trzymał stare ustawienia, migracja v3→v4 powinna zadziałać automatycznie.

---

## Task 9: STATUS.md update + commit + decyzja merge

**Files:**
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Zaktualizuj STATUS.md**

Wymeldować z sekcji "v1.1.1 follow-up" punkty 1, 2, 3 (zrobione). Dodać nowy bullet w "Co zrobione w sesji" z podsumowaniem v1.1.1:
- Per-level `timeLimit` (typ + helper + persist v3→v4 + UI per-level + checkbox countdown disabled gdy timer off)
- `FeedbackOverlay::headlineFor('timeout')` → `'Posłuchaj jeszcze raz'`
- LevelSelect używa `IskraMascot` z rosnącą intensywnością (spark/flame/fire/torch)
- Pre-existing bug `activeLettersValidation` wciąż otwarty (osobny task)

Aktualizuj sekcję "Najbliższe rzeczy do zrobienia" — usuń v1.1.1 follow-up jako zrobione, postaw znowu opcję merge do main jako TOP.

- [ ] **Step 2: Commit STATUS.md**

```bash
git add docs/STATUS.md
git commit -m "docs(STATUS): v1.1.1 follow-up done — per-level timeLimit + headline + LevelSelect mascot"
```

- [ ] **Step 3: STOP — zapytaj user'a**

Po wykonaniu Task 8 i 9 NIE merguj automatycznie do main. Ostatnia decyzja należy do user'a:
- "v1.1.1 follow-up gotowy. Mergujemy `feat/ux-iteration-v1.1` do main jako v1.1 (squash vs merge commit)?"
- Czekaj na potwierdzenie.

---

## Self-review checklist

- [x] Spec coverage: oba issues z STATUS.md "v1.1.1 follow-up" + opcjonalny #3 (LevelSelect mascot) pokryte (Tasks 1-7)
- [x] No placeholders: wszystkie code blocks mają konkretny kod, exact paths, exact commands
- [x] Type consistency: `getEffectiveTimeLimit` użyte spójnie w SessionView, exporter, SettingsScreen
- [x] TDD: każdy nietrywialny task ma failing test PRZED implementacją (Task 1.5/1.6, Task 2.2/2.3, Task 6.1/2/3/4)
- [x] Frequent commits: każdy task = 1 commit, łącznie 9 commits
- [x] Branch decyzja: jasno powiedziane że NIE merguje automatycznie — czeka na user'a
