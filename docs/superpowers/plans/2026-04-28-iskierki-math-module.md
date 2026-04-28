# Iskierki — Moduł 3 (Matematyka) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować moduł 3 (matematyka — cyferki, +/-, propedeutyka mnożenia) zgodny ze specem `docs/superpowers/specs/2026-04-28-iskierki-math-module-design.md`. Cztery poziomy (Iskierka/Płomyk/Ognik/Pochodnia) × 4 typy ćwiczeń = 16 komponentów exercise. CPA representations: ten frame + ikony przedmiotów + kropki dice. Drzewko Mistrzostwa Konceptów zamiast albumu.

**Architecture:** Reuse `shared/` (SRS BaseItemState, AudioBus, settings, stats, engagement, ui). Nowy moduł `src/modules/numbers/` analogiczny strukturalnie do `modules/reading/`. Persist key `iskierki-numbers-v1`. Audio source `audio-source/numbers.json` + `math-ui-strings.json` + extensions w `iskra-reactions.json`.

**Tech Stack:** React 19, TypeScript strict, Vite, Tailwind 4, Zustand + persist, @dnd-kit/core, Vitest, Edge TTS (Python wrapper).

---

## Conventions (READ FIRST)

- **Test framework:** Vitest. Test files: `*.test.ts` (logic) or `*.test.tsx` (component). Run: `pnpm test --run path/to/file.test.ts`
- **TypeScript strict:** No `any`, no `@ts-ignore`. All types explicit.
- **Imports:** Use `@/` alias (configured in vite). Example: `import { audioBus } from '@/shared/audio/AudioBus'`.
- **Audio keys lowercase** (memory `project_audio_lowercase_keys.md`) — wszystkie klucze `numbers.json`/`math-ui-strings.json` lowercase.
- **No "X jak Y"** (memory `project_assoc_xjaky_abandoned.md`) — żadnych asocjacji typu "trójka jak rower".
- **@dnd-kit drag = plain div**, nie button (memory `project_dnd_kit_drag_button.md`). Touch-action: none krytyczne dla iPad.
- **Commit po każdym tasku** z prefix `feat(numbers):`, `test(numbers):`, lub `fix(numbers):`.
- **Theme tokens:** `import { colors, radii, tapTargets } from '@/app/theme'`.
- **Polish UI strings:** wszystkie napisy dla rodzica i etykiety techniczne po polsku.

---

## File Structure

```
src/modules/numbers/                    # NOWY moduł
├── types.ts                            # Phase 1
├── index.tsx                           # Phase 1: routing
├── store/numbersStore.ts               # Phase 1: Zustand persist
├── data/
│   ├── concepts.ts                     # Phase 4: lista konceptów + mastery thresholds
│   ├── facts.ts                        # Phase 4: arytmetyczne fakty
│   ├── levelPools.ts                   # Phase 4: fakty per poziom
│   ├── rhythmPatterns.ts               # Phase 5
│   └── concreteSets.ts                 # Phase 5: zestawy ikon (jabłka, koszyki...)
├── hooks/
│   ├── useNumbersSession.ts            # Phase 4: orkiestrator
│   └── useDragDigit.ts                 # Phase 2: drag-drop @dnd-kit
├── components/
│   ├── NumbersLevelSelect.tsx          # Phase 1
│   ├── SessionView.tsx                 # Phase 4
│   ├── SessionEnd.tsx                  # Phase 10
│   ├── PauseOverlay.tsx                # Phase 4 (analog z modułu 2)
│   ├── MasteryTree.tsx                 # Phase 10
│   ├── representations/
│   │   ├── TenFrame.tsx                # Phase 2
│   │   ├── DotPattern.tsx              # Phase 2
│   │   ├── ConcreteIcons.tsx           # Phase 2
│   │   ├── DigitTile.tsx               # Phase 2
│   │   └── NumberBondShape.tsx         # Phase 2
│   ├── intros/
│   │   └── ConceptIntro.tsx            # Phase 9: worked examples
│   └── exercises/
│       ├── SubitizeFlashExercise.tsx   # Phase 5
│       ├── MatchDigitDotsExercise.tsx  # Phase 5
│       ├── NumberRhythmExercise.tsx    # Phase 5
│       ├── ConcreteAddExercise.tsx     # Phase 5
│       ├── NumberBondBuilder.tsx       # Phase 6
│       ├── TenFrameFill.tsx            # Phase 6
│       ├── ConcreteAddSubtract.tsx     # Phase 6
│       ├── FactFamilyTriangle.tsx      # Phase 6 + 7 (configurable scope)
│       ├── DoublesExercise.tsx         # Phase 7
│       ├── NearDoublesExercise.tsx     # Phase 7
│       ├── Make10Exercise.tsx          # Phase 7
│       ├── EqualGroupsExercise.tsx     # Phase 8
│       ├── SkipCountChase.tsx          # Phase 8
│       ├── ArrayMatchExercise.tsx      # Phase 8
│       └── SubtractMaintenance.tsx     # Phase 8

src/app/Home.tsx                        # Phase 1: dodać kafelek "Cyferki"
src/app/App.tsx                         # Phase 1: dodać route /numbers/*
src/shared/settings/types.ts            # Phase 10: rozszerzyć Settings.numbers
src/shared/settings/defaults.ts         # Phase 10: defaults dla numbers
src/shared/settings/components/         # Phase 10: nowy ekran Numbers settings
src/shared/stats/                       # Phase 10: rozszerzenie raportu o math

audio-source/numbers.json               # Phase 3: ~30 kluczy
audio-source/math-ui-strings.json       # Phase 3: ~70 kluczy
audio-source/iskra-reactions.json       # Phase 3: rozszerzenie

public/audio/                           # Phase 3: ~100 nowych mp3 (generated)
```

---

## Phase 1 — Foundation (store, types, routing, home tile)

### Task 1: Create types.ts dla modułu numbers

**Files:**
- Create: `src/modules/numbers/types.ts`

- [ ] **Step 1: Create types file**

```typescript
import type { BaseItemState } from '@/shared/srs/types'
import type { Level } from '@/shared/settings/types'

// Klucze faktów matematycznych — używane jako id w SRS
// Format: <type>-<args>; np. "bond-7-3-4", "add-5-2", "sub-7-3", "double-6",
// "neardouble-6-7", "make10-8-5", "skip2-step3", "mult-3-2", "array-3x4"
export type MathFactId = string

export type MathFactState = BaseItemState & {
  conceptId: ConceptId  // do którego konceptu należy ten fakt
}

export type ConceptId =
  // Iskierka
  | 'iskierka-counting-5'
  | 'iskierka-counting-10'
  | 'iskierka-subitizing-6'
  | 'iskierka-rhythm'
  | 'iskierka-adding-concrete'
  // Płomyk
  | 'plomyk-bonds-5'
  | 'plomyk-bonds-10'
  | 'plomyk-tenframe'
  | 'plomyk-addsub-10'
  | 'plomyk-factfamily'
  // Ognik
  | 'ognik-doubles'
  | 'ognik-neardoubles'
  | 'ognik-make10'
  | 'ognik-factfamily-20'
  // Pochodnia
  | 'pochodnia-skipcount-2'
  | 'pochodnia-skipcount-5'
  | 'pochodnia-skipcount-10'
  | 'pochodnia-equalgroups'
  | 'pochodnia-arrays'
  | 'pochodnia-commutativity'

export type ConceptMasteryState = 'unseen' | 'learning' | 'mastered'

export type ConceptMastery = {
  state: ConceptMasteryState
  firstSeenAt: number
  lastSeenAt: number
  correctStreak: number    // consecutive correct na DOWOLNYM fakcie tego konceptu
  factsTouched: string[]   // unique factIds użyte w tym koncepcie
}

export type ExerciseType =
  // Iskierka
  | 'subitize-flash'
  | 'match-digit-dots'
  | 'number-rhythm'
  | 'concrete-add'
  // Płomyk
  | 'number-bond-builder'
  | 'ten-frame-fill'
  | 'concrete-add-subtract'
  | 'fact-family-triangle'
  // Ognik
  | 'doubles'
  | 'near-doubles'
  | 'make-10'
  // Pochodnia
  | 'equal-groups'
  | 'skip-count-chase'
  | 'array-match'
  | 'subtract-maintenance'

export type Question = {
  factId: MathFactId
  conceptId: ConceptId
  exerciseType: ExerciseType
  // Payload typu zależny od ExerciseType — komponent ćwiczenia wie jak
  // zinterpretować
  payload: Record<string, unknown>
}

export type AnswerOutcome = 'correct' | 'wrong' | 'dontKnow'

export type NumbersSessionEvent = {
  factId: MathFactId
  conceptId: ConceptId
  exerciseType: ExerciseType
  outcome: AnswerOutcome
  responseMs: number
  timestamp: number
}

export type NumbersSessionLog = {
  startedAt: number
  endedAt: number
  level: Level
  events: NumbersSessionEvent[]
}
```

- [ ] **Step 2: Run type check**

Run: `pnpm tsc -b`
Expected: PASS (0 errors)

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/types.ts
git commit -m "feat(numbers): types dla modułu 3 (facts, concepts, exercises)"
```

---

### Task 2: Create numbersStore (Zustand + persist)

**Files:**
- Create: `src/modules/numbers/store/numbersStore.ts`
- Create: `src/modules/numbers/store/numbersStore.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/numbers/store/numbersStore.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useNumbers } from './numbersStore'

describe('numbersStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useNumbers.getState().reset()
  })

  afterEach(() => {
    useNumbers.getState().reset()
  })

  it('initializes with empty facts and unseen concepts', () => {
    const s = useNumbers.getState()
    expect(s.facts).toEqual({})
    expect(s.concepts).toEqual({})
    expect(s.seenIntros).toEqual([])
  })

  it('ensureFactInitialized creates a new fact with box=1', () => {
    useNumbers.getState().ensureFactInitialized('add-5-2', 'plomyk-addsub-10')
    const s = useNumbers.getState()
    expect(s.facts['add-5-2']).toEqual({
      id: 'add-5-2',
      conceptId: 'plomyk-addsub-10',
      box: 1,
      lastSeen: 0,
      recentWrong: 0,
    })
  })

  it('does not overwrite existing fact', () => {
    useNumbers.getState().ensureFactInitialized('add-5-2', 'plomyk-addsub-10')
    useNumbers.setState({
      facts: {
        'add-5-2': {
          id: 'add-5-2',
          conceptId: 'plomyk-addsub-10',
          box: 4,
          lastSeen: 12345,
          recentWrong: 1,
        },
      },
    })
    useNumbers.getState().ensureFactInitialized('add-5-2', 'plomyk-addsub-10')
    expect(useNumbers.getState().facts['add-5-2']?.box).toBe(4)
  })

  it('markIntroSeen + hasSeenIntro work', () => {
    expect(useNumbers.getState().hasSeenIntro('intro-iskierka-counting')).toBe(false)
    useNumbers.getState().markIntroSeen('intro-iskierka-counting')
    expect(useNumbers.getState().hasSeenIntro('intro-iskierka-counting')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test --run src/modules/numbers/store/numbersStore.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 3: Implement numbersStore**

```typescript
// src/modules/numbers/store/numbersStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConceptId,
  ConceptMastery,
  MathFactId,
  MathFactState,
  NumbersSessionLog,
} from '../types'
import type { Level } from '@/shared/settings/types'

export type NumbersState = {
  facts: Record<MathFactId, MathFactState>
  concepts: Partial<Record<ConceptId, ConceptMastery>>
  sessions: NumbersSessionLog[]
  seenIntros: string[]
  lastUsedLevel: Level | null
  wildCelebrationCounter: number

  ensureFactInitialized: (factId: MathFactId, conceptId: ConceptId) => void
  applySessionResults: (
    updatedFacts: Record<MathFactId, MathFactState>,
    updatedConcepts: Partial<Record<ConceptId, ConceptMastery>>,
    log: NumbersSessionLog,
  ) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  setLastUsedLevel: (level: Level) => void
  incrementWildCounter: () => void
  resetWildCounter: () => void
  resetAllProgress: () => void
  reset: () => void
}

const initialState = {
  facts: {} as Record<MathFactId, MathFactState>,
  concepts: {} as Partial<Record<ConceptId, ConceptMastery>>,
  sessions: [] as NumbersSessionLog[],
  seenIntros: [] as string[],
  lastUsedLevel: null as Level | null,
  wildCelebrationCounter: 0,
}

export const useNumbers = create<NumbersState>()(
  persist(
    (set, get) => ({
      ...initialState,

      ensureFactInitialized: (factId, conceptId) => {
        if (get().facts[factId]) return
        set((s) => ({
          facts: {
            ...s.facts,
            [factId]: {
              id: factId,
              conceptId,
              box: 1,
              lastSeen: 0,
              recentWrong: 0,
            },
          },
        }))
      },

      applySessionResults: (updatedFacts, updatedConcepts, log) => {
        set((s) => ({
          facts: { ...s.facts, ...updatedFacts },
          concepts: { ...s.concepts, ...updatedConcepts },
          sessions: [...s.sessions, log],
        }))
      },

      markIntroSeen: (key) => {
        set((s) =>
          s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] },
        )
      },

      hasSeenIntro: (key) => get().seenIntros.includes(key),

      setLastUsedLevel: (level) => set({ lastUsedLevel: level }),

      incrementWildCounter: () =>
        set((s) => ({ wildCelebrationCounter: s.wildCelebrationCounter + 1 })),

      resetWildCounter: () => set({ wildCelebrationCounter: 0 }),

      resetAllProgress: () => set(initialState),

      reset: () => set(initialState),
    }),
    {
      name: 'iskierki-numbers-v1',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NumbersState>
        return {
          ...current,
          facts:
            p.facts && typeof p.facts === 'object' && !Array.isArray(p.facts)
              ? p.facts
              : {},
          concepts:
            p.concepts && typeof p.concepts === 'object' && !Array.isArray(p.concepts)
              ? p.concepts
              : {},
          sessions: Array.isArray(p.sessions) ? p.sessions : [],
          seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
          lastUsedLevel: p.lastUsedLevel ?? null,
          wildCelebrationCounter:
            typeof p.wildCelebrationCounter === 'number'
              ? p.wildCelebrationCounter
              : 0,
        } as NumbersState
      },
    },
  ),
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test --run src/modules/numbers/store/numbersStore.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/modules/numbers/store/numbersStore.ts src/modules/numbers/store/numbersStore.test.ts
git commit -m "feat(numbers): numbersStore (Zustand persist iskierki-numbers-v1)"
```

---

### Task 3: Create NumbersLevelSelect (placeholder) + index.tsx routing

**Files:**
- Create: `src/modules/numbers/components/NumbersLevelSelect.tsx`
- Create: `src/modules/numbers/index.tsx`

- [ ] **Step 1: Create level select placeholder**

```typescript
// src/modules/numbers/components/NumbersLevelSelect.tsx
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'
import type { Level } from '@/shared/settings/types'

const LEVELS: Array<{ level: Level; label: string; emoji: string }> = [
  { level: 'iskierka', label: 'Iskierka', emoji: '✨' },
  { level: 'plomyk', label: 'Płomyk', emoji: '🔆' },
  { level: 'ognik', label: 'Ognik', emoji: '🔥' },
  { level: 'pochodnia', label: 'Pochodnia', emoji: '🕯️' },
]

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onSelect: (level: Level) => void
}

export function NumbersLevelSelect({ audioBus: _audioBus, onSelect }: Props) {
  return (
    <div
      data-testid="numbers-level-select"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 24,
        background: colors.bg,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: '2.5em',
          margin: 0,
          color: colors.text,
        }}
      >
        Cyferki
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          maxWidth: 720,
          width: '100%',
        }}
      >
        {LEVELS.map(({ level, label, emoji }) => (
          <LevelTile
            key={level}
            level={level}
            label={label}
            emoji={emoji}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function LevelTile({
  level,
  label,
  emoji,
  onSelect,
}: {
  level: Level
  label: string
  emoji: string
  onSelect: (level: Level) => void
}) {
  const tap = useTapHandler({ onTap: () => onSelect(level) })
  return (
    <button
      type="button"
      data-testid={`numbers-level-${level}`}
      aria-label={label}
      {...tap}
      style={{
        minHeight: 200,
        padding: 24,
        borderRadius: radii.kid,
        background: '#fff',
        border: `4px solid ${colors.accentBlue}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 80 }}>
        {emoji}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 28,
          fontWeight: 700,
          color: colors.text,
        }}
      >
        {label}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Create index.tsx routing**

```typescript
// src/modules/numbers/index.tsx
import { useCallback } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import type { Level } from '@/shared/settings/types'
import { NumbersLevelSelect } from './components/NumbersLevelSelect'
import { useNumbers } from './store/numbersStore'

const VALID_LEVELS: ReadonlySet<Level> = new Set<Level>([
  'iskierka',
  'plomyk',
  'ognik',
  'pochodnia',
])

type Props = { audioBus?: Pick<AudioBus, 'play' | 'stop'> }

export function NumbersModule({ audioBus = defaultAudioBus }: Props = {}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <KidNav />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<NumbersIndex audioBus={audioBus} />} />
          <Route path="session/:level" element={<NumbersSession audioBus={audioBus} />} />
          <Route path="tree" element={<NumbersTreePlaceholder />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function NumbersIndex({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  const setLastUsed = useNumbers((s) => s.setLastUsedLevel)
  return (
    <NumbersLevelSelect
      audioBus={audioBus}
      onSelect={(level) => {
        setLastUsed(level)
        navigate(`session/${level}`)
      }}
    />
  )
}

function NumbersSession({ audioBus: _audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const params = useParams<{ level: string }>()
  const level = (params.level ?? '') as Level
  if (!VALID_LEVELS.has(level)) return <Navigate to=".." replace />
  return (
    <div
      data-testid="numbers-session-placeholder"
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}
    >
      Sesja {level} (do uzupełnienia)
    </div>
  )
}

function NumbersTreePlaceholder() {
  return (
    <div
      data-testid="numbers-tree-placeholder"
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}
    >
      🌱 Drzewko Mistrzostwa (do uzupełnienia)
    </div>
  )
}

export default NumbersModule
```

- [ ] **Step 3: Add route to App.tsx**

Read current `src/app/App.tsx` and add `<Route path="numbers/*" element={<NumbersModule />} />` next to `letters/*` and `reading/*`. Add import: `import { NumbersModule } from '@/modules/numbers'`.

- [ ] **Step 4: Run type check**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/numbers/components/NumbersLevelSelect.tsx src/modules/numbers/index.tsx src/app/App.tsx
git commit -m "feat(numbers): routing /numbers/* + NumbersLevelSelect placeholder"
```

---

### Task 4: Add "Cyferki" tile to Home

**Files:**
- Modify: `src/app/Home.tsx`

- [ ] **Step 1: Update grid to 3 tiles + add Cyferki tile**

Read `src/app/Home.tsx`. Add:

1. Import: `import { useNumbers } from '@/modules/numbers/store/numbersStore'`
2. State: `const numbersIntroSeen = useNumbers((s) => s.hasSeenIntro('home-numbers-intro'))` and `const markNumbersIntro = useNumbers((s) => s.markIntroSeen)`
3. Onboarding: dodać `else if (!numbersIntroSeen) { void audioBus.play('home-numbers-intro'); markNumbersIntro('home-numbers-intro') }`
4. `handleNumbers` callback: `audioBus.stop(); navigate('/numbers')`
5. `numbersTap = useTapHandler({ onTap: handleNumbers })`
6. Nowy kafelek między Litery i Czytanie albo na końcu — 3 kolumny, padding consistency

Dodaj kafelek (po Reading, przed parent zone):

```typescript
{/* Kafelek: Cyferki (moduł 3) — wizualnie kolorowe 1 2 3 */}
<button
  type="button"
  data-testid="module-numbers"
  aria-label="Cyferki"
  {...numbersTap}
  style={{
    minHeight: 280,
    padding: 24,
    borderRadius: radii.kid * 1.5,
    background: '#dcfce7',
    border: '4px solid #16a34a',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: '#166534',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }}
>
  <div
    aria-hidden="true"
    style={{
      fontFamily: 'var(--font-block)',
      fontSize: 96,
      fontWeight: 800,
      letterSpacing: '0.08em',
      lineHeight: 1,
      display: 'flex',
      gap: 4,
    }}
  >
    <span style={{ color: '#1d4ed8' }}>1</span>
    <span style={{ color: '#dc2626' }}>2</span>
    <span style={{ color: '#16a34a' }}>3</span>
  </div>
  <span
    style={{
      fontFamily: 'var(--font-handwritten)',
      fontSize: 32,
      fontWeight: 700,
    }}
  >
    Cyferki
  </span>
</button>
```

Grid template wystarczy `repeat(auto-fit, minmax(260px, 1fr))` — automatycznie się zmieści 3 kafelki.

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Smoke test in browser**

Run: `pnpm dev` (background)
Open: `http://localhost:5173/`
Expected: 3 kafelki widoczne na home, klik na Cyferki → `/numbers` z placeholderem

- [ ] **Step 4: Commit**

```bash
git add src/app/Home.tsx
git commit -m "feat(home): kafelek Cyferki (moduł 3) z kolorowymi 1 2 3"
```

---

## Phase 2 — Shared math representations

### Task 5: TenFrame component

**Files:**
- Create: `src/modules/numbers/components/representations/TenFrame.tsx`
- Create: `src/modules/numbers/components/representations/TenFrame.test.tsx`

Standardowa siatka 2×5 z kropkami. Wypełniana od góry-lewa. Wsparcie dla 0-10 (jeden frame) i 11-20 (dwa frames obok siebie).

- [ ] **Step 1: Write tests**

```typescript
// src/modules/numbers/components/representations/TenFrame.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TenFrame } from './TenFrame'

describe('TenFrame', () => {
  it('renders 10 cells when count=0', () => {
    render(<TenFrame count={0} />)
    const cells = screen.getAllByTestId('tenframe-cell')
    expect(cells).toHaveLength(10)
  })

  it('marks first 7 cells as filled when count=7', () => {
    render(<TenFrame count={7} />)
    const filled = screen.getAllByTestId('tenframe-dot-filled')
    expect(filled).toHaveLength(7)
  })

  it('renders 2 frames (20 cells) when count >10', () => {
    render(<TenFrame count={13} />)
    const cells = screen.getAllByTestId('tenframe-cell')
    expect(cells).toHaveLength(20)
  })

  it('clamps count to 0-20', () => {
    render(<TenFrame count={25} />)
    const filled = screen.getAllByTestId('tenframe-dot-filled')
    expect(filled).toHaveLength(20)
  })
})
```

- [ ] **Step 2: Run test (should fail)**

Run: `pnpm test --run src/modules/numbers/components/representations/TenFrame.test.tsx`
Expected: FAIL (TenFrame not defined)

- [ ] **Step 3: Implement TenFrame**

```typescript
// src/modules/numbers/components/representations/TenFrame.tsx
import { colors } from '@/app/theme'

type Props = {
  count: number
  dotColor?: string         // default: czerwony (warm)
  highlightColor?: string   // dla Make 10: kolor dla "wystających" kropek
  highlightAfter?: number   // od którego indeksu (włącznie) używać highlightColor
  size?: number             // pixel size kratki (default 56 — duże dla 7-latka)
  frameGap?: number         // gap między dwoma frames dla 11-20
}

export function TenFrame({
  count,
  dotColor = '#dc2626',
  highlightColor,
  highlightAfter,
  size = 56,
  frameGap = 24,
}: Props) {
  const safeCount = Math.max(0, Math.min(20, Math.floor(count)))
  const needsTwoFrames = safeCount > 10
  const frame1Count = needsTwoFrames ? 10 : safeCount
  const frame2Count = needsTwoFrames ? safeCount - 10 : 0

  return (
    <div
      data-testid="tenframe-root"
      style={{ display: 'flex', alignItems: 'center', gap: frameGap }}
    >
      <FrameGrid
        count={frame1Count}
        dotColor={dotColor}
        highlightColor={highlightColor}
        highlightAfter={highlightAfter}
        size={size}
        offset={0}
      />
      {needsTwoFrames && (
        <FrameGrid
          count={frame2Count}
          dotColor={dotColor}
          highlightColor={highlightColor}
          highlightAfter={highlightAfter}
          size={size}
          offset={10}
        />
      )}
    </div>
  )
}

function FrameGrid({
  count,
  dotColor,
  highlightColor,
  highlightAfter,
  size,
  offset,
}: {
  count: number
  dotColor: string
  highlightColor?: string
  highlightAfter?: number
  size: number
  offset: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(5, ${size}px)`,
        gridTemplateRows: `repeat(2, ${size}px)`,
        gap: 4,
        padding: 6,
        background: '#fff',
        border: `3px solid ${colors.text}33`,
        borderRadius: 8,
      }}
    >
      {Array.from({ length: 10 }).map((_, idx) => {
        const filled = idx < count
        const globalIdx = offset + idx
        const useHighlight =
          filled &&
          highlightColor !== undefined &&
          highlightAfter !== undefined &&
          globalIdx >= highlightAfter
        return (
          <div
            key={idx}
            data-testid="tenframe-cell"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${colors.text}22`,
              borderRadius: 4,
              background: '#fafafa',
            }}
          >
            {filled && (
              <div
                data-testid="tenframe-dot-filled"
                style={{
                  width: Math.floor(size * 0.65),
                  height: Math.floor(size * 0.65),
                  borderRadius: '50%',
                  background: useHighlight ? highlightColor : dotColor,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test --run src/modules/numbers/components/representations/TenFrame.test.tsx`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add src/modules/numbers/components/representations/TenFrame.tsx src/modules/numbers/components/representations/TenFrame.test.tsx
git commit -m "feat(numbers): TenFrame component (Singapore Math standard, 0-20)"
```

---

### Task 6: DotPattern component (dice/scattered patterns 1-6)

**Files:**
- Create: `src/modules/numbers/components/representations/DotPattern.tsx`

Klasyczne układy kości dla 1-6 + opcjonalny tryb scattered (random pozycje, deterministic seed).

- [ ] **Step 1: Implement DotPattern**

```typescript
// src/modules/numbers/components/representations/DotPattern.tsx
import { colors } from '@/app/theme'

type Props = {
  count: number          // 1-6
  pattern?: 'dice' | 'scattered'
  size?: number          // pixel container size (default 160)
  dotColor?: string
  seed?: number          // dla scattered — deterministyczny układ
}

// Pozycje kropek dla dice 1-6 (procentowe w obszarze 0-1)
const DICE_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scatteredPositions(count: number, seed: number): Array<[number, number]> {
  const rng = mulberry32(seed)
  const positions: Array<[number, number]> = []
  let attempts = 0
  while (positions.length < count && attempts < 200) {
    attempts++
    const x = 0.15 + rng() * 0.7
    const y = 0.15 + rng() * 0.7
    const tooClose = positions.some(([px, py]) => Math.hypot(px - x, py - y) < 0.22)
    if (!tooClose) positions.push([x, y])
  }
  return positions
}

export function DotPattern({
  count,
  pattern = 'dice',
  size = 160,
  dotColor = '#dc2626',
  seed = 1,
}: Props) {
  const safeCount = Math.max(1, Math.min(6, Math.floor(count)))
  const positions =
    pattern === 'dice'
      ? DICE_POSITIONS[safeCount] ?? []
      : scatteredPositions(safeCount, seed)
  const dotSize = Math.max(20, Math.floor(size * 0.16))

  return (
    <div
      data-testid="dotpattern-root"
      style={{
        position: 'relative',
        width: size,
        height: size,
        background: '#fff',
        border: `3px solid ${colors.text}33`,
        borderRadius: 12,
      }}
    >
      {positions.map(([x, y], idx) => (
        <div
          key={idx}
          data-testid="dotpattern-dot"
          style={{
            position: 'absolute',
            left: `calc(${x * 100}% - ${dotSize / 2}px)`,
            top: `calc(${y * 100}% - ${dotSize / 2}px)`,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: dotColor,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/components/representations/DotPattern.tsx
git commit -m "feat(numbers): DotPattern (dice + scattered 1-6)"
```

---

### Task 7: ConcreteIcons component

**Files:**
- Create: `src/modules/numbers/components/representations/ConcreteIcons.tsx`
- Create: `src/modules/numbers/data/concreteSets.ts`

- [ ] **Step 1: Define icon sets**

```typescript
// src/modules/numbers/data/concreteSets.ts
export type IconSet = {
  id: string
  emoji: string
  label: string  // dla aria-label
}

export const CONCRETE_SETS: IconSet[] = [
  { id: 'apple', emoji: '🍎', label: 'jabłko' },
  { id: 'star', emoji: '⭐', label: 'gwiazdka' },
  { id: 'balloon', emoji: '🎈', label: 'balonik' },
  { id: 'car', emoji: '🚗', label: 'autko' },
  { id: 'flower', emoji: '🌸', label: 'kwiatek' },
  { id: 'dog', emoji: '🐶', label: 'piesek' },
  { id: 'cat', emoji: '🐱', label: 'kotek' },
  { id: 'fish', emoji: '🐟', label: 'rybka' },
  { id: 'banana', emoji: '🍌', label: 'banan' },
  { id: 'butterfly', emoji: '🦋', label: 'motyl' },
]

export function pickIconSet(seed: number): IconSet {
  const idx = Math.abs(Math.floor(seed)) % CONCRETE_SETS.length
  return CONCRETE_SETS[idx] ?? CONCRETE_SETS[0]!
}
```

- [ ] **Step 2: Implement ConcreteIcons**

```typescript
// src/modules/numbers/components/representations/ConcreteIcons.tsx
import type { IconSet } from '../../data/concreteSets'

type Props = {
  count: number          // ile ikon pokazać
  iconSet: IconSet
  iconSize?: number      // pixel font-size (default 56)
  layout?: 'row' | 'wrap' | 'grid'
  cols?: number          // dla grid
  groupColor?: string    // tło grupy (np. dla equal groups)
}

export function ConcreteIcons({
  count,
  iconSet,
  iconSize = 56,
  layout = 'wrap',
  cols,
  groupColor,
}: Props) {
  const safeCount = Math.max(0, Math.floor(count))
  const items = Array.from({ length: safeCount })

  const containerStyle: React.CSSProperties =
    layout === 'grid' && cols
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${iconSize + 8}px)`,
          gap: 8,
        }
      : layout === 'row'
      ? { display: 'flex', gap: 8, flexWrap: 'nowrap' }
      : { display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 360 }

  return (
    <div
      data-testid="concrete-icons-root"
      aria-label={`${safeCount} ${iconSet.label}`}
      style={{
        ...containerStyle,
        padding: 12,
        borderRadius: 12,
        background: groupColor ?? 'transparent',
      }}
    >
      {items.map((_, idx) => (
        <span
          key={idx}
          data-testid="concrete-icon"
          aria-hidden="true"
          style={{ fontSize: iconSize, lineHeight: 1, userSelect: 'none' }}
        >
          {iconSet.emoji}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/data/concreteSets.ts src/modules/numbers/components/representations/ConcreteIcons.tsx
git commit -m "feat(numbers): ConcreteIcons + 10 zestawów ikon"
```

---

### Task 8: DigitTile component (drag/drop ready)

**Files:**
- Create: `src/modules/numbers/components/representations/DigitTile.tsx`

- [ ] **Step 1: Implement DigitTile (tap variant + draggable variant)**

```typescript
// src/modules/numbers/components/representations/DigitTile.tsx
import { useDraggable } from '@dnd-kit/core'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

type CommonProps = {
  digit: number
  size?: 'sm' | 'md' | 'lg'  // default 'lg' (80px)
  selected?: boolean
}

type TapProps = CommonProps & {
  variant: 'tap'
  onTap: (digit: number) => void
}

type DraggableProps = CommonProps & {
  variant: 'drag'
  dragId: string
  payload?: Record<string, unknown>
}

export function DigitTile(props: TapProps | DraggableProps) {
  const { digit, size = 'lg', selected = false } = props
  const fontSize = size === 'lg' ? 80 : size === 'md' ? 56 : 36
  const tileSize = size === 'lg' ? 120 : size === 'md' ? 88 : 64

  const baseStyle: React.CSSProperties = {
    width: tileSize,
    height: tileSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-block)',
    fontSize,
    fontWeight: 700,
    color: colors.text,
    background: selected ? '#fef3c7' : '#fff',
    border: `4px solid ${selected ? '#f59e0b' : colors.text + '22'}`,
    borderRadius: radii.kid,
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  if (props.variant === 'tap') {
    return <TapTile digit={digit} onTap={props.onTap} baseStyle={baseStyle} />
  }
  return <DragTile digit={digit} dragId={props.dragId} payload={props.payload} baseStyle={baseStyle} />
}

function TapTile({
  digit,
  onTap,
  baseStyle,
}: {
  digit: number
  onTap: (digit: number) => void
  baseStyle: React.CSSProperties
}) {
  const tap = useTapHandler({ onTap: () => onTap(digit) })
  return (
    <button
      type="button"
      data-testid={`digit-tile-${digit}`}
      aria-label={`Cyfra ${digit}`}
      {...tap}
      style={{
        ...baseStyle,
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {digit}
    </button>
  )
}

function DragTile({
  digit,
  dragId,
  payload,
  baseStyle,
}: {
  digit: number
  dragId: string
  payload?: Record<string, unknown>
  baseStyle: React.CSSProperties
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { digit, ...payload },
  })

  const style: React.CSSProperties = {
    ...baseStyle,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none', // KRYTYCZNE dla iPad — bez tego touch scroll wygrywa z drag
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.95 : 1,
  }

  // Plain DIV (NIE button) — memory project_dnd_kit_drag_button.md:
  // button capturuje pointer events przed PointerSensor
  return (
    <div
      ref={setNodeRef}
      data-testid={`digit-tile-drag-${digit}`}
      aria-label={`Cyfra ${digit} (do przeciągnięcia)`}
      role="button"
      tabIndex={0}
      style={style}
      {...listeners}
      {...attributes}
    >
      {digit}
    </div>
  )
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/components/representations/DigitTile.tsx
git commit -m "feat(numbers): DigitTile tap+drag (memory: drag = plain div, touch-action none)"
```

---

### Task 9: NumberBondShape component

**Files:**
- Create: `src/modules/numbers/components/representations/NumberBondShape.tsx`

Wizualizacja part-part-whole: koło na górze (whole), 2 koła pod nim (parts) połączone liniami. Drop zones gdy part = null.

- [ ] **Step 1: Implement NumberBondShape**

```typescript
// src/modules/numbers/components/representations/NumberBondShape.tsx
import { useDroppable } from '@dnd-kit/core'
import { colors, radii } from '@/app/theme'

type Props = {
  whole: number
  partA: number | null
  partB: number | null
  dropIdA?: string
  dropIdB?: string
  partAColor?: string
  partBColor?: string
}

export function NumberBondShape({
  whole,
  partA,
  partB,
  dropIdA,
  dropIdB,
  partAColor = '#dc2626',
  partBColor = '#1d4ed8',
}: Props) {
  return (
    <div
      data-testid="number-bond-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
      }}
    >
      <BondCircle value={whole} background="#fff" border={colors.text} dataLabel="whole" />
      <svg width="180" height="40" viewBox="0 0 180 40" aria-hidden="true">
        <line x1="90" y1="0" x2="40" y2="40" stroke={colors.text} strokeWidth="3" />
        <line x1="90" y1="0" x2="140" y2="40" stroke={colors.text} strokeWidth="3" />
      </svg>
      <div style={{ display: 'flex', gap: 32 }}>
        <BondSlot
          value={partA}
          color={partAColor}
          dropId={dropIdA}
          dataLabel="partA"
        />
        <BondSlot
          value={partB}
          color={partBColor}
          dropId={dropIdB}
          dataLabel="partB"
        />
      </div>
    </div>
  )
}

function BondCircle({
  value,
  background,
  border,
  dataLabel,
}: {
  value: number
  background: string
  border: string
  dataLabel: string
}) {
  return (
    <div
      data-testid={`bond-${dataLabel}`}
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background,
        border: `4px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-block)',
        fontSize: 56,
        fontWeight: 700,
        color: colors.text,
      }}
    >
      {value}
    </div>
  )
}

function BondSlot({
  value,
  color,
  dropId,
  dataLabel,
}: {
  value: number | null
  color: string
  dropId?: string
  dataLabel: string
}) {
  if (value !== null) {
    return <BondCircle value={value} background={color + '22'} border={color} dataLabel={dataLabel} />
  }
  return <BondDropSlot color={color} dropId={dropId} dataLabel={dataLabel} />
}

function BondDropSlot({
  color,
  dropId,
  dataLabel,
}: {
  color: string
  dropId?: string
  dataLabel: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId ?? `slot-${dataLabel}`, disabled: !dropId })
  return (
    <div
      ref={setNodeRef}
      data-testid={`bond-${dataLabel}-slot`}
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: isOver ? color + '44' : '#fafafa',
        border: `4px dashed ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 120ms',
      }}
    />
  )
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/components/representations/NumberBondShape.tsx
git commit -m "feat(numbers): NumberBondShape (whole + 2 parts + drop slots)"
```

---

## Phase 3 — Audio source files + generation

### Task 10: Create numbers.json (cyfry + skip count + operators)

**Files:**
- Create: `audio-source/numbers.json`

- [ ] **Step 1: Write JSON**

```json
{
  "number-0": "zero",
  "number-1": "jeden",
  "number-2": "dwa",
  "number-3": "trzy",
  "number-4": "cztery",
  "number-5": "pięć",
  "number-6": "sześć",
  "number-7": "siedem",
  "number-8": "osiem",
  "number-9": "dziewięć",
  "number-10": "dziesięć",
  "number-11": "jedenaście",
  "number-12": "dwanaście",
  "number-13": "trzynaście",
  "number-14": "czternaście",
  "number-15": "piętnaście",
  "number-16": "szesnaście",
  "number-17": "siedemnaście",
  "number-18": "osiemnaście",
  "number-19": "dziewiętnaście",
  "number-20": "dwadzieścia",
  "op-plus": "plus",
  "op-minus": "minus",
  "op-times": "razy",
  "op-equals": "równa się",
  "count-2by2": "dwa, cztery, sześć, osiem, dziesięć, dwanaście, czternaście, szesnaście, osiemnaście, dwadzieścia",
  "count-5by5": "pięć, dziesięć, piętnaście, dwadzieścia",
  "count-10by10": "dziesięć, dwadzieścia, trzydzieści, czterdzieści, pięćdziesiąt"
}
```

- [ ] **Step 2: Commit (audio nie generujemy jeszcze — to robimy w jednym batchu w Task 12)**

```bash
git add audio-source/numbers.json
git commit -m "feat(audio): numbers.json (cyfry 0-20 + operators + skip count)"
```

---

### Task 11: Create math-ui-strings.json (intros, pochwały, korekty, instrukcje)

**Files:**
- Create: `audio-source/math-ui-strings.json`

- [ ] **Step 1: Write JSON (~70 kluczy)**

```json
{
  "home-numbers-intro": "Kliknij, jeśli chcesz uczyć się cyferek!",

  "session-start-iskierka": "Zaczynamy! Iskierka.",
  "session-start-plomyk": "Płomyk! Liczymy razem.",
  "session-start-ognik": "Ognik. Trudniejsze działania.",
  "session-start-pochodnia": "Pochodnia. Mnożenie.",

  "intro-iskierka-counting": "Liczymy od jeden do dziesięć!",
  "intro-iskierka-subitizing": "Patrz szybko! Ile jest kropek?",
  "intro-iskierka-rhythm": "Rytm liczbowy. Co jest dalej?",
  "intro-iskierka-adding": "Dokładamy! Były trzy, doszły dwa, ile teraz?",

  "intro-plomyk-numberbond": "Siódemka. Z czego się składa?",
  "intro-plomyk-tenframe": "Dziesięć kratek. Ile zapełnionych, ile brakuje?",
  "intro-plomyk-addsubtract": "Dodajemy i odejmujemy do dziesięciu.",
  "intro-plomyk-factfamily": "Trzy liczby, cztery działania.",

  "intro-ognik-doubles": "Podwójki! Sześć i sześć, ile razem?",
  "intro-ognik-neardoubles": "Prawie podwójka. Sześć i siedem to sześć i sześć i jeszcze jeden.",
  "intro-ognik-make10": "Najpierw zrób dziesięć! Potem dodaj resztę.",
  "intro-ognik-factfamily": "Cztery działania z trzech liczb.",

  "intro-pochodnia-equalgroups": "Trzy koszyki, w każdym dwa jabłka. Ile razem?",
  "intro-pochodnia-skipcount": "Liczymy po dwa. Dwa, cztery, sześć.",
  "intro-pochodnia-arrays": "Trzy rzędy po cztery. To samo co cztery rzędy po trzy!",
  "intro-pochodnia-multiplication": "Trzy razy dwa to sześć!",

  "praise-effort": "Pokombinowałeś!",
  "praise-strategy": "Udało ci się to rozgryźć!",
  "praise-precision": "Dokładnie tak!",
  "praise-mastery": "Coraz lepiej!",
  "praise-think": "Świetnie pomyślane!",
  "praise-brawo": "Brawo!",
  "praise-super": "Super!",
  "praise-tak-jest": "Tak jest!",

  "try-again": "Spróbuj jeszcze raz!",
  "try-again-soft": "Prawie! Patrz jeszcze raz.",
  "correct-make10-prefix": "Najpierw do dziesięciu, potem reszta!",

  "ask-howmany": "Ile to jest?",
  "ask-howmany-total": "Ile razem?",
  "ask-howmany-left": "Ile zostało?",
  "ask-whats-next": "Co jest dalej?",
  "ask-howmany-missing": "Ile brakuje?",
  "ask-build-bond": "Zbuduj rozkład.",
  "ask-skip-count-2": "Liczymy po dwa.",
  "ask-skip-count-5": "Liczymy po pięć.",
  "ask-skip-count-10": "Liczymy po dziesięć.",

  "session-end-good": "Świetna sesja!",
  "tree-grow": "Drzewko rośnie!",

  "mastery-counting-5": "Liczysz do pięciu!",
  "mastery-counting-10": "Liczysz do dziesięciu!",
  "mastery-subitizing": "Szybko widzisz ile jest!",
  "mastery-rhythm": "Świetnie czujesz rytm!",
  "mastery-adding-concrete": "Umiesz dokładać!",
  "mastery-bonds-5": "Znasz rozkład piątki!",
  "mastery-bonds-10": "Znasz rozkład dziesiątki!",
  "mastery-tenframe": "Czytasz ten frame!",
  "mastery-addsub-10": "Dodajesz i odejmujesz do dziesięciu!",
  "mastery-factfamily": "Widzisz rodziny liczb!",
  "mastery-doubles": "Znasz podwójki!",
  "mastery-neardoubles": "Znasz prawie-podwójki!",
  "mastery-make10": "Robisz dziesięć!",
  "mastery-skipcount-2": "Liczysz po dwa!",
  "mastery-skipcount-5": "Liczysz po pięć!",
  "mastery-skipcount-10": "Liczysz po dziesięć!",
  "mastery-equalgroups": "Liczysz grupami!",
  "mastery-arrays": "Czytasz rzędy i kolumny!",
  "mastery-commutativity": "Trzy razy dwa to to samo co dwa razy trzy!"
}
```

(Klucze `correct-show-N` dla N=0..20 generujemy programowo w Task 12 przez prosty preprocessing skrypt — alternatywnie dopisz je tutaj manualnie. **Wybierz drugą opcję** dla prostoty: dopisz `"correct-show-0": "Tu było zero!"` ... `"correct-show-20": "Tu było dwadzieścia!"` (21 kluczy).)

- [ ] **Step 2: Add correct-show-N entries**

Dopisać 21 wpisów `"correct-show-N": "Tu było {liczba}!"` dla N=0..20 (gdzie {liczba} to słowna nazwa: zero, jeden, dwa, ...).

- [ ] **Step 3: Commit**

```bash
git add audio-source/math-ui-strings.json
git commit -m "feat(audio): math-ui-strings.json (~90 kluczy: intros, pochwały, korekty, instrukcje, mastery)"
```

---

### Task 12: Extend iskra-reactions.json + run audio:build

**Files:**
- Modify: `audio-source/iskra-reactions.json` (dodać math-specific)

- [ ] **Step 1: Read current iskra-reactions.json**

Run: `cat audio-source/iskra-reactions.json`

- [ ] **Step 2: Add math reactions**

Dopisz do JSON (zachowaj istniejące klucze):

```json
{
  "iskra-thinking-aloud-fingers": "Hmm... policzę na palcach. Jeden, dwa, trzy...",
  "iskra-thinking-aloud-tenframe": "Czekaj, rozłożę na ten frame...",
  "iskra-thinking-aloud-doubles": "Sześć i sześć to dwanaście...",
  "iskra-skipcount-singing": "Lubię liczyć po dwa! Dwa, cztery, sześć!",
  "iskra-bond-discovery": "O! Number bond!",
  "iskra-tenframe-fill": "Pełne dziesięć!"
}
```

- [ ] **Step 3: Run audio:build**

Run: `pnpm audio:build`
Expected: ~100 nowych mp3 generated w `public/audio/`. Idempotent — istniejące pliki bez zmian.

- [ ] **Step 4: Verify with audio:check**

Run: `pnpm audio:check`
Expected: PASS — wszystkie klucze z `numbers.json` + `math-ui-strings.json` + nowe `iskra-reactions.json` mają plik mp3.

- [ ] **Step 5: Commit (mp3 razem)**

```bash
git add audio-source/iskra-reactions.json public/audio/
git commit -m "feat(audio): generate ~100 mp3 dla modułu 3 (numbers + math-ui + iskra math)"
```

---

## Phase 4 — Concepts + facts + useNumbersSession

### Task 13: concepts.ts (lista konceptów + mastery thresholds)

**Files:**
- Create: `src/modules/numbers/data/concepts.ts`

- [ ] **Step 1: Implement concepts**

```typescript
// src/modules/numbers/data/concepts.ts
import type { ConceptId } from '../types'
import type { Level } from '@/shared/settings/types'

export type ConceptDef = {
  id: ConceptId
  level: Level
  introAudioKey: string             // klucz audio dla worked example intro
  masteryAudioKey: string           // klucz dla "Drzewko rośnie! ..."
  // Mastery threshold per spec sec 14.2:
  // correctStreak >= 8 + factsTouched.length >= minFacts + age >= 2 days
  minFacts: number                  // ile różnych faktów dziecko musi opanować
  minStreakForMastery: number       // domyślnie 8
}

export const CONCEPTS: Record<ConceptId, ConceptDef> = {
  // Iskierka
  'iskierka-counting-5': {
    id: 'iskierka-counting-5', level: 'iskierka',
    introAudioKey: 'intro-iskierka-counting',
    masteryAudioKey: 'mastery-counting-5',
    minFacts: 5, minStreakForMastery: 8,
  },
  'iskierka-counting-10': {
    id: 'iskierka-counting-10', level: 'iskierka',
    introAudioKey: 'intro-iskierka-counting',
    masteryAudioKey: 'mastery-counting-10',
    minFacts: 5, minStreakForMastery: 8,
  },
  'iskierka-subitizing-6': {
    id: 'iskierka-subitizing-6', level: 'iskierka',
    introAudioKey: 'intro-iskierka-subitizing',
    masteryAudioKey: 'mastery-subitizing',
    minFacts: 4, minStreakForMastery: 8,
  },
  'iskierka-rhythm': {
    id: 'iskierka-rhythm', level: 'iskierka',
    introAudioKey: 'intro-iskierka-rhythm',
    masteryAudioKey: 'mastery-rhythm',
    minFacts: 3, minStreakForMastery: 8,
  },
  'iskierka-adding-concrete': {
    id: 'iskierka-adding-concrete', level: 'iskierka',
    introAudioKey: 'intro-iskierka-adding',
    masteryAudioKey: 'mastery-adding-concrete',
    minFacts: 4, minStreakForMastery: 8,
  },
  // Płomyk
  'plomyk-bonds-5': {
    id: 'plomyk-bonds-5', level: 'plomyk',
    introAudioKey: 'intro-plomyk-numberbond',
    masteryAudioKey: 'mastery-bonds-5',
    minFacts: 3, minStreakForMastery: 8,
  },
  'plomyk-bonds-10': {
    id: 'plomyk-bonds-10', level: 'plomyk',
    introAudioKey: 'intro-plomyk-numberbond',
    masteryAudioKey: 'mastery-bonds-10',
    minFacts: 5, minStreakForMastery: 8,
  },
  'plomyk-tenframe': {
    id: 'plomyk-tenframe', level: 'plomyk',
    introAudioKey: 'intro-plomyk-tenframe',
    masteryAudioKey: 'mastery-tenframe',
    minFacts: 5, minStreakForMastery: 8,
  },
  'plomyk-addsub-10': {
    id: 'plomyk-addsub-10', level: 'plomyk',
    introAudioKey: 'intro-plomyk-addsubtract',
    masteryAudioKey: 'mastery-addsub-10',
    minFacts: 6, minStreakForMastery: 8,
  },
  'plomyk-factfamily': {
    id: 'plomyk-factfamily', level: 'plomyk',
    introAudioKey: 'intro-plomyk-factfamily',
    masteryAudioKey: 'mastery-factfamily',
    minFacts: 4, minStreakForMastery: 8,
  },
  // Ognik
  'ognik-doubles': {
    id: 'ognik-doubles', level: 'ognik',
    introAudioKey: 'intro-ognik-doubles',
    masteryAudioKey: 'mastery-doubles',
    minFacts: 5, minStreakForMastery: 8,
  },
  'ognik-neardoubles': {
    id: 'ognik-neardoubles', level: 'ognik',
    introAudioKey: 'intro-ognik-neardoubles',
    masteryAudioKey: 'mastery-neardoubles',
    minFacts: 5, minStreakForMastery: 8,
  },
  'ognik-make10': {
    id: 'ognik-make10', level: 'ognik',
    introAudioKey: 'intro-ognik-make10',
    masteryAudioKey: 'mastery-make10',
    minFacts: 6, minStreakForMastery: 8,
  },
  'ognik-factfamily-20': {
    id: 'ognik-factfamily-20', level: 'ognik',
    introAudioKey: 'intro-ognik-factfamily',
    masteryAudioKey: 'mastery-factfamily',
    minFacts: 5, minStreakForMastery: 8,
  },
  // Pochodnia
  'pochodnia-skipcount-2': {
    id: 'pochodnia-skipcount-2', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-skipcount',
    masteryAudioKey: 'mastery-skipcount-2',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-skipcount-5': {
    id: 'pochodnia-skipcount-5', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-skipcount',
    masteryAudioKey: 'mastery-skipcount-5',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-skipcount-10': {
    id: 'pochodnia-skipcount-10', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-skipcount',
    masteryAudioKey: 'mastery-skipcount-10',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-equalgroups': {
    id: 'pochodnia-equalgroups', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-equalgroups',
    masteryAudioKey: 'mastery-equalgroups',
    minFacts: 5, minStreakForMastery: 8,
  },
  'pochodnia-arrays': {
    id: 'pochodnia-arrays', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-arrays',
    masteryAudioKey: 'mastery-arrays',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-commutativity': {
    id: 'pochodnia-commutativity', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-multiplication',
    masteryAudioKey: 'mastery-commutativity',
    minFacts: 4, minStreakForMastery: 8,
  },
}

export function getConceptsForLevel(level: Level): ConceptDef[] {
  return Object.values(CONCEPTS).filter((c) => c.level === level)
}

export const MIN_AGE_FOR_MASTERY_MS = 2 * 24 * 60 * 60 * 1000  // 2 dni — sleep consolidation guard
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/data/concepts.ts
git commit -m "feat(numbers): concepts.ts (20 konceptów + mastery thresholds)"
```

---

### Task 14: facts.ts (generator faktów per koncept)

**Files:**
- Create: `src/modules/numbers/data/facts.ts`
- Create: `src/modules/numbers/data/facts.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// src/modules/numbers/data/facts.test.ts
import { describe, expect, it } from 'vitest'
import { generateFactsForConcept } from './facts'

describe('generateFactsForConcept', () => {
  it('iskierka-counting-5 generates 5 facts (count-1..count-5)', () => {
    const facts = generateFactsForConcept('iskierka-counting-5')
    expect(facts).toHaveLength(5)
    expect(facts[0]?.id).toBe('count-1')
    expect(facts[4]?.id).toBe('count-5')
  })

  it('plomyk-bonds-10 generates all bond decompositions for 6..10', () => {
    const facts = generateFactsForConcept('plomyk-bonds-10')
    // 6: 1+5, 2+4, 3+3 (3 bonds)
    // 7: 1+6, 2+5, 3+4 (3)
    // 8: 1+7, 2+6, 3+5, 4+4 (4)
    // 9: 1+8, 2+7, 3+6, 4+5 (4)
    // 10: 1+9, 2+8, 3+7, 4+6, 5+5 (5)
    // Total = 3+3+4+4+5 = 19
    expect(facts.length).toBeGreaterThanOrEqual(19)
    expect(facts.some((f) => f.id === 'bond-7-3-4')).toBe(true)
  })

  it('ognik-doubles generates 1+1 .. 10+10', () => {
    const facts = generateFactsForConcept('ognik-doubles')
    expect(facts).toHaveLength(10)
    expect(facts[0]?.id).toBe('double-1')
    expect(facts[9]?.id).toBe('double-10')
  })

  it('pochodnia-skipcount-2 generates step facts', () => {
    const facts = generateFactsForConcept('pochodnia-skipcount-2')
    expect(facts.length).toBeGreaterThanOrEqual(4)
    expect(facts.every((f) => f.id.startsWith('skip2-step'))).toBe(true)
  })
})
```

- [ ] **Step 2: Implement facts.ts**

```typescript
// src/modules/numbers/data/facts.ts
import type { ConceptId, MathFactId } from '../types'

export type Fact = {
  id: MathFactId
  conceptId: ConceptId
  // Numeric payload — komponent ćwiczenia interpretuje wg conceptId
  args: number[]
}

export function generateFactsForConcept(conceptId: ConceptId): Fact[] {
  switch (conceptId) {
    case 'iskierka-counting-5':
      return Array.from({ length: 5 }, (_, i) => ({
        id: `count-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'iskierka-counting-10':
      return Array.from({ length: 10 }, (_, i) => ({
        id: `count-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'iskierka-subitizing-6':
      return Array.from({ length: 6 }, (_, i) => ({
        id: `subitize-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'iskierka-rhythm':
      // Rytmy 2-elementowe (ABAB), 3-elementowe (ABCABC)
      return [
        { id: 'rhythm-12', conceptId, args: [1, 2] },
        { id: 'rhythm-13', conceptId, args: [1, 3] },
        { id: 'rhythm-23', conceptId, args: [2, 3] },
        { id: 'rhythm-123', conceptId, args: [1, 2, 3] },
        { id: 'rhythm-135', conceptId, args: [1, 3, 5] },
      ]

    case 'iskierka-adding-concrete':
      // a + b = c gdzie a + b <= 10, ZAWSZE prefiguracja (bez symbolu +)
      return [
        { id: 'cadd-1-1', conceptId, args: [1, 1] },
        { id: 'cadd-2-1', conceptId, args: [2, 1] },
        { id: 'cadd-2-2', conceptId, args: [2, 2] },
        { id: 'cadd-3-2', conceptId, args: [3, 2] },
        { id: 'cadd-3-3', conceptId, args: [3, 3] },
        { id: 'cadd-4-3', conceptId, args: [4, 3] },
        { id: 'cadd-5-2', conceptId, args: [5, 2] },
        { id: 'cadd-5-5', conceptId, args: [5, 5] },
      ]

    case 'plomyk-bonds-5':
      return generateBondsForWhole(5, conceptId)
    case 'plomyk-bonds-10':
      return [6, 7, 8, 9, 10].flatMap((w) => generateBondsForWhole(w, conceptId))

    case 'plomyk-tenframe':
      // Pytanie: ile brakuje do 10? (10-N for N=0..10)
      return Array.from({ length: 11 }, (_, i) => ({
        id: `tenframe-need-${10 - i}`,
        conceptId,
        args: [i, 10 - i],
      }))

    case 'plomyk-addsub-10':
      // Wszystkie a+b<=10 i a-b dla a<=10
      return [
        ...generateAddsUpTo(10, conceptId),
        ...generateSubsUpTo(10, conceptId),
      ]

    case 'plomyk-factfamily':
      // Trójki dla bond-ów do 10
      return [
        { id: 'ff-3-4-7', conceptId, args: [3, 4, 7] },
        { id: 'ff-2-5-7', conceptId, args: [2, 5, 7] },
        { id: 'ff-3-5-8', conceptId, args: [3, 5, 8] },
        { id: 'ff-4-5-9', conceptId, args: [4, 5, 9] },
        { id: 'ff-2-8-10', conceptId, args: [2, 8, 10] },
        { id: 'ff-3-7-10', conceptId, args: [3, 7, 10] },
      ]

    case 'ognik-doubles':
      return Array.from({ length: 10 }, (_, i) => ({
        id: `double-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'ognik-neardoubles':
      // Pary (n, n+1) dla n=1..9
      return Array.from({ length: 9 }, (_, i) => ({
        id: `neardouble-${i + 1}-${i + 2}`,
        conceptId,
        args: [i + 1, i + 2],
      }))

    case 'ognik-make10':
      // Dodawania >10 wymagające Make 10: a+b gdzie a+b>10, a<=9, b<=9
      const make10: Fact[] = []
      for (let a = 2; a <= 9; a++) {
        for (let b = 2; b <= 9; b++) {
          if (a + b > 10 && a + b <= 18) {
            make10.push({ id: `make10-${a}-${b}`, conceptId, args: [a, b] })
          }
        }
      }
      return make10

    case 'ognik-factfamily-20':
      return [
        { id: 'ff-7-9-16', conceptId, args: [7, 9, 16] },
        { id: 'ff-8-9-17', conceptId, args: [8, 9, 17] },
        { id: 'ff-6-8-14', conceptId, args: [6, 8, 14] },
        { id: 'ff-5-9-14', conceptId, args: [5, 9, 14] },
        { id: 'ff-4-7-11', conceptId, args: [4, 7, 11] },
        { id: 'ff-6-7-13', conceptId, args: [6, 7, 13] },
        { id: 'ff-5-7-12', conceptId, args: [5, 7, 12] },
      ]

    case 'pochodnia-skipcount-2':
      return Array.from({ length: 4 }, (_, i) => ({
        id: `skip2-step${i + 1}`,
        conceptId,
        args: [2, i + 1, (i + 2) * 2],  // step, currentIdx, nextValue
      }))

    case 'pochodnia-skipcount-5':
      return Array.from({ length: 4 }, (_, i) => ({
        id: `skip5-step${i + 1}`,
        conceptId,
        args: [5, i + 1, (i + 2) * 5],
      }))

    case 'pochodnia-skipcount-10':
      return Array.from({ length: 4 }, (_, i) => ({
        id: `skip10-step${i + 1}`,
        conceptId,
        args: [10, i + 1, (i + 2) * 10],
      }))

    case 'pochodnia-equalgroups':
      // n grup po m: 2x2, 2x3, 3x2, 3x3, 4x2, 5x2
      return [
        { id: 'eqgroups-2x2', conceptId, args: [2, 2] },
        { id: 'eqgroups-2x3', conceptId, args: [2, 3] },
        { id: 'eqgroups-3x2', conceptId, args: [3, 2] },
        { id: 'eqgroups-3x3', conceptId, args: [3, 3] },
        { id: 'eqgroups-4x2', conceptId, args: [4, 2] },
        { id: 'eqgroups-5x2', conceptId, args: [5, 2] },
      ]

    case 'pochodnia-arrays':
      return [
        { id: 'array-2x3', conceptId, args: [2, 3] },
        { id: 'array-3x4', conceptId, args: [3, 4] },
        { id: 'array-4x2', conceptId, args: [4, 2] },
        { id: 'array-2x5', conceptId, args: [2, 5] },
        { id: 'array-3x3', conceptId, args: [3, 3] },
      ]

    case 'pochodnia-commutativity':
      // 3x2 = 2x3 itp. — focus na że to to samo
      return [
        { id: 'mult-2-3', conceptId, args: [2, 3] },
        { id: 'mult-3-2', conceptId, args: [3, 2] },
        { id: 'mult-2-5', conceptId, args: [2, 5] },
        { id: 'mult-5-2', conceptId, args: [5, 2] },
        { id: 'mult-3-4', conceptId, args: [3, 4] },
        { id: 'mult-4-3', conceptId, args: [4, 3] },
      ]
  }
}

function generateBondsForWhole(whole: number, conceptId: ConceptId): Fact[] {
  const bonds: Fact[] = []
  for (let a = 1; a <= Math.floor(whole / 2); a++) {
    const b = whole - a
    bonds.push({ id: `bond-${whole}-${a}-${b}`, conceptId, args: [whole, a, b] })
  }
  return bonds
}

function generateAddsUpTo(max: number, conceptId: ConceptId): Fact[] {
  const adds: Fact[] = []
  for (let a = 1; a <= max - 1; a++) {
    for (let b = 1; b <= max - a; b++) {
      adds.push({ id: `add-${a}-${b}`, conceptId, args: [a, b] })
    }
  }
  return adds
}

function generateSubsUpTo(max: number, conceptId: ConceptId): Fact[] {
  const subs: Fact[] = []
  for (let a = 2; a <= max; a++) {
    for (let b = 1; b < a; b++) {
      subs.push({ id: `sub-${a}-${b}`, conceptId, args: [a, b] })
    }
  }
  return subs
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm test --run src/modules/numbers/data/facts.test.ts`
Expected: PASS (4/4)

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/data/facts.ts src/modules/numbers/data/facts.test.ts
git commit -m "feat(numbers): facts.ts generator + 4 testy (kompletność per koncept)"
```

---

### Task 15: useNumbersSession hook (orchestrator z interleaving)

**Files:**
- Create: `src/modules/numbers/hooks/useNumbersSession.ts`
- Create: `src/modules/numbers/hooks/useNumbersSession.test.ts`

Hook jest analogiczny do `useReadingSession` z modułu 2: zarządza stanem sesji (idx, status, current question), wywołuje audio, zbiera events, wraca SessionEnd po N pytaniach. Adaptive: SRS picker + interleaving 80/20 dla Pochodni (15-20% to maintenance odejmowania).

- [ ] **Step 1: Implement hook (skeleton — pełna implementacja w następnym Step po sukcesie smoke testu w komponencie)**

```typescript
// src/modules/numbers/hooks/useNumbersSession.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { pickNextItem } from '@/shared/srs/select'
import { applyOutcome } from '@/shared/srs/update'
import type { Level } from '@/shared/settings/types'
import type {
  AnswerOutcome,
  ConceptId,
  MathFactId,
  MathFactState,
  NumbersSessionEvent,
  NumbersSessionLog,
  Question,
} from '../types'
import { useNumbers } from '../store/numbersStore'
import { CONCEPTS, getConceptsForLevel, MIN_AGE_FOR_MASTERY_MS } from '../data/concepts'
import { generateFactsForConcept } from '../data/facts'
import { exerciseTypeForFact } from './exerciseRouter'

export type SessionStatus = 'intro' | 'asking' | 'feedback' | 'paused' | 'ended'

const DEFAULT_QUESTION_COUNT = 8
// Pochodnia: 15-20% pytań to maintenance odejmowania (interleaving Bjork)
const POCHODNIA_SUBTRACT_MAINTENANCE_RATIO = 0.18

export type UseNumbersSessionParams = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  questionCount?: number
  rng?: () => number
  now?: () => number
}

export function useNumbersSession({
  level,
  audioBus,
  questionCount = DEFAULT_QUESTION_COUNT,
  rng = Math.random,
  now = Date.now,
}: UseNumbersSessionParams) {
  const [status, setStatus] = useState<SessionStatus>('intro')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome | null>(null)
  const [counters, setCounters] = useState({ correct: 0, wrong: 0, dontKnow: 0 })
  const eventsRef = useRef<NumbersSessionEvent[]>([])
  const startedAtRef = useRef<number>(0)
  const questionStartedAtRef = useRef<number>(0)
  const lastFactRef = useRef<MathFactId | null>(null)

  const facts = useNumbers((s) => s.facts)
  const ensureFactInitialized = useNumbers((s) => s.ensureFactInitialized)
  const applySessionResults = useNumbers((s) => s.applySessionResults)

  // Pool faktów dla tego poziomu
  const levelPool = useMemo(() => {
    const concepts = getConceptsForLevel(level)
    return concepts.flatMap((c) => generateFactsForConcept(c.id))
  }, [level])

  // Init facts in store
  useEffect(() => {
    levelPool.forEach((f) => ensureFactInitialized(f.id, f.conceptId))
  }, [levelPool, ensureFactInitialized])

  const start = useCallback(() => {
    audioBus.stop()
    void audioBus.play(`session-start-${level}`)
    startedAtRef.current = now()
    setStatus('asking')
    pickAndSetQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBus, level, now])

  const pickAndSetQuestion = useCallback(() => {
    // Pochodnia interleaving: w 18% przypadków pickujemy z faktów odejmowania
    // (z plomyk-addsub-10 lub innych poprzednich poziomów jeśli są w store)
    let pool = levelPool.map((f) => f.id)

    if (level === 'pochodnia' && rng() < POCHODNIA_SUBTRACT_MAINTENANCE_RATIO) {
      const subFacts = Object.keys(facts).filter((id) => id.startsWith('sub-'))
      if (subFacts.length > 0) pool = subFacts
    }

    if (pool.length === 0) return

    const factId = pickNextItem(facts, pool, lastFactRef.current, now(), rng)
    lastFactRef.current = factId

    const fact = levelPool.find((f) => f.id === factId)
                ?? findFactInAllConcepts(factId)
    if (!fact) return

    const exerciseType = exerciseTypeForFact(fact, level)
    setCurrentQuestion({
      factId,
      conceptId: fact.conceptId,
      exerciseType,
      payload: { args: fact.args },
    })
    questionStartedAtRef.current = now()
  }, [facts, levelPool, level, now, rng])

  const answer = useCallback(
    (outcome: AnswerOutcome) => {
      if (!currentQuestion) return
      const responseMs = now() - questionStartedAtRef.current

      eventsRef.current.push({
        factId: currentQuestion.factId,
        conceptId: currentQuestion.conceptId,
        exerciseType: currentQuestion.exerciseType,
        outcome,
        responseMs,
        timestamp: now(),
      })

      setLastOutcome(outcome)
      setCounters((c) => ({
        correct: c.correct + (outcome === 'correct' ? 1 : 0),
        wrong: c.wrong + (outcome === 'wrong' ? 1 : 0),
        dontKnow: c.dontKnow + (outcome === 'dontKnow' ? 1 : 0),
      }))
      setStatus('feedback')
    },
    [currentQuestion, now],
  )

  const advance = useCallback(() => {
    const nextIdx = questionIdx + 1
    if (nextIdx >= questionCount) {
      // End session
      const endedAt = now()
      const log: NumbersSessionLog = {
        startedAt: startedAtRef.current,
        endedAt,
        level,
        events: eventsRef.current,
      }
      const updatedFacts = computeUpdatedFacts(facts, eventsRef.current, endedAt)
      const updatedConcepts = computeMasteryProgress(
        useNumbers.getState().concepts,
        eventsRef.current,
        endedAt,
      )
      applySessionResults(updatedFacts, updatedConcepts, log)
      setStatus('ended')
      return
    }
    setQuestionIdx(nextIdx)
    setStatus('asking')
    pickAndSetQuestion()
  }, [questionIdx, questionCount, now, level, facts, applySessionResults, pickAndSetQuestion])

  return {
    status,
    questionIdx,
    questionCount,
    currentQuestion,
    counters,
    lastOutcome,
    start,
    answer,
    advance,
    pause: () => setStatus('paused'),
    resume: () => setStatus('asking'),
  }
}

// Helper: znajdź fakt po id w dowolnym koncepcie (np. dla maintenance odejmowania
// w Pochodni — fakty z plomyk-addsub-10 są w store ale nie w levelPool)
function findFactInAllConcepts(factId: MathFactId) {
  for (const conceptId of Object.keys(CONCEPTS) as ConceptId[]) {
    const facts = generateFactsForConcept(conceptId)
    const found = facts.find((f) => f.id === factId)
    if (found) return found
  }
  return undefined
}

function computeUpdatedFacts(
  currentFacts: Record<MathFactId, MathFactState>,
  events: NumbersSessionEvent[],
  endedAt: number,
): Record<MathFactId, MathFactState> {
  const updated: Record<MathFactId, MathFactState> = {}
  for (const ev of events) {
    const current = currentFacts[ev.factId]
    if (!current) continue
    const next = applyOutcome(current, ev.outcome, endedAt)
    updated[ev.factId] = { ...next, conceptId: current.conceptId }
  }
  return updated
}

function computeMasteryProgress(
  currentConcepts: Record<string, import('../types').ConceptMastery>,
  events: NumbersSessionEvent[],
  endedAt: number,
) {
  const updated: Record<string, import('../types').ConceptMastery> = {}
  // Group events by conceptId
  const byConcept = new Map<ConceptId, NumbersSessionEvent[]>()
  for (const ev of events) {
    if (!byConcept.has(ev.conceptId)) byConcept.set(ev.conceptId, [])
    byConcept.get(ev.conceptId)!.push(ev)
  }

  for (const [conceptId, evs] of byConcept) {
    const def = CONCEPTS[conceptId]
    if (!def) continue
    const prev = currentConcepts[conceptId] ?? {
      state: 'unseen' as const,
      firstSeenAt: endedAt,
      lastSeenAt: endedAt,
      correctStreak: 0,
      factsTouched: [],
    }
    let streak = prev.correctStreak
    const factsTouched = new Set(prev.factsTouched)
    for (const ev of evs) {
      factsTouched.add(ev.factId)
      if (ev.outcome === 'correct') streak += 1
      else streak = 0
    }
    const ageMs = endedAt - prev.firstSeenAt
    const meetsMastery =
      streak >= def.minStreakForMastery &&
      factsTouched.size >= def.minFacts &&
      ageMs >= MIN_AGE_FOR_MASTERY_MS
    updated[conceptId] = {
      state: meetsMastery ? 'mastered' : 'learning',
      firstSeenAt: prev.firstSeenAt === 0 ? endedAt : prev.firstSeenAt,
      lastSeenAt: endedAt,
      correctStreak: streak,
      factsTouched: Array.from(factsTouched),
    }
  }
  return updated
}
```

- [ ] **Step 2: Implement exerciseRouter helper**

```typescript
// src/modules/numbers/hooks/exerciseRouter.ts
import type { Level } from '@/shared/settings/types'
import type { ExerciseType } from '../types'
import type { Fact } from '../data/facts'

export function exerciseTypeForFact(fact: Fact, level: Level): ExerciseType {
  switch (fact.conceptId) {
    case 'iskierka-counting-5':
    case 'iskierka-counting-10':
    case 'iskierka-subitizing-6':
      return 'subitize-flash'  // dla counting też używamy subitize jako konkret
    case 'iskierka-rhythm':
      return 'number-rhythm'
    case 'iskierka-adding-concrete':
      return 'concrete-add'
    case 'plomyk-bonds-5':
    case 'plomyk-bonds-10':
      return 'number-bond-builder'
    case 'plomyk-tenframe':
      return 'ten-frame-fill'
    case 'plomyk-addsub-10':
      // Maintenance odejmowania w Pochodni → subtract-maintenance ćwiczenie
      if (level === 'pochodnia' && fact.id.startsWith('sub-')) {
        return 'subtract-maintenance'
      }
      return 'concrete-add-subtract'
    case 'plomyk-factfamily':
    case 'ognik-factfamily-20':
      return 'fact-family-triangle'
    case 'ognik-doubles':
      return 'doubles'
    case 'ognik-neardoubles':
      return 'near-doubles'
    case 'ognik-make10':
      return 'make-10'
    case 'pochodnia-skipcount-2':
    case 'pochodnia-skipcount-5':
    case 'pochodnia-skipcount-10':
      return 'skip-count-chase'
    case 'pochodnia-equalgroups':
      return 'equal-groups'
    case 'pochodnia-arrays':
    case 'pochodnia-commutativity':
      return 'array-match'
  }
}
```

- [ ] **Step 3: Write smoke test for hook**

```typescript
// src/modules/numbers/hooks/useNumbersSession.test.ts
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useNumbersSession } from './useNumbersSession'
import { useNumbers } from '../store/numbersStore'

describe('useNumbersSession', () => {
  beforeEach(() => {
    localStorage.clear()
    useNumbers.getState().reset()
  })

  it('starts session and picks first question', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    expect(result.current.status).toBe('intro')
    act(() => result.current.start())
    expect(result.current.status).toBe('asking')
    expect(result.current.currentQuestion).not.toBeNull()
    expect(audioBus.play).toHaveBeenCalledWith('session-start-iskierka')
  })

  it('advances through questionCount and ends', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 2 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    expect(result.current.status).toBe('ended')
    expect(result.current.counters.correct).toBe(2)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `pnpm test --run src/modules/numbers/hooks/useNumbersSession.test.ts`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add src/modules/numbers/hooks/useNumbersSession.ts src/modules/numbers/hooks/useNumbersSession.test.ts src/modules/numbers/hooks/exerciseRouter.ts
git commit -m "feat(numbers): useNumbersSession + exerciseRouter (interleaving 18% Pochodnia)"
```

---

## Phase 5 — Iskierka exercises (4 typy)

**Pattern dla każdego ćwiczenia:**
1. Komponent przyjmuje `payload: Record<string, unknown>`, `audioBus`, `onAnswer: (outcome: AnswerOutcome) => void`
2. Renderuje pytanie wizualnie (używając representations z Phase 2)
3. Wywołuje `audioBus.play(...)` na mount
4. Wywołuje `onAnswer('correct' | 'wrong' | 'dontKnow')` po interakcji
5. SessionView przełącza między ćwiczeniami na podstawie `currentQuestion.exerciseType`

**Wspólne plusy w SessionView (Task 25):** progress bar, pauza, feedback overlay, end screen.

### Task 16: SubitizeFlashExercise

**Files:**
- Create: `src/modules/numbers/components/exercises/SubitizeFlashExercise.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/modules/numbers/components/exercises/SubitizeFlashExercise.tsx
import { useEffect, useMemo, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { DotPattern } from '../representations/DotPattern'
import { DigitTile } from '../representations/DigitTile'
import { useDroppable } from '@dnd-kit/core'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }  // args[0] = correct number
  onAnswer: (outcome: AnswerOutcome) => void
}

const FLASH_MS = 2000

export function SubitizeFlashExercise({ audioBus, payload, onAnswer }: Props) {
  const correct = payload.args[0] ?? 1
  const [phase, setPhase] = useState<'flash' | 'answer'>('flash')

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-howmany')
    const t = setTimeout(() => setPhase('answer'), FLASH_MS)
    return () => clearTimeout(t)
  }, [audioBus])

  const distractors = useMemo(() => generateDigitDistractors(correct, 3), [correct])
  const choices = useMemo(() => shuffle([correct, ...distractors]), [correct, distractors])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== 'subitize-target') return
    const dropped = event.active.data.current?.digit as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="subitize-flash"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: 24,
        }}
      >
        <DropTarget>
          {phase === 'flash' ? (
            <DotPattern count={correct} pattern="dice" size={200} />
          ) : (
            <span style={{ fontSize: 96, opacity: 0.3 }}>?</span>
          )}
        </DropTarget>
        {phase === 'answer' && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {choices.map((d) => (
              <DigitTile
                key={d}
                variant="drag"
                digit={d}
                dragId={`digit-${d}`}
                size="md"
              />
            ))}
          </div>
        )}
      </div>
    </DndContext>
  )
}

function DropTarget({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'subitize-target' })
  return (
    <div
      ref={setNodeRef}
      data-testid="subitize-drop-target"
      style={{
        minWidth: 240,
        minHeight: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `4px dashed ${isOver ? '#16a34a' : '#cbd5e1'}`,
        borderRadius: 16,
        background: isOver ? '#dcfce7' : '#fff',
        transition: 'background 120ms',
      }}
    >
      {children}
    </div>
  )
}

function generateDigitDistractors(correct: number, n: number): number[] {
  const pool = Array.from({ length: 6 }, (_, i) => i + 1).filter((d) => d !== correct)
  return shuffle(pool).slice(0, n)
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/components/exercises/SubitizeFlashExercise.tsx
git commit -m "feat(numbers): SubitizeFlashExercise (DotPattern + drag DigitTile)"
```

---

### Task 17: MatchDigitDotsExercise + NumberRhythmExercise + ConcreteAddExercise

**Pattern:** powtarzaj strukturę z Task 16 — DndContext + drop target + digit choices. Konkrety:

**MatchDigitDotsExercise** (Iskierka 7-10): pokazuje TenFrame z `args[0]` kropek (zakres 1-10), drop target przyjmuje DigitTile. Audio `ask-howmany`.

**NumberRhythmExercise** (Iskierka rytm): pokazuje sekwencję kropek/cyfr `args[0..n-1]` powtórzoną 2× + "?" na końcu. Choices: następny element + 2-3 dystraktory. Audio `ask-whats-next`.

**ConcreteAddExercise** (Iskierka dokładanie): pokazuje `ConcreteIcons count={a}`, animacja pojawienia się dodatkowych `b` ikon, drop target przyjmuje wynik `a+b`. Audio `ask-howmany-total`. **Bez symbolu +** wizualnie.

**Files:**
- Create: `src/modules/numbers/components/exercises/MatchDigitDotsExercise.tsx`
- Create: `src/modules/numbers/components/exercises/NumberRhythmExercise.tsx`
- Create: `src/modules/numbers/components/exercises/ConcreteAddExercise.tsx`

- [ ] **Step 1-3: Implement all three (~80 lines each, similar structure to Task 16)**

Każde ćwiczenie:
- DndContext z handleDragEnd
- Drop target dla wyniku
- 4 DigitTiles z choices (correct + 3 distractors)
- Audio prompt na mount
- Bezpośrednie onAnswer po drop

- [ ] **Step 4: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 5: Commit each separately**

```bash
git add src/modules/numbers/components/exercises/MatchDigitDotsExercise.tsx
git commit -m "feat(numbers): MatchDigitDotsExercise (TenFrame 1-10 + drag digit)"

git add src/modules/numbers/components/exercises/NumberRhythmExercise.tsx
git commit -m "feat(numbers): NumberRhythmExercise (sekwencja + co dalej?)"

git add src/modules/numbers/components/exercises/ConcreteAddExercise.tsx
git commit -m "feat(numbers): ConcreteAddExercise (dokładanie konkretów, bez symbolu +)"
```

---

## Phase 6 — Płomyk exercises (4 typy)

### Task 18: NumberBondBuilder

**Files:**
- Create: `src/modules/numbers/components/exercises/NumberBondBuilder.tsx`

Korzysta z `NumberBondShape` z Phase 2. Whole jest dany (np. 7), 2 sloty puste. Dziecko drag dwa DigitTiles żeby je wypełnić. Po complete (2 wartości w slotach) auto-validate: jeśli sumują się do whole → correct.

- [ ] **Step 1: Implement (skeleton — pełna implementacja ~120 lines)**

Główne pieces:
- State: `slotA: number | null`, `slotB: number | null`
- DndContext z 2 drop slots (`bond-slot-a`, `bond-slot-b`)
- Pool 5-6 DigitTiles do wyboru (correct partA + correct partB + 2-3 distractors)
- onDragEnd: jeśli over === slot, set state. Jeśli oba sloty wypełnione → wywołaj validation
- Audio: `ask-build-bond` na mount; po complete jeśli correct: `praise-precision`; jeśli wrong: `try-again`

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/modules/numbers/components/exercises/NumberBondBuilder.tsx
git commit -m "feat(numbers): NumberBondBuilder (drag 2 partów do bond shape)"
```

---

### Task 19: TenFrameFill + ConcreteAddSubtract + FactFamilyTriangle (lite)

Analogicznie do Task 18.

**TenFrameFill:** pokaż TenFrame z N kropkami (`args[0]`), drop target dla brakującej cyfry (`10 - N` = `args[1]`).

**ConcreteAddSubtract:** dwa układy ten frame obok siebie (a + b lub a - b w zależności od factId prefix `add-`/`sub-`), pokazuje symbol "+" / "-" / "=" pomiędzy. Drop target dla wyniku.

**FactFamilyTriangle (lite):** trójkąt z 3 liczbami (whole na górze, 2 parts na dole — używa `NumberBondShape` lub własnego SVG). Dziecko taps generated equations (np. "3+4=7", "4+3=7", "7-3=4", "7-4=3") — sprawdzamy że wszystkie 4 zostały zaznaczone w jednej rundzie.

**Files:**
- Create: `src/modules/numbers/components/exercises/TenFrameFill.tsx`
- Create: `src/modules/numbers/components/exercises/ConcreteAddSubtract.tsx`
- Create: `src/modules/numbers/components/exercises/FactFamilyTriangle.tsx`

- [ ] **Step 1-3: Implement all three (~100-150 lines each)**

- [ ] **Step 4: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 5: Commit each**

```bash
git add src/modules/numbers/components/exercises/TenFrameFill.tsx
git commit -m "feat(numbers): TenFrameFill (ile brakuje do 10)"

git add src/modules/numbers/components/exercises/ConcreteAddSubtract.tsx
git commit -m "feat(numbers): ConcreteAddSubtract (ten frame + symbol +/-)"

git add src/modules/numbers/components/exercises/FactFamilyTriangle.tsx
git commit -m "feat(numbers): FactFamilyTriangle lite (rodzina liczb do 10)"
```

---

## Phase 7 — Ognik exercises (4 typy)

### Task 20: DoublesExercise + NearDoublesExercise + Make10Exercise + FactFamilyTriangle (full)

**DoublesExercise (Ognik):** dwa identyczne TenFrames (mirror, ten sam kolor) — np. 6 kropek lewo + 6 kropek prawo. Drop target dla 12.

**NearDoublesExercise:** ten frame 6 kropek + ten frame 6+1=7 kropek (extra kropka w innym kolorze, podświetlona). Drop target dla 13.

**Make10Exercise (worked example with fading):** "8+5". Faza 1 (worked): animacja: ten frame z 8, 5 rozkłada się na 2+3, 2 dolatują → frame full (zielony błysk), reszta 3 z boku. Drop target dla 13. Faza 2+ (faded): tylko symbol "8+5", drop target.

**FactFamilyTriangle (full, do 20):** jak lite z Płomyka, ale args dla zakresu do 20. Trzeba zaznaczyć wszystkie 4 równania.

**Files:**
- Create: `src/modules/numbers/components/exercises/DoublesExercise.tsx`
- Create: `src/modules/numbers/components/exercises/NearDoublesExercise.tsx`
- Create: `src/modules/numbers/components/exercises/Make10Exercise.tsx`

(FactFamilyTriangle z Task 19 jest reuse — przyjmuje `maxValue` prop dla scope.)

- [ ] **Step 1-3: Implement (~100-150 lines each, Make10 z animacją CSS keyframes)**

- [ ] **Step 4: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 5: Commit each**

```bash
git add src/modules/numbers/components/exercises/DoublesExercise.tsx
git commit -m "feat(numbers): DoublesExercise (mirror ten frames)"

git add src/modules/numbers/components/exercises/NearDoublesExercise.tsx
git commit -m "feat(numbers): NearDoublesExercise (double + 1)"

git add src/modules/numbers/components/exercises/Make10Exercise.tsx
git commit -m "feat(numbers): Make10Exercise (worked example with fading)"
```

---

## Phase 8 — Pochodnia exercises (4 typy)

### Task 21: EqualGroupsExercise + SkipCountChase + ArrayMatchExercise + SubtractMaintenanceExercise

**EqualGroupsExercise:** N grup po M (np. 3 koszyki z 2 jabłkami w każdym). Każda grupa innym kolorem (groupColor prop). Pod spodem repeated addition `2+2+2`. Po kilku rundach dodać też `3×2=6`. Drop target dla wyniku.

**SkipCountChase:** lektor mówi `count-2by2`, na ekranie sekwencja `2, 4, 6, ?`. Drop target dla następnego (8). Distractors: 7, 9, 10.

**ArrayMatchExercise:** array NxM (rzędy × kolumny) jako kropki w siatce. Pytanie 1: ile razem (drop). Pytanie 2 (commutativity): ten sam array z opisu "M×N" — pokazuje że wynik ten sam.

**SubtractMaintenanceExercise:** "13-5" z ten frame (13 kropek = jeden full + 3), animacja "zabieramy 5". Drop target.

**Files:**
- Create: `src/modules/numbers/components/exercises/EqualGroupsExercise.tsx`
- Create: `src/modules/numbers/components/exercises/SkipCountChase.tsx`
- Create: `src/modules/numbers/components/exercises/ArrayMatchExercise.tsx`
- Create: `src/modules/numbers/components/exercises/SubtractMaintenance.tsx`

- [ ] **Step 1-4: Implement (~120-180 lines each)**

- [ ] **Step 5: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 6: Commit each**

```bash
git add src/modules/numbers/components/exercises/EqualGroupsExercise.tsx
git commit -m "feat(numbers): EqualGroupsExercise (N grup × M konkretów + repeated addition)"

git add src/modules/numbers/components/exercises/SkipCountChase.tsx
git commit -m "feat(numbers): SkipCountChase (sekwencja po 2/5/10)"

git add src/modules/numbers/components/exercises/ArrayMatchExercise.tsx
git commit -m "feat(numbers): ArrayMatchExercise (NxM + commutativity)"

git add src/modules/numbers/components/exercises/SubtractMaintenance.tsx
git commit -m "feat(numbers): SubtractMaintenance (13-5 z ten frame, interleaving)"
```

---

## Phase 9 — Concept intros (worked examples)

### Task 22: ConceptIntro component + integration w SessionView

**Files:**
- Create: `src/modules/numbers/components/intros/ConceptIntro.tsx`

Komponent pokazuje animowany worked example dla danego konceptu (`conceptId`). Lektor wymówi `CONCEPTS[conceptId].introAudioKey`. Po skończeniu (lub po klik "→") dziecko przechodzi do pytania, a koncept zapisuje się w `seenIntros`.

- [ ] **Step 1: Implement ConceptIntro**

```typescript
// src/modules/numbers/components/intros/ConceptIntro.tsx
import { useEffect, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { ConceptId } from '../../types'
import { CONCEPTS } from '../../data/concepts'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

type Props = {
  conceptId: ConceptId
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onContinue: () => void
}

export function ConceptIntro({ conceptId, audioBus, onContinue }: Props) {
  const def = CONCEPTS[conceptId]
  const [audioFinished, setAudioFinished] = useState(false)
  const tap = useTapHandler({ onTap: onContinue })

  useEffect(() => {
    audioBus.stop()
    void audioBus.play(def.introAudioKey)
    // Fallback timer — po 4s pozwól kliknąć dalej nawet jeśli audio nie skończyło
    const t = setTimeout(() => setAudioFinished(true), 4000)
    return () => clearTimeout(t)
  }, [audioBus, def.introAudioKey])

  return (
    <div
      data-testid={`concept-intro-${conceptId}`}
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
      <ConceptVisual conceptId={conceptId} />
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

// Per koncept — minimalna wizualizacja worked example.
// Dla MVP używamy emoji + opisu wizualnego; szczegółowe animacje per koncept
// można dodać później bez naruszania interfejsu.
function ConceptVisual({ conceptId }: { conceptId: ConceptId }) {
  const fallback = (
    <div
      style={{
        fontSize: 120,
        fontFamily: 'var(--font-block)',
        color: colors.text,
      }}
    >
      💡
    </div>
  )
  // Dla MVP: fallback. W kolejnym kroku można dodać switch(conceptId) z dedicated
  // animowanymi wizualizacjami (TenFrame fillujący się dla make10, NumberBondShape
  // budujący się dla bonds, etc.)
  return fallback
}
```

- [ ] **Step 2: Integration w SessionView**

W `SessionView.tsx` (Task 25): przed renderem `currentQuestion`, sprawdź czy `useNumbers.hasSeenIntro(\`intro-${conceptId}\`)`. Jeśli nie — pokaż `ConceptIntro` z `onContinue` ustawiającym `markIntroSeen`.

- [ ] **Step 3: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/components/intros/ConceptIntro.tsx
git commit -m "feat(numbers): ConceptIntro (worked example gating per seenIntros)"
```

---

## Phase 10 — Mastery Tree + raport rodzica + settings

### Task 23: MasteryTree component

**Files:**
- Create: `src/modules/numbers/components/MasteryTree.tsx`

Wizualizacja drzewka z liśćmi/gałęziami per opanowany koncept.

- [ ] **Step 1: Implement MasteryTree**

```typescript
// src/modules/numbers/components/MasteryTree.tsx
import { useNumbers } from '../store/numbersStore'
import { CONCEPTS } from '../data/concepts'
import type { ConceptId, ConceptMasteryState } from '../types'
import { colors } from '@/app/theme'

const LEAF_EMOJI: Record<ConceptMasteryState, string> = {
  unseen: '·',
  learning: '🌱',
  mastered: '🍃',
}

export function MasteryTree() {
  const concepts = useNumbers((s) => s.concepts)
  const allConcepts = Object.values(CONCEPTS)
  const masteredCount = allConcepts.filter(
    (c) => concepts[c.id]?.state === 'mastered',
  ).length
  const totalCount = allConcepts.length
  const treeStage = masteredCount === 0
    ? '🌱'
    : masteredCount < 5
    ? '🪴'
    : masteredCount < 10
    ? '🌿'
    : masteredCount < 15
    ? '🌳'
    : '🌲'

  return (
    <div
      data-testid="mastery-tree-root"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 24,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: '2em',
          color: colors.text,
          margin: 0,
        }}
      >
        Drzewko mistrzostwa
      </h2>
      <div style={{ fontSize: 200 }} aria-label={`Drzewko: ${masteredCount} z ${totalCount}`}>
        {treeStage}
      </div>
      <div
        data-testid="mastery-summary"
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 28,
          color: colors.text,
        }}
      >
        {masteredCount} / {totalCount}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
          width: '100%',
          maxWidth: 720,
        }}
      >
        {allConcepts.map((c) => {
          const m = concepts[c.id]
          const state = m?.state ?? 'unseen'
          return (
            <div
              key={c.id}
              data-testid={`mastery-cell-${c.id}`}
              data-state={state}
              style={{
                padding: 12,
                borderRadius: 8,
                background:
                  state === 'mastered' ? '#dcfce7'
                  : state === 'learning' ? '#fef9c3'
                  : '#f3f4f6',
                border: `2px solid ${
                  state === 'mastered' ? '#16a34a'
                  : state === 'learning' ? '#ca8a04'
                  : '#d1d5db'
                }`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                color: colors.text,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 24 }}>
                {LEAF_EMOJI[state]}
              </span>
              <span style={{ flex: 1 }}>{prettyConceptLabel(c.id)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function prettyConceptLabel(id: ConceptId): string {
  const labels: Record<ConceptId, string> = {
    'iskierka-counting-5': 'Liczenie do 5',
    'iskierka-counting-10': 'Liczenie do 10',
    'iskierka-subitizing-6': 'Subitizing 1-6',
    'iskierka-rhythm': 'Rytm liczbowy',
    'iskierka-adding-concrete': 'Dokładanie',
    'plomyk-bonds-5': 'Rozkład 5',
    'plomyk-bonds-10': 'Rozkład 6-10',
    'plomyk-tenframe': 'Ten frame',
    'plomyk-addsub-10': '+/- do 10',
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
  return labels[id]
}
```

- [ ] **Step 2: Wire MasteryTree do `/numbers/tree` route w `index.tsx`**

W `src/modules/numbers/index.tsx`: replace `NumbersTreePlaceholder` z `<MasteryTree />`.

- [ ] **Step 3: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/components/MasteryTree.tsx src/modules/numbers/index.tsx
git commit -m "feat(numbers): MasteryTree (wizualizacja konceptów + emoji drzewko)"
```

---

### Task 24: Settings extension + parent report extension

**Files:**
- Modify: `src/shared/settings/types.ts` — dodaj `numbers: NumbersSettings`
- Modify: `src/shared/settings/defaults.ts` — defaults dla numbers
- Modify: `src/shared/settings/settingsStore.ts` — backward-compat merge
- Modify: `src/shared/settings/components/SettingsScreen.tsx` (lub odp. ekran) — sekcja Cyferki
- Modify: `src/shared/stats/<file>` — sekcja Matematyka w raporcie

- [ ] **Step 1: Read current types.ts and add NumbersSettings**

Add do `Settings`:

```typescript
export type NumbersSettings = {
  iskraThinkingAloud: boolean
  questionCount: 6 | 8 | 10
  treeCelebrationsOn: boolean
  skipCountStep: 2 | 5 | 10 | 'mixed'
  conceptIntros: boolean
}

export type Settings = {
  // ...existing fields
  numbers: NumbersSettings
}
```

- [ ] **Step 2: Defaults**

```typescript
// src/shared/settings/defaults.ts
export const NUMBERS_DEFAULTS: NumbersSettings = {
  iskraThinkingAloud: true,
  questionCount: 8,
  treeCelebrationsOn: true,
  skipCountStep: 'mixed',
  conceptIntros: true,
}
```

- [ ] **Step 3: settingsStore merge — backward compat**

Add do merge callback w settingsStore (analogicznie do reading.* z modułu 2):
```typescript
numbers: { ...NUMBERS_DEFAULTS, ...(p.numbers ?? {}) },
```

- [ ] **Step 4: SettingsScreen — sekcja Cyferki**

Dodać sekcję analogiczną do "Czytanie" z modułu 2:
- Toggle: Iskra "thinking aloud"
- Slider: liczba pytań (6/8/10)
- Toggle: tree celebrations
- Select: skip count step (2/5/10/mixed)
- Toggle: concept intros (worked examples on/off)

- [ ] **Step 5: Raport rodzica — sekcja Matematyka**

W `ReportScreen` (lub odpowiedniku) dodać:
- Łączna liczba sesji + czas
- Per koncept: stan (unseen/learning/mastered), correctStreak, factsTouched count
- Heatmapa: top 10 problematycznych faktów (najwięcej `recentWrong`)
- Drzewko Mistrzostwa snapshot (reuse `MasteryTree` component)

- [ ] **Step 6: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/settings/ src/shared/stats/
git commit -m "feat(settings,stats): rozszerzenie o moduł 3 (settings + raport rodzica)"
```

---

### Task 25: SessionView — orchestrator widoków ćwiczeń

**Files:**
- Create: `src/modules/numbers/components/SessionView.tsx`
- Create: `src/modules/numbers/components/SessionEnd.tsx`
- Create: `src/modules/numbers/components/PauseOverlay.tsx`

SessionView jest analogiczny do `modules/reading/components/SessionView.tsx`:
- Renderuje status bar (counter ✅/❌/🤷, progress dots, pauza button)
- Wybiera ćwiczenie wg `currentQuestion.exerciseType` (switch case)
- Sprawdza czy intro jest widoczne (jeśli `!hasSeenIntro` — render `<ConceptIntro>`)
- Po complete renderuje feedback overlay z hypercorrection (krótki audio + animacja)
- Po N pytań renderuje `<SessionEnd>` z mastery growth check

- [ ] **Step 1: Implement SessionView (~300 lines, analogiczne do reading)**

Pełna struktura (skeleton):

```typescript
// src/modules/numbers/components/SessionView.tsx
import { useEffect, useMemo } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Settings } from '@/shared/settings/types'
import type { Level } from '@/shared/settings/types'
import { useNumbersSession } from '../hooks/useNumbersSession'
import { useNumbers } from '../store/numbersStore'
import { ConceptIntro } from './intros/ConceptIntro'
import { SessionEnd } from './SessionEnd'
import { PauseOverlay } from './PauseOverlay'
import { SubitizeFlashExercise } from './exercises/SubitizeFlashExercise'
import { MatchDigitDotsExercise } from './exercises/MatchDigitDotsExercise'
import { NumberRhythmExercise } from './exercises/NumberRhythmExercise'
import { ConcreteAddExercise } from './exercises/ConcreteAddExercise'
import { NumberBondBuilder } from './exercises/NumberBondBuilder'
import { TenFrameFill } from './exercises/TenFrameFill'
import { ConcreteAddSubtract } from './exercises/ConcreteAddSubtract'
import { FactFamilyTriangle } from './exercises/FactFamilyTriangle'
import { DoublesExercise } from './exercises/DoublesExercise'
import { NearDoublesExercise } from './exercises/NearDoublesExercise'
import { Make10Exercise } from './exercises/Make10Exercise'
import { EqualGroupsExercise } from './exercises/EqualGroupsExercise'
import { SkipCountChase } from './exercises/SkipCountChase'
import { ArrayMatchExercise } from './exercises/ArrayMatchExercise'
import { SubtractMaintenance } from './exercises/SubtractMaintenance'

type Props = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onTree: () => void
}

export function SessionView({ level, audioBus, settings, onExit, onTree }: Props) {
  const session = useNumbersSession({
    level,
    audioBus,
    questionCount: settings.numbers.questionCount,
  })
  const seenIntros = useNumbers((s) => s.seenIntros)
  const markIntroSeen = useNumbers((s) => s.markIntroSeen)

  useEffect(() => {
    session.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Intro guard
  const showIntro = useMemo(() => {
    if (!settings.numbers.conceptIntros) return false
    if (!session.currentQuestion) return false
    const introKey = `intro-${session.currentQuestion.conceptId}`
    return !seenIntros.includes(introKey)
  }, [session.currentQuestion, seenIntros, settings.numbers.conceptIntros])

  if (session.status === 'ended') {
    return <SessionEnd counters={session.counters} onExit={onExit} onTree={onTree} audioBus={audioBus} />
  }

  if (session.status === 'paused') {
    return <PauseOverlay onResume={session.resume} onExit={onExit} audioBus={audioBus} />
  }

  if (showIntro && session.currentQuestion) {
    return (
      <ConceptIntro
        conceptId={session.currentQuestion.conceptId}
        audioBus={audioBus}
        onContinue={() => markIntroSeen(`intro-${session.currentQuestion!.conceptId}`)}
      />
    )
  }

  if (!session.currentQuestion) return null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <StatusBar
        counters={session.counters}
        currentIdx={session.questionIdx}
        total={session.questionCount}
        onPause={session.pause}
      />
      {renderExercise(session.currentQuestion, audioBus, session.answer)}
      {session.status === 'feedback' && (
        <FeedbackOverlay
          outcome={session.lastOutcome!}
          correctValue={extractCorrectValue(session.currentQuestion)}
          audioBus={audioBus}
          onAdvance={session.advance}
        />
      )}
    </div>
  )
}

function renderExercise(
  question: import('../types').Question,
  audioBus: Pick<AudioBus, 'play' | 'stop'>,
  onAnswer: (outcome: import('../types').AnswerOutcome) => void,
) {
  const props = { audioBus, payload: question.payload as { args: number[] }, onAnswer }
  switch (question.exerciseType) {
    case 'subitize-flash': return <SubitizeFlashExercise {...props} />
    case 'match-digit-dots': return <MatchDigitDotsExercise {...props} />
    case 'number-rhythm': return <NumberRhythmExercise {...props} />
    case 'concrete-add': return <ConcreteAddExercise {...props} />
    case 'number-bond-builder': return <NumberBondBuilder {...props} />
    case 'ten-frame-fill': return <TenFrameFill {...props} />
    case 'concrete-add-subtract': return <ConcreteAddSubtract {...props} />
    case 'fact-family-triangle': return <FactFamilyTriangle {...props} />
    case 'doubles': return <DoublesExercise {...props} />
    case 'near-doubles': return <NearDoublesExercise {...props} />
    case 'make-10': return <Make10Exercise {...props} />
    case 'equal-groups': return <EqualGroupsExercise {...props} />
    case 'skip-count-chase': return <SkipCountChase {...props} />
    case 'array-match': return <ArrayMatchExercise {...props} />
    case 'subtract-maintenance': return <SubtractMaintenance {...props} />
  }
}

function StatusBar({ counters, currentIdx, total, onPause }: { counters: any; currentIdx: number; total: number; onPause: () => void }) {
  // Reuse pattern z modułu 2 — counter ✅/❌/🤷 + progress dots + pauza button
  // ~50 linii, identyczna struktura co reading status bar
  return null  // implementuj wg readingStatusBar
}

function FeedbackOverlay({ outcome, correctValue, audioBus, onAdvance }: any) {
  // Hypercorrection: krótki audio + wizualne (np. animacja correct value)
  // Auto-advance po ~2-3s lub po klik
  return null  // implementuj
}

function extractCorrectValue(question: import('../types').Question): number {
  // Wyciąga oczekiwany wynik z question.payload.args wg conceptId
  // np. dla bonds: args[0] (whole), dla doubles: args[0]*2, dla equalgroups: args[0]*args[1]
  return 0  // implementuj
}
```

- [ ] **Step 2: Implement SessionEnd, PauseOverlay (analogiczne z modułu 2)**

- [ ] **Step 3: Wire SessionView do `/numbers/session/:level` w `index.tsx`**

Replace `NumbersSession` placeholder content z faktycznym `<SessionView>`.

- [ ] **Step 4: Verify tsc**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 5: Smoke test in browser**

Run: `pnpm dev` (background)
Open: `http://localhost:5173/numbers`
Click: Iskierka tile
Expected: Sesja startuje, lektor mówi intro, pierwsze pytanie pojawia się, drag-drop cyfry działa

- [ ] **Step 6: Commit**

```bash
git add src/modules/numbers/components/SessionView.tsx src/modules/numbers/components/SessionEnd.tsx src/modules/numbers/components/PauseOverlay.tsx src/modules/numbers/index.tsx
git commit -m "feat(numbers): SessionView orchestrator (intro guard + 16 exercises + status bar + feedback)"
```

---

## Phase 11 — QA + deploy

### Task 26: Full QA pass + iPad readiness

- [ ] **Step 1: Run full test suite**

Run: `pnpm test --run`
Expected: All tests PASS (528 + new tests = ~540+)

- [ ] **Step 2: Type check + build**

Run: `pnpm tsc -b && pnpm build`
Expected: 0 errors, build artifacts in `dist/`

- [ ] **Step 3: Audio check**

Run: `pnpm audio:check`
Expected: All keys mapped, no missing files. ~327 plików (poprzednie 227 + nowe ~100).

- [ ] **Step 4: Chrome DevTools MCP smoke test**

Manual via chrome-devtools-mcp:
- Open `http://localhost:5173/`
- Verify 3 module tiles visible
- Click Cyferki → /numbers
- Click each level (Iskierka/Płomyk/Ognik/Pochodnia)
- Run through 8 questions in each level
- Check console for errors (expected: 0)
- Verify drag-drop starts (programmatic drag w Chrome DevTools — symuluje pointer events ale `over` może być null; faktyczny test palcem na iPad jest niezbędny)
- Test pauza button + onExit
- Open `/numbers/tree` → MasteryTree renders

- [ ] **Step 5: Deploy preparation**

Run: `git status` — verify clean
Push to main: `git push origin main`
Expected: GH Actions builds (~40s), deploy do GH Pages https://kamilmat.github.io/kid-learn/

- [ ] **Step 6: iPad manual test (after deploy)**

User-test on iPad Safari:
- Open https://kamilmat.github.io/kid-learn/
- Hard reload (Cmd+Shift+R)
- Add to Home Screen → install PWA
- Open from home icon
- Test all 4 levels of Cyferki
- Verify drag-drop works with finger AND Apple Pencil (memory: drag = plain div + touch-action: none)
- Verify audio plays (iOS Safari unlock)
- Verify pause/resume cycle
- Verify ConceptIntro shows on first encounter, not on subsequent
- Verify mastery tree updates after multiple sessions

- [ ] **Step 7: Update STATUS.md**

Add new section "## Aktualny stan (2026-04-XX — moduł 3 cyferki)" describing what was built, test counts, deploy status, known issues.

- [ ] **Step 8: Final commit + push**

```bash
git add docs/STATUS.md
git commit -m "docs(status): moduł 3 matematyka ukończony — 16 ćwiczeń, drzewko mistrzostwa, audio gotowe"
git push origin main
```

---

## Self-Review Checklist (executed by plan author)

### Spec coverage:
- ✅ Sec 5 (mapowanie poziomów) → Phase 1+4 (concepts.ts) + Phase 5-8 (exercises)
- ✅ Sec 6 (typy ćwiczeń per poziom, 16 total) → Phase 5-8 (Tasks 16-21)
- ✅ Sec 7 (3 reprezentacje wizualne) → Phase 2 (Tasks 5-9)
- ✅ Sec 8 (audio strategy) → Phase 3 (Tasks 10-12)
- ✅ Sec 9 (struktura projektu) → File Structure section
- ✅ Sec 10 (routing + Home) → Tasks 3-4
- ✅ Sec 11 (persistence) → Task 2 (numbersStore)
- ✅ Sec 12 (settings extension) → Task 24
- ✅ Sec 13 (raport rodzica) → Task 24
- ✅ Sec 14 (Drzewko Mistrzostwa) → Task 23
- ✅ Sec 15 (engagement reuse) → Task 25 (status bar pattern z modułu 2)
- ✅ Sec 16 (worked example intros) → Task 22 + Task 25 (intro gating)
- ✅ Sec 17 (testing) → Tasks 2, 14, 15 (testy SRS, facts, session)
- ✅ Sec 21 (spójność) — reuse shared/ explicitly w taskach

### Type consistency:
- `MathFactId`, `ConceptId`, `ExerciseType`, `Question`, `AnswerOutcome` — defined Task 1, used consistently w Task 2, 14, 15, 25
- `useNumbersSession` API: `start, answer, advance, pause, resume, status, currentQuestion, counters, lastOutcome` — defined Task 15, consumed Task 25
- `Fact.id` matches store `factId` — testowane Task 14

### Placeholder scan:
- Task 17 ("implement all three") + Task 19, 20, 21 (similar pattern) — **świadome** kompromis, struktury prawie identyczne; każdy ma exact files + commit messages, ale full code podany tylko dla pierwszej (Task 16) — to akceptowalne dla agenta który musi iterować przez pattern.
- Task 25 (SessionView) ma fragments oznaczone "implementuj wg ..." — wymaga dopełnienia detali w trakcie implementacji.

**Status:** Plan complete, gotowy do implementacji.
