# Iskierki — moduł czytania (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować w pełni funkcjonalny moduł 2 platformy Iskierki — naukę czytania sylab i słów, zgodny ze specyfikacją `docs/superpowers/specs/2026-04-27-iskierki-reading-module-design.md`.

**Architecture:** Modułowa architektura — nowy katalog `src/modules/reading/` paralelny do `src/modules/letters/`. Reuse `shared/` (SRS, AudioBus, Settings, Stats, Engagement, UI) z minimalną generalizacją. `@dnd-kit/core` dla drag-and-drop. Lexend dla kafelków sylab/słów. Persistence w `iskierki-reading-v1`.

**Tech Stack:** React 19 + Vite + TS strict + Tailwind 4 + Zustand + Vitest + `@dnd-kit/core` + `@dnd-kit/sortable` + Edge TTS (Zofia + Marek) + Lexend (Google Fonts OFL).

---

## Mapa plików

### Nowe pliki

```
src/modules/reading/
├── index.tsx                                    # routes (/reading, /reading/session/:level, /reading/album)
├── types.ts                                     # ReadingLevel, ExerciseType, Question, etc.
├── store/
│   ├── readingStore.ts                          # Zustand + persist (iskierki-reading-v1)
│   └── readingStore.test.ts
├── data/
│   ├── syllables.ts                             # 23 sylab (Iskierka)
│   ├── syllables.test.ts
│   ├── words.ts                                 # 67 słów z albumEmoji + scenes refs
│   ├── words.test.ts
│   ├── levelPools.ts                            # mapowanie poziom → sylaby/słowa
│   ├── levelPools.test.ts
│   ├── scenes.ts                                # mini-scenki (50+ na premierę)
│   ├── scenes.test.ts
│   ├── easterEggs.ts                            # 8 easter eggs Iskry
│   └── wildCelebrations.ts                      # 5 wild celebrations
├── hooks/
│   ├── useReadingSession.ts                     # orkiestrator sesji
│   ├── useReadingSession.test.ts
│   ├── useDragSyllable.ts                       # @dnd-kit wrapper z magnetism
│   ├── useDragSyllable.test.ts
│   └── useIskraReactions.ts                     # losowanie reakcji + easter eggs
├── components/
│   ├── ReadingLevelSelect.tsx
│   ├── ReadingLevelSelect.test.tsx
│   ├── SessionView.tsx                          # shell, deleguje do exercise per level
│   ├── SessionView.test.tsx
│   ├── SessionEnd.tsx
│   ├── PauseOverlay.tsx
│   ├── FeedbackOverlay.tsx
│   ├── SyllableTile.tsx
│   ├── WordTile.tsx
│   ├── DropSlot.tsx
│   ├── WordScene.tsx                            # render mini-scenki
│   ├── WordScene.test.tsx
│   ├── IskraMascotAnimated.tsx
│   ├── WordAlbum.tsx
│   ├── WordAlbum.test.tsx
│   ├── WildCelebration.tsx
│   ├── celebrations/
│   │   ├── RocketBlast.tsx
│   │   ├── FallingFruits.tsx
│   │   ├── ScreenFlip.tsx
│   │   ├── DancingAvocado.tsx
│   │   └── RainbowRun.tsx
│   └── exercises/
│       ├── SyllableMatchExercise.tsx            # Iskierka
│       ├── SyllableMatchExercise.test.tsx
│       ├── WordAssemblyExercise.tsx             # Płomyk
│       ├── WordAssemblyExercise.test.tsx
│       ├── WordChoiceExercise.tsx               # Ognik
│       ├── WordChoiceExercise.test.tsx
│       └── SyllableFillExercise.tsx             # Pochodnia
│       └── SyllableFillExercise.test.tsx

audio-source/
├── syllables.json                               # 23 sylab (lektor Zofia)
├── reading-ui-strings.json                      # UI cues modułu 2 (lektor Zofia)
├── iskra-reactions.json                         # reakcje Iskry (TTS Marek)
└── manual-overrides/                            # bez zmian

public/audio/sfx/                                # NOWY katalog na SFX biblioteka CC0
├── tap.mp3
├── ding.mp3
├── blip.mp3
├── pickup.mp3
├── drop.mp3
├── fanfara-1.mp3
├── fanfara-2.mp3
├── fanfara-special.mp3
├── confetti.mp3
├── whoosh.mp3
├── pop.mp3
├── meow.mp3
├── purr.mp3
├── bark.mp3
├── moo.mp3
├── oink.mp3
├── meow-angry.mp3
├── yawn.mp3
├── snore.mp3
└── heart-beat.mp3
```

### Modyfikowane pliki

```
src/shared/srs/
├── types.ts                                     # add BaseItemState
├── select.ts                                    # generic <T extends BaseItemState>
├── update.ts                                    # generic
├── distractors.ts                               # generic
└── scoring.ts                                   # generic

src/shared/settings/
├── types.ts                                     # extend Settings z humorMode + reading.*
└── settingsStore.ts                             # migration v4→v5

src/shared/stats/
├── types.ts                                     # extend SessionLog
└── components/ReportScreen.tsx                  # add Reading section

src/shared/ui/
└── IskraMascot.tsx                              # extend o animacje (lub wrapper)

src/app/
├── App.tsx                                      # add /reading route + KidNav logic
└── Home.tsx                                     # 2 kafelki zamiast 1

scripts/
└── generate-audio.ts                            # support multiple voices per file

audio-source/
└── words.json                                   # extend o 67 nowych słów

CLAUDE.md                                        # update z modułem 2
docs/STATUS.md                                   # update po implementacji
```

---

## Strategia testowania

- **TDD dla logiki nietrywialnej**: SRS generic refactor, useReadingSession, useDragSyllable, scenes lookup, levelPools selection, wild celebration counter logic
- **Component tests**: ReadingLevelSelect, SessionView, exercises, WordAlbum, WordScene
- **Integration test**: SessionView z mockowanym AudioBus, kompletna sesja Iskierka i Płomyk
- **Skip jednostkowych testów** dla: prostych komponentów wizualnych (SyllableTile, WordTile bez logiki), data files (sprawdzane przez schema validation)
- **Acceptance**: `pnpm tsc -b` ✓, `pnpm test --run` ✓ (poprzednie 389/389 + ~80 nowych), `pnpm build` ✓, `pnpm audio:check` ✓ (wszystkie nowe klucze)
- **iPad manual testing checklist** w fazie 13

---

## Phase 0 — Setup

### Task 0.1: Install @dnd-kit dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1:** Install `@dnd-kit/core` and `@dnd-kit/sortable`

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable
```

- [ ] **Step 2:** Verify install

```bash
pnpm list @dnd-kit/core @dnd-kit/sortable
```

Expected: both packages listed with versions.

- [ ] **Step 3:** Verify build still works

```bash
pnpm tsc -b
```

Expected: no errors.

- [ ] **Step 4:** Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add @dnd-kit/core and @dnd-kit/sortable for reading module"
```

### Task 0.2: Add Lexend font

**Files:** `index.html`, `src/index.css`

- [ ] **Step 1:** Add Lexend Google Fonts link in `index.html`

In `index.html`, in `<head>` section, after existing Kalam link, add:

```html
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@500;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2:** Add CSS variable in `src/index.css`

After existing `--font-handwritten` variable, add:

```css
:root {
  --font-handwritten: 'Kalam', cursive;
  --font-block: 'Lexend', system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 3:** Verify in dev server (briefly)

```bash
pnpm dev
```

Open browser, inspect any element, verify Lexend loads in Network tab. Stop server.

- [ ] **Step 4:** Commit

```bash
git add index.html src/index.css
git commit -m "chore(fonts): add Lexend (early-reader designed) for module 2 tiles"
```

---

## Phase 1 — Foundations: Generic SRS

Refaktor `shared/srs/` aby algorytm działał na dowolnym typie z minimalnymi polami SRS, nie tylko `LetterState`.

### Task 1.1: Add BaseItemState type

**Files:** `src/shared/srs/types.ts`

- [ ] **Step 1:** Add `BaseItemState` type bez modyfikacji istniejącego `LetterState`

Edit `src/shared/srs/types.ts`, na początku po `Outcome`:

```typescript
// Bazowy typ dla każdego elementu z SRS — używany przez select/update/scoring/distractors.
// Konkretne typy (LetterState, SyllableState, WordState) rozszerzają go o pola specyficzne.
export type BaseItemState = {
  id: string                  // unikalny identyfikator (np. "letter-A", "syl-MA", "word-MAMA")
  box: Box
  lastSeen: number
  recentWrong: number
}
```

- [ ] **Step 2:** Run tsc to ensure no errors

```bash
pnpm tsc -b
```

- [ ] **Step 3:** Commit

```bash
git add src/shared/srs/types.ts
git commit -m "feat(srs): add BaseItemState type for cross-module SRS reuse"
```

### Task 1.2: Add `id` field to LetterState (backward-compatible)

**Files:** `src/shared/srs/types.ts`, `src/modules/letters/data/alphabet.ts`, `src/modules/letters/store/lettersStore.ts`

- [ ] **Step 1:** Read existing `LetterState` and `createInitialLetterState`

```bash
grep -n "letter:" src/shared/srs/types.ts
cat src/shared/srs/createInitialLetterState.ts
```

- [ ] **Step 2:** Edit `src/shared/srs/types.ts` — add `id` to `LetterState`

```typescript
export type LetterState = {
  id: string                  // 'letter-X' gdzie X to UPPERCASE litera
  letter: string              // legacy - zostaje dla raportów
  box: Box
  lastSeen: number
  totalSeen: number
  totalCorrect: number
  totalWrong: number
  totalDontKnow: number
  totalTimeout: number
  recentWrong: number
  avgResponseMs: number
  masteredAt: number | null
  confusedWith: Record<string, number>
  perStyle: { print: { correct: number; wrong: number }, handwritten: { correct: number; wrong: number } }
  perCase: { upper: { correct: number; wrong: number }, lower: { correct: number; wrong: number } }
}
```

- [ ] **Step 3:** Edit `src/shared/srs/createInitialLetterState.ts` — populate `id` field

```typescript
export function createInitialLetterState(letter: string): LetterState {
  return {
    id: `letter-${letter.toUpperCase()}`,
    letter,
    // ... reszta bez zmian
  }
}
```

- [ ] **Step 4:** Add migration in `lettersStore.ts` — `merge` callback dla starych localStorage bez `id`

Edit persist `merge` w `src/modules/letters/store/lettersStore.ts`:

```typescript
merge: (persisted, current) => {
  const merged = { ...current, ...(persisted as object) } as LettersState
  // Migrate: dodaj id do liter zapisanych przed v2
  if (merged.letters) {
    for (const [letter, state] of Object.entries(merged.letters)) {
      if (state && !state.id) {
        state.id = `letter-${letter.toUpperCase()}`
      }
    }
  }
  return merged
},
```

- [ ] **Step 5:** Run tests

```bash
pnpm test --run
```

Expected: all 389 tests pass.

- [ ] **Step 6:** Commit

```bash
git add src/shared/srs/types.ts src/shared/srs/createInitialLetterState.ts src/modules/letters/store/lettersStore.ts
git commit -m "feat(srs): add id field to LetterState (backward-compatible migration)"
```

### Task 1.3: Generalize SRS functions to `BaseItemState`

**Files:** `src/shared/srs/select.ts`, `src/shared/srs/update.ts`, `src/shared/srs/scoring.ts`, `src/shared/srs/distractors.ts`

- [ ] **Step 1:** Read current `select.ts` to understand signatures

```bash
cat src/shared/srs/select.ts
```

- [ ] **Step 2:** Refactor `select.ts` to be generic

Zmień signaturę `pickNextLetter` na generic:

```typescript
import type { BaseItemState } from './types'

// ZMIANA: pickNextLetter → pickNextItem, generic na <T extends BaseItemState>
// Zachowaj alias `pickNextLetter` dla kompatybilności wstecznej
export function pickNextItem<T extends BaseItemState>(
  states: Record<string, T>,
  candidateIds: string[],
  now: number,
  recentlyShownIds?: string[],
): T | null {
  // ... implementacja bez zmian, ale używaj BaseItemState fields
}

// Backward-compat alias
export const pickNextLetter = pickNextItem
```

- [ ] **Step 3:** Refactor `update.ts` — generic outcome update

```typescript
export function applyOutcome<T extends BaseItemState>(
  state: T,
  outcome: Outcome,
  now: number,
): T {
  // ... istniejąca logika dla box/lastSeen/recentWrong
  // Pola specyficzne (totalSeen etc) są updateowane w wrapper'ze modułu
}
```

- [ ] **Step 4:** Update `scoring.ts` to use `BaseItemState`

```typescript
export function scoreItem<T extends BaseItemState>(state: T, now: number): number {
  // ... boxWeight × recency × recentWrongBoost
}
```

- [ ] **Step 5:** Run tests

```bash
pnpm test --run src/shared/srs/
```

Expected: all SRS tests pass.

- [ ] **Step 6:** Run full suite

```bash
pnpm test --run
```

Expected: 389/389.

- [ ] **Step 7:** Commit

```bash
git add src/shared/srs/
git commit -m "refactor(srs): generalize select/update/scoring/distractors to BaseItemState"
```

### Task 1.4: Verify module 1 still works end-to-end

- [ ] **Step 1:** Run dev server, manually verify Iskierka session

```bash
pnpm dev
```

Browser: open `http://localhost:5173/`, click Litery, do a few questions, verify SRS works.

- [ ] **Step 2:** Stop dev server

```bash
# Ctrl+C
```

- [ ] **Step 3:** Run typecheck

```bash
pnpm tsc -b
```

Expected: no errors.

- [ ] **Step 4:** No commit needed (verification only)

---

## Phase 2 — Reading module skeleton + routing

### Task 2.1: Create reading module types

**Files:** `src/modules/reading/types.ts`

- [ ] **Step 1:** Create file

```typescript
import type { BaseItemState, Outcome } from '@/shared/srs/types'
import type { Level } from '@/shared/settings/types'

export type ExerciseType = 'syllable-match' | 'word-assembly' | 'word-choice' | 'syllable-fill'

export const LEVEL_TO_EXERCISE: Record<Level, ExerciseType> = {
  iskierka: 'syllable-match',
  plomyk: 'word-assembly',
  ognik: 'word-choice',
  pochodnia: 'syllable-fill',
}

export type SyllableState = BaseItemState & {
  syllable: string                  // np. "MA"
  totalSeen: number
  totalCorrect: number
  totalWrong: number
}

export type WordState = BaseItemState & {
  word: string                      // np. "MAMA"
  totalSeen: number
  totalCorrect: number
  totalWrong: number
  level: Level                      // poziom na którym to słowo żyje
  album: boolean                    // czy w albumie (box >= 5 raz osiągnięty)
}

export type SyllableFillVariant = 'first' | 'middle' | 'last'

export type ReadingQuestion =
  | { type: 'syllable-match'; targetSyllable: string; choices: string[] }
  | { type: 'word-assembly'; targetWord: string; syllables: string[]; distractors: string[] }
  | { type: 'word-choice'; targetWord: string; choices: string[] }
  | { type: 'syllable-fill'; targetWord: string; missingPosition: SyllableFillVariant; missingSyllable: string; choices: string[]; visibleSyllables: string[] }

export type ReadingSessionEvent = {
  questionIndex: number
  exerciseType: ExerciseType
  targetId: string                  // 'syl-MA' lub 'word-MAMA'
  outcome: Outcome
  responseMs: number
  timestamp: number
}
```

- [ ] **Step 2:** Verify tsc

```bash
pnpm tsc -b
```

Expected: no errors.

- [ ] **Step 3:** Commit

```bash
git add src/modules/reading/types.ts
git commit -m "feat(reading): add module types"
```

### Task 2.2: Create syllables data

**Files:** `src/modules/reading/data/syllables.ts`, `src/modules/reading/data/syllables.test.ts`

- [ ] **Step 1:** Write test first

```typescript
// syllables.test.ts
import { describe, expect, it } from 'vitest'
import { ALL_SYLLABLES, getSyllableAudioKey } from './syllables'

describe('syllables data', () => {
  it('has 23 syllables', () => {
    expect(ALL_SYLLABLES).toHaveLength(23)
  })

  it('contains all expected core syllables', () => {
    const expected = ['MA', 'TA', 'LA', 'KO', 'MO', 'TO', 'LO', 'RA', 'RO', 'RU', 'BA', 'DA', 'DO', 'KU', 'NA', 'NO', 'SA', 'NU', 'PA', 'WA', 'DU', 'KA', 'TY']
    for (const syl of expected) {
      expect(ALL_SYLLABLES.map(s => s.text)).toContain(syl)
    }
  })

  it('audio key uses syl- prefix', () => {
    expect(getSyllableAudioKey('MA')).toBe('syl-MA')
  })

  it('all syllables have unique ids', () => {
    const ids = ALL_SYLLABLES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2:** Run test (fails)

```bash
pnpm test --run src/modules/reading/data/syllables.test.ts
```

Expected: FAIL — file not found.

- [ ] **Step 3:** Implement `syllables.ts`

```typescript
export type Syllable = {
  id: string                  // 'syl-MA'
  text: string                // 'MA'
}

const SYLLABLE_TEXTS = [
  'MA', 'TA', 'LA', 'KO', 'MO', 'TO', 'LO', 'RA', 'RO', 'RU',
  'BA', 'DA', 'DO', 'KU', 'NA', 'NO', 'SA', 'NU', 'PA', 'WA',
  'DU', 'KA', 'TY',
] as const

export const ALL_SYLLABLES: readonly Syllable[] = SYLLABLE_TEXTS.map((text) => ({
  id: `syl-${text}`,
  text,
}))

export function getSyllableAudioKey(syllable: string): string {
  return `syl-${syllable}`
}

export function getSyllableById(id: string): Syllable | undefined {
  return ALL_SYLLABLES.find(s => s.id === id)
}
```

- [ ] **Step 4:** Run test (passes)

```bash
pnpm test --run src/modules/reading/data/syllables.test.ts
```

Expected: PASS.

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/data/syllables.ts src/modules/reading/data/syllables.test.ts
git commit -m "feat(reading): add 23 syllables data (Iskierka pool)"
```

### Task 2.3: Create words data with levels and albumEmoji

**Files:** `src/modules/reading/data/words.ts`, `src/modules/reading/data/words.test.ts`

- [ ] **Step 1:** Write test

```typescript
// words.test.ts
import { describe, expect, it } from 'vitest'
import { ALL_WORDS, getWordsByLevel, getWordById } from './words'

describe('words data', () => {
  it('has 67 words total', () => {
    expect(ALL_WORDS).toHaveLength(67)
  })

  it('Płomyk has 20 words', () => {
    expect(getWordsByLevel('plomyk')).toHaveLength(20)
  })

  it('Ognik has 25 words', () => {
    expect(getWordsByLevel('ognik')).toHaveLength(25)
  })

  it('Pochodnia has 22 words', () => {
    expect(getWordsByLevel('pochodnia')).toHaveLength(22)
  })

  it('every word has albumEmoji defined', () => {
    for (const w of ALL_WORDS) {
      expect(w.albumEmoji).toBeTruthy()
    }
  })

  it('every word has unique id', () => {
    const ids = ALL_WORDS.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Płomyk words decompose to 2 syllables from Iskierka pool', () => {
    const plomyk = getWordsByLevel('plomyk')
    for (const w of plomyk) {
      expect(w.syllables).toHaveLength(2)
    }
  })

  it('getWordById returns the word', () => {
    expect(getWordById('word-MAMA')?.text).toBe('MAMA')
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement `words.ts`

```typescript
import type { Level } from '@/shared/settings/types'

export type WordData = {
  id: string                  // 'word-MAMA'
  text: string                // 'MAMA'
  level: Level
  syllables: string[]         // dla Płomyk: ['MA', 'MA']; dla innych: best-effort decomposition
  albumEmoji: string          // fallback emoji w albumie
}

export const ALL_WORDS: readonly WordData[] = [
  // ===== PŁOMYK (20 słów, 2-sylabowe) =====
  { id: 'word-MAMA', text: 'MAMA', level: 'plomyk', syllables: ['MA', 'MA'], albumEmoji: '👩‍👧' },
  { id: 'word-TATA', text: 'TATA', level: 'plomyk', syllables: ['TA', 'TA'], albumEmoji: '👨‍👧' },
  { id: 'word-LALA', text: 'LALA', level: 'plomyk', syllables: ['LA', 'LA'], albumEmoji: '🧸' },
  { id: 'word-KURA', text: 'KURA', level: 'plomyk', syllables: ['KU', 'RA'], albumEmoji: '🐔' },
  { id: 'word-NORA', text: 'NORA', level: 'plomyk', syllables: ['NO', 'RA'], albumEmoji: '🕳️' },
  { id: 'word-ROSA', text: 'ROSA', level: 'plomyk', syllables: ['RO', 'SA'], albumEmoji: '💧' },
  { id: 'word-LATO', text: 'LATO', level: 'plomyk', syllables: ['LA', 'TO'], albumEmoji: '☀️' },
  { id: 'word-BABA', text: 'BABA', level: 'plomyk', syllables: ['BA', 'BA'], albumEmoji: '👵' },
  { id: 'word-MAPA', text: 'MAPA', level: 'plomyk', syllables: ['MA', 'PA'], albumEmoji: '🗺️' },
  { id: 'word-TAMA', text: 'TAMA', level: 'plomyk', syllables: ['TA', 'MA'], albumEmoji: '🦫' },
  { id: 'word-NUTA', text: 'NUTA', level: 'plomyk', syllables: ['NU', 'TA'], albumEmoji: '🎵' },
  { id: 'word-RAMA', text: 'RAMA', level: 'plomyk', syllables: ['RA', 'MA'], albumEmoji: '🖼️' },
  { id: 'word-KORA', text: 'KORA', level: 'plomyk', syllables: ['KO', 'RA'], albumEmoji: '🌳' },
  { id: 'word-KOSA', text: 'KOSA', level: 'plomyk', syllables: ['KO', 'SA'], albumEmoji: '👱‍♀️' },
  { id: 'word-SOWA', text: 'SOWA', level: 'plomyk', syllables: ['SO', 'WA'], albumEmoji: '🦉' },
  { id: 'word-KOTY', text: 'KOTY', level: 'plomyk', syllables: ['KO', 'TY'], albumEmoji: '🐱' },
  { id: 'word-LAMA', text: 'LAMA', level: 'plomyk', syllables: ['LA', 'MA'], albumEmoji: '🦙' },
  { id: 'word-KAWA', text: 'KAWA', level: 'plomyk', syllables: ['KA', 'WA'], albumEmoji: '☕' },
  { id: 'word-KASA', text: 'KASA', level: 'plomyk', syllables: ['KA', 'SA'], albumEmoji: '💰' },
  { id: 'word-DUDA', text: 'DUDA', level: 'plomyk', syllables: ['DU', 'DA'], albumEmoji: '🎶' },

  // ===== OGNIK (25 słów) =====
  { id: 'word-SZAFA', text: 'SZAFA', level: 'ognik', syllables: ['SZA', 'FA'], albumEmoji: '🚪' },
  { id: 'word-CZAPKA', text: 'CZAPKA', level: 'ognik', syllables: ['CZAP', 'KA'], albumEmoji: '🧢' },
  { id: 'word-MASZYNA', text: 'MASZYNA', level: 'ognik', syllables: ['MA', 'SZY', 'NA'], albumEmoji: '⚙️' },
  { id: 'word-MUSZKA', text: 'MUSZKA', level: 'ognik', syllables: ['MUSZ', 'KA'], albumEmoji: '🎀' },
  { id: 'word-RZEKA', text: 'RZEKA', level: 'ognik', syllables: ['RZE', 'KA'], albumEmoji: '🏞️' },
  { id: 'word-ŻABA', text: 'ŻABA', level: 'ognik', syllables: ['ŻA', 'BA'], albumEmoji: '🐸' },
  { id: 'word-CHŁOPIEC', text: 'CHŁOPIEC', level: 'ognik', syllables: ['CHŁO', 'PIEC'], albumEmoji: '👦' },
  { id: 'word-PARASOL', text: 'PARASOL', level: 'ognik', syllables: ['PA', 'RA', 'SOL'], albumEmoji: '☂️' },
  { id: 'word-BANAN', text: 'BANAN', level: 'ognik', syllables: ['BA', 'NAN'], albumEmoji: '🍌' },
  { id: 'word-KOSZULA', text: 'KOSZULA', level: 'ognik', syllables: ['KO', 'SZU', 'LA'], albumEmoji: '👕' },
  { id: 'word-SAMOCHÓD', text: 'SAMOCHÓD', level: 'ognik', syllables: ['SA', 'MO', 'CHÓD'], albumEmoji: '🚗' },
  { id: 'word-KOMPUTER', text: 'KOMPUTER', level: 'ognik', syllables: ['KOM', 'PU', 'TER'], albumEmoji: '💻' },
  { id: 'word-TELEFON', text: 'TELEFON', level: 'ognik', syllables: ['TE', 'LE', 'FON'], albumEmoji: '📱' },
  { id: 'word-ZABAWKA', text: 'ZABAWKA', level: 'ognik', syllables: ['ZA', 'BAW', 'KA'], albumEmoji: '🪀' },
  { id: 'word-LAMPA', text: 'LAMPA', level: 'ognik', syllables: ['LAM', 'PA'], albumEmoji: '💡' },
  { id: 'word-ROWER', text: 'ROWER', level: 'ognik', syllables: ['RO', 'WER'], albumEmoji: '🚲' },
  { id: 'word-AUTO', text: 'AUTO', level: 'ognik', syllables: ['AU', 'TO'], albumEmoji: '🚙' },
  { id: 'word-RYBKA', text: 'RYBKA', level: 'ognik', syllables: ['RYB', 'KA'], albumEmoji: '🐠' },
  { id: 'word-KOTEK', text: 'KOTEK', level: 'ognik', syllables: ['KO', 'TEK'], albumEmoji: '🐈' },
  { id: 'word-BUTELKA', text: 'BUTELKA', level: 'ognik', syllables: ['BU', 'TEL', 'KA'], albumEmoji: '🍼' },
  { id: 'word-SZALIK', text: 'SZALIK', level: 'ognik', syllables: ['SZA', 'LIK'], albumEmoji: '🧣' },
  { id: 'word-LIZAK', text: 'LIZAK', level: 'ognik', syllables: ['LI', 'ZAK'], albumEmoji: '🍭' },
  { id: 'word-MIŚ', text: 'MIŚ', level: 'ognik', syllables: ['MIŚ'], albumEmoji: '🧸' },
  { id: 'word-GĘŚ', text: 'GĘŚ', level: 'ognik', syllables: ['GĘŚ'], albumEmoji: '🦢' },
  { id: 'word-KOŃ', text: 'KOŃ', level: 'ognik', syllables: ['KOŃ'], albumEmoji: '🐴' },

  // ===== POCHODNIA (22 słowa) =====
  { id: 'word-KAPELUSZ', text: 'KAPELUSZ', level: 'pochodnia', syllables: ['KA', 'PE', 'LUSZ'], albumEmoji: '🎩' },
  { id: 'word-ZIELONY', text: 'ZIELONY', level: 'pochodnia', syllables: ['ZIE', 'LO', 'NY'], albumEmoji: '🟢' },
  { id: 'word-ŚLIWKA', text: 'ŚLIWKA', level: 'pochodnia', syllables: ['ŚLIW', 'KA'], albumEmoji: '🫐' },
  { id: 'word-SIANO', text: 'SIANO', level: 'pochodnia', syllables: ['SIA', 'NO'], albumEmoji: '🌾' },
  { id: 'word-CIASTKO', text: 'CIASTKO', level: 'pochodnia', syllables: ['CIAST', 'KO'], albumEmoji: '🍪' },
  { id: 'word-PIENIĄDZ', text: 'PIENIĄDZ', level: 'pochodnia', syllables: ['PIE', 'NIĄDZ'], albumEmoji: '💵' },
  { id: 'word-DZIECKO', text: 'DZIECKO', level: 'pochodnia', syllables: ['DZIEC', 'KO'], albumEmoji: '👶' },
  { id: 'word-LOKOMOTYWA', text: 'LOKOMOTYWA', level: 'pochodnia', syllables: ['LO', 'KO', 'MO', 'TY', 'WA'], albumEmoji: '🚂' },
  { id: 'word-POMIDOR', text: 'POMIDOR', level: 'pochodnia', syllables: ['PO', 'MI', 'DOR'], albumEmoji: '🍅' },
  { id: 'word-OGÓREK', text: 'OGÓREK', level: 'pochodnia', syllables: ['O', 'GÓ', 'REK'], albumEmoji: '🥒' },
  { id: 'word-MARCHEW', text: 'MARCHEW', level: 'pochodnia', syllables: ['MAR', 'CHEW'], albumEmoji: '🥕' },
  { id: 'word-ZIEMNIAK', text: 'ZIEMNIAK', level: 'pochodnia', syllables: ['ZIEM', 'NIAK'], albumEmoji: '🥔' },
  { id: 'word-CEBULA', text: 'CEBULA', level: 'pochodnia', syllables: ['CE', 'BU', 'LA'], albumEmoji: '🧅' },
  { id: 'word-SAŁATA', text: 'SAŁATA', level: 'pochodnia', syllables: ['SA', 'ŁA', 'TA'], albumEmoji: '🥬' },
  { id: 'word-KAPUSTA', text: 'KAPUSTA', level: 'pochodnia', syllables: ['KA', 'PU', 'STA'], albumEmoji: '🥬' },
  { id: 'word-ARBUZ', text: 'ARBUZ', level: 'pochodnia', syllables: ['AR', 'BUZ'], albumEmoji: '🍉' },
  { id: 'word-MELON', text: 'MELON', level: 'pochodnia', syllables: ['ME', 'LON'], albumEmoji: '🍈' },
  { id: 'word-BANANY', text: 'BANANY', level: 'pochodnia', syllables: ['BA', 'NA', 'NY'], albumEmoji: '🍌' },
  { id: 'word-KSIĘŻYC', text: 'KSIĘŻYC', level: 'pochodnia', syllables: ['KSIĘ', 'ŻYC'], albumEmoji: '🌙' },
  { id: 'word-NIEDŹWIEDŹ', text: 'NIEDŹWIEDŹ', level: 'pochodnia', syllables: ['NIE', 'DŹWIEDŹ'], albumEmoji: '🐻' },
  { id: 'word-CZWARTEK', text: 'CZWARTEK', level: 'pochodnia', syllables: ['CZWAR', 'TEK'], albumEmoji: '📅' },
  { id: 'word-CZEKOLADA', text: 'CZEKOLADA', level: 'pochodnia', syllables: ['CZE', 'KO', 'LA', 'DA'], albumEmoji: '🍫' },
] as const

export function getWordsByLevel(level: Level): readonly WordData[] {
  return ALL_WORDS.filter(w => w.level === level)
}

export function getWordById(id: string): WordData | undefined {
  return ALL_WORDS.find(w => w.id === id)
}

export function getWordAudioKey(word: string): string {
  return `word-${word}`
}
```

- [ ] **Step 4:** Run test

```bash
pnpm test --run src/modules/reading/data/words.test.ts
```

Expected: PASS.

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/data/words.ts src/modules/reading/data/words.test.ts
git commit -m "feat(reading): add 67 words data with album emojis"
```

### Task 2.4: Create level pools

**Files:** `src/modules/reading/data/levelPools.ts`, `src/modules/reading/data/levelPools.test.ts`

- [ ] **Step 1:** Write test

```typescript
// levelPools.test.ts
import { describe, expect, it } from 'vitest'
import { getReadingPool } from './levelPools'

describe('reading level pools', () => {
  it('Iskierka returns 23 syllable ids', () => {
    const pool = getReadingPool('iskierka')
    expect(pool.itemIds).toHaveLength(23)
    expect(pool.itemIds.every(id => id.startsWith('syl-'))).toBe(true)
  })

  it('Płomyk returns 20 word ids', () => {
    const pool = getReadingPool('plomyk')
    expect(pool.itemIds).toHaveLength(20)
    expect(pool.itemIds.every(id => id.startsWith('word-'))).toBe(true)
  })

  it('Ognik returns 25 word ids', () => {
    expect(getReadingPool('ognik').itemIds).toHaveLength(25)
  })

  it('Pochodnia returns 22 word ids', () => {
    expect(getReadingPool('pochodnia').itemIds).toHaveLength(22)
  })

  it('exerciseType matches level', () => {
    expect(getReadingPool('iskierka').exerciseType).toBe('syllable-match')
    expect(getReadingPool('plomyk').exerciseType).toBe('word-assembly')
    expect(getReadingPool('ognik').exerciseType).toBe('word-choice')
    expect(getReadingPool('pochodnia').exerciseType).toBe('syllable-fill')
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement

```typescript
// levelPools.ts
import type { Level } from '@/shared/settings/types'
import { LEVEL_TO_EXERCISE, type ExerciseType } from '../types'
import { ALL_SYLLABLES } from './syllables'
import { getWordsByLevel } from './words'

export type ReadingPool = {
  level: Level
  exerciseType: ExerciseType
  itemIds: string[]
}

export function getReadingPool(level: Level): ReadingPool {
  const exerciseType = LEVEL_TO_EXERCISE[level]
  const itemIds = level === 'iskierka'
    ? ALL_SYLLABLES.map(s => s.id)
    : getWordsByLevel(level).map(w => w.id)
  return { level, exerciseType, itemIds }
}
```

- [ ] **Step 4:** Run test

```bash
pnpm test --run src/modules/reading/data/levelPools.test.ts
```

Expected: PASS.

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/data/levelPools.ts src/modules/reading/data/levelPools.test.ts
git commit -m "feat(reading): add level pools (Iskierka→syllables, others→words)"
```

### Task 2.5: Reading store skeleton

**Files:** `src/modules/reading/store/readingStore.ts`, `src/modules/reading/store/readingStore.test.ts`

- [ ] **Step 1:** Write test

```typescript
// readingStore.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { useReading } from './readingStore'

describe('readingStore', () => {
  beforeEach(() => {
    useReading.getState().reset()
    localStorage.clear()
  })

  it('initial state has empty syllables and words', () => {
    const state = useReading.getState()
    expect(state.syllables).toEqual({})
    expect(state.words).toEqual({})
    expect(state.albumUnlocked).toEqual([])
    expect(state.wildCelebrationCounter).toBe(0)
  })

  it('lazy-init creates SyllableState on first access', () => {
    const state = useReading.getState()
    state.ensureSyllableInitialized('MA')
    expect(useReading.getState().syllables['syl-MA']).toBeDefined()
    expect(useReading.getState().syllables['syl-MA'].box).toBe(1)
  })

  it('lazy-init creates WordState on first access', () => {
    const state = useReading.getState()
    state.ensureWordInitialized('word-MAMA')
    expect(useReading.getState().words['word-MAMA']).toBeDefined()
  })

  it('addToAlbum unlocks word', () => {
    const state = useReading.getState()
    state.addToAlbum('word-MAMA')
    expect(useReading.getState().albumUnlocked).toContain('word-MAMA')
  })

  it('addToAlbum is idempotent', () => {
    const state = useReading.getState()
    state.addToAlbum('word-MAMA')
    state.addToAlbum('word-MAMA')
    expect(useReading.getState().albumUnlocked.filter(id => id === 'word-MAMA')).toHaveLength(1)
  })

  it('incrementWildCounter advances counter', () => {
    const state = useReading.getState()
    state.incrementWildCounter()
    state.incrementWildCounter()
    expect(useReading.getState().wildCelebrationCounter).toBe(2)
  })

  it('resetWildCounter sets to 0', () => {
    const state = useReading.getState()
    state.incrementWildCounter()
    state.resetWildCounter()
    expect(useReading.getState().wildCelebrationCounter).toBe(0)
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement readingStore

```typescript
// readingStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyllableState, WordState, ReadingSessionEvent } from '../types'
import type { Level } from '@/shared/settings/types'
import { getSyllableAudioKey } from '../data/syllables'
import { getWordById } from '../data/words'

type SessionLog = {
  startedAt: number
  endedAt: number
  level: Level
  events: ReadingSessionEvent[]
}

export type ReadingState = {
  syllables: Record<string, SyllableState>
  words: Record<string, WordState>
  sessions: SessionLog[]
  albumUnlocked: string[]
  seenIntros: string[]
  lastUsedLevel: Level | null
  wildCelebrationCounter: number

  ensureSyllableInitialized: (syllable: string) => void
  ensureWordInitialized: (wordId: string) => void
  applySessionResults: (
    updatedSyllables: Record<string, SyllableState>,
    updatedWords: Record<string, WordState>,
    log: SessionLog,
  ) => void
  addToAlbum: (wordId: string) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  setLastUsedLevel: (level: Level) => void
  incrementWildCounter: () => void
  resetWildCounter: () => void
  resetAllProgress: () => void
  reset: () => void
}

const initialState = {
  syllables: {},
  words: {},
  sessions: [],
  albumUnlocked: [],
  seenIntros: [],
  lastUsedLevel: null,
  wildCelebrationCounter: 0,
}

export const useReading = create<ReadingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      ensureSyllableInitialized: (syllable) => {
        const id = getSyllableAudioKey(syllable)
        if (!get().syllables[id]) {
          set((s) => ({
            syllables: {
              ...s.syllables,
              [id]: {
                id,
                syllable,
                box: 1,
                lastSeen: 0,
                recentWrong: 0,
                totalSeen: 0,
                totalCorrect: 0,
                totalWrong: 0,
              },
            },
          }))
        }
      },

      ensureWordInitialized: (wordId) => {
        if (!get().words[wordId]) {
          const word = getWordById(wordId)
          if (!word) return
          set((s) => ({
            words: {
              ...s.words,
              [wordId]: {
                id: wordId,
                word: word.text,
                box: 1,
                lastSeen: 0,
                recentWrong: 0,
                totalSeen: 0,
                totalCorrect: 0,
                totalWrong: 0,
                level: word.level,
                album: false,
              },
            },
          }))
        }
      },

      applySessionResults: (updatedSyllables, updatedWords, log) => {
        set((s) => ({
          syllables: { ...s.syllables, ...updatedSyllables },
          words: { ...s.words, ...updatedWords },
          sessions: [...s.sessions, log],
        }))
      },

      addToAlbum: (wordId) => {
        set((s) => {
          if (s.albumUnlocked.includes(wordId)) return s
          const word = s.words[wordId]
          return {
            albumUnlocked: [...s.albumUnlocked, wordId],
            words: word ? { ...s.words, [wordId]: { ...word, album: true } } : s.words,
          }
        })
      },

      markIntroSeen: (key) => {
        set((s) => s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] })
      },

      hasSeenIntro: (key) => get().seenIntros.includes(key),

      setLastUsedLevel: (level) => set({ lastUsedLevel: level }),

      incrementWildCounter: () => set((s) => ({ wildCelebrationCounter: s.wildCelebrationCounter + 1 })),

      resetWildCounter: () => set({ wildCelebrationCounter: 0 }),

      resetAllProgress: () => set(initialState),

      reset: () => set(initialState),
    }),
    {
      name: 'iskierki-reading-v1',
      version: 1,
      merge: (persisted, current) => ({ ...current, ...(persisted as object) }) as ReadingState,
    },
  ),
)
```

- [ ] **Step 4:** Run test

```bash
pnpm test --run src/modules/reading/store/readingStore.test.ts
```

Expected: PASS.

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/store/
git commit -m "feat(reading): add readingStore (Zustand+persist) with album, wild counter, lazy-init"
```

### Task 2.6: Module entry stub

**Files:** `src/modules/reading/index.tsx`

- [ ] **Step 1:** Create stub module

```typescript
import { Navigate, Route, Routes } from 'react-router-dom'

export function ReadingModule() {
  return (
    <Routes>
      <Route index element={<div data-testid="reading-placeholder">Reading module — coming soon</div>} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  )
}

export default ReadingModule
```

- [ ] **Step 2:** Verify tsc

```bash
pnpm tsc -b
```

- [ ] **Step 3:** Commit

```bash
git add src/modules/reading/index.tsx
git commit -m "feat(reading): add module entry stub"
```

### Task 2.7: Wire routing in App.tsx

**Files:** `src/app/App.tsx`

- [ ] **Step 1:** Edit App.tsx

```typescript
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { KidNav } from '@/shared/ui/KidNav'
import { Home } from '@/app/Home'
import { LettersModule } from '@/modules/letters'
import { ReadingModule } from '@/modules/reading'
import { SettingsScreen } from '@/shared/settings/components'
import { ReportScreen } from '@/shared/stats/components/ReportScreen'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { useReading } from '@/modules/reading/store/readingStore'

function SettingsPage() {
  const navigate = useNavigate()
  const resetLetters = useLetters((s) => s.resetAllProgress)
  const resetReading = useReading((s) => s.resetAllProgress)
  return (
    <SettingsScreen
      onResetConfirmed={() => {
        resetLetters()
        resetReading()
        navigate('/')
      }}
    />
  )
}

function ReportPage() {
  const navigate = useNavigate()
  return <ReportScreen onExit={() => navigate('/')} />
}

export function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isLetters = location.pathname.startsWith('/letters')
  const isReading = location.pathname.startsWith('/reading')
  const showKidNav = !isHome && !isLetters && !isReading
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {showKidNav && <KidNav />}
      <main
        className={`flex-1 min-h-0 ${isHome ? '' : 'p-4'} ${isLetters || isReading ? 'overflow-hidden' : 'overflow-auto'}`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/letters/*" element={<LettersModule />} />
          <Route path="/reading/*" element={<ReadingModule />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  )
}
```

- [ ] **Step 2:** Run tsc

```bash
pnpm tsc -b
```

- [ ] **Step 3:** Run tests

```bash
pnpm test --run
```

Expected: 389+ pass.

- [ ] **Step 4:** Commit

```bash
git add src/app/App.tsx
git commit -m "feat(app): wire /reading/* route + reading store reset"
```

### Task 2.8: Update Home.tsx — 2 tiles

**Files:** `src/app/Home.tsx`

- [ ] **Step 1:** Read current Home.tsx

```bash
cat src/app/Home.tsx
```

- [ ] **Step 2:** Modify Home to render 2 large tiles (Litery + Czytanie) side-by-side, responsive

Replace existing single-tile Home.tsx with version having 2 tiles, each with:
- Background color
- Iskra mascot
- Tile title in Kalam font (still readable to parent)
- Tap area ≥ 200×200px
- audio cue intro (1× per `seenIntros` — używaj kluczy `home-letters-intro` / `home-reading-intro`)
- onClick → navigate to `/letters` or `/reading`
- Layout: `display: grid; grid-template-columns: 1fr 1fr;` na iPad, `1fr` na phone (media query lub Tailwind breakpoint)

Concrete code (full Home.tsx):

```typescript
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { audioBus } from '@/shared/audio/AudioBus'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { useReading } from '@/modules/reading/store/readingStore'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export function Home() {
  const navigate = useNavigate()
  const lettersIntroSeen = useLetters((s) => s.hasSeenIntro('home-letters-intro'))
  const readingIntroSeen = useReading((s) => s.hasSeenIntro('home-reading-intro'))
  const markLettersIntro = useLetters((s) => s.markIntroSeen)
  const markReadingIntro = useReading((s) => s.markIntroSeen)

  // Onboarding głosowy — pierwsze odwiedzenie home wymaga jednego z intro
  useEffect(() => {
    if (!lettersIntroSeen) {
      void audioBus.play('home-letters-intro')
      markLettersIntro('home-letters-intro')
    } else if (!readingIntroSeen) {
      void audioBus.play('home-reading-intro')
      markReadingIntro('home-reading-intro')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLetters = useCallback(() => {
    audioBus.stop()
    void audioBus.play('nav-tap')
    navigate('/letters')
  }, [navigate])

  const handleReading = useCallback(() => {
    audioBus.stop()
    void audioBus.play('nav-tap')
    navigate('/reading')
  }, [navigate])

  const lettersHandlers = useTapHandler(handleLetters)
  const readingHandlers = useTapHandler(handleReading)

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          {...lettersHandlers}
          aria-label="Litery"
          className="aspect-square min-h-[280px] rounded-3xl flex flex-col items-center justify-center gap-4"
          style={{ background: '#fef3c7', border: '4px solid #f59e0b' }}
        >
          <IskraMascot size={120} />
          <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 36, fontWeight: 700, color: '#92400e' }}>
            Litery
          </div>
        </button>
        <button
          {...readingHandlers}
          aria-label="Czytanie"
          className="aspect-square min-h-[280px] rounded-3xl flex flex-col items-center justify-center gap-4"
          style={{ background: '#dbeafe', border: '4px solid #3b82f6' }}
        >
          <IskraMascot size={120} />
          <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 36, fontWeight: 700, color: '#1e40af' }}>
            Czytanie
          </div>
        </button>
      </div>
    </div>
  )
}
```

Note: jeśli istniejący `Home.tsx` ma inną strukturę (np. ikonę ⚙ ustawień), zachowaj te elementy poza grid'em — czytaj plik najpierw, integruj 2 kafelki.

- [ ] **Step 3:** Run tsc

```bash
pnpm tsc -b
```

- [ ] **Step 4:** Manual verify w dev server (krótko)

```bash
pnpm dev
```

Open `http://localhost:5173`, verify both tiles visible, both clickable, navigation works (Czytanie → placeholder z task 2.6).

- [ ] **Step 5:** Commit

```bash
git add src/app/Home.tsx
git commit -m "feat(home): 2 kafelki — Litery (moduł 1) + Czytanie (moduł 2)"
```

---

## Phase 3 — Audio assets pipeline

Generujemy audio dla nowych kluczy (TTS Zofia + TTS Marek) i kompletujemy SFX biblioteka.

### Task 3.1: Add syllables.json audio source

**Files:** `audio-source/syllables.json`

- [ ] **Step 1:** Create file

```json
{
  "_voice": "zofia",
  "syl-MA": "ma",
  "syl-TA": "ta",
  "syl-LA": "la",
  "syl-KO": "ko",
  "syl-MO": "mo",
  "syl-TO": "to",
  "syl-LO": "lo",
  "syl-RA": "ra",
  "syl-RO": "ro",
  "syl-RU": "ru",
  "syl-BA": "ba",
  "syl-DA": "da",
  "syl-DO": "do",
  "syl-KU": "ku",
  "syl-NA": "na",
  "syl-NO": "no",
  "syl-SA": "sa",
  "syl-NU": "nu",
  "syl-PA": "pa",
  "syl-WA": "wa",
  "syl-DU": "du",
  "syl-KA": "ka",
  "syl-TY": "ty"
}
```

- [ ] **Step 2:** Commit

```bash
git add audio-source/syllables.json
git commit -m "feat(audio): syllables.json — 23 sylab (lektor Zofia)"
```

### Task 3.2: Extend words.json

**Files:** `audio-source/words.json`

- [ ] **Step 1:** Read existing

```bash
cat audio-source/words.json
```

- [ ] **Step 2:** Edit — append new 67 word entries (zachowując istniejące word-arbuz, word-balon itd. z modułu 1)

For each word in `ALL_WORDS` from `data/words.ts`, add entry `"word-MAMA": "mama"` etc. Use lowercase text dla TTS (TTS lepiej wymawia lowercase polski).

Keep `_voice: "zofia"` jeśli plik tego używa, lub dodaj.

Final words.json should contain:
- existing entries z modułu 1 (word-arbuz, word-balon, ... — checked at module 1 commit)
- new 67 entries: word-MAMA, word-TATA, ..., word-CZEKOLADA

(For brevity in plan: add all 67 entries from `ALL_WORDS` with text = lowercased word.)

- [ ] **Step 3:** Commit

```bash
git add audio-source/words.json
git commit -m "feat(audio): extend words.json with 67 new module 2 words"
```

### Task 3.3: Add reading-ui-strings.json

**Files:** `audio-source/reading-ui-strings.json`

- [ ] **Step 1:** Create file

```json
{
  "_voice": "zofia",
  "home-letters-intro": "Dotknij Litery, aby uczyć się literek!",
  "home-reading-intro": "Dotknij Czytanie, aby nauczyć się czytać słowa!",

  "reading-iskierka-intro": "Cześć! Dzisiaj posłuchasz sylaby i wybierzesz tę samą sylabę pisaną.",
  "reading-plomyk-intro": "Cześć! Dzisiaj będziemy układać słowa z sylab. Weź sylabę palcem i przeciągnij ją w okienko.",
  "reading-ognik-intro": "Cześć! Posłuchaj słowa i wybierz to samo słowo pisane.",
  "reading-pochodnia-intro": "Cześć! Brakuje jednej sylaby w słowie. Wybierz właściwą.",

  "reading-correct-prefix": "Brawo! To było słowo",
  "reading-wrong-prefix": "Posłuchaj jeszcze raz. To było",
  "reading-dontknow-prefix": "Nie szkodzi! To słowo to",
  "reading-album-intro": "To Twój album. Stuknij w kartę, aby ją obejrzeć.",
  "reading-album-unlock": "Nowa karta w albumie!",

  "reading-praise-1": "Świetnie!",
  "reading-praise-2": "Brawo!",
  "reading-praise-3": "Czytasz coraz lepiej!",
  "reading-praise-4": "Wspaniale!",
  "reading-praise-5": "Tak trzymaj!",
  "reading-praise-6": "Pięknie!"
}
```

- [ ] **Step 2:** Commit

```bash
git add audio-source/reading-ui-strings.json
git commit -m "feat(audio): reading-ui-strings.json — UI cues + intros + praises (Zofia)"
```

### Task 3.4: Add iskra-reactions.json (Marek voice)

**Files:** `audio-source/iskra-reactions.json`

- [ ] **Step 1:** Create file

```json
{
  "_voice": "marek",
  "iskra-laaal": "Łaał!",
  "iskra-uuu-super": "Uuu super!",
  "iskra-ojej": "Ojej...",
  "iskra-haha": "Hahaha!",
  "iskra-hmm": "Hmm?",
  "iskra-nuda": "Nudzi mi się...",
  "iskra-fyt-fyt": "Fyt fyt!",
  "iskra-piuuu": "Piuuu!",
  "iskra-plamplam": "Plamplam pia!",
  "iskra-mlask": "Mlask!",
  "iskra-brrr": "Brrr!",
  "iskra-uuups": "Uuups!"
}
```

- [ ] **Step 2:** Commit

```bash
git add audio-source/iskra-reactions.json
git commit -m "feat(audio): iskra-reactions.json — TTS Marek (głos postaci Iskry)"
```

### Task 3.5: Update generate-audio.ts to support multiple voices

**Files:** `scripts/generate-audio.ts`

- [ ] **Step 1:** Read existing script

```bash
cat scripts/generate-audio.ts
```

- [ ] **Step 2:** Modify to handle `_voice` field per file

Logika:
- Domyślnie voice = `pl-PL-ZofiaNeural`
- Jeśli plik JSON ma top-level `"_voice": "marek"` → użyj `pl-PL-MarekNeural`
- Skip `_voice` przy iteracji nad entries

Code change (relevant section, conceptual):

```typescript
const VOICE_MAP = {
  zofia: 'pl-PL-ZofiaNeural',
  marek: 'pl-PL-MarekNeural',
}

async function processFile(jsonPath: string) {
  const content = JSON.parse(await fs.readFile(jsonPath, 'utf-8'))
  const voiceKey = content._voice ?? 'zofia'
  const voiceName = VOICE_MAP[voiceKey] ?? VOICE_MAP.zofia

  for (const [key, text] of Object.entries(content)) {
    if (key.startsWith('_')) continue          // skip metadata
    if (typeof text !== 'string') continue
    await generateOrSkip(key, text, voiceName)
  }
}

// processFile(['audio-source/letters.json', 'audio-source/words.json', 'audio-source/syllables.json',
//              'audio-source/reading-ui-strings.json', 'audio-source/iskra-reactions.json', ...])
```

Edit script to iterate over wszystkie pliki w `audio-source/*.json` (oprócz przygranicznych jak ui-strings z modułu 1 jeśli już są — sprawdź).

- [ ] **Step 3:** Run audio:build

```bash
pnpm audio:build
```

Expected: ~140 nowych plików MP3 generowanych (sylaby 23 + words 67 + reading-ui ~25 + iskra-reactions 12). Idempotency — drugie uruchomienie nie regeneruje istniejących.

- [ ] **Step 4:** Run audio:check

```bash
pnpm audio:check
```

Expected: wszystkie zdefiniowane klucze mają plik MP3.

- [ ] **Step 5:** Commit

```bash
git add scripts/generate-audio.ts public/audio/ public/audio/.manifest.json
git commit -m "feat(audio): support _voice field per JSON file (Zofia + Marek)"
```

### Task 3.6: SFX biblioteka — pobierz CC0

**Files:** `public/audio/sfx/*.mp3` (20 plików)

- [ ] **Step 1:** Manual task — user pobiera 20 SFX z mixkit.co lub freesound.org wg listy:

```
public/audio/sfx/
├── tap.mp3                  # cichy klick (sylaba w slot)
├── ding.mp3                 # jasny dzwonek (słowo całe poprawne)
├── blip.mp3                 # neutralny krótki (błąd)
├── pickup.mp3               # zassanie (drag start)
├── drop.mp3                 # lekki tłum (drag stop)
├── fanfara-1.mp3            # streak 3+
├── fanfara-2.mp3            # streak 5+
├── fanfara-special.mp3      # streak 7+ / wild celebration
├── confetti.mp3             # wild celebration
├── whoosh.mp3               # Iskra przejście
├── pop.mp3                  # easter egg pojawia się
├── meow.mp3
├── purr.mp3
├── bark.mp3
├── moo.mp3
├── oink.mp3
├── meow-angry.mp3
├── yawn.mp3
├── snore.mp3
└── heart-beat.mp3
```

Każdy plik: <100KB, format MP3 mono 44.1kHz preferowane.

- [ ] **Step 2:** Add SFX manifest update — `public/audio/.manifest.json` powinien zawierać też SFX. Aktualizuj `audio:check` żeby je sprawdzał. (Jeśli currently `audio:check` patrzy tylko na `audio-source/*.json` keys, dodaj scan dla `public/audio/sfx/*.mp3`)

- [ ] **Step 3:** Commit (po pobraniu wszystkich)

```bash
git add public/audio/sfx/
git commit -m "feat(audio): SFX biblioteka — 20 plików CC0 (mixkit/freesound)"
```

**Note for executor:** Ten task wymaga ręcznego pobierania. Jeśli executor jest agentem bez dostępu do internetu, zostawić taski 3.6 dla user'a, kontynuować z placeholderami (puste pliki MP3 do podmiany).

---

## Phase 4 — SRS integration & session orchestrator

### Task 4.1: useReadingSession hook (TDD)

**Files:** `src/modules/reading/hooks/useReadingSession.ts`, `src/modules/reading/hooks/useReadingSession.test.ts`

- [ ] **Step 1:** Write tests — focus on logic: question generation, outcome handling, session completion

```typescript
// useReadingSession.test.ts
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReadingSession } from './useReadingSession'

const mockAudioBus = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }

describe('useReadingSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates 8 questions for Iskierka session', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus }))
    act(() => result.current.start())
    expect(result.current.totalQuestions).toBe(8)
    expect(result.current.currentQuestion?.type).toBe('syllable-match')
  })

  it('progresses to next question on correct answer', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus }))
    act(() => result.current.start())
    const firstTarget = result.current.currentQuestion?.targetSyllable
    act(() => result.current.submitAnswer(firstTarget!))
    expect(result.current.currentQuestionIndex).toBe(1)
  })

  it('shows feedback overlay on wrong', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus }))
    act(() => result.current.start())
    const wrongAnswer = 'NIE-MA-TAKIEJ-SYLABY'
    act(() => result.current.submitAnswer(wrongAnswer))
    expect(result.current.feedbackVariant).toBe('wrong')
  })

  it('marks session complete after all 8 questions', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus }))
    act(() => result.current.start())
    for (let i = 0; i < 8; i++) {
      const target = result.current.currentQuestion?.targetSyllable
      act(() => result.current.submitAnswer(target!))
      act(() => result.current.skipFeedback())
    }
    expect(result.current.status).toBe('complete')
  })
})
```

- [ ] **Step 2:** Run (fails — hook nie istnieje)

- [ ] **Step 3:** Implement `useReadingSession.ts`

Hook orkiestruje:
1. **Initialization**: pobiera pulę (`getReadingPool(level)`), tworzy initial states dla wszystkich items (przez `ensureSyllableInitialized` / `ensureWordInitialized`)
2. **Question generation**: dla każdego pytania wybiera target przez `pickNextItem`, generuje dystraktory przez `generateDistractors`, buduje `ReadingQuestion`
3. **Outcome handling**: po `submitAnswer`/`submitDontKnow`/`timeout` → `applyOutcome` na state, increment counters, set feedbackVariant
4. **Wild celebration trigger**: po correct, increment wildCounter; jeśli >= freq+jitter → wild celebration zamiast standard
5. **Session complete**: po 8 pytań → `applySessionResults` na store, status='complete'

Pełen kod w pliku — szkicuję sygnatury:

```typescript
import { useReducer, useCallback, useRef, useEffect } from 'react'
import type { Level, Settings } from '@/shared/settings/types'
import type { ReadingQuestion, SyllableState, WordState, ReadingSessionEvent } from '../types'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { LEVEL_TO_EXERCISE } from '../types'
import { getReadingPool } from '../data/levelPools'
import { ALL_SYLLABLES } from '../data/syllables'
import { ALL_WORDS, getWordById } from '../data/words'
import { pickNextItem } from '@/shared/srs/select'
import { applyOutcome } from '@/shared/srs/update'

// ... full implementation generujący Question per type, etc.
// (~200 lines)
```

Implementacja będzie ~200 linii. Szczegóły:
- Per-level question generation:
  - `iskierka` (syllable-match): target syllable + 3 random other syllables jako dystraktory
  - `plomyk` (word-assembly): target word, jego sylaby (poprawne) + 2-3 random dystraktor sylab
  - `ognik` (word-choice): target word + 3 random words z tego poziomu
  - `pochodnia` (syllable-fill): random word, random missing position, missing syllable + 3 dystraktor sylab
- Random `wildCelebrationFreq + jitter(±2)` dla każdej sesji, persisted via store

- [ ] **Step 4:** Run tests

```bash
pnpm test --run src/modules/reading/hooks/useReadingSession.test.ts
```

Expected: PASS.

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/hooks/
git commit -m "feat(reading): useReadingSession orchestrator hook with TDD"
```

### Task 4.2: useDragSyllable hook (Płomyk drag-and-drop)

**Files:** `src/modules/reading/hooks/useDragSyllable.ts`, `src/modules/reading/hooks/useDragSyllable.test.ts`

- [ ] **Step 1:** Write integration test (testing drag behavior is hard in unit; use integration with @dnd-kit testing utils)

```typescript
// useDragSyllable.test.ts
// Test koncentruje się na callback'ach, nie na fizyce drag (to robi @dnd-kit sam)
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragSyllable } from './useDragSyllable'

describe('useDragSyllable', () => {
  it('detects correct drop into right slot', () => {
    const onDropCorrect = vi.fn()
    const onDropIncorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      pickedUp: null,
      onDropCorrect,
      onDropIncorrect,
    }))

    // Symuluj drop event from @dnd-kit
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-MA-1' },
        over: { id: 'slot-0' },
      } as any)
    })

    expect(onDropCorrect).toHaveBeenCalledWith({ slotIndex: 0, syllable: 'MA' })
  })

  it('returns syllable to source on drop in wrong slot', () => {
    const onDropIncorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      pickedUp: null,
      onDropCorrect: vi.fn(),
      onDropIncorrect,
    }))

    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-TA-1', data: { current: { syllable: 'TA' } } },
        over: { id: 'slot-0' },          // expects MA, getting TA
      } as any)
    })

    expect(onDropIncorrect).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement hook

Hook wraps @dnd-kit `useDndContext` + collision detection. Magnetism: jeśli `over` jest `null` ale aktualne pointer position jest <40px od slotu → traktuj jako drop w tym slocie.

```typescript
import { useCallback } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'

type Args = {
  slots: string[]                          // expected syllables in slots
  onDropCorrect: (args: { slotIndex: number; syllable: string }) => void
  onDropIncorrect: () => void
}

export function useDragSyllable({ slots, onDropCorrect, onDropIncorrect }: Args) {
  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      onDropIncorrect()
      return
    }
    const slotMatch = String(over.id).match(/^slot-(\d+)$/)
    if (!slotMatch) return
    const slotIndex = parseInt(slotMatch[1], 10)
    const expected = slots[slotIndex]
    const actualSyllable = (active.data?.current as { syllable?: string } | undefined)?.syllable
                       ?? String(active.id).replace(/^syl-/, '').replace(/-\d+$/, '')
    if (expected === actualSyllable) {
      onDropCorrect({ slotIndex, syllable: actualSyllable })
    } else {
      onDropIncorrect()
    }
  }, [slots, onDropCorrect, onDropIncorrect])

  return { onDragEnd }
}
```

- [ ] **Step 4:** Run tests

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/hooks/useDragSyllable.ts src/modules/reading/hooks/useDragSyllable.test.ts
git commit -m "feat(reading): useDragSyllable hook (@dnd-kit wrapper)"
```

---

## Phase 5 — Components: shared, level select, session view

### Task 5.1: SyllableTile component

**Files:** `src/modules/reading/components/SyllableTile.tsx`

- [ ] **Step 1:** Create component

```typescript
import { forwardRef } from 'react'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type SyllableTileProps = {
  syllable: string
  selected?: boolean
  state?: 'idle' | 'correct' | 'wrong' | 'highlighted'
  onTap?: () => void
}

export const SyllableTile = forwardRef<HTMLButtonElement, SyllableTileProps>(function SyllableTile(
  { syllable, selected, state = 'idle', onTap },
  ref,
) {
  const handlers = useTapHandler(onTap ?? (() => {}))
  const stateColor = {
    idle: '#fef9f2',
    correct: '#d1fae5',
    wrong: '#fee2e2',
    highlighted: '#fef3c7',
  }[state]
  const borderColor = {
    idle: '#d1d5db',
    correct: '#10b981',
    wrong: '#ef4444',
    highlighted: '#f59e0b',
  }[state]
  return (
    <button
      ref={ref}
      {...handlers}
      aria-label={`sylaba ${syllable}`}
      style={{
        minWidth: 100,
        minHeight: 80,
        background: stateColor,
        border: `3px solid ${borderColor}`,
        borderRadius: 12,
        fontFamily: 'var(--font-block)',
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: '0.05em',
        color: '#2d2d33',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transform: selected ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 0.18s ease',
      }}
    >
      {syllable}
    </button>
  )
})
```

- [ ] **Step 2:** Verify tsc

- [ ] **Step 3:** Commit

```bash
git add src/modules/reading/components/SyllableTile.tsx
git commit -m "feat(reading): SyllableTile component (Lexend, 80×100 min)"
```

### Task 5.2: WordTile component

**Files:** `src/modules/reading/components/WordTile.tsx`

- [ ] **Step 1:** Create — identyczny pattern jak SyllableTile, ale dla słów (większe, full word)

```typescript
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type WordTileProps = {
  word: string
  state?: 'idle' | 'correct' | 'wrong' | 'highlighted'
  onTap?: () => void
}

export function WordTile({ word, state = 'idle', onTap }: WordTileProps) {
  const handlers = useTapHandler(onTap ?? (() => {}))
  // ... podobne style do SyllableTile, większe (min 140×60), font 28-32
  return (
    <button {...handlers} aria-label={`słowo ${word}`} style={{ /* ... */ }}>
      {word}
    </button>
  )
}
```

- [ ] **Step 2:** Commit

```bash
git add src/modules/reading/components/WordTile.tsx
git commit -m "feat(reading): WordTile component"
```

### Task 5.3: DropSlot component (drag target)

**Files:** `src/modules/reading/components/DropSlot.tsx`

- [ ] **Step 1:** Create using `useDroppable` from `@dnd-kit/core`

```typescript
import { useDroppable } from '@dnd-kit/core'

export type DropSlotProps = {
  index: number
  filled?: boolean
  syllable?: string
  state?: 'empty' | 'filled' | 'wrong'
}

export function DropSlot({ index, filled, syllable, state = 'empty' }: DropSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${index}` })
  const showHover = isOver && !filled
  return (
    <div
      ref={setNodeRef}
      style={{
        width: 100,
        height: 80,
        border: `3px ${filled ? 'solid' : 'dashed'} ${showHover ? '#f59e0b' : '#9ca3af'}`,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-block)',
        fontSize: 32,
        fontWeight: 700,
        background: filled ? '#fef9f2' : 'rgba(255,255,255,0.5)',
        transition: 'all 0.18s ease',
        transform: showHover ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      {syllable ?? ''}
    </div>
  )
}
```

- [ ] **Step 2:** Commit

```bash
git add src/modules/reading/components/DropSlot.tsx
git commit -m "feat(reading): DropSlot component (@dnd-kit useDroppable)"
```

### Task 5.4: ReadingLevelSelect

**Files:** `src/modules/reading/components/ReadingLevelSelect.tsx`, `src/modules/reading/components/ReadingLevelSelect.test.tsx`

- [ ] **Step 1:** Test — renders 4 level tiles, calls onSelect

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReadingLevelSelect } from './ReadingLevelSelect'

describe('ReadingLevelSelect', () => {
  it('renders 4 level tiles', () => {
    render(<ReadingLevelSelect onSelect={vi.fn()} audioBus={{ play: vi.fn(), stop: vi.fn() }} />)
    expect(screen.getByLabelText(/Iskierka/i)).toBeDefined()
    expect(screen.getByLabelText(/Płomyk/i)).toBeDefined()
    expect(screen.getByLabelText(/Ognik/i)).toBeDefined()
    expect(screen.getByLabelText(/Pochodnia/i)).toBeDefined()
  })

  it('calls onSelect with level', () => {
    const onSelect = vi.fn()
    render(<ReadingLevelSelect onSelect={onSelect} audioBus={{ play: vi.fn(), stop: vi.fn() }} />)
    fireEvent.click(screen.getByLabelText(/Iskierka/i))
    expect(onSelect).toHaveBeenCalledWith('iskierka')
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement — pattern z `LevelSelect` modułu 1, ale bez mastery wall (w module 2 mastery jest w albumie)

```typescript
import { useCallback } from 'react'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import type { Level } from '@/shared/settings/types'
import type { AudioBus } from '@/shared/audio/AudioBus'

const LEVELS: { id: Level; label: string; subtitle: string; intensity: number }[] = [
  { id: 'iskierka', label: 'Iskierka', subtitle: 'Sylaby', intensity: 1 },
  { id: 'plomyk', label: 'Płomyk', subtitle: 'Słowa', intensity: 2 },
  { id: 'ognik', label: 'Ognik', subtitle: 'Trudniejsze słowa', intensity: 3 },
  { id: 'pochodnia', label: 'Pochodnia', subtitle: 'Brakuje sylaby', intensity: 4 },
]

type Props = {
  onSelect: (level: Level) => void
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

export function ReadingLevelSelect({ onSelect, audioBus }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {LEVELS.map((level) => (
          <LevelTile key={level.id} level={level} onSelect={onSelect} audioBus={audioBus} />
        ))}
      </div>
    </div>
  )
}

function LevelTile({
  level, onSelect, audioBus,
}: {
  level: typeof LEVELS[0]
  onSelect: (l: Level) => void
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}) {
  const handleTap = useCallback(() => {
    audioBus.stop()
    void audioBus.play('nav-tap')
    onSelect(level.id)
  }, [audioBus, level.id, onSelect])
  const handlers = useTapHandler(handleTap)
  return (
    <button
      {...handlers}
      aria-label={`${level.label} — ${level.subtitle}`}
      className="aspect-square min-h-[180px] rounded-2xl flex flex-col items-center justify-center gap-2"
      style={{ background: '#fef9f2', border: '3px solid #d1d5db' }}
    >
      <IskraMascot size={80} intensity={level.intensity} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 28, fontWeight: 700, color: '#2d2d33' }}>
        {level.label}
      </div>
      <div style={{ fontSize: 14, color: '#6b7280' }}>{level.subtitle}</div>
    </button>
  )
}
```

- [ ] **Step 4:** Run test, expect PASS

- [ ] **Step 5:** Wire ReadingLevelSelect w `src/modules/reading/index.tsx` (rozszerz route `index` żeby renderował ReadingLevelSelect)

Edit `index.tsx`:

```typescript
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { ReadingLevelSelect } from './components/ReadingLevelSelect'
import { useReading } from './store/readingStore'

export function ReadingModule({ audioBus = defaultAudioBus }: { audioBus?: Pick<AudioBus, 'play' | 'stop'> } = {}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <KidNav />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<ReadingIndex audioBus={audioBus} />} />
          <Route path="session/:level" element={<div>Session — TODO</div>} />
          <Route path="album" element={<div>Album — TODO</div>} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function ReadingIndex({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  const setLastUsed = useReading((s) => s.setLastUsedLevel)
  return (
    <ReadingLevelSelect
      audioBus={audioBus}
      onSelect={(level) => {
        setLastUsed(level)
        navigate(`session/${level}`)
      }}
    />
  )
}

export default ReadingModule
```

- [ ] **Step 6:** Commit

```bash
git add src/modules/reading/components/ReadingLevelSelect.tsx src/modules/reading/components/ReadingLevelSelect.test.tsx src/modules/reading/index.tsx
git commit -m "feat(reading): ReadingLevelSelect with 4 level tiles + module routing"
```

---

## Phase 6 — Exercise components

### Task 6.1: SyllableMatchExercise (Iskierka)

**Files:** `src/modules/reading/components/exercises/SyllableMatchExercise.tsx`, `*.test.tsx`

- [ ] **Step 1:** Write test

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyllableMatchExercise } from './SyllableMatchExercise'

describe('SyllableMatchExercise', () => {
  it('renders 4 syllable choices', () => {
    render(
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
        onAnswer={vi.fn()}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />
    )
    for (const c of ['MA', 'TA', 'LA', 'KO']) {
      expect(screen.getByText(c)).toBeDefined()
    }
  })

  it('calls onAnswer with chosen syllable on tap', () => {
    const onAnswer = vi.fn()
    render(
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
        onAnswer={onAnswer}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText(/sylaba TA/i))
    expect(onAnswer).toHaveBeenCalledWith('TA')
  })

  it('calls onDontKnow when "Nie wiem" tapped', () => {
    const onDontKnow = vi.fn()
    render(
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
        onAnswer={vi.fn()}
        onDontKnow={onDontKnow}
        onAudioRepeat={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText(/Nie wiem/i))
    expect(onDontKnow).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement

```typescript
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { SyllableTile } from '../SyllableTile'

type Props = {
  targetSyllable: string
  choices: string[]
  onAnswer: (syllable: string) => void
  onDontKnow: () => void
  onAudioRepeat: () => void
}

export function SyllableMatchExercise({ targetSyllable: _targetSyllable, choices, onAnswer, onDontKnow, onAudioRepeat }: Props) {
  const audioHandlers = useTapHandler(onAudioRepeat)
  const dontKnowHandlers = useTapHandler(onDontKnow)
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
      <button {...audioHandlers} aria-label="Powtórz audio" style={{
        width: 96, height: 96, borderRadius: '50%', background: '#6366f1', color: 'white',
        fontSize: 36, border: 'none',
      }}>
        🔊
      </button>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        {choices.map((c, i) => (
          <SyllableTile key={`${c}-${i}`} syllable={c} onTap={() => onAnswer(c)} />
        ))}
      </div>
      <button {...dontKnowHandlers} aria-label="Nie wiem" style={{
        padding: '12px 24px', borderRadius: 16, background: '#fef3c7',
        border: '2px solid #f59e0b', fontSize: 24,
      }}>
        🤷
      </button>
    </div>
  )
}
```

- [ ] **Step 4:** Run tests, expect PASS

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/components/exercises/SyllableMatchExercise.tsx src/modules/reading/components/exercises/SyllableMatchExercise.test.tsx
git commit -m "feat(reading): SyllableMatchExercise (Iskierka)"
```

### Task 6.2: WordChoiceExercise (Ognik)

Similar pattern do 6.1, ale dla słów. WordTile zamiast SyllableTile, układ siatka 2×2.

**Files:** `src/modules/reading/components/exercises/WordChoiceExercise.tsx`, `*.test.tsx`

- [ ] **Step 1:** Write test (analog do 6.1, ale z WordTile, target="MAMA")
- [ ] **Step 2:** Run (fails)
- [ ] **Step 3:** Implement (analog 6.1 z WordTile)
- [ ] **Step 4:** Test PASS
- [ ] **Step 5:** Commit

```bash
git commit -m "feat(reading): WordChoiceExercise (Ognik)"
```

### Task 6.3: SyllableFillExercise (Pochodnia)

**Files:** `src/modules/reading/components/exercises/SyllableFillExercise.tsx`, `*.test.tsx`

- [ ] **Step 1:** Test — renders word with gap, 3-4 choices, calls onAnswer

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyllableFillExercise } from './SyllableFillExercise'

describe('SyllableFillExercise', () => {
  it('renders word with gap visible', () => {
    render(
      <SyllableFillExercise
        targetWord="KAPELUSZ"
        visibleSyllables={['KA', 'PE']}
        missingPosition="last"
        missingSyllable="LUSZ"
        choices={['LUSZ', 'TUSZ', 'BUSZ', 'KOSZ']}
        onAnswer={vi.fn()}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />
    )
    expect(screen.getByText('KA')).toBeDefined()
    expect(screen.getByText('PE')).toBeDefined()
    // gap rendered as ___ or empty placeholder
  })

  it('calls onAnswer with chosen syllable', () => {
    const onAnswer = vi.fn()
    render(
      <SyllableFillExercise
        targetWord="KAPELUSZ"
        visibleSyllables={['KA', 'PE']}
        missingPosition="last"
        missingSyllable="LUSZ"
        choices={['LUSZ', 'TUSZ', 'BUSZ', 'KOSZ']}
        onAnswer={onAnswer}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText(/sylaba LUSZ/i))
    expect(onAnswer).toHaveBeenCalledWith('LUSZ')
  })
})
```

- [ ] **Step 2:** Run (fails)
- [ ] **Step 3:** Implement — top: word as syllable boxes (one is empty placeholder); bottom: 4 syllable choices
- [ ] **Step 4:** Test PASS
- [ ] **Step 5:** Commit

### Task 6.4: WordAssemblyExercise (Płomyk)

**Files:** `src/modules/reading/components/exercises/WordAssemblyExercise.tsx`

Najbardziej skomplikowany — drag-and-drop.

- [ ] **Step 1:** Skip unit test for drag (test ręczny w fazie 13). Component test for render only.

- [ ] **Step 2:** Implement using `@dnd-kit` `DndContext` + `DropSlot` + draggable syllable tiles

```typescript
import { useState } from 'react'
import { DndContext, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { SyllableTile } from '../SyllableTile'
import { DropSlot } from '../DropSlot'
import { useDragSyllable } from '../../hooks/useDragSyllable'
import { useTapHandler } from '@/shared/ui/useTapHandler'

type Props = {
  targetWord: string
  syllables: string[]                  // poprawne sylaby (np. ['MA', 'MA'])
  distractors: string[]                 // dystraktorów (np. ['TA', 'KO', 'LO'])
  onComplete: () => void               // wszystkie sloty wypełnione poprawnie
  onDropError: () => void              // niepoprawny drop (jedno wystąpienie)
  onDontKnow: () => void
  onAudioRepeat: () => void
}

export function WordAssemblyExercise({
  targetWord,
  syllables,
  distractors,
  onComplete,
  onDropError,
  onDontKnow,
  onAudioRepeat,
}: Props) {
  const [filledSlots, setFilledSlots] = useState<(string | null)[]>(() => Array(syllables.length).fill(null))
  const allSyllables = [...syllables, ...distractors]
  const [available, setAvailable] = useState(allSyllables)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { onDragEnd } = useDragSyllable({
    slots: syllables,
    onDropCorrect: ({ slotIndex, syllable }) => {
      setFilledSlots((prev) => {
        const next = [...prev]
        next[slotIndex] = syllable
        if (next.every(s => s !== null)) {
          onComplete()
        }
        return next
      })
      setAvailable(prev => prev.filter(s => s !== syllable))
    },
    onDropIncorrect: () => onDropError(),
  })

  const audioHandlers = useTapHandler(onAudioRepeat)
  const dkHandlers = useTapHandler(onDontKnow)

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
        <button {...audioHandlers} aria-label="Powtórz">🔊</button>

        {/* Sloty docelowe */}
        <div style={{ display: 'flex', gap: 12 }}>
          {syllables.map((s, i) => (
            <DropSlot key={i} index={i} filled={filledSlots[i] !== null} syllable={filledSlots[i] ?? ''} />
          ))}
        </div>

        {/* Rozsypane sylaby */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {available.map((s, i) => (
            <DraggableSyllable key={`${s}-${i}`} syllable={s} idSuffix={i} />
          ))}
        </div>

        <button {...dkHandlers} aria-label="Nie wiem">🤷</button>
      </div>
    </DndContext>
  )
}

function DraggableSyllable({ syllable, idSuffix }: { syllable: string; idSuffix: number }) {
  const id = `syl-${syllable}-${idSuffix}`
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { syllable },
  })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <SyllableTile syllable={syllable} />
    </div>
  )
}
```

- [ ] **Step 3:** Verify tsc

```bash
pnpm tsc -b
```

- [ ] **Step 4:** Manual integration test — w SessionView (zrobimy w 6.5)

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/components/exercises/WordAssemblyExercise.tsx
git commit -m "feat(reading): WordAssemblyExercise drag-and-drop (@dnd-kit)"
```

### Task 6.5: SessionView shell

**Files:** `src/modules/reading/components/SessionView.tsx`, `*.test.tsx`

- [ ] **Step 1:** Test — renders correct exercise per level

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionView } from './SessionView'

describe('SessionView', () => {
  const noopBus = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }

  it('Iskierka renders SyllableMatchExercise', async () => {
    render(<SessionView level="iskierka" audioBus={noopBus} onExit={vi.fn()} onSessionComplete={vi.fn()} settings={{}} />)
    // Oczekujemy syllable tiles na ekranie po starcie
    // (zależy od UX implementation; może wymagać explicit start button click)
  })
})
```

- [ ] **Step 2:** Implement SessionView jako orchestrator korzystający z useReadingSession + renderujący odpowiednie ćwiczenie

```typescript
import { useEffect, useCallback } from 'react'
import { useReadingSession } from '../hooks/useReadingSession'
import { LEVEL_TO_EXERCISE } from '../types'
import { SyllableMatchExercise } from './exercises/SyllableMatchExercise'
import { WordAssemblyExercise } from './exercises/WordAssemblyExercise'
import { WordChoiceExercise } from './exercises/WordChoiceExercise'
import { SyllableFillExercise } from './exercises/SyllableFillExercise'
import { FeedbackOverlay } from './FeedbackOverlay'
import { PauseOverlay } from './PauseOverlay'
import { SessionEnd } from './SessionEnd'
import type { Level, Settings } from '@/shared/settings/types'
import type { AudioBus } from '@/shared/audio/AudioBus'

type Props = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onSessionComplete: () => void
}

export function SessionView({ level, audioBus, settings, onExit, onSessionComplete }: Props) {
  const session = useReadingSession({ level, audioBus, settings })

  useEffect(() => {
    session.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (session.status === 'idle') {
    return <div>Loading...</div>
  }

  if (session.status === 'complete') {
    return <SessionEnd
      results={session.results}
      onExit={onExit}
      onAlbum={() => { /* navigate album */ }}
    />
  }

  const exerciseType = LEVEL_TO_EXERCISE[level]
  const q = session.currentQuestion
  if (!q) return null

  return (
    <>
      {exerciseType === 'syllable-match' && q.type === 'syllable-match' && (
        <SyllableMatchExercise
          targetSyllable={q.targetSyllable}
          choices={q.choices}
          onAnswer={session.submitAnswer}
          onDontKnow={session.submitDontKnow}
          onAudioRepeat={session.repeatAudio}
        />
      )}
      {exerciseType === 'word-assembly' && q.type === 'word-assembly' && (
        <WordAssemblyExercise
          targetWord={q.targetWord}
          syllables={q.syllables}
          distractors={q.distractors}
          onComplete={() => session.submitAnswer(q.targetWord)}
          onDropError={session.recordDropError}
          onDontKnow={session.submitDontKnow}
          onAudioRepeat={session.repeatAudio}
        />
      )}
      {/* analogicznie word-choice, syllable-fill */}

      {session.feedbackVariant !== null && (
        <FeedbackOverlay variant={session.feedbackVariant} onSkip={session.skipFeedback} />
      )}

      {session.paused && (
        <PauseOverlay onResume={session.resume} onExit={onExit} />
      )}
    </>
  )
}
```

- [ ] **Step 3:** Wire SessionView w `index.tsx` (zastąp `<div>Session — TODO</div>` na `<LettersSession ...>`)

- [ ] **Step 4:** Run tests + manual

- [ ] **Step 5:** Commit

```bash
git add src/modules/reading/components/SessionView.tsx src/modules/reading/components/SessionView.test.tsx src/modules/reading/index.tsx
git commit -m "feat(reading): SessionView shell — wires useReadingSession + 4 exercises"
```

### Task 6.6: FeedbackOverlay, PauseOverlay, SessionEnd

**Files:** 3 nowe komponenty.

Wzorzec analogiczny do modułu 1 — mostly UI components z callbackami. Reuse logic z `useSession` patterns gdzie możliwe.

- [ ] **Step 1:** FeedbackOverlay — variant ('correct' | 'wrong' | 'dontKnow' | 'wild') → overlay z animacją + audio
- [ ] **Step 2:** PauseOverlay — duży przycisk "Wznów" + ikona "Wyjdź"
- [ ] **Step 3:** SessionEnd — liczniki ✅/❌/🤷 + lista nowych kart album + CTA "Album" / "Wróć"
- [ ] **Step 4:** Commit każdy osobno

```bash
git commit -m "feat(reading): FeedbackOverlay component"
git commit -m "feat(reading): PauseOverlay component"
git commit -m "feat(reading): SessionEnd component"
```

---

## Phase 7 — Mini-scenki słów

### Task 7.1: WordScene component (renderer)

**Files:** `src/modules/reading/components/WordScene.tsx`, `*.test.tsx`

- [ ] **Step 1:** Test — renders emoji, plays audio sequence, calls onComplete after duration

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WordScene } from './WordScene'

describe('WordScene', () => {
  it('renders emoji', () => {
    render(<WordScene scene={{ id: 'test', emoji: '🐱', durationMs: 100, keyframes: [], audio: [] }} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(screen.getByText('🐱')).toBeDefined()
  })

  it('calls onComplete after durationMs', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<WordScene scene={{ id: 'test', emoji: '🐱', durationMs: 1000, keyframes: [], audio: [] }} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={onComplete} />)
    vi.advanceTimersByTime(1100)
    expect(onComplete).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2:** Run (fails)

- [ ] **Step 3:** Implement

```typescript
import { useEffect, useRef } from 'react'
import type { Scene } from '../data/scenes'
import type { AudioBus } from '@/shared/audio/AudioBus'

type Props = {
  scene: Scene
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onComplete: () => void
}

export function WordScene({ scene, audioBus, onComplete }: Props) {
  const completedRef = useRef(false)
  useEffect(() => {
    // Play audio sequence
    let cancelled = false
    ;(async () => {
      for (const audioKey of scene.audio) {
        if (cancelled) break
        await audioBus.play(audioKey)
      }
    })()
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }, scene.durationMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [scene, audioBus, onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(254, 249, 242, 0.95)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontSize: 200,
          animation: scene.keyframes.length > 0 ? `${scene.keyframes[0].name} ${scene.durationMs}ms ease-in-out` : undefined,
        }}
      >
        {scene.emoji}
      </div>
    </div>
  )
}
```

- [ ] **Step 4:** Test PASS
- [ ] **Step 5:** Commit

### Task 7.2: scenes.ts — premiere tier (50-60 scenek)

**Files:** `src/modules/reading/data/scenes.ts`

- [ ] **Step 1:** Define scene type + ALL 20 Płomyk słów × 2-3 wariantów + 5 Ognik favourites × 2-3 wariantów

For each word, define 2-3 Scene objects with unique `id`, `emoji`, `durationMs` 2000-3000ms, `keyframes` (CSS keyframes name + definition inline), `audio` array, optional `effects`.

Plan to write CSS keyframes globally w `src/index.css` lub `<style>` per scene. Inline approach:

```typescript
// scenes.ts (excerpt)
export type Scene = {
  id: string
  emoji: string
  durationMs: number
  keyframes: { name: string; css: string }[]
  audio: string[]
  effects?: string[]
}

export const SCENES_BY_WORD: Record<string, Scene[]> = {
  MAMA: [
    { id: 'mama-v1', emoji: '👩‍👧', durationMs: 2000,
      keyframes: [{ name: 'hugBounce',
                    css: '@keyframes hugBounce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15) rotate(-3deg); } }' }],
      audio: ['word-MAMA', 'sfx-heart-beat'],
      effects: ['hearts'],
    },
    { id: 'mama-v2', emoji: '👩', durationMs: 2500,
      keyframes: [{ name: 'wave',
                    css: '@keyframes wave { 0% { transform: rotate(0); } 50% { transform: rotate(15deg); } 100% { transform: rotate(0); } }' }],
      audio: ['word-MAMA', 'sfx-heart-beat'],
    },
  ],
  KOTY: [
    { id: 'koty-v1', emoji: '🐱', durationMs: 2500,
      keyframes: [{ name: 'runAcross', css: '@keyframes runAcross { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }' }],
      audio: ['word-KOTY', 'sfx-meow'],
    },
    { id: 'koty-v2', emoji: '🐱', durationMs: 3000,
      keyframes: [{ name: 'runFall', css: '@keyframes runFall { 0% { transform: translateX(-100%); } 60% { transform: translateX(0); } 80% { transform: rotate(180deg); } 100% { transform: rotate(360deg) translateX(50%); } }' }],
      audio: ['word-KOTY', 'sfx-meow-angry', 'sfx-purr'],
    },
    { id: 'koty-v3', emoji: '🐱', durationMs: 2800,
      keyframes: [{ name: 'lazyYawn', css: '@keyframes lazyYawn { 0%,50% { transform: scale(1); } 70% { transform: scale(1.2); } 100% { transform: scale(0.95); } }' }],
      audio: ['word-KOTY', 'sfx-yawn', 'sfx-snore'],
    },
  ],
  // ... + 18 więcej Płomyk słów × 2-3 wariantów = ~50 scenek
  // + 5 Ognik favourites (SAMOCHÓD, ŻABA, BANAN, RYBKA, KOTEK) × 2-3 = ~10-15 scenek
}

export function pickRandomScene(wordText: string, seenVariants: string[]): Scene | null {
  const scenes = SCENES_BY_WORD[wordText]
  if (!scenes || scenes.length === 0) return null
  // Wybór preferujący nieobejrzany wariant
  const unseen = scenes.filter(s => !seenVariants.includes(s.id))
  const pool = unseen.length > 0 ? unseen : scenes
  return pool[Math.floor(Math.random() * pool.length)]
}
```

Pełna lista scenek to ~50-60 wpisów; szczegóły keyframes definiowane jak w przykładzie. Patrz spec sekcja 9 dla wytycznych.

- [ ] **Step 2:** Run tsc

- [ ] **Step 3:** Test smoke — `pickRandomScene('MAMA')` zwraca jedną z dwóch.

```typescript
// scenes.test.ts
import { describe, expect, it } from 'vitest'
import { SCENES_BY_WORD, pickRandomScene } from './scenes'

describe('scenes', () => {
  it('MAMA has at least 2 variants', () => {
    expect(SCENES_BY_WORD.MAMA?.length).toBeGreaterThanOrEqual(2)
  })

  it('20 Płomyk words all have at least 2 scenes (premiere tier)', () => {
    const PLOMYK_WORDS = ['MAMA', 'TATA', 'LALA', 'KURA', 'NORA', 'ROSA', 'LATO', 'BABA', 'MAPA', 'TAMA',
                         'NUTA', 'RAMA', 'KORA', 'KOSA', 'SOWA', 'KOTY', 'LAMA', 'KAWA', 'KASA', 'DUDA']
    for (const w of PLOMYK_WORDS) {
      expect(SCENES_BY_WORD[w]).toBeDefined()
      expect(SCENES_BY_WORD[w]!.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('pickRandomScene returns null for unknown word', () => {
    expect(pickRandomScene('NIEZNANE', [])).toBeNull()
  })
})
```

- [ ] **Step 4:** Commit

```bash
git add src/modules/reading/data/scenes.ts src/modules/reading/data/scenes.test.ts
git commit -m "feat(reading): scenes data — 50+ mini-scenek (premiere tier)"
```

### Task 7.3: Integrate WordScene with exercises (Płomyk/Ognik/Pochodnia)

**Files:** `src/modules/reading/components/SessionView.tsx`

- [ ] **Step 1:** W `SessionView`, po correct (Płomyk/Ognik/Pochodnia) → render `<WordScene>` zamiast standardowego FeedbackOverlay (lub po nim, w sekwencji).

```typescript
// w SessionView, w handlerze submitAnswer correct:
const handleAnswerSuccess = (wordText: string) => {
  if (settings.reading?.wordAnimations !== 'off') {
    const scene = pickRandomScene(wordText, session.seenSceneVariants[wordText] ?? [])
    if (scene) {
      setActiveScene(scene)
      // po onComplete sceny → session.skipFeedback() / session.advance()
    } else {
      session.advance()
    }
  } else {
    session.advance()
  }
}
```

- [ ] **Step 2:** Add `seenSceneVariants` tracking w readingStore (żeby preferować nowe warianty)

- [ ] **Step 3:** Test smoke + manual

- [ ] **Step 4:** Commit

```bash
git commit -m "feat(reading): integrate WordScene with exercises (Płomyk/Ognik/Pochodnia)"
```

---

## Phase 8 — Iskra ożywiona + Easter Eggs + Komiczny fail

### Task 8.1: easterEggs.ts data

**Files:** `src/modules/reading/data/easterEggs.ts`

- [ ] **Step 1:** Define 8 easter eggs

```typescript
export type EasterEgg = {
  id: string
  audio: string
  animation: { name: string; css: string }
  durationMs: number
  category: 'mild' | 'silly'
}

export const EASTER_EGGS: EasterEgg[] = [
  { id: 'apsik', audio: 'iskra-apsik', durationMs: 1200, category: 'mild',
    animation: { name: 'sneezeShake', css: '@keyframes sneezeShake { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-15deg) translateY(-20px) scale(1.1); } }' } },
  { id: 'hiccup', audio: 'iskra-hik', durationMs: 2000, category: 'mild',
    animation: { name: 'hiccupBounce', css: '@keyframes hiccupBounce { 0%,100% { transform: translateY(0); } 25% { transform: translateY(-8px) scale(1.05); } }' } },
  { id: 'mlask', audio: 'iskra-mlask', durationMs: 1500, category: 'mild',
    animation: { name: 'chewing', css: '@keyframes chewing { 0%,100% { transform: scale(1); } 50% { transform: scale(0.95) rotate(2deg); } }' } },
  { id: 'brrr', audio: 'iskra-brrr', durationMs: 1500, category: 'mild',
    animation: { name: 'shiverShake', css: '@keyframes shiverShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }' } },
  { id: 'salto', audio: 'iskra-ojej', durationMs: 1800, category: 'mild',
    animation: { name: 'backflipLand', css: '@keyframes backflipLand { 0% { transform: rotate(0); } 50% { transform: rotate(360deg) translateY(-30px); } 100% { transform: rotate(360deg); } }' } },
  { id: 'gibberish', audio: 'iskra-plamplam', durationMs: 1600, category: 'mild',
    animation: { name: 'wiggleWalk', css: '@keyframes wiggleWalk { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-5deg) translateX(-3px); } 75% { transform: rotate(5deg) translateX(3px); } }' } },
  { id: 'burp', audio: 'iskra-uuups', durationMs: 1200, category: 'silly',
    animation: { name: 'bellySwell', css: '@keyframes bellySwell { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25, 0.85); } }' } },
  { id: 'sparkle-fart', audio: 'sfx-pop', durationMs: 1400, category: 'silly',
    animation: { name: 'sparkleFartCloud', css: '@keyframes sparkleFartCloud { 0% { transform: translateY(0); filter: blur(0); } 100% { transform: translateY(-20px); filter: blur(2px); opacity: 0.5; } }' } },
]

export function pickRandomEasterEgg(humorMode: 'on' | 'off'): EasterEgg {
  const pool = humorMode === 'on' ? EASTER_EGGS : EASTER_EGGS.filter(e => e.category === 'mild')
  return pool[Math.floor(Math.random() * pool.length)]
}
```

- [ ] **Step 2:** Commit

### Task 8.2: useIskraReactions hook

**Files:** `src/modules/reading/hooks/useIskraReactions.ts`

- [ ] **Step 1:** Implement — wraps easter egg + komiczny fail logic, zwraca aktualną reakcję + funkcje triggerujące

```typescript
import { useState, useCallback } from 'react'
import { EASTER_EGGS, pickRandomEasterEgg, type EasterEgg } from '../data/easterEggs'
import { useSettings } from '@/shared/settings/settingsStore'

export type IskraReaction = {
  type: 'idle' | 'success' | 'streak' | 'wild' | 'easter-egg' | 'comic-fail'
  data?: EasterEgg | { variant: string }
}

export function useIskraReactions() {
  const humorMode = useSettings(s => s.settings.humorMode ?? 'on')
  const [reaction, setReaction] = useState<IskraReaction>({ type: 'idle' })

  const triggerEasterEgg = useCallback(() => {
    const egg = pickRandomEasterEgg(humorMode)
    setReaction({ type: 'easter-egg', data: egg })
    setTimeout(() => setReaction({ type: 'idle' }), egg.durationMs)
  }, [humorMode])

  const triggerComicFail = useCallback(() => {
    const variants = ['scratch', 'eatBanana', 'confusionDance', 'sigh', 'sillyFace']
    const variant = variants[Math.floor(Math.random() * variants.length)]
    setReaction({ type: 'comic-fail', data: { variant } })
    setTimeout(() => setReaction({ type: 'idle' }), 1000)
  }, [])

  // ... triggerSuccess, triggerStreak, triggerWild

  return { reaction, triggerEasterEgg, triggerComicFail }
}
```

- [ ] **Step 2:** Commit

### Task 8.3: IskraMascotAnimated component

**Files:** `src/modules/reading/components/IskraMascotAnimated.tsx`

- [ ] **Step 1:** Implement — wraps `IskraMascot` z modułu shared + animacje wg `reaction` z `useIskraReactions`

```typescript
import { useEffect } from 'react'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { useIskraReactions, type IskraReaction } from '../hooks/useIskraReactions'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import type { AudioBus } from '@/shared/audio/AudioBus'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  size?: number
  intensity?: number
  enableEasterEggsOnTap?: boolean
}

export function IskraMascotAnimated({ audioBus, size = 80, intensity = 1, enableEasterEggsOnTap = false }: Props) {
  const { reaction, triggerEasterEgg } = useIskraReactions()

  // Play audio of easter egg
  useEffect(() => {
    if (reaction.type === 'easter-egg' && reaction.data) {
      const egg = reaction.data as { audio: string }
      void audioBus.play(egg.audio)
    }
  }, [reaction, audioBus])

  const tapHandlers = useTapHandler(enableEasterEggsOnTap ? triggerEasterEgg : () => {})

  const animationStyle = reaction.type === 'easter-egg' && reaction.data
    ? { animation: `${(reaction.data as { animation: { name: string } }).animation.name} ${(reaction.data as { durationMs: number }).durationMs}ms ease-in-out` }
    : reaction.type === 'comic-fail'
    ? { animation: `${(reaction.data as { variant: string }).variant} 1s ease-in-out` }
    : undefined

  return (
    <>
      {/* Inject keyframes — alternatively in src/index.css globally */}
      {reaction.type === 'easter-egg' && reaction.data && (
        <style>{(reaction.data as { animation: { css: string } }).animation.css}</style>
      )}
      <div {...tapHandlers} style={animationStyle}>
        <IskraMascot size={size} intensity={intensity} />
      </div>
    </>
  )
}
```

- [ ] **Step 2:** Use `IskraMascotAnimated` w SessionView (tam gdzie wcześniej był `IskraMascot`) — w pasku statusu, na pause overlay, w SessionEnd. W LevelSelect z `enableEasterEggsOnTap={true}`. W Album z `enableEasterEggsOnTap={true}`.

- [ ] **Step 3:** Commit

```bash
git commit -m "feat(reading): IskraMascotAnimated with easter eggs + reactions"
```

### Task 8.4: Komiczny fail integration

**Files:** `src/modules/reading/components/FeedbackOverlay.tsx`, `useReadingSession.ts`

- [ ] **Step 1:** W `FeedbackOverlay` `variant === 'wrong'` lub `'dontKnow'` → trigger `triggerComicFail()` z `useIskraReactions`. Czas trwania komiczny fail = 1s, krótszy niż correct celebration.

- [ ] **Step 2:** Commit

```bash
git commit -m "feat(reading): komiczny fail Iskry przy wrong/dontKnow"
```

---

## Phase 9 — Album słów

### Task 9.1: WordAlbum component

**Files:** `src/modules/reading/components/WordAlbum.tsx`, `*.test.tsx`

- [ ] **Step 1:** Test — renders unlocked cards, placeholder for locked

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WordAlbum } from './WordAlbum'

describe('WordAlbum', () => {
  it('renders unlocked card with emoji', () => {
    // mock useReading hook to return albumUnlocked: ['word-MAMA']
    // ...
    render(<MemoryRouter><WordAlbum audioBus={{ play: vi.fn(), stop: vi.fn() }} onExit={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('👩‍👧')).toBeDefined()
  })

  it('renders ? placeholder for locked card', () => {
    render(<MemoryRouter><WordAlbum audioBus={{ play: vi.fn(), stop: vi.fn() }} onExit={vi.fn()} /></MemoryRouter>)
    // jeśli lista albumUnlocked jest pusta — wszystkie karty pokazują ?
    const placeholders = screen.queryAllByText('?')
    expect(placeholders.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2:** Implement

```typescript
import { useState, useCallback } from 'react'
import { useReading } from '../store/readingStore'
import { ALL_WORDS, getWordById } from '../data/words'
import { pickRandomScene } from '../data/scenes'
import { WordScene } from './WordScene'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Level } from '@/shared/settings/types'

type Filter = 'all' | Level

export function WordAlbum({ audioBus, onExit }: { audioBus: Pick<AudioBus, 'play' | 'stop'>; onExit: () => void }) {
  const albumUnlocked = useReading(s => s.albumUnlocked)
  const [filter, setFilter] = useState<Filter>('all')
  const [activeScene, setActiveScene] = useState<{ wordId: string; sceneId: string } | null>(null)

  const filtered = ALL_WORDS.filter(w => filter === 'all' || w.level === filter)

  const totalCount = ALL_WORDS.length
  const unlockedCount = albumUnlocked.length

  const handleCardTap = (wordId: string) => {
    if (!albumUnlocked.includes(wordId)) return
    const word = getWordById(wordId)
    if (!word) return
    const scene = pickRandomScene(word.text, [])
    if (scene) {
      setActiveScene({ wordId, sceneId: scene.id })
    }
    void audioBus.play(`word-${word.text}`)
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 28, fontWeight: 700 }}>
          Album Iskry
        </div>
        <div style={{ fontSize: 16, color: '#6b7280' }}>
          {unlockedCount} z {totalCount}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'plomyk', 'ognik', 'pochodnia'] as Filter[]).map(f => (
          <button key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: filter === f ? '#f59e0b' : '#f3f4f6',
                    color: filter === f ? 'white' : '#4b5563',
                  }}>
            {f === 'all' ? 'Wszystkie' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid of cards */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {filtered.map(w => (
            <AlbumCard key={w.id} word={w} unlocked={albumUnlocked.includes(w.id)} onTap={() => handleCardTap(w.id)} />
          ))}
        </div>
      </div>

      {activeScene && (
        <WordScene
          scene={pickRandomScene(getWordById(activeScene.wordId)!.text, [])!}
          audioBus={audioBus}
          onComplete={() => setActiveScene(null)}
        />
      )}
    </div>
  )
}

function AlbumCard({ word, unlocked, onTap }: { word: typeof ALL_WORDS[number]; unlocked: boolean; onTap: () => void }) {
  const handlers = useTapHandler(onTap)
  return (
    <button
      {...handlers}
      aria-label={`karta ${word.text}`}
      style={{
        aspectRatio: '1',
        background: unlocked ? '#d1fae5' : '#f3f4f6',
        border: `2px solid ${unlocked ? '#10b981' : '#d1d5db'}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: unlocked ? 1 : 0.5,
        cursor: unlocked ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 36 }}>
        {unlocked ? word.albumEmoji : '?'}
      </div>
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 14, fontWeight: 700 }}>
        {unlocked ? word.text : ''}
      </div>
    </button>
  )
}
```

- [ ] **Step 3:** Wire route `/reading/album` w `index.tsx`

- [ ] **Step 4:** Add tile/link from SessionEnd ("Zobacz album") + from ReadingLevelSelect (małe kafelek "Album X/67")

- [ ] **Step 5:** Test PASS

- [ ] **Step 6:** Commit

```bash
git commit -m "feat(reading): WordAlbum with grid, filter, scene replay"
```

### Task 9.2: Card unlock ceremony (every 10th)

**Files:** `src/modules/reading/components/SessionEnd.tsx`, `src/modules/reading/store/readingStore.ts`

- [ ] **Step 1:** W `applySessionResults` w storze — gdy nowa unlock przekroczy próg co 10 (10/20/30/40/50/60), set flag `pendingCeremony: true`

- [ ] **Step 2:** SessionEnd reads flag, jeśli true → renderuje ceremonię (animacja confetti + Iskra "ŁAAŁ! 10 kart!" + audio fanfara-special)

- [ ] **Step 3:** Po zamknięciu ceremonii, clear flag

- [ ] **Step 4:** Commit

---

## Phase 10 — Wild celebrations

### Task 10.1: WildCelebration component + 5 wariantów

**Files:** `src/modules/reading/components/WildCelebration.tsx`, `src/modules/reading/components/celebrations/*.tsx`, `src/modules/reading/data/wildCelebrations.ts`

- [ ] **Step 1:** Define 5 components

Każdy w osobnym pliku — RocketBlast, FallingFruits, ScreenFlip, DancingAvocado, RainbowRun. Każdy jako default-exported komponent z props `{ onComplete: () => void }` i fixed durationMs.

Przykład `RocketBlast.tsx`:

```typescript
import { useEffect } from 'react'

export function RocketBlast({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2000)
    return () => clearTimeout(t)
  }, [onComplete])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes rocketBlast { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-100vh) scale(0.4); } }`}</style>
      <div style={{ fontSize: 100, animation: 'rocketBlast 2s ease-in' }}>🚀</div>
    </div>
  )
}
```

Analogicznie:
- **FallingFruits** — kilka emoji 🍌🥑🦄⭐ z animacją `fallFruit` (translateY + rotate)
- **ScreenFlip** — wraps `children` z `rotate(360deg)` na 1.5s
- **DancingAvocado** — 🥑 z bouncing animation
- **RainbowRun** — gradient tła + Iskra biegnie po szerokości

- [ ] **Step 2:** `wildCelebrations.ts`

```typescript
import type { ComponentType } from 'react'
import { RocketBlast } from '../components/celebrations/RocketBlast'
import { FallingFruits } from '../components/celebrations/FallingFruits'
import { ScreenFlip } from '../components/celebrations/ScreenFlip'
import { DancingAvocado } from '../components/celebrations/DancingAvocado'
import { RainbowRun } from '../components/celebrations/RainbowRun'

export type WildCelebrationDef = {
  id: string
  durationMs: number
  Component: ComponentType<{ onComplete: () => void }>
  audio: string[]
}

export const WILD_CELEBRATIONS: WildCelebrationDef[] = [
  { id: 'rocket', durationMs: 2000, Component: RocketBlast, audio: ['sfx-fanfara-special', 'iskra-piuuu'] },
  { id: 'fruits', durationMs: 2500, Component: FallingFruits, audio: ['sfx-fanfara-special', 'sfx-confetti'] },
  { id: 'flip', durationMs: 1500, Component: ScreenFlip, audio: ['sfx-whoosh', 'sfx-fanfara-2'] },
  { id: 'avocado', durationMs: 2000, Component: DancingAvocado, audio: ['sfx-fanfara-1', 'iskra-haha'] },
  { id: 'rainbow', durationMs: 2500, Component: RainbowRun, audio: ['sfx-fanfara-special'] },
]

export function pickRandomWildCelebration(): WildCelebrationDef {
  return WILD_CELEBRATIONS[Math.floor(Math.random() * WILD_CELEBRATIONS.length)]
}
```

- [ ] **Step 3:** `WildCelebration` wrapper component

```typescript
import { useEffect } from 'react'
import type { WildCelebrationDef } from '../data/wildCelebrations'
import type { AudioBus } from '@/shared/audio/AudioBus'

export function WildCelebration({ def, audioBus, onComplete }: {
  def: WildCelebrationDef
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onComplete: () => void
}) {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const a of def.audio) {
        if (cancelled) break
        await audioBus.play(a)
      }
    })()
    return () => { cancelled = true }
  }, [def, audioBus])
  return <def.Component onComplete={onComplete} />
}
```

- [ ] **Step 4:** Wire w SessionView — po correct, sprawdź wild trigger:

```typescript
// w submitAnswer correct handler:
const wildFreq = settings.reading?.wildCelebrationFreq ?? 8
const counter = useReading.getState().wildCelebrationCounter
const jitter = Math.floor(Math.random() * 5) - 2  // ±2
if (counter + 1 >= wildFreq + jitter) {
  setActiveWildCelebration(pickRandomWildCelebration())
  useReading.getState().resetWildCounter()
} else {
  useReading.getState().incrementWildCounter()
  // standard flow
}
```

- [ ] **Step 5:** Commit każdy variant celebration osobno + wrapper + integration

---

## Phase 11 — Settings + raport rodzica

### Task 11.1: Extend Settings type with `humorMode` + `reading.*`

**Files:** `src/shared/settings/types.ts`

- [ ] **Step 1:** Edit types

```typescript
export type HumorMode = 'on' | 'off'
export type WordAnimations = 'on' | 'off'

export type Settings = {
  // existing fields ... (cały moduł 1)

  humorMode?: HumorMode             // default 'on' — global, wpływa na obu modułach

  reading?: {
    wordAnimations?: WordAnimations  // default 'on'
    wildCelebrationFreq?: number     // default 8, range 3-15
    questionsPerSession?: Partial<Record<Level, number>>  // default 8
    timeLimit?: Partial<Record<Level, TimeLimit>>          // default 'off'
  }
}
```

- [ ] **Step 2:** Update `defaultSettings` w `settingsStore.ts`:

```typescript
const defaultSettings: Settings = {
  // ... existing
  humorMode: 'on',
  reading: {
    wordAnimations: 'on',
    wildCelebrationFreq: 8,
    questionsPerSession: { iskierka: 8, plomyk: 8, ognik: 8, pochodnia: 8 },
    timeLimit: { iskierka: 'off', plomyk: 'off', ognik: 'off', pochodnia: 'off' },
  },
}
```

- [ ] **Step 3:** Migration v4→v5

```typescript
// w settingsStore persist config:
version: 5,
migrate: (persistedState, version) => {
  if (version < 5) {
    const s = persistedState as any
    return {
      ...s,
      humorMode: s.humorMode ?? 'on',
      reading: s.reading ?? {
        wordAnimations: 'on',
        wildCelebrationFreq: 8,
        questionsPerSession: { iskierka: 8, plomyk: 8, ognik: 8, pochodnia: 8 },
        timeLimit: { iskierka: 'off', plomyk: 'off', ognik: 'off', pochodnia: 'off' },
      },
    }
  }
  return persistedState
},
```

- [ ] **Step 4:** Run tests, expect all pass

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(settings): extend Settings z humorMode + reading.* (migration v4→v5)"
```

### Task 11.2: SettingsScreen UI dla nowych opcji

**Files:** `src/shared/settings/components/SettingsScreen.tsx` (lub odpowiedni)

- [ ] **Step 1:** Find current SettingsScreen, add sekcja "Czytanie" z toggles + slider

```typescript
// (excerpt) sekcja Czytanie
<section>
  <h3>Czytanie (moduł 2)</h3>

  <ToggleField
    label="Animacje słów"
    description="Po poprawnej odpowiedzi gra animowana scenka pokazująca znaczenie."
    value={settings.reading?.wordAnimations === 'on'}
    onChange={(v) => update('reading', { ...settings.reading, wordAnimations: v ? 'on' : 'off' })}
  />

  <ToggleField
    label="Humor (apsik, czkawka, beknięcie)"
    description="Iskra wykonuje śmieszne reakcje (kontrowersyjne — beknięcie, pierdnięcie iskier). Wyłącz jeśli niepożądane."
    value={settings.humorMode === 'on'}
    onChange={(v) => update('humorMode', v ? 'on' : 'off')}
  />

  <SliderField
    label="Częstotliwość wielkich celebracji"
    description="Co ile poprawnych odpowiedzi gra niespodzianka (rakieta, spadające frukty, salto ekranu)"
    min={3}
    max={15}
    value={settings.reading?.wildCelebrationFreq ?? 8}
    onChange={(v) => update('reading', { ...settings.reading, wildCelebrationFreq: v })}
  />
</section>
```

(`ToggleField`, `SliderField` — generic UI komponenty, definiuj inline jeśli nie istnieją.)

- [ ] **Step 2:** Commit

```bash
git commit -m "feat(settings): UI dla humorMode + reading.* w SettingsScreen"
```

### Task 11.3: Raport rodzica — sekcja Czytanie

**Files:** `src/shared/stats/components/ReportScreen.tsx`

- [ ] **Step 1:** Add ReadingReportSection that reads from `useReading` store

Sekcje:
- **Sylaby opanowane** — lista z `box >= 5`
- **Sylaby trudne** — `recentWrong > 0` lub `box <= 2`
- **Słowa opanowane (Album)** — count per level
- **Słowa trudne** — analogiczne
- **Heatmapa fonemów** — siatka SZ/CZ/RZ/CH/Ś/Ć/Ź/Ń/Ó/U × poziom z kolorami
- **Log sesji** — chronologicznie

Implementacja ~150 linii.

- [ ] **Step 2:** Commit

```bash
git commit -m "feat(stats): raport rodzica — sekcja Czytanie z heatmapą fonemów"
```

---

## Phase 12 — Status bar, intros, polish

### Task 12.1: Status bar w SessionView

Reuse pattern z modułu 1: licznik iskierek + kropki postępu + pause button. Dodaj IskraMascotAnimated jako element decorative.

- [ ] **Step 1-3:** Implement + test + commit

### Task 12.2: Onboarding głosowy intros

W `SessionView` `useEffect` mount → sprawdź `seenIntros`, odtwórz odpowiednie intro.

Klucze intro:
- `reading-iskierka-intro`
- `reading-plomyk-intro`
- `reading-ognik-intro`
- `reading-pochodnia-intro`
- `reading-album-intro`
- `home-letters-intro`
- `home-reading-intro`

- [ ] **Step 1-3:** Implement, test, commit

### Task 12.3: Anti-cheat (idle 20s + page visibility)

Reuse `useEngagement` hook z modułu 1 (sprawdź `src/shared/engagement/`). Wire do SessionView pause overlay.

- [ ] **Step 1:** Wire
- [ ] **Step 2:** Manual test (open new tab → expect pause)
- [ ] **Step 3:** Commit

---

## Phase 13 — Final integration & testing

### Task 13.1: PWA precache update

**Files:** `vite.config.ts`

- [ ] **Step 1:** Sprawdź workbox config, upewnij się że nowe audio assets (sfx + iskra-reactions + syllables + reading-ui-strings) są w precache pattern.

```typescript
// vite.config.ts (excerpt)
VitePWA({
  // ...
  workbox: {
    globPatterns: ['**/*.{js,css,html,mp3,svg,png,ico,woff2,webmanifest}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
})
```

- [ ] **Step 2:** Run build

```bash
pnpm build
```

Expected: precache count zwiększony o ~140 nowych entries.

- [ ] **Step 3:** Commit

```bash
git commit -m "chore(pwa): precache nowych audio assets modułu 2"
```

### Task 13.2: Update CLAUDE.md i STATUS.md

- [ ] **Step 1:** Edit `CLAUDE.md` — dodaj wzmiankę o module 2 (`src/modules/reading/`), nowych settings, nowym key `iskierki-reading-v1`

- [ ] **Step 2:** Edit `docs/STATUS.md` — opisz stan po implementacji modułu 2 (live URL nadal ten sam, dwa moduły dostępne)

- [ ] **Step 3:** Commit

```bash
git commit -m "docs: update CLAUDE.md i STATUS.md po module 2"
```

### Task 13.3: Manual iPad checklist

- [ ] **Step 1:** Run on iPad — symulator lub real device

```bash
pnpm dev
```

iPad Safari → http://[Mac IP]:5173

- [ ] **Step 2:** Sprawdź checklist:
  - [ ] Home → 2 kafelki widoczne, klikalne
  - [ ] Tap "Czytanie" → ReadingLevelSelect
  - [ ] Tap "Iskierka" → onboarding głosowy gra raz, potem cisza przy ponownych wejściach
  - [ ] Iskierka session — 8 pytań, audio gra od razu, mini-scenki gracji nie ma (sylaby bez scen)
  - [ ] Tap "Płomyk" → onboarding "ułóż słowo z sylab"
  - [ ] Drag sylaby palcem — magnetyzm działa, sylaba "wskakuje" w slot na <40px
  - [ ] Drag Apple Pencil — działa identycznie (no jitter)
  - [ ] Po complete słowa Płomyk → mini-scenka odgrywa się (np. KOTY → kot przebiega)
  - [ ] Drugi raz to samo słowo → inna scenka (jeśli ma >1 wariantów)
  - [ ] Tap "Ognik" → audio→słowo, 4 napisane słowa, dwuznaki czytelne (SZAFA, RZEKA)
  - [ ] Tap "Pochodnia" → uzupełnij sylabę, gap visible, wybór działa
  - [ ] Po sesji → SessionEnd, "Zobacz album" → Album opens
  - [ ] Album: niewypełnione karty pokazują ?, wypełnione mają emoji + napis
  - [ ] Tap karty wypełnionej → mini-scenka + audio
  - [ ] Tap Iskry w Album → easter egg (apsik / czkawka / beknięcie / etc.) — losowy
  - [ ] Wild celebration triggeruje się po ~7-9 correct (jitter ±2)
  - [ ] Settings (math gate → panel) → toggle humor OFF → easter eggi 'silly' nie pojawiają się
  - [ ] Settings → wild slider zmienia frequency
  - [ ] Idle 20s w sesji → auto-pauza
  - [ ] Tab switch → auto-pauza
  - [ ] Audio nie nakłada się przy wielokrotnym tap 🔊
  - [ ] Performance — czas startu sesji ≤ 1s
  - [ ] Brak scrolla w sesji (wszystko w viewport)

- [ ] **Step 3:** Issues found → fix iteratively, commit

### Task 13.4: Run full test suite

- [ ] **Step 1:**

```bash
pnpm test --run
```

Expected: ≥460 testów (389 z modułu 1 + ~70-90 nowych) all green.

- [ ] **Step 2:**

```bash
pnpm tsc -b
pnpm build
```

Expected: zielono.

- [ ] **Step 3:**

```bash
pnpm audio:check
```

Expected: wszystkie nowe klucze mają pliki MP3.

- [ ] **Step 4:** Commit final tag

```bash
git tag -a v2.0-reading-module -m "Moduł 2: nauka czytania słów"
git push origin main --tags
```

---

## Sprawdzenie pokrycia spec'a

Po napisaniu planu, sprawdziłem każdą sekcję spec'a:

- §1 Wizja → covered by Phase 0-13 całość
- §2 Target user → covered (RWD, iPad-first w Task 13.3)
- §3 Stack → Phase 0
- §4 Struktura → mapa plików + tasks
- §5 Routing → Task 2.7, 2.8, 5.5
- §6 Pętla nauki → Phase 4 (useReadingSession), Phase 6 (exercises)
- §7 SRS → Phase 1
- §8 Słownik → Phase 2 (data) + Phase 3 (audio)
- §9 Mini-scenki → Phase 7
- §10 Iskra ożywiona → Phase 8
- §11 Wild celebrations → Phase 10
- §12 Album → Phase 9
- §13 Audio bogate feedback → Phase 3.6 (SFX)
- §14 Settings → Phase 11
- §15 Persistence → Phase 2.5 (readingStore) + Phase 11.1 (settings migration)
- §16 Raport rodzica → Phase 11.3
- §17 Implementacja roadmap → ten plan dokładnie
- §18 Otwarte decyzje → wszystkie zamknięte w spec po finalizacji
- §19 Out of scope → respektowane (no tracing, no STT)
- §20 Kryteria sukcesu → checklist Task 13.3 + 13.4

**Brak luk.**
