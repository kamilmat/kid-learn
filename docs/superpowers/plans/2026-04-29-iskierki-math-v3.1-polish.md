# Iskierki — moduł 3 v3.1 polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dokończyć moduł 3 (matematyka): sekcja matematyki w raporcie rodzica, UI dla 5 ustawień `numbers.*`, 20 dedykowanych worked-example animacji ConceptIntro per koncept.

**Architecture:** Trzy niezależne zmiany reuse istniejących komponentów (`representations/`, `ToggleField`, `audioBus`). Brak nowych dependencji, brak nowych nagrań audio (reuse 121 mp3 z modułu 3 v3.0). Animacje synchronizowane z istniejącym `intro-<conceptId>.mp3` przez `setTimeout` od startu `audioBus.play()` (Promise rezolvuje na 'ended').

**Tech Stack:** React 19 + TS strict + Vite + Vitest + Tailwind 4 + Zustand. Audio: AudioBus singleton (single persistent HTMLAudioElement). Reuse `TenFrame`, `DotPattern`, `ConcreteIcons`, `NumberBondShape`, `DigitTile`, `ToggleField`, `useTapHandler`, `colors/radii`.

**Spec:** `docs/superpowers/specs/2026-04-29-iskierki-math-v3.1-polish-design.md` (commit `40abc67`)

---

## File structure

**Nowe pliki (25):**
| Plik | Odpowiedzialność |
|---|---|
| `src/modules/numbers/data/conceptLabels.ts` | Single source of truth dla polskich etykiet 20 konceptów (extract z MasteryTree) |
| `src/shared/stats/components/NumbersStats.tsx` | Sekcja matematyki w raporcie rodzica (3 karty: koncepty / trudne fakty / heatmapa typów) |
| `src/shared/stats/components/NumbersStats.test.tsx` | Smoke test renderowania z fake store |
| `src/modules/numbers/components/intros/IntroFrame.tsx` | Wspólny szkielet animacji intro (audio orchestracja, fallback timer, stage management, przycisk →) |
| `src/modules/numbers/components/intros/animations/<conceptId>.tsx` × 20 | Pure animation per koncept (props: `{stage: number}`, exportowany `SCENES`) |
| `src/modules/numbers/components/intros/animations/index.ts` | Registry `INTRO_ANIMATIONS: Record<ConceptId, IntroAnimation>` |
| `src/modules/numbers/components/intros/animations/animations.test.tsx` | Data-driven smoke test — wszystkie ConceptId mają entry w INTRO_ANIMATIONS |

**Modyfikowane pliki (5):**
| Plik | Zmiana |
|---|---|
| `src/modules/numbers/components/MasteryTree.tsx` | Usuń lokalny `CONCEPT_LABELS`, importuj z `data/conceptLabels.ts` |
| `src/modules/numbers/components/intros/ConceptIntro.tsx` | Refaktor na router: `<IntroFrame Animation={INTRO_ANIMATIONS[conceptId]} />` |
| `src/shared/settings/components/SettingsScreen.tsx` | Dodaj sekcję "Matematyka (moduł 3)" przed Reset z 5 kontrolkami |
| `src/shared/stats/components/ReportScreen.tsx` | Mount `<NumbersStats />` po `<ReadingStats />` |
| `src/shared/stats/exporter.ts` | Dodaj sekcję `## Matematyka` w eksporcie markdown (rozszerz sygnaturę o opcjonalny snapshot) |

**Konwencje (z CLAUDE.md):** Function components, named exports, TS strict (no `any`), inline styles + Tailwind OK, polskie napisy w UI, tokeny z `@/app/theme`. Audio keys lowercase (już są). Komentarze tylko jeśli WHY niejasne.

**TDD note:** User preference (CLAUDE.md): "test w przeglądarce > testów jednostkowych". Plan ma minimum testów (smoke / kontrakt) — manualna weryfikacja w browserze pokrywa CSS animacji.

---

## Task 1: Extract `CONCEPT_LABELS` do shared

**Files:**
- Create: `src/modules/numbers/data/conceptLabels.ts`
- Modify: `src/modules/numbers/components/MasteryTree.tsx`

- [ ] **Step 1: Utwórz plik conceptLabels.ts**

Create `src/modules/numbers/data/conceptLabels.ts`:

```ts
import type { ConceptId } from '../types'

export const CONCEPT_LABELS: Record<ConceptId, string> = {
  'iskierka-counting-5': 'Liczenie do 5',
  'iskierka-counting-10': 'Liczenie do 10',
  'iskierka-subitizing-6': 'Subitizing 1-6',
  'iskierka-rhythm': 'Rytm liczbowy',
  'iskierka-adding-concrete': 'Dokładanie',
  'plomyk-bonds-5': 'Rozkład 5',
  'plomyk-bonds-10': 'Rozkład 6-10',
  'plomyk-tenframe': 'Ten frame',
  'plomyk-addsub-10': '+/− do 10',
  'plomyk-factfamily': 'Rodzina liczb',
  'ognik-doubles': 'Podwójki',
  'ognik-neardoubles': 'Prawie-podwójki',
  'ognik-make10': 'Zrób 10',
  'ognik-factfamily-20': 'Rodzina liczb do 20',
  'pochodnia-skipcount-2': 'Po 2',
  'pochodnia-skipcount-5': 'Po 5',
  'pochodnia-skipcount-10': 'Po 10',
  'pochodnia-equalgroups': 'Równe grupy',
  'pochodnia-arrays': 'Rzędy i kolumny',
  'pochodnia-commutativity': 'Mnożenie',
}
```

- [ ] **Step 2: Refaktor MasteryTree do importu**

W `src/modules/numbers/components/MasteryTree.tsx`:
- Usuń lokalny blok `const CONCEPT_LABELS: Record<ConceptId, string> = { … }` (linie 12-33)
- Dodaj import na górze: `import { CONCEPT_LABELS } from '../data/conceptLabels'`
- Zachowaj reszta pliku bez zmian

- [ ] **Step 3: Verify**

Run: `pnpm tsc -b`
Expected: PASS

Run: `pnpm test --run`
Expected: 551/551 (lub więcej jeśli istnieją testy MasteryTree dotykające etykiet — wszystkie zielone)

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/data/conceptLabels.ts src/modules/numbers/components/MasteryTree.tsx
git commit -m "refactor(numbers): extract CONCEPT_LABELS to shared data module"
```

---

## Task 2: SettingsScreen — sekcja matematyki

**Files:**
- Modify: `src/shared/settings/components/SettingsScreen.tsx`

- [ ] **Step 1: Dodaj sekcję "Matematyka (moduł 3)" przed sekcją Reset**

W `src/shared/settings/components/SettingsScreen.tsx` znajdź `{/* Reset postępów */}` (~linia 692) i WSTAW PRZED nią całą sekcję:

```tsx
      {/* Matematyka (moduł 3) */}
      <section style={sectionStyle} data-testid="section-numbers">
        <div style={labelStyle}>Matematyka (moduł 3)</div>
        <ToggleField
          label="Iskra mówi na głos"
          description="Iskra opowiada krok po kroku co robi (pomaga zrozumieć)"
          value={settings.numbers.iskraThinkingAloud}
          onChange={(v) =>
            updateSetting('numbers', { ...settings.numbers, iskraThinkingAloud: v })
          }
          testId="numbers-iskra-thinking"
        />
        <ToggleField
          label="Wprowadzenia do nowych konceptów"
          description="Krótkie animowane intro przed pierwszym pytaniem z nowego tematu"
          value={settings.numbers.conceptIntros}
          onChange={(v) =>
            updateSetting('numbers', { ...settings.numbers, conceptIntros: v })
          }
          testId="numbers-concept-intros"
        />
        <ToggleField
          label="Celebracje opanowania"
          description="Głośne celebracje gdy dziecko opanuje koncept w drzewku"
          value={settings.numbers.treeCelebrationsOn}
          onChange={(v) =>
            updateSetting('numbers', { ...settings.numbers, treeCelebrationsOn: v })
          }
          testId="numbers-tree-celebrations"
        />

        <div style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Pytań na sesję</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Mniej = krócej; więcej = solidniej
          </div>
          <div
            role="radiogroup"
            aria-label="Pytań na sesję matematyki"
            style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}
          >
            {([6, 8, 10] as const).map((n) => (
              <label
                key={n}
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${
                    settings.numbers.questionCount === n
                      ? colors.accentBlue
                      : '#d8d8de'
                  }`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="numbers-question-count"
                  value={n}
                  checked={settings.numbers.questionCount === n}
                  onChange={() =>
                    updateSetting('numbers', {
                      ...settings.numbers,
                      questionCount: n,
                    })
                  }
                  data-testid={`numbers-question-count-${n}`}
                />
                <span>{n}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            Krok dla skip count (Pochodnia)
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Liczenie 2,4,6… / 5,10,15… / 10,20,30… / mieszane
          </div>
          <select
            data-testid="numbers-skip-count-step"
            value={String(settings.numbers.skipCountStep)}
            onChange={(e) => {
              const v = e.target.value
              const next: 2 | 5 | 10 | 'mixed' =
                v === 'mixed' ? 'mixed' : (Number(v) as 2 | 5 | 10)
              updateSetting('numbers', { ...settings.numbers, skipCountStep: next })
            }}
            style={{ ...selectStyle, marginTop: 8 }}
          >
            <option value="2">co 2</option>
            <option value="5">co 5</option>
            <option value="10">co 10</option>
            <option value="mixed">mieszane</option>
          </select>
        </div>
      </section>
```

- [ ] **Step 2: Type-check + test**

Run: `pnpm tsc -b`
Expected: PASS

Run: `pnpm test --run src/shared/settings/components/SettingsScreen.test.tsx`
Expected: PASS (istniejące testy nie tykają nowej sekcji)

- [ ] **Step 3: Manual quick smoke**

Run: `pnpm dev`
Otwórz http://localhost:5173, kliknij ⚙ Settings, przejdź math gate.
Verify: sekcja "Matematyka (moduł 3)" widoczna nad "Reset postępów" z 5 kontrolkami.
Toggle każdy → otwórz DevTools → Application → localStorage → `iskierki-state-v4`. Verify że `settings.numbers.<field>` zaktualizowany.

- [ ] **Step 4: Commit**

```bash
git add src/shared/settings/components/SettingsScreen.tsx
git commit -m "feat(settings): UI sekcja matematyki (5 kontrolek numbers.*)"
```

---

## Task 3: `IntroFrame` + animations registry skeleton

**Files:**
- Create: `src/modules/numbers/components/intros/IntroFrame.tsx`
- Create: `src/modules/numbers/components/intros/animations/index.ts`
- Create: `src/modules/numbers/components/intros/animations/animations.test.tsx`

- [ ] **Step 1: Type kontraktowy + IntroFrame**

Create `src/modules/numbers/components/intros/IntroFrame.tsx`:

```tsx
import { useEffect, useRef, useState, type ComponentType } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

export type Scene = { stage: number; offsetMs: number }

export type IntroAnimation = ComponentType<{ stage: number }> & {
  SCENES: readonly Scene[]
}

type Props = {
  introAudioKey: string
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onContinue: () => void
  Animation: IntroAnimation
}

const FALLBACK_FINISH_MS = 4000

export function IntroFrame({ introAudioKey, audioBus, onContinue, Animation }: Props) {
  const [stage, setStage] = useState(0)
  const [audioFinished, setAudioFinished] = useState(false)
  const tap = useTapHandler({ onTap: onContinue })
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    audioBus.stop()
    const fallback = window.setTimeout(
      () => setAudioFinished(true),
      FALLBACK_FINISH_MS,
    )
    timeoutsRef.current.push(fallback)

    audioBus
      .play(introAudioKey)
      .then(() => setAudioFinished(true))
      .catch(() => setAudioFinished(true))

    for (const scene of Animation.SCENES) {
      const id = window.setTimeout(() => setStage(scene.stage), scene.offsetMs)
      timeoutsRef.current.push(id)
    }

    return () => {
      for (const id of timeoutsRef.current) window.clearTimeout(id)
      timeoutsRef.current = []
    }
  }, [audioBus, introAudioKey, Animation])

  return (
    <div
      data-testid="intro-frame"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 32,
      }}
    >
      <div
        data-testid="intro-animation-host"
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Animation stage={stage} />
      </div>
      <button
        type="button"
        data-testid="concept-intro-continue"
        aria-label="Dalej"
        {...tap}
        disabled={!audioFinished}
        style={{
          minHeight: 72,
          minWidth: 200,
          padding: '0 32px',
          borderRadius: radii.kid,
          background: audioFinished ? colors.accentBlue : '#cbd5e1',
          color: '#fff',
          border: 'none',
          fontSize: 32,
          fontFamily: 'var(--font-handwritten)',
          cursor: audioFinished ? 'pointer' : 'not-allowed',
          opacity: audioFinished ? 1 : 0.5,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Pusty registry**

Create `src/modules/numbers/components/intros/animations/index.ts`:

```ts
import type { ConceptId } from '../../../types'
import type { IntroAnimation } from '../IntroFrame'

// Wypełniany w Tasks 5-8 (per poziom). Build i smoke test failuje dopóki
// Record nie jest kompletny dla wszystkich 20 ConceptId.
export const INTRO_ANIMATIONS: Record<ConceptId, IntroAnimation> = {} as Record<
  ConceptId,
  IntroAnimation
>
```

- [ ] **Step 3: Smoke test**

Create `src/modules/numbers/components/intros/animations/animations.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { CONCEPTS } from '../../../data/concepts'
import { INTRO_ANIMATIONS } from './index'

describe('INTRO_ANIMATIONS registry', () => {
  it('ma entry dla każdego ConceptId z CONCEPTS', () => {
    const conceptIds = Object.keys(CONCEPTS) as Array<keyof typeof CONCEPTS>
    for (const id of conceptIds) {
      const anim = INTRO_ANIMATIONS[id]
      expect(anim, `Brak animacji dla ${id}`).toBeDefined()
      expect(typeof anim).toBe('function')
      expect(anim.SCENES).toBeDefined()
      expect(Array.isArray(anim.SCENES)).toBe(true)
    }
  })
})
```

- [ ] **Step 4: Verify że test FAILS (TDD red)**

Run: `pnpm test --run src/modules/numbers/components/intros/animations/animations.test.tsx`
Expected: FAIL — "Brak animacji dla iskierka-counting-5" (i 19 innych — wszystkie konceptId nie mają entries).

- [ ] **Step 5: Type-check że IntroFrame buduje się**

Run: `pnpm tsc -b`
Expected: PASS (IntroFrame i registry kompilują się; brak konsumentów IntroFrame jeszcze)

- [ ] **Step 6: Commit (red baseline)**

```bash
git add src/modules/numbers/components/intros/IntroFrame.tsx src/modules/numbers/components/intros/animations/
git commit -m "feat(numbers): IntroFrame + animations registry szkielet (TDD red)"
```

---

## Task 4: `NumbersStats` — sekcja matematyki w raporcie

**Files:**
- Create: `src/shared/stats/components/NumbersStats.tsx`
- Create: `src/shared/stats/components/NumbersStats.test.tsx`

- [ ] **Step 1: Helper formatFactId + grouping**

Create `src/shared/stats/components/NumbersStats.tsx`:

```tsx
import { useNumbers } from '@/modules/numbers/store/numbersStore'
import { CONCEPTS } from '@/modules/numbers/data/concepts'
import { CONCEPT_LABELS } from '@/modules/numbers/data/conceptLabels'
import type { ConceptId, MathFactId, MathFactState } from '@/modules/numbers/types'

const cardStyle = {
  padding: 16,
  background: '#ffffff',
  border: '1px solid #e2e2e8',
  borderRadius: 12,
} as const

type ConceptGroupKey =
  | 'counting'
  | 'subitizing'
  | 'bonds'
  | 'addsub'
  | 'doubles'
  | 'make10'
  | 'skipcount'
  | 'multiplication'

const CONCEPT_GROUPS: Record<ConceptGroupKey, { label: string; concepts: ConceptId[] }> = {
  counting: { label: 'Liczenie', concepts: ['iskierka-counting-5', 'iskierka-counting-10'] },
  subitizing: { label: 'Subitizing/Rytm', concepts: ['iskierka-subitizing-6', 'iskierka-rhythm'] },
  bonds: { label: 'Rozkłady', concepts: ['plomyk-bonds-5', 'plomyk-bonds-10'] },
  addsub: { label: '+/− do 10', concepts: ['iskierka-adding-concrete', 'plomyk-tenframe', 'plomyk-addsub-10'] },
  doubles: { label: 'Podwójki', concepts: ['ognik-doubles', 'ognik-neardoubles'] },
  make10: { label: 'Zrób 10', concepts: ['ognik-make10'] },
  skipcount: { label: 'Skip count', concepts: ['pochodnia-skipcount-2', 'pochodnia-skipcount-5', 'pochodnia-skipcount-10'] },
  multiplication: { label: 'Mnożenie', concepts: ['plomyk-factfamily', 'ognik-factfamily-20', 'pochodnia-equalgroups', 'pochodnia-arrays', 'pochodnia-commutativity'] },
}

export function formatFactId(id: MathFactId): string {
  // Format z numbers/types.ts: <type>-<args>
  const parts = id.split('-')
  const type = parts[0]
  switch (type) {
    case 'bond': return `${parts[2]}+${parts[3]}`           // bond-7-3-4 → 3+4
    case 'add': return `${parts[1]}+${parts[2]}`            // add-5-2 → 5+2
    case 'sub': return `${parts[1]}-${parts[2]}`            // sub-7-3 → 7-3
    case 'double': return `${parts[1]}+${parts[1]}`         // double-6 → 6+6
    case 'neardouble': return `${parts[1]}+${parts[2]}`     // neardouble-6-7 → 6+7
    case 'make10': return `${parts[1]}+${parts[2]}`         // make10-8-5 → 8+5
    case 'mult': return `${parts[1]}×${parts[2]}`           // mult-3-2 → 3×2
    case 'array': {                                          // array-3x4 → 3×4
      const dims = parts[1]?.split('x')
      return dims && dims.length === 2 ? `${dims[0]}×${dims[1]}` : id
    }
    case 'tenframe': return `TF·${parts[1]}`                // tenframe-7 → TF·7
    case 'skip2':
    case 'skip5':
    case 'skip10': {
      const step = type.replace('skip', '')
      return `+${step}`
    }
    default: return id
  }
}

function difficultyColor(avg: number | null): string {
  if (avg === null) return '#f3f4f6'
  if (avg <= 1) return '#d1fae5'
  if (avg <= 3) return '#fef3c7'
  return '#fee2e2'
}

type NumbersStatsProps = {
  onOpenTree?: () => void
}

export function NumbersStats({ onOpenTree }: NumbersStatsProps = {}) {
  const concepts = useNumbers((s) => s.concepts)
  const facts = useNumbers((s) => s.facts)

  const allConcepts = Object.values(CONCEPTS)
  const totalConcepts = allConcepts.length

  const masteredList = allConcepts.filter((c) => concepts[c.id]?.state === 'mastered')
  const learningCount = allConcepts.filter((c) => concepts[c.id]?.state === 'learning').length
  const untouchedCount = totalConcepts - masteredList.length - learningCount

  const allFactStates: MathFactState[] = Object.values(facts)
  const difficultFacts = allFactStates
    .filter((f) => f.recentWrong > 0)
    .sort((a, b) => {
      if (b.recentWrong !== a.recentWrong) return b.recentWrong - a.recentWrong
      return a.box - b.box
    })
    .slice(0, 10)

  const heatmap = (Object.keys(CONCEPT_GROUPS) as ConceptGroupKey[]).map((groupKey) => {
    const group = CONCEPT_GROUPS[groupKey]
    const groupFacts = allFactStates.filter((f) => group.concepts.includes(f.conceptId))
    if (groupFacts.length === 0) {
      return { key: groupKey, label: group.label, avg: null as number | null, n: 0 }
    }
    const sum = groupFacts.reduce((s, f) => s + (f.recentWrong + (5 - f.box)), 0)
    return { key: groupKey, label: group.label, avg: sum / groupFacts.length, n: groupFacts.length }
  })

  return (
    <section
      data-testid="numbers-stats-section"
      style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}
    >
      <h2 style={{ margin: 0, fontSize: 20 }}>Matematyka (moduł 3)</h2>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Koncepty</h3>
        <p style={{ margin: '0 0 4px' }}>
          Opanowane: {masteredList.length} / {totalConcepts}
        </p>
        {masteredList.length > 0 && (
          <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 13 }}>
            {masteredList.slice(0, 10).map((c) => CONCEPT_LABELS[c.id]).join(', ')}
            {masteredList.length > 10 ? ` +${masteredList.length - 10}` : ''}
          </p>
        )}
        <p style={{ margin: '0 0 4px' }}>W nauce: {learningCount}</p>
        <p style={{ margin: '0 0 8px' }}>Nietknięte: {untouchedCount}</p>
        {onOpenTree && (
          <button
            type="button"
            data-testid="numbers-stats-tree-link"
            onClick={onOpenTree}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#1d4ed8',
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'underline',
            }}
          >
            Zobacz drzewko →
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Najtrudniejsze fakty (top 10)</h3>
        {difficultFacts.length === 0 ? (
          <p style={{ margin: 0, color: '#059669' }}>Brak trudnych faktów — wszystko idzie!</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {difficultFacts.map((f) => (
              <div
                key={f.id}
                data-testid={`difficult-fact-${f.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span>{formatFactId(f.id)}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#7c2d12' }}>
                  {f.recentWrong}× wrong
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Heatmapa typów konceptów</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Kolor: zielony = łatwe, żółty = średnie, czerwony = trudne. n = liczba faktów z danymi.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}
        >
          {heatmap.map((cell) => (
            <div
              key={cell.key}
              data-testid={`concept-group-cell-${cell.key}`}
              style={{
                padding: 8,
                borderRadius: 8,
                textAlign: 'center' as const,
                fontWeight: 700,
                fontSize: 14,
                background: difficultyColor(cell.avg),
              }}
            >
              {cell.label}
              <div style={{ fontSize: 10, fontWeight: 400 }}>n={cell.n}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Smoke test (TDD red → green; jednoetap, nie warto rozdzielać)**

Create `src/shared/stats/components/NumbersStats.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NumbersStats, formatFactId } from './NumbersStats'
import { useNumbers } from '@/modules/numbers/store/numbersStore'

describe('formatFactId', () => {
  it('formatuje znane typy faktów', () => {
    expect(formatFactId('add-5-2')).toBe('5+2')
    expect(formatFactId('sub-7-3')).toBe('7-3')
    expect(formatFactId('bond-7-3-4')).toBe('3+4')
    expect(formatFactId('double-6')).toBe('6+6')
    expect(formatFactId('mult-3-2')).toBe('3×2')
    expect(formatFactId('array-3x4')).toBe('3×4')
    expect(formatFactId('tenframe-7')).toBe('TF·7')
    expect(formatFactId('skip5-step3')).toBe('+5')
  })

  it('nieznane formaty zwraca jako-jest (no-op defensywny)', () => {
    expect(formatFactId('totally-unknown-format')).toBe('totally-unknown-format')
  })
})

describe('NumbersStats', () => {
  beforeEach(() => {
    useNumbers.getState().reset()
  })

  it('pokazuje 0/20 koncepty gdy store pusty', () => {
    render(<NumbersStats />)
    expect(screen.getByText(/Opanowane:/)).toHaveTextContent('Opanowane: 0 / 20')
  })

  it('pokazuje opanowane koncepty + listę', () => {
    useNumbers.setState({
      concepts: {
        'iskierka-counting-5': {
          state: 'mastered',
          firstSeenAt: 1, lastSeenAt: 2, correctStreak: 10, factsTouched: ['add-1-1'],
        },
        'plomyk-bonds-5': {
          state: 'learning',
          firstSeenAt: 1, lastSeenAt: 2, correctStreak: 3, factsTouched: ['bond-5-2-3'],
        },
      },
    })
    render(<NumbersStats />)
    expect(screen.getByText(/Opanowane:/)).toHaveTextContent('Opanowane: 1 / 20')
    expect(screen.getByText(/Liczenie do 5/)).toBeInTheDocument()
    expect(screen.getByText(/W nauce:/)).toHaveTextContent('W nauce: 1')
  })

  it('pokazuje top 10 trudnych faktów posortowane', () => {
    useNumbers.setState({
      facts: {
        'add-5-2': { id: 'add-5-2', conceptId: 'iskierka-adding-concrete', box: 1, lastSeen: 0, recentWrong: 3 },
        'sub-7-3': { id: 'sub-7-3', conceptId: 'plomyk-addsub-10', box: 2, lastSeen: 0, recentWrong: 1 },
      },
    })
    render(<NumbersStats />)
    expect(screen.getByTestId('difficult-fact-add-5-2')).toBeInTheDocument()
    expect(screen.getByTestId('difficult-fact-sub-7-3')).toBeInTheDocument()
  })

  it('pokazuje "wszystko idzie" gdy brak trudnych', () => {
    render(<NumbersStats />)
    expect(screen.getByText(/Brak trudnych faktów/)).toBeInTheDocument()
  })

  it('renderuje 8 komórek heatmapy', () => {
    render(<NumbersStats />)
    expect(screen.getByTestId('concept-group-cell-counting')).toBeInTheDocument()
    expect(screen.getByTestId('concept-group-cell-multiplication')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test --run src/shared/stats/components/NumbersStats.test.tsx`
Expected: 7+ passing

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/stats/components/NumbersStats.tsx src/shared/stats/components/NumbersStats.test.tsx
git commit -m "feat(stats): NumbersStats — koncepty/trudne fakty/heatmapa typów + formatFactId"
```

---

## Task 5: Animacje Iskierka (5 plików)

**Files (5 nowych):**
- Create: `src/modules/numbers/components/intros/animations/iskierka-counting-5.tsx`
- Create: `src/modules/numbers/components/intros/animations/iskierka-counting-10.tsx`
- Create: `src/modules/numbers/components/intros/animations/iskierka-subitizing-6.tsx`
- Create: `src/modules/numbers/components/intros/animations/iskierka-rhythm.tsx`
- Create: `src/modules/numbers/components/intros/animations/iskierka-adding-concrete.tsx`

**Modify:**
- `src/modules/numbers/components/intros/animations/index.ts` (5 entries)

**Wzorzec animacji** — każdy plik exportuje default function component + stałą `SCENES`:

```tsx
import { TenFrame } from '../../representations/TenFrame'

const SCENES = [
  { stage: 1, offsetMs: 800 },
  { stage: 2, offsetMs: 1600 },
  // ...
] as const

function IskierkaCounting5({ stage }: { stage: number }) {
  return <TenFrame count={Math.min(stage, 5)} size={56} />
}
IskierkaCounting5.SCENES = SCENES
export default IskierkaCounting5
```

- [ ] **Step 1: iskierka-counting-5 (template — TenFrame fillujący się 1→5)**

```tsx
import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1200 },
  { stage: 3, offsetMs: 1800 },
  { stage: 4, offsetMs: 2400 },
  { stage: 5, offsetMs: 3000 },
]

function IskierkaCounting5({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-iskierka-counting-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={Math.min(stage, 5)} size={56} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 64, color: '#dc2626', minHeight: 80 }}>
        {stage > 0 ? Math.min(stage, 5) : ''}
      </div>
    </div>
  )
}
IskierkaCounting5.SCENES = SCENES
export default IskierkaCounting5
```

- [ ] **Step 2: iskierka-counting-10 (TenFrame 1→10)**

```tsx
import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = Array.from({ length: 10 }, (_, i) => ({
  stage: i + 1,
  offsetMs: 400 + i * 400,
}))

function IskierkaCounting10({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-iskierka-counting-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={Math.min(stage, 10)} size={48} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 64, color: '#dc2626', minHeight: 80 }}>
        {stage > 0 ? Math.min(stage, 10) : ''}
      </div>
    </div>
  )
}
IskierkaCounting10.SCENES = SCENES
export default IskierkaCounting10
```

- [ ] **Step 3: iskierka-subitizing-6 (3 dice patterns flash)**

```tsx
import { DotPattern } from '../../representations/DotPattern'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 800 },
  { stage: 2, offsetMs: 2000 },
  { stage: 3, offsetMs: 3200 },
]

const PATTERN_FOR_STAGE: Record<number, number> = { 1: 3, 2: 5, 3: 6 }

function IskierkaSubitizing6({ stage }: { stage: number }) {
  const count = PATTERN_FOR_STAGE[stage] ?? 0
  return (
    <div data-testid="anim-iskierka-subitizing-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {count > 0 && <DotPattern count={count} pattern="dice" size={140} />}
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 56, color: '#1d4ed8', minHeight: 70 }}>
        {count > 0 ? count : ''}
      </div>
    </div>
  )
}
IskierkaSubitizing6.SCENES = SCENES
export default IskierkaSubitizing6
```

- [ ] **Step 4: iskierka-rhythm (3 grupy po 3 — rytm 3-3-3)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1600 },
  { stage: 3, offsetMs: 2600 },
]

function IskierkaRhythm({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0] // pierwszy zestaw — fallback bezpieczny
  return (
    <div data-testid="anim-iskierka-rhythm" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {[1, 2, 3].map((g) => (
        <div
          key={g}
          style={{
            opacity: stage >= g ? 1 : 0.15,
            transition: 'opacity 200ms',
          }}
        >
          <ConcreteIcons count={3} iconSet={apple} iconSize={48} layout="row" />
        </div>
      ))}
    </div>
  )
}
IskierkaRhythm.SCENES = SCENES
export default IskierkaRhythm
```

- [ ] **Step 5: iskierka-adding-concrete (CPA: 2 + 1 = 3)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 800 },   // 2 jabłka
  { stage: 2, offsetMs: 2000 },  // + 1 jabłko
  { stage: 3, offsetMs: 3200 },  // = 3
]

function IskierkaAddingConcrete({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]
  return (
    <div data-testid="anim-iskierka-adding-concrete" style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-handwritten)', fontSize: 56 }}>
      <ConcreteIcons count={stage >= 1 ? 2 : 0} iconSet={apple} iconSize={48} layout="row" />
      <span style={{ opacity: stage >= 2 ? 1 : 0.15 }}>+</span>
      <ConcreteIcons count={stage >= 2 ? 1 : 0} iconSet={apple} iconSize={48} layout="row" />
      <span style={{ opacity: stage >= 3 ? 1 : 0.15 }}>=</span>
      <span style={{ opacity: stage >= 3 ? 1 : 0.15, color: '#dc2626' }}>3</span>
    </div>
  )
}
IskierkaAddingConcrete.SCENES = SCENES
export default IskierkaAddingConcrete
```

- [ ] **Step 6: Update registry index.ts**

Edit `src/modules/numbers/components/intros/animations/index.ts`:

```ts
import type { ConceptId } from '../../../types'
import type { IntroAnimation } from '../IntroFrame'
import iskierkaCounting5 from './iskierka-counting-5'
import iskierkaCounting10 from './iskierka-counting-10'
import iskierkaSubitizing6 from './iskierka-subitizing-6'
import iskierkaRhythm from './iskierka-rhythm'
import iskierkaAddingConcrete from './iskierka-adding-concrete'

export const INTRO_ANIMATIONS: Partial<Record<ConceptId, IntroAnimation>> = {
  'iskierka-counting-5': iskierkaCounting5 as IntroAnimation,
  'iskierka-counting-10': iskierkaCounting10 as IntroAnimation,
  'iskierka-subitizing-6': iskierkaSubitizing6 as IntroAnimation,
  'iskierka-rhythm': iskierkaRhythm as IntroAnimation,
  'iskierka-adding-concrete': iskierkaAddingConcrete as IntroAnimation,
} as Record<ConceptId, IntroAnimation>
```

Note: `Partial<Record<>>` przejściowo, dopóki Tasks 6-8 nie wypełnią pozostałych. `as Record<>` na końcu zachowuje export type compatibility.

- [ ] **Step 7: Verify**

Run: `pnpm tsc -b`
Expected: PASS

Run: `pnpm test --run src/modules/numbers/components/intros/animations/animations.test.tsx`
Expected: FAIL — wszystkie iskierka-* PASS, ale brak płomyk/ognik/pochodnia (15 fail) — to OK na tym etapie.

- [ ] **Step 8: Commit**

```bash
git add src/modules/numbers/components/intros/animations/iskierka-*.tsx src/modules/numbers/components/intros/animations/index.ts
git commit -m "feat(numbers): 5 worked-example animacji ConceptIntro dla Iskierki"
```

---

## Task 6: Animacje Płomyk (5 plików)

**Files:**
- Create: `src/modules/numbers/components/intros/animations/plomyk-bonds-5.tsx`
- Create: `src/modules/numbers/components/intros/animations/plomyk-bonds-10.tsx`
- Create: `src/modules/numbers/components/intros/animations/plomyk-tenframe.tsx`
- Create: `src/modules/numbers/components/intros/animations/plomyk-addsub-10.tsx`
- Create: `src/modules/numbers/components/intros/animations/plomyk-factfamily.tsx`

**Modify:** `src/modules/numbers/components/intros/animations/index.ts`

- [ ] **Step 1: plomyk-bonds-5 (CPA: 5 → bond 2+3)**

```tsx
import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // pokazuje 5 (whole only)
  { stage: 2, offsetMs: 1800 },  // pokazuje 2
  { stage: 3, offsetMs: 2800 },  // pokazuje 2 i 3
]

function PlomykBonds5({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-plomyk-bonds-5">
      <NumberBondShape
        whole={5}
        partA={stage >= 2 ? 2 : null}
        partB={stage >= 3 ? 3 : null}
      />
    </div>
  )
}
PlomykBonds5.SCENES = SCENES
export default PlomykBonds5
```

- [ ] **Step 2: plomyk-bonds-10 (cykliczne pary 4+6, 7+3)**

```tsx
import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // 10 + 4+6
  { stage: 2, offsetMs: 2400 },  // 10 + 7+3
  { stage: 3, offsetMs: 3800 },  // 10 + 5+5
]

const PAIRS: Array<[number, number]> = [[4, 6], [7, 3], [5, 5]]

function PlomykBonds10({ stage }: { stage: number }) {
  const idx = Math.max(0, Math.min(stage - 1, PAIRS.length - 1))
  const pair = PAIRS[idx]
  return (
    <div data-testid="anim-plomyk-bonds-10">
      <NumberBondShape
        whole={10}
        partA={stage >= 1 ? pair[0] : null}
        partB={stage >= 1 ? pair[1] : null}
      />
    </div>
  )
}
PlomykBonds10.SCENES = SCENES
export default PlomykBonds10
```

- [ ] **Step 3: plomyk-tenframe (TenFrame 7 fill = 10 - 3 puste)**

```tsx
import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // 0
  { stage: 2, offsetMs: 1400 },  // narastający fill do 7
  { stage: 3, offsetMs: 2400 },  // pokaż "7"
]

function PlomykTenframe({ stage }: { stage: number }) {
  const count = stage >= 2 ? 7 : 0
  return (
    <div data-testid="anim-plomyk-tenframe" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={count} highlightAfter={count - 1} highlightColor="#dc2626" size={56} />
      {stage >= 3 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 56, color: '#dc2626' }}>7</div>
      )}
    </div>
  )
}
PlomykTenframe.SCENES = SCENES
export default PlomykTenframe
```

- [ ] **Step 4: plomyk-addsub-10 (4+3 build, then 7-2 remove)**

```tsx
import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 500 },   // 4
  { stage: 2, offsetMs: 1500 },  // 4+3 = 7 (highlight 3 last)
  { stage: 3, offsetMs: 3000 },  // 7-2 = 5
]

function PlomykAddsub10({ stage }: { stage: number }) {
  const count = stage === 1 ? 4 : stage === 2 ? 7 : stage >= 3 ? 5 : 0
  const op = stage === 2 ? '+3' : stage >= 3 ? '−2' : ''
  return (
    <div data-testid="anim-plomyk-addsub-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={count} highlightAfter={stage === 2 ? 4 : undefined} highlightColor="#16a34a" size={56} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 48, color: stage >= 3 ? '#dc2626' : '#16a34a', minHeight: 60 }}>
        {op}
      </div>
    </div>
  )
}
PlomykAddsub10.SCENES = SCENES
export default PlomykAddsub10
```

- [ ] **Step 5: plomyk-factfamily (NumberBondShape statyczny + 4 równania)**

```tsx
import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // 7 + 3 + 4
  { stage: 2, offsetMs: 1600 },  // 3 + 4 = 7
  { stage: 3, offsetMs: 2400 },  // 4 + 3 = 7
  { stage: 4, offsetMs: 3200 },  // 7 - 3 = 4
  { stage: 5, offsetMs: 4000 },  // 7 - 4 = 3
]

const EQUATIONS = ['', '3 + 4 = 7', '4 + 3 = 7', '7 − 3 = 4', '7 − 4 = 3']

function PlomykFactfamily({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-plomyk-factfamily" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <NumberBondShape whole={7} partA={3} partB={4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-handwritten)', fontSize: 32 }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ opacity: stage >= s + 1 ? 1 : 0.15, transition: 'opacity 200ms' }}>
            {EQUATIONS[s]}
          </div>
        ))}
      </div>
    </div>
  )
}
PlomykFactfamily.SCENES = SCENES
export default PlomykFactfamily
```

- [ ] **Step 6: Update registry**

W `src/modules/numbers/components/intros/animations/index.ts` dodaj 5 importów + entries (analogicznie do Task 5 step 6).

- [ ] **Step 7: Verify**

Run: `pnpm tsc -b && pnpm test --run src/modules/numbers/components/intros/animations/animations.test.tsx`
Expected: 10 PASS, 10 FAIL (ognik + pochodnia jeszcze pusty)

- [ ] **Step 8: Commit**

```bash
git add src/modules/numbers/components/intros/animations/plomyk-*.tsx src/modules/numbers/components/intros/animations/index.ts
git commit -m "feat(numbers): 5 worked-example animacji ConceptIntro dla Płomyka"
```

---

## Task 7: Animacje Ognik (4 pliki)

**Files:**
- Create: `src/modules/numbers/components/intros/animations/ognik-doubles.tsx`
- Create: `src/modules/numbers/components/intros/animations/ognik-neardoubles.tsx`
- Create: `src/modules/numbers/components/intros/animations/ognik-make10.tsx`
- Create: `src/modules/numbers/components/intros/animations/ognik-factfamily-20.tsx`

**Modify:** registry index.ts

- [ ] **Step 1: ognik-doubles (4+4=8 mirror)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // lewa 4
  { stage: 2, offsetMs: 1600 },  // prawa 4
  { stage: 3, offsetMs: 2600 },  // = 8
]

function OgnikDoubles({ stage }: { stage: number }) {
  const star = CONCRETE_SETS[1] ?? CONCRETE_SETS[0]
  return (
    <div data-testid="anim-ognik-doubles" style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-handwritten)', fontSize: 56 }}>
      <ConcreteIcons count={stage >= 1 ? 4 : 0} iconSet={star} iconSize={40} layout="grid" cols={2} />
      <span style={{ opacity: stage >= 2 ? 1 : 0.15 }}>+</span>
      <ConcreteIcons count={stage >= 2 ? 4 : 0} iconSet={star} iconSize={40} layout="grid" cols={2} />
      <span style={{ opacity: stage >= 3 ? 1 : 0.15 }}>=</span>
      <span style={{ opacity: stage >= 3 ? 1 : 0.15, color: '#dc2626' }}>8</span>
    </div>
  )
}
OgnikDoubles.SCENES = SCENES
export default OgnikDoubles
```

- [ ] **Step 2: ognik-neardoubles (4+4=8 → +1 → 4+5=9)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // 4+4=8
  { stage: 2, offsetMs: 2200 },  // +1 jabłko (highlight)
  { stage: 3, offsetMs: 3200 },  // 4+5=9
]

function OgnikNeardoubles({ stage }: { stage: number }) {
  const star = CONCRETE_SETS[1] ?? CONCRETE_SETS[0]
  const rightCount = stage >= 2 ? 5 : 4
  const result = stage >= 3 ? 9 : stage >= 1 ? 8 : 0
  return (
    <div data-testid="anim-ognik-neardoubles" style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-handwritten)', fontSize: 56 }}>
      <ConcreteIcons count={4} iconSet={star} iconSize={40} layout="grid" cols={2} />
      <span>+</span>
      <ConcreteIcons count={rightCount} iconSet={star} iconSize={40} layout="grid" cols={2} groupColor={stage === 2 ? '#fef3c7' : 'transparent'} />
      <span>=</span>
      <span style={{ color: '#dc2626' }}>{result || ''}</span>
    </div>
  )
}
OgnikNeardoubles.SCENES = SCENES
export default OgnikNeardoubles
```

- [ ] **Step 3: ognik-make10 (8+5: weź 2 z 5 → 10+3=13)**

```tsx
import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // pokaż 8
  { stage: 2, offsetMs: 1800 },  // dodaj 2 (do 10) — highlight
  { stage: 3, offsetMs: 3000 },  // pokaż 13 (10 + 3)
]

function OgnikMake10({ stage }: { stage: number }) {
  const count = stage === 1 ? 8 : stage === 2 ? 10 : stage >= 3 ? 13 : 0
  return (
    <div data-testid="anim-ognik-make10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame
        count={count}
        highlightAfter={stage === 2 ? 8 : stage >= 3 ? 10 : undefined}
        highlightColor={stage === 2 ? '#16a34a' : '#1d4ed8'}
        size={48}
      />
      {stage >= 3 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 48, color: '#dc2626' }}>10 + 3 = 13</div>
      )}
    </div>
  )
}
OgnikMake10.SCENES = SCENES
export default OgnikMake10
```

- [ ] **Step 4: ognik-factfamily-20 (NumberBondShape 15=8+7 + 4 równania)**

```tsx
import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1600 },
  { stage: 3, offsetMs: 2400 },
  { stage: 4, offsetMs: 3200 },
  { stage: 5, offsetMs: 4000 },
]

const EQUATIONS = ['', '8 + 7 = 15', '7 + 8 = 15', '15 − 8 = 7', '15 − 7 = 8']

function OgnikFactfamily20({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-ognik-factfamily-20" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <NumberBondShape whole={15} partA={8} partB={7} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-handwritten)', fontSize: 32 }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ opacity: stage >= s + 1 ? 1 : 0.15, transition: 'opacity 200ms' }}>
            {EQUATIONS[s]}
          </div>
        ))}
      </div>
    </div>
  )
}
OgnikFactfamily20.SCENES = SCENES
export default OgnikFactfamily20
```

- [ ] **Step 5: Update registry + verify + commit**

Dodaj 4 importy + entries do registry. Run `pnpm tsc -b && pnpm test --run animations.test.tsx`. Expected: 14 PASS, 6 FAIL (pochodnia).

```bash
git add src/modules/numbers/components/intros/animations/ognik-*.tsx src/modules/numbers/components/intros/animations/index.ts
git commit -m "feat(numbers): 4 worked-example animacji ConceptIntro dla Ognika"
```

---

## Task 8: Animacje Pochodnia (6 plików)

**Files:**
- Create: `src/modules/numbers/components/intros/animations/pochodnia-skipcount-2.tsx`
- Create: `src/modules/numbers/components/intros/animations/pochodnia-skipcount-5.tsx`
- Create: `src/modules/numbers/components/intros/animations/pochodnia-skipcount-10.tsx`
- Create: `src/modules/numbers/components/intros/animations/pochodnia-equalgroups.tsx`
- Create: `src/modules/numbers/components/intros/animations/pochodnia-arrays.tsx`
- Create: `src/modules/numbers/components/intros/animations/pochodnia-commutativity.tsx`

**Modify:** registry index.ts (zmień typ z `Partial<Record>` na `Record` — ostatnia paczka uzupełnia kompletność)

- [ ] **Step 1: pochodnia-skipcount-2 (sequence 2,4,6,8,10 z bounce)**

```tsx
import type { Scene } from '../IntroFrame'

const STEP = 2
const VALUES = [2, 4, 6, 8, 10]
const SCENES: readonly Scene[] = VALUES.map((_, i) => ({
  stage: i + 1,
  offsetMs: 600 + i * 600,
}))

function PochodniaSkipcount2({ stage }: { stage: number }) {
  return (
    <div data-testid={`anim-pochodnia-skipcount-${STEP}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {VALUES.map((v, i) => (
        <div
          key={v}
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: stage >= i + 1 ? '#3b82f6' : '#e5e7eb',
            color: stage >= i + 1 ? '#fff' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-block)',
            fontSize: 28,
            fontWeight: 700,
            transform: stage === i + 1 ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'transform 200ms, background 200ms',
          }}
        >
          {v}
        </div>
      ))}
    </div>
  )
}
PochodniaSkipcount2.SCENES = SCENES
export default PochodniaSkipcount2
```

- [ ] **Step 2: pochodnia-skipcount-5 (5,10,15,20)**

Skopiuj plik z Step 1, zmień:
- `const STEP = 5`
- `const VALUES = [5, 10, 15, 20]`
- testid → `anim-pochodnia-skipcount-5`
- nazwę funkcji → `PochodniaSkipcount5`

- [ ] **Step 3: pochodnia-skipcount-10 (10,20,30,40,50)**

Analogicznie:
- `const STEP = 10`
- `const VALUES = [10, 20, 30, 40, 50]`
- testid → `anim-pochodnia-skipcount-10`
- nazwę funkcji → `PochodniaSkipcount10`

- [ ] **Step 4: pochodnia-equalgroups (3 grupy po 4 jabłka)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 700 },
  { stage: 2, offsetMs: 1700 },
  { stage: 3, offsetMs: 2700 },
  { stage: 4, offsetMs: 3700 },
]

function PochodniaEqualgroups({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]
  return (
    <div data-testid="anim-pochodnia-equalgroups" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        {[1, 2, 3].map((g) => (
          <div key={g} style={{ opacity: stage >= g ? 1 : 0.15, transition: 'opacity 200ms', padding: 8, border: stage >= g ? '2px solid #3b82f6' : '2px dashed #cbd5e1', borderRadius: 8 }}>
            <ConcreteIcons count={4} iconSet={apple} iconSize={36} layout="grid" cols={2} />
          </div>
        ))}
      </div>
      {stage >= 4 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 40, color: '#dc2626' }}>3 × 4 = 12</div>
      )}
    </div>
  )
}
PochodniaEqualgroups.SCENES = SCENES
export default PochodniaEqualgroups
```

- [ ] **Step 5: pochodnia-arrays (macierz 3×4 zapełnia się rząd-po-rzędzie)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 700 },   // rząd 1 (4)
  { stage: 2, offsetMs: 1700 },  // rząd 2 (4)
  { stage: 3, offsetMs: 2700 },  // rząd 3 (4)
  { stage: 4, offsetMs: 3700 },  // = 12
]

function PochodniaArrays({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]
  return (
    <div data-testid="anim-pochodnia-arrays" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[1, 2, 3].map((row) => (
          <div key={row} style={{ opacity: stage >= row ? 1 : 0.15, transition: 'opacity 200ms' }}>
            <ConcreteIcons count={4} iconSet={apple} iconSize={36} layout="row" />
          </div>
        ))}
      </div>
      {stage >= 4 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 40, color: '#dc2626' }}>3 × 4 = 12</div>
      )}
    </div>
  )
}
PochodniaArrays.SCENES = SCENES
export default PochodniaArrays
```

- [ ] **Step 6: pochodnia-commutativity (CPA: 3×4 obraca się 90° → 4×3)**

```tsx
import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },   // 3×4 (3 rzędy po 4)
  { stage: 2, offsetMs: 2200 },  // rotation start (mid)
  { stage: 3, offsetMs: 3000 },  // 4×3 (4 rzędy po 3)
]

function PochodniaCommutativity({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]
  const rotated = stage >= 3
  return (
    <div data-testid="anim-pochodnia-commutativity" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          transform: stage === 2 ? 'rotate(45deg)' : rotated ? 'rotate(0deg)' : 'rotate(0deg)',
          transition: 'transform 600ms',
        }}
      >
        {!rotated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3].map((r) => (
              <ConcreteIcons key={r} count={4} iconSet={apple} iconSize={32} layout="row" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3, 4].map((r) => (
              <ConcreteIcons key={r} count={3} iconSet={apple} iconSize={32} layout="row" />
            ))}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 40, color: '#dc2626' }}>
        {rotated ? '4 × 3 = 12' : stage >= 1 ? '3 × 4 = 12' : ''}
      </div>
    </div>
  )
}
PochodniaCommutativity.SCENES = SCENES
export default PochodniaCommutativity
```

- [ ] **Step 7: Update registry — domknij kompletność**

Edit `src/modules/numbers/components/intros/animations/index.ts`. Wynik finalny:

```ts
import type { ConceptId } from '../../../types'
import type { IntroAnimation } from '../IntroFrame'
import iskierkaCounting5 from './iskierka-counting-5'
import iskierkaCounting10 from './iskierka-counting-10'
import iskierkaSubitizing6 from './iskierka-subitizing-6'
import iskierkaRhythm from './iskierka-rhythm'
import iskierkaAddingConcrete from './iskierka-adding-concrete'
import plomykBonds5 from './plomyk-bonds-5'
import plomykBonds10 from './plomyk-bonds-10'
import plomykTenframe from './plomyk-tenframe'
import plomykAddsub10 from './plomyk-addsub-10'
import plomykFactfamily from './plomyk-factfamily'
import ognikDoubles from './ognik-doubles'
import ognikNeardoubles from './ognik-neardoubles'
import ognikMake10 from './ognik-make10'
import ognikFactfamily20 from './ognik-factfamily-20'
import pochodniaSkipcount2 from './pochodnia-skipcount-2'
import pochodniaSkipcount5 from './pochodnia-skipcount-5'
import pochodniaSkipcount10 from './pochodnia-skipcount-10'
import pochodniaEqualgroups from './pochodnia-equalgroups'
import pochodniaArrays from './pochodnia-arrays'
import pochodniaCommutativity from './pochodnia-commutativity'

export const INTRO_ANIMATIONS: Record<ConceptId, IntroAnimation> = {
  'iskierka-counting-5': iskierkaCounting5 as IntroAnimation,
  'iskierka-counting-10': iskierkaCounting10 as IntroAnimation,
  'iskierka-subitizing-6': iskierkaSubitizing6 as IntroAnimation,
  'iskierka-rhythm': iskierkaRhythm as IntroAnimation,
  'iskierka-adding-concrete': iskierkaAddingConcrete as IntroAnimation,
  'plomyk-bonds-5': plomykBonds5 as IntroAnimation,
  'plomyk-bonds-10': plomykBonds10 as IntroAnimation,
  'plomyk-tenframe': plomykTenframe as IntroAnimation,
  'plomyk-addsub-10': plomykAddsub10 as IntroAnimation,
  'plomyk-factfamily': plomykFactfamily as IntroAnimation,
  'ognik-doubles': ognikDoubles as IntroAnimation,
  'ognik-neardoubles': ognikNeardoubles as IntroAnimation,
  'ognik-make10': ognikMake10 as IntroAnimation,
  'ognik-factfamily-20': ognikFactfamily20 as IntroAnimation,
  'pochodnia-skipcount-2': pochodniaSkipcount2 as IntroAnimation,
  'pochodnia-skipcount-5': pochodniaSkipcount5 as IntroAnimation,
  'pochodnia-skipcount-10': pochodniaSkipcount10 as IntroAnimation,
  'pochodnia-equalgroups': pochodniaEqualgroups as IntroAnimation,
  'pochodnia-arrays': pochodniaArrays as IntroAnimation,
  'pochodnia-commutativity': pochodniaCommutativity as IntroAnimation,
}
```

- [ ] **Step 8: Verify (TDD GREEN — wszystkie 20)**

Run: `pnpm test --run src/modules/numbers/components/intros/animations/animations.test.tsx`
Expected: PASS — wszystkie 20 ConceptId mają entries.

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/modules/numbers/components/intros/animations/pochodnia-*.tsx src/modules/numbers/components/intros/animations/index.ts
git commit -m "feat(numbers): 6 worked-example animacji ConceptIntro dla Pochodni — registry kompletny 20/20"
```

---

## Task 9: ConceptIntro refaktor (router → INTRO_ANIMATIONS)

**Files:**
- Modify: `src/modules/numbers/components/intros/ConceptIntro.tsx`

- [ ] **Step 1: Refaktor komponentu**

Replace całą zawartość `src/modules/numbers/components/intros/ConceptIntro.tsx`:

```tsx
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { ConceptId } from '../../types'
import { CONCEPTS } from '../../data/concepts'
import { IntroFrame } from './IntroFrame'
import { INTRO_ANIMATIONS } from './animations'

type Props = {
  conceptId: ConceptId
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onContinue: () => void
}

export function ConceptIntro({ conceptId, audioBus, onContinue }: Props) {
  const def = CONCEPTS[conceptId]
  const Animation = INTRO_ANIMATIONS[conceptId]
  return (
    <IntroFrame
      introAudioKey={def.introAudioKey}
      audioBus={audioBus}
      onContinue={onContinue}
      Animation={Animation}
    />
  )
}
```

- [ ] **Step 2: Type-check + tests**

Run: `pnpm tsc -b`
Expected: PASS

Run: `pnpm test --run`
Expected: 551+ all green (nowe NumbersStats + animations + IntroFrame smoke testy = 558+)

- [ ] **Step 3: Manual smoke**

Run: `pnpm dev`. Otwórz http://localhost:5173/numbers, wybierz każdy z 4 poziomów (Iskierka/Płomyk/Ognik/Pochodnia). Po kliknięciu poziomu → po `session-start` audio powinno pojawić się ConceptIntro z dedykowaną animacją (TenFrame fillujący się dla counting-5, NumberBondShape dla bonds-5, itd.). Przycisk → odblokowuje się po skończeniu audio.

W DevTools → Application → localStorage → `iskierki-numbers-v1` wyczyść `seenIntros` jeśli chcesz zobaczyć intro ponownie.

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/components/intros/ConceptIntro.tsx
git commit -m "feat(numbers): ConceptIntro routes do dedykowanej animacji per koncept"
```

---

## Task 10: Mount NumbersStats w ReportScreen + eksporter markdown

**Files:**
- Modify: `src/shared/stats/components/ReportScreen.tsx`
- Modify: `src/shared/stats/exporter.ts`

- [ ] **Step 1: Mount NumbersStats po ReadingStats**

W `src/shared/stats/components/ReportScreen.tsx`:

Dodaj import na górze:
```ts
import { NumbersStats } from './NumbersStats'
```

Znajdź `<ReadingStats />` (~linia 303) i dodaj PO niej:
```tsx
        <NumbersStats />
```

Wynik (fragment):
```tsx
        <ReadingStats />
        <NumbersStats />
      </div>
```

- [ ] **Step 2: Rozszerz exporter o sekcję matematyki**

W `src/shared/stats/exporter.ts`:

Dodaj importy na górze:
```ts
import { CONCEPTS } from '@/modules/numbers/data/concepts'
import { CONCEPT_LABELS } from '@/modules/numbers/data/conceptLabels'
import { formatFactId } from './components/NumbersStats'
import type { MathFactState, ConceptMastery, ConceptId } from '@/modules/numbers/types'
```

Rozszerz sygnaturę `exportReportToMarkdown`:

```ts
export function exportReportToMarkdown(
  letters: Record<string, LetterState>,
  sessions: SessionLog[],
  settings: Settings,
  now: number,
  numbersSnapshot?: {
    facts: Record<string, MathFactState>
    concepts: Partial<Record<ConceptId, ConceptMastery>>
  },
): string {
```

Po istniejących sekcjach (przed `return lines.join('\n')` na końcu funkcji), DODAJ:

```ts
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
```

- [ ] **Step 3: Update wywołania exportReportToMarkdown w ReportScreen**

W `src/shared/stats/components/ReportScreen.tsx` znajdź `handleCopy`:

```ts
  const handleCopy = useCallback(async () => {
    const md = exportReportToMarkdown(letters, sessions, settings, now())
```

Zmień na:

```ts
  const handleCopy = useCallback(async () => {
    const numbersSnapshot = {
      facts: useNumbers.getState().facts,
      concepts: useNumbers.getState().concepts,
    }
    const md = exportReportToMarkdown(letters, sessions, settings, now(), numbersSnapshot)
```

Dodaj import na górze:
```ts
import { useNumbers } from '@/modules/numbers/store/numbersStore'
```

- [ ] **Step 4: Type-check + tests**

Run: `pnpm tsc -b`
Expected: PASS

Run: `pnpm test --run`
Expected: 558+ all green. Istniejące testy `exporter.test.ts` (jeśli są) używają sygnatury bez `numbersSnapshot` — opcjonalny argument zachowuje wsteczną kompatybilność.

- [ ] **Step 5: Manual verify w przeglądarce**

Run: `pnpm dev`. Otwórz http://localhost:5173, ⚙ Settings → przejdź math gate → "Zobacz raport" (lub bezpośrednio `/raport`). Verify:
- Sekcja "Matematyka (moduł 3)" widoczna pod sekcją Czytania
- 3 karty: Koncepty (X/20 + lista mastered), Najtrudniejsze fakty (lub "Brak..."), Heatmapa typów konceptów (8 komórek 4×2)
- Kliknij "Skopiuj raport" → wklej do edytora → verify że MD ma sekcję `## Matematyka` z faktami w odpowiednim formacie

- [ ] **Step 6: Final build + commit**

Run: `pnpm build`
Expected: PASS, output bundle sizes (warning OK jeśli < 600 kB)

```bash
git add src/shared/stats/components/ReportScreen.tsx src/shared/stats/exporter.ts
git commit -m "feat(stats): mount NumbersStats w raporcie + eksporter MD sekcja Matematyka"
```

---

## Final verification

- [ ] **Step 1: Pełne `pnpm test --run`**

Expected: ≥ 558 testów zielone (551 baseline + min. 7 nowych: formatFactId 2, NumbersStats 5, animations registry 1, +/- inne smoke).

- [ ] **Step 2: Pełne `pnpm tsc -b`**

Expected: PASS

- [ ] **Step 3: Pełne `pnpm build`**

Expected: PASS, sprawdź bundle size (mieli warning ~504 kB; akceptowalny do ~600 kB).

- [ ] **Step 4: Manual end-to-end browser test**

Run: `pnpm dev`

1. Home → wybierz Matematyka (moduł 3)
2. Wybierz Iskierka → ConceptIntro pierwszego konceptu (np. counting-5) → animacja TenFrame fillująca się + audio Iskry
3. Przejdź sesję, weryfikuj że nie crash'uje
4. Wróć Home → ⚙ Settings → math gate → sprawdź sekcję "Matematyka (moduł 3)" → 5 kontrolek edytowalnych
5. Wyłącz "Wprowadzenia do nowych konceptów" → wróć do `/numbers` → wybierz Płomyk → wyczyść `seenIntros` w localStorage → start sesji → ConceptIntro POMINIĘTE (guard z SessionView działa)
6. Wróć → "Raport" → sekcja "Matematyka (moduł 3)" widoczna z 3 kartami
7. Kliknij "Skopiuj raport" → wklej w notatniku → verify sekcja `## Matematyka` w MD

- [ ] **Step 5: STATUS.md update**

Edytuj `docs/STATUS.md`. Dodaj nową sekcję na początku po "Aktualny stan":

```markdown
## Aktualny stan (2026-04-29 — moduł 3 v3.1 polish ukończony)

### v3.1 — wszystkie 3 obszary wdrożone ✅

- **Raport rodzica**: nowa sekcja "Matematyka (moduł 3)" — Koncepty (X/20 + lista mastered), Najtrudniejsze fakty (top 10), Heatmapa 8 typów konceptów
- **SettingsScreen**: 5 kontrolek `numbers.*` (iskraThinkingAloud, conceptIntros, treeCelebrationsOn, questionCount, skipCountStep)
- **ConceptIntro**: 20 dedykowanych worked-example animacji (Renkl/Sweller fading + CPA dla bonds/factfamily)
- Testy: 558/558 zielone
- Build: ~XXX kB JS

**Spec**: `docs/superpowers/specs/2026-04-29-iskierki-math-v3.1-polish-design.md`
**Plan**: `docs/superpowers/plans/2026-04-29-iskierki-math-v3.1-polish.md`
```

- [ ] **Step 6: Final commit + push**

```bash
git add docs/STATUS.md
git commit -m "docs(status): moduł 3 v3.1 polish ukończony — raport + settings + 20 animacji"
git push
```

Po push: `gh run watch` — monitoruj GH Actions deploy (~40s) → live: https://kamilmat.github.io/kid-learn/

---

## Out of scope (do v3.2)

- Trendy aktywności matematyki (sloupek dziennie jak ActivitySection liter)
- Tekstowe sugestie nauczania (jak SuggestionsSection liter)
- iPad performance audit (test na fizycznym iPadzie)
- Lazy import animacji (`React.lazy`) jeśli build size > 600 kB
