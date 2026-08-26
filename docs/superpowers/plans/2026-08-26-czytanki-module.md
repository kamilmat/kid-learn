# Moduł 4 Czytanki — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Czwarty moduł „Czytanki" — 60 czytanek do swobodnego czytania sylabami (tap sylaby → audio sylaby, long-press → audio słowa, ▶ czyta całość), każda z animowaną sceną emoji.

**Architecture:** Nowy `src/modules/czytanki/` (routes `/czytanki`, `/czytanki/:id`), własny Zustand store `iskierki-czytanki-v1`, dane czytanek w TS, klucze audio wyprowadzane z danych, skrypt generujący `audio-source/czytanki.json`. Reużywa shared (AudioBus, KidNav, IskraMascot, useTapHandler, levelIcons, theme).

**Tech Stack:** React 19, TS strict, Zustand persist, react-router-dom 7, Vitest, tsx (skrypty), Edge TTS przez `pnpm audio:build`.

**Spec:** `docs/superpowers/specs/2026-08-26-czytanki-module-design.md`

## Global Constraints

- TS strict, brak `any` / `@ts-ignore`. Function components, named exports.
- Klucze audio **lowercase**, tylko `[a-z0-9_-]` (macOS APFS maskuje 404 na Linux GH Pages).
- Tap-targety ≥ 60×60. Bez tekstu do czytania w UI dziecka (poza samą czytanką). Polskie napisy dla rodzica.
- Tokeny z `@/app/theme` (`colors`, `radii`, `tapTargets`). Fonty: `var(--font-block)` (Lexend) dla tekstu czytanki, `var(--font-handwritten)` (Kalam) dla tytułów.
- Persist `merge` callback z defaultami dla każdego pola store.
- `audioBus.stop()` przed każdym nowym odtworzeniem na tap.
- Testy tylko dla danych/kluczy/store (preferencja usera: „nie nadmiarowe testy"). Reszta w przeglądarce.
- Commit po każdym tasku, message po polsku w stylu `feat(czytanki): …`.

---

### Task 1: Przeniesienie `getSyllableColor` do shared

**Files:**
- Create: `src/shared/ui/syllableColors.ts`
- Delete: `src/modules/reading/utils/syllableColors.ts`
- Modify: `src/modules/reading/components/SyllableText.tsx:4`, `src/modules/reading/components/DropSlot.tsx:6`, `src/modules/reading/components/exercises/SyllableFillExercise.tsx:12`

**Interfaces:**
- Produces: `getSyllableColor(index: number): string` z `@/shared/ui/syllableColors`

- [ ] **Step 1: Przenieś plik**

```bash
git mv src/modules/reading/utils/syllableColors.ts src/shared/ui/syllableColors.ts
rmdir src/modules/reading/utils 2>/dev/null || true
```

- [ ] **Step 2: Popraw importy w 3 plikach modułu reading**

W każdym zamień ścieżkę względną na `import { getSyllableColor } from '@/shared/ui/syllableColors'`.

- [ ] **Step 3: Sprawdź**

Run: `pnpm tsc -b && pnpm test --run`
Expected: 0 błędów, 559/559 zielone.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor(shared): getSyllableColor do shared/ui (reużycie w module czytanek)"
```

---

### Task 2: Klucze audio + slugPl

**Files:**
- Create: `src/modules/czytanki/data/audioKeys.ts`, `src/modules/czytanki/data/audioKeys.test.ts`

**Interfaces:**
- Produces: `slugPl(text: string): string`, `syllableAudioKey(syl: string): string` → `cz-syl-<slug>`, `wordAudioKey(syllables: readonly string[]): string` → `cz-word-<slug>`, `AUDIO_KEY_RE`

- [ ] **Step 1: Test**

```ts
// src/modules/czytanki/data/audioKeys.test.ts
import { describe, it, expect } from 'vitest'
import { slugPl, syllableAudioKey, wordAudioKey, AUDIO_KEY_RE } from './audioKeys'

describe('audioKeys', () => {
  it('slugPl mapuje polskie znaki i lowercase', () => {
    expect(slugPl('ŻĄDŁO')).toBe('z-a_dl_o')
    expect(slugPl('Łąka')).toBe('l_a_ka')
    expect(slugPl('MA')).toBe('ma')
  })
  it('klucze mają prefixy i przechodzą regex', () => {
    expect(syllableAudioKey('KO')).toBe('cz-syl-ko')
    expect(wordAudioKey(['KO', 'TA'])).toBe('cz-word-kota')
    expect(AUDIO_KEY_RE.test(wordAudioKey(['GĘŚ']))).toBe(true)
  })
})
```

- [ ] **Step 2: Run** `pnpm vitest --run src/modules/czytanki/data/audioKeys.test.ts` → FAIL (module not found)

- [ ] **Step 3: Implementacja**

```ts
// src/modules/czytanki/data/audioKeys.ts
// Klucze audio muszą być lowercase ASCII — macOS APFS jest case-insensitive
// i maskuje 404, które wychodzą dopiero na GH Pages (Linux).
const PL_MAP: Record<string, string> = {
  ą: 'a_', ę: 'e_', ó: 'o_', ł: 'l_', ś: 's_', ć: 'c_', ń: 'n_', ź: 'z_', ż: 'z-',
}

export const AUDIO_KEY_RE = /^[a-z0-9_-]+$/

export function slugPl(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => PL_MAP[ch] ?? ch)
    .join('')
}

export function syllableAudioKey(syllable: string): string {
  return `cz-syl-${slugPl(syllable)}`
}

export function wordAudioKey(syllables: readonly string[]): string {
  return `cz-word-${slugPl(syllables.join(''))}`
}
```

- [ ] **Step 4: Run test** → PASS
- [ ] **Step 5: Commit** `git add src/modules/czytanki && git commit -m "feat(czytanki): klucze audio + slugPl"`

---

### Task 3: Typy danych, sceny i 60 czytanek

**Files:**
- Create: `src/modules/czytanki/data/types.ts`, `src/modules/czytanki/data/czytanki.ts`, `src/modules/czytanki/data/czytanki.test.ts`

**Interfaces:**
- Produces: typy `Word`, `Sentence`, `Czytanka`, `CzytankaGroup`, `BgKind`, `AnimKind`, `Actor`, `SceneSpec`; `CZYTANKI: readonly Czytanka[]`; `getCzytankaById(id): Czytanka | undefined`; `GROUP_ORDER: readonly CzytankaGroup[]`; `getCzytankiByGroup(g): Czytanka[]`

- [ ] **Step 1: Typy**

```ts
// src/modules/czytanki/data/types.ts
export type Punct = '.' | '!' | '?' | ','
export type Word = { syllables: readonly string[]; punct?: Punct }
export type Sentence = readonly Word[]
export type CzytankaGroup = 1 | 2 | 3 | 4

export type BgKind = 'sky' | 'room' | 'meadow' | 'forest' | 'beach' | 'night' | 'snow' | 'kitchen'
export type AnimKind = 'bob' | 'sway' | 'pulse' | 'wiggle' | 'float' | 'none'
export type Actor = {
  emoji: string
  x: number      // % szerokości sceny (środek aktora)
  y: number      // % wysokości sceny
  size: number   // px (font-size emoji)
  anim: AnimKind
  delay?: number // s, przesunięcie fazy animacji
}
export type SceneSpec = { bg: BgKind; actors: readonly Actor[] }

export type Czytanka = {
  id: string          // 'cz-01' … 'cz-60'
  group: CzytankaGroup
  title: string       // dla rodzica
  emoji: string       // ikona kafelka
  sentences: readonly Sentence[]
  scene: SceneSpec
}
```

- [ ] **Step 2: Test danych**

```ts
// src/modules/czytanki/data/czytanki.test.ts
import { describe, it, expect } from 'vitest'
import { CZYTANKI, getCzytankiByGroup, getCzytankaById } from './czytanki'
import { AUDIO_KEY_RE, syllableAudioKey, wordAudioKey } from './audioKeys'

const OPEN_CV = /^[BCDFGHJKLŁMNPRSTWZ]?[AEIOUYÓ]$/u

describe('CZYTANKI', () => {
  it('60 sztuk, unikalne id cz-NN, 15 na grupę', () => {
    expect(CZYTANKI).toHaveLength(60)
    const ids = new Set(CZYTANKI.map((c) => c.id))
    expect(ids.size).toBe(60)
    for (const c of CZYTANKI) expect(c.id).toMatch(/^cz-\d{2}$/)
    for (const g of [1, 2, 3, 4] as const) expect(getCzytankiByGroup(g)).toHaveLength(15)
  })
  it('grupa 1: dokładnie 1 zdanie × 3 słowa, tylko sylaby otwarte', () => {
    for (const c of getCzytankiByGroup(1)) {
      expect(c.sentences).toHaveLength(1)
      expect(c.sentences[0]).toHaveLength(3)
      for (const w of c.sentences[0]!) for (const s of w.syllables) expect(s, `${c.id} ${s}`).toMatch(OPEN_CV)
    }
  })
  it('każde zdanie kończy się punct, sylaby niepuste, klucze audio poprawne', () => {
    for (const c of CZYTANKI) {
      expect(c.sentences.length).toBeGreaterThan(0)
      for (const sent of c.sentences) {
        expect(sent.length).toBeGreaterThan(0)
        expect(sent[sent.length - 1]!.punct).toBeDefined()
        for (const w of sent) {
          expect(w.syllables.length).toBeGreaterThan(0)
          for (const s of w.syllables) {
            expect(s.length).toBeGreaterThan(0)
            expect(syllableAudioKey(s)).toMatch(AUDIO_KEY_RE)
          }
          expect(wordAudioKey(w.syllables)).toMatch(AUDIO_KEY_RE)
        }
      }
    }
  })
  it('sceny: 1–5 aktorów, pozycje 0–100', () => {
    for (const c of CZYTANKI) {
      expect(c.scene.actors.length).toBeGreaterThanOrEqual(1)
      expect(c.scene.actors.length).toBeLessThanOrEqual(5)
      for (const a of c.scene.actors) {
        expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThanOrEqual(100)
        expect(a.y).toBeGreaterThanOrEqual(0); expect(a.y).toBeLessThanOrEqual(100)
      }
    }
  })
  it('getCzytankaById', () => {
    expect(getCzytankaById('cz-01')?.group).toBe(1)
    expect(getCzytankaById('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run** → FAIL

- [ ] **Step 4: Napisz 60 czytanek**

Reguły autorskie (egzekwowane testem tam, gdzie się da):
- Sylaby WIELKIMI literami z polskimi znakami (`'KO'`, `'GĘŚ'`). Podział: spółgłoska między samogłoskami → do następnej sylaby (KO-TA, MA-MA, LA-LA); sylaba zamknięta gdy słowo kończy się spółgłoską (DOM, KOT, LAS, PIES→PIES jedna sylaba); dwuznaki nierozdzielne (SZ, CZ, RZ, CH, DZ); zbitki na początku razem (KRO-WA, DRZE-WO, PTAK).
- Grupa 1 (cz-01…15): 1 zdanie, 3 słowa, **wyłącznie** sylaby CV z listy dozwolonych spółgłosek regexu `OPEN_CV`. Przykłady poprawne: `TA-TA MA KO-TA.` · `MA-MA MA BU-TY.` · `TO JE KO-ZA.` · `O-LA MA RO-WE-RY.` (sylaba samogłoskowa `O` jest OK). Niepoprawne w gr. 1: `LA-LĘ` (Ę), `DOM` (zamknięta), `SZA-FA` (dwuznak).
- Grupa 2 (cz-16…30): 2 zdania, 3–4 słowa; wolno sylaby zamknięte i spójniki `I`, `A`, `TO`, `TU`.
- Grupa 3 (cz-31…45): 3–4 zdania, 3–5 słów; obowiązkowo w każdej czytance ≥1 słowo z dwuznakiem SZ/CZ/RZ/CH/DZ lub ę/ą/ó.
- Grupa 4 (cz-46…60): 5–6 zdań, 3–6 słów; ≥1 słowo 3-sylabowe i ≥1 zbitka spółgłoskowa.
- Tematyka: rodzina, zwierzęta domowe i leśne, dom, park, przedszkole, pory roku, jedzenie, zabawki, pojazdy. Każda czytanka to mała scenka z sensem, zdania łączą się w historyjkę.
- Scena: `bg` pasujące do treści; 2–4 aktorów (emoji z treści), rozmieszczeni tak, by się nie nakładali (x różne o ≥20), y w 35–80, size 64–120, różne `anim`, `delay` 0–1.5.

Kształt pliku (pokazane 4 pełne przykłady — po jednym na grupę; pozostałe 56 w tym samym formacie):

```ts
// src/modules/czytanki/data/czytanki.ts
import type { Czytanka, CzytankaGroup, Word } from './types'

// Skrót: w('KO','TA','.') → { syllables: ['KO','TA'], punct: '.' }
function w(...parts: string[]): Word {
  const last = parts[parts.length - 1]
  if (last === '.' || last === '!' || last === '?' || last === ',') {
    return { syllables: parts.slice(0, -1), punct: last }
  }
  return { syllables: parts }
}

export const GROUP_ORDER: readonly CzytankaGroup[] = [1, 2, 3, 4]

export const CZYTANKI: readonly Czytanka[] = [
  {
    id: 'cz-01', group: 1, title: 'Kot taty', emoji: '🐱',
    sentences: [[w('TA', 'TA'), w('MA'), w('KO', 'TA', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '🧔', x: 35, y: 60, size: 110, anim: 'bob' },
      { emoji: '🐱', x: 65, y: 70, size: 90, anim: 'wiggle', delay: 0.5 },
    ] },
  },
  // … cz-02 … cz-15 (grupa 1)
  {
    id: 'cz-16', group: 2, title: 'Dom i pies', emoji: '🏠',
    sentences: [
      [w('TO'), w('JEST'), w('DOM', '.')],
      [w('W'), w('DO', 'MU'), w('JEST'), w('PIES', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🏠', x: 40, y: 55, size: 120, anim: 'none' },
      { emoji: '🐶', x: 70, y: 72, size: 90, anim: 'bob', delay: 0.3 },
    ] },
  },
  // … cz-17 … cz-30 (grupa 2)
  {
    id: 'cz-31', group: 3, title: 'Myszka w norce', emoji: '🐭',
    sentences: [
      [w('MYSZ', 'KA'), w('SIE', 'DZI'), w('W'), w('NOR', 'CE', '.')],
      [w('JEST'), w('CI', 'CHO', '.')],
      [w('KOT'), w('ŚPI'), w('NA'), w('KA', 'NA', 'PIE', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🐭', x: 25, y: 75, size: 70, anim: 'wiggle' },
      { emoji: '🛋️', x: 65, y: 60, size: 120, anim: 'none' },
      { emoji: '🐱', x: 65, y: 45, size: 80, anim: 'pulse', delay: 1 },
    ] },
  },
  // … cz-32 … cz-45 (grupa 3)
  {
    id: 'cz-46', group: 4, title: 'Krowa na łące', emoji: '🐮',
    sentences: [
      [w('NA'), w('ŁĄ', 'CE'), w('STO', 'I'), w('KRO', 'WA', '.')],
      [w('KRO', 'WA'), w('JE'), w('ZIE', 'LO', 'NĄ'), w('TRA', 'WĘ', '.')],
      [w('O', 'BOK'), w('ROŚ', 'NIE'), w('DU', 'ŻE'), w('DRZE', 'WO', '.')],
      [w('NA'), w('DRZE', 'WIE'), w('SIE', 'DZI'), w('PTAK', '.')],
      [w('PTAK'), w('GŁOŚ', 'NO'), w('ŚPIE', 'WA', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐮', x: 30, y: 70, size: 110, anim: 'sway' },
      { emoji: '🌳', x: 70, y: 55, size: 130, anim: 'sway', delay: 0.8 },
      { emoji: '🐦', x: 72, y: 32, size: 60, anim: 'float', delay: 0.2 },
    ] },
  },
  // … cz-47 … cz-60 (grupa 4)
]

export function getCzytankaById(id: string): Czytanka | undefined {
  return CZYTANKI.find((c) => c.id === id)
}

export function getCzytankiByGroup(group: CzytankaGroup): Czytanka[] {
  return CZYTANKI.filter((c) => c.group === group)
}
```

- [ ] **Step 5: Run** `pnpm vitest --run src/modules/czytanki` → PASS (popraw dane, nie test — chyba że regex `OPEN_CV` nie obejmuje potrzebnej spółgłoski; wtedy dopisz spółgłoskę do regexu w teście i w tym planie)
- [ ] **Step 6: Commit** `git add src/modules/czytanki && git commit -m "feat(czytanki): 60 czytanek w 4 grupach + sceny"`

---

### Task 4: Skrypt generujący `audio-source/czytanki.json` + UI strings

**Files:**
- Create: `scripts/czytanki-audio-source.ts`, `audio-source/czytanki-ui-strings.json`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `CZYTANKI`, `syllableAudioKey`, `wordAudioKey`
- Produces: `audio-source/czytanki.json` (generowany, commitowany), klucze UI: `home-czytanki-intro`, `czytanki-list-intro`, `czytanki-intro`, `czytanki-ui-next`, `czytanki-ui-prev`, `czytanki-ui-open`

- [ ] **Step 1: Skrypt**

```ts
// scripts/czytanki-audio-source.ts
// Generuje audio-source/czytanki.json z danych czytanek (unikalne sylaby + słowa).
// Plik wynikowy NIE jest edytowany ręcznie. Uruchom: pnpm audio:czytanki
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CZYTANKI } from '../src/modules/czytanki/data/czytanki'
import { syllableAudioKey, wordAudioKey } from '../src/modules/czytanki/data/audioKeys'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'audio-source', 'czytanki.json')

export function buildCzytankiSource(): Record<string, string> {
  const out: Record<string, string> = { _voice: 'zofia' }
  const syl = new Map<string, string>()
  const words = new Map<string, string>()
  for (const c of CZYTANKI) {
    for (const sent of c.sentences) {
      for (const w of sent) {
        for (const s of w.syllables) syl.set(syllableAudioKey(s), s.toLowerCase())
        words.set(wordAudioKey(w.syllables), w.syllables.join('').toLowerCase())
      }
    }
  }
  for (const [k, v] of [...syl.entries()].sort()) out[k] = v
  for (const [k, v] of [...words.entries()].sort()) out[k] = v
  return out
}

const map = buildCzytankiSource()
writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n', 'utf8')
console.log(`czytanki.json: ${Object.keys(map).length - 1} kluczy`)
```

Uwaga: `generate-audio.ts` importuje czcionkę `_voice` przez `loadSources` — `_voice` w czytanki.json jest respektowany, klucze `_*` pomijane.

- [ ] **Step 2: UI strings**

```json
{
  "_voice": "zofia",
  "home-czytanki-intro": "Dotknij Czytanki, aby czytać sylabami!",
  "czytanki-list-intro": "Wybierz czytankę! Zacznij od tych na górze, są najłatwiejsze.",
  "czytanki-intro": "Dotknij sylabę, a ja ją przeczytam. Ty powtórz! Przytrzymaj dłużej, a przeczytam całe słowo.",
  "czytanki-ui-next": "Następna czytanka.",
  "czytanki-ui-prev": "Poprzednia czytanka.",
  "czytanki-ui-open": "Czytamy!"
}
```

- [ ] **Step 3: package.json** — dodaj `"audio:czytanki": "tsx scripts/czytanki-audio-source.ts"` i zmień `audio:build` na `"pnpm audio:czytanki && tsx scripts/generate-audio.ts build"`.

- [ ] **Step 4: Uruchom** `pnpm audio:czytanki` → wypisuje liczbę kluczy; sprawdź `head audio-source/czytanki.json`.

- [ ] **Step 5: Wygeneruj mp3** `pnpm audio:build` (kilka minut, ~400 plików), potem `pnpm audio:check` → 0 braków. Odsłuchaj 5 losowych sylab zamkniętych/zbitek (`afplay public/audio/cz-syl-drze.mp3` itp.); jeśli TTS czyta literami zamiast sylabą — zanotuj klucze w `docs/STATUS.md` do manual override (nie blokuje).

- [ ] **Step 6: Commit** `git add scripts audio-source package.json public/audio && git commit -m "feat(czytanki): generator audio-source + ~400 mp3 sylab i słów"`

---

### Task 5: Store

**Files:**
- Create: `src/modules/czytanki/store/czytankiStore.ts`, `src/modules/czytanki/store/czytankiStore.test.ts`

**Interfaces:**
- Produces: `useCzytanki` z `openedIds: string[]`, `lastOpenedId: string | null`, `seenIntros: string[]`, `markOpened(id)`, `markIntroSeen(key)`, `hasSeenIntro(key)`, `resetAllProgress()`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCzytanki } from './czytankiStore'

describe('czytankiStore', () => {
  beforeEach(() => useCzytanki.getState().resetAllProgress())
  it('markOpened jest idempotentne i ustawia lastOpenedId', () => {
    useCzytanki.getState().markOpened('cz-03')
    useCzytanki.getState().markOpened('cz-03')
    expect(useCzytanki.getState().openedIds).toEqual(['cz-03'])
    expect(useCzytanki.getState().lastOpenedId).toBe('cz-03')
  })
  it('intro seen', () => {
    expect(useCzytanki.getState().hasSeenIntro('x')).toBe(false)
    useCzytanki.getState().markIntroSeen('x')
    expect(useCzytanki.getState().hasSeenIntro('x')).toBe(true)
  })
})
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementacja** (wzór: `numbersStore.ts`)

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CzytankiState = {
  openedIds: string[]
  lastOpenedId: string | null
  seenIntros: string[]
  markOpened: (id: string) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  resetAllProgress: () => void
}

const initialState = {
  openedIds: [] as string[],
  lastOpenedId: null as string | null,
  seenIntros: [] as string[],
}

export const useCzytanki = create<CzytankiState>()(
  persist(
    (set, get) => ({
      ...initialState,
      markOpened: (id) =>
        set((s) => ({
          lastOpenedId: id,
          openedIds: s.openedIds.includes(id) ? s.openedIds : [...s.openedIds, id],
        })),
      markIntroSeen: (key) =>
        set((s) => (s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] })),
      hasSeenIntro: (key) => get().seenIntros.includes(key),
      resetAllProgress: () => set(initialState),
    }),
    {
      name: 'iskierki-czytanki-v1',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CzytankiState>
        return {
          ...current,
          openedIds: Array.isArray(p.openedIds) ? p.openedIds : [],
          lastOpenedId: typeof p.lastOpenedId === 'string' ? p.lastOpenedId : null,
          seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
        } as CzytankiState
      },
    },
  ),
)
```

- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `git commit -am "feat(czytanki): store iskierki-czytanki-v1"` (dodaj nowe pliki `git add`)

---

### Task 6: Scena — tła SVG, animacje, `CzytankaScene`

**Files:**
- Create: `src/modules/czytanki/components/backgrounds.tsx`, `src/modules/czytanki/components/scene.css`, `src/modules/czytanki/components/CzytankaScene.tsx`

**Interfaces:**
- Consumes: `SceneSpec`, `BgKind`, `AnimKind`, `Actor`
- Produces: `<CzytankaScene scene={SceneSpec} />` — wypełnia rodzica (`width/height 100%`), `<SceneBackground kind={BgKind} />`

- [ ] **Step 1: scene.css**

```css
/* Animacje aktorów sceny czytanki. Wolne, łagodne — tło dla czytania, nie show. */
@keyframes cz-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes cz-sway { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
@keyframes cz-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
@keyframes cz-wiggle {
  0%,80%,100% { transform: rotate(0) }
  84% { transform: rotate(-10deg) } 88% { transform: rotate(10deg) }
  92% { transform: rotate(-8deg) } 96% { transform: rotate(8deg) }
}
@keyframes cz-float {
  0% { transform: translate(0,0) } 25% { transform: translate(10px,-8px) }
  50% { transform: translate(0,-14px) } 75% { transform: translate(-10px,-8px) } 100% { transform: translate(0,0) }
}
@keyframes cz-poke { 0% { transform: scale(1) rotate(0) } 40% { transform: scale(1.3) rotate(-12deg) } 100% { transform: scale(1) rotate(0) } }
@keyframes cz-drift { from { transform: translateX(-10%) } to { transform: translateX(10%) } }
@keyframes cz-twinkle { 0%,100% { opacity: .4 } 50% { opacity: 1 } }

.cz-actor { position: absolute; transform: translate(-50%, -50%); line-height: 1; user-select: none; -webkit-user-select: none; cursor: pointer; will-change: transform; }
.cz-actor-inner { display: inline-block; }
.cz-anim-bob .cz-actor-inner { animation: cz-bob 2s ease-in-out infinite; }
.cz-anim-sway .cz-actor-inner { animation: cz-sway 3s ease-in-out infinite; transform-origin: 50% 90%; }
.cz-anim-pulse .cz-actor-inner { animation: cz-pulse 2s ease-in-out infinite; }
.cz-anim-wiggle .cz-actor-inner { animation: cz-wiggle 4s ease-in-out infinite; }
.cz-anim-float .cz-actor-inner { animation: cz-float 6s ease-in-out infinite; }
.cz-actor.poke .cz-actor-inner { animation: cz-poke .5s ease-out; }
.cz-cloud { animation: cz-drift 14s ease-in-out infinite alternate; }
.cz-star { animation: cz-twinkle 2.5s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .cz-actor-inner, .cz-cloud, .cz-star { animation: none !important; }
}
```

- [ ] **Step 2: backgrounds.tsx** — 8 tł, każde `<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>`. Wymagane elementy:

| kind | gradient (góra→dół) | dekoracje |
|---|---|---|
| sky | `#bae6fd`→`#e0f2fe` | słońce `<circle>` żółte r=7 (`.cz-star` pulsuje opacity .85–1), 2 chmurki (`.cz-cloud`, 3 elipsy białe) |
| room | `#fde68a`→`#fef3c7` | okno (prostokąt `#bae6fd` z ramą `#92400e`), podłoga `rect` y=44 `#d6b48a` |
| meadow | `#bfdbfe`→`#dcfce7` | słońce, trawa `rect` y=42 `#86efac`, 3 kwiatki (koło żółte + 4 płatki) |
| forest | `#bbf7d0`→`#166534`/`#4ade80` | 3 choinki (trójkąty `#15803d`, pnie `#78350f`), trawa |
| beach | `#7dd3fc`→`#fde68a` | słońce, morze `rect` y=32..46 `#38bdf8`, 2 fale (`path` biały, `.cz-cloud`), piasek `rect` y=46 `#fcd34d` |
| night | `#1e3a8a`→`#3b82f6` | księżyc (koło `#fef3c7`), 8 gwiazdek (`.cz-star`, różne `animation-delay` przez `style`) |
| snow | `#e0f2fe`→`#f8fafc` | 10 płatków (koła białe, `.cz-star`), śnieg `rect` y=44 biały, bałwanek nie — zostawiamy aktorom |
| kitchen | `#fecdd3`→`#fff1f2` | blat `rect` y=42 `#a16207`, 2 szafki (prostokąty `#fda4af` z ramką) |

Eksport: `export function SceneBackground({ kind }: { kind: BgKind })` — `switch(kind)` zwraca odpowiedni svg. Wszystkie stringi kolorów jako stałe w pliku.

- [ ] **Step 3: CzytankaScene.tsx**

```tsx
import { useState } from 'react'
import type { Actor, SceneSpec } from '../data/types'
import { SceneBackground } from './backgrounds'
import './scene.css'

function SceneActor({ actor }: { actor: Actor }) {
  const [poke, setPoke] = useState(0)
  return (
    <div
      className={`cz-actor cz-anim-${actor.anim}${poke ? ' poke' : ''}`}
      key={poke}
      style={{ left: `${actor.x}%`, top: `${actor.y}%`, fontSize: actor.size, touchAction: 'manipulation' }}
      onPointerDown={() => setPoke((n) => n + 1)}
      aria-hidden="true"
    >
      <span className="cz-actor-inner" style={{ animationDelay: `${actor.delay ?? 0}s` }}>
        {actor.emoji}
      </span>
    </div>
  )
}

export function CzytankaScene({ scene }: { scene: SceneSpec }) {
  return (
    <div data-testid="czytanka-scene" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 24 }}>
      <SceneBackground kind={scene.bg} />
      {scene.actors.map((a, i) => <SceneActor key={i} actor={a} />)}
    </div>
  )
}
```

Uwaga: `key={poke}` na elemencie z klasą `poke` remountuje węzeł, więc animacja `cz-poke` odpala się przy każdym tapie (inaczej drugi tap nic nie robi). `.poke` nadpisuje animację idle na 0.5 s — po remoncie wraca idle, bo klasa `poke` zostaje; zamiast tego użyj `onAnimationEnd={() => setPoke(0)}` na `.cz-actor-inner`. Popraw: `key` i `poke` state jak wyżej, dodaj `onAnimationEnd` na inner: jeśli `e.animationName === 'cz-poke'` → `setPoke(0)`.

- [ ] **Step 4: Sprawdź** `pnpm tsc -b` → 0 błędów.
- [ ] **Step 5: Commit** `git add src/modules/czytanki && git commit -m "feat(czytanki): sceny — 8 tł SVG + animowani aktorzy emoji"`

---

### Task 7: `useSyllablePress` + `SyllableButton`

**Files:**
- Create: `src/modules/czytanki/hooks/useSyllablePress.ts`, `src/modules/czytanki/components/SyllableButton.tsx`

**Interfaces:**
- Produces: `useSyllablePress({ onTap, onLongPress, longPressMs?=500, moveTolerancePx?=10 })` → props do spreadu (`onPointerDown/Up/Cancel/Move/Leave`, `onContextMenu`); `<SyllableButton text color highlighted fontSize onTap onLongPress />`

- [ ] **Step 1: Hook**

```ts
import { useCallback, useRef } from 'react'
import type { PointerEvent } from 'react'

export type UseSyllablePressOptions = {
  onTap: () => void
  onLongPress: () => void
  longPressMs?: number
  moveTolerancePx?: number
}

export function useSyllablePress({ onTap, onLongPress, longPressMs = 500, moveTolerancePx = 10 }: UseSyllablePressOptions) {
  const timer = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null }
    start.current = null
  }, [])

  const onPointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault()
    fired.current = false
    start.current = { x: e.clientX, y: e.clientY }
    timer.current = window.setTimeout(() => { fired.current = true; timer.current = null; onLongPress() }, longPressMs)
  }, [onLongPress, longPressMs])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!start.current) return
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > moveTolerancePx) clear()
  }, [clear, moveTolerancePx])

  const onPointerUp = useCallback(() => {
    if (start.current && !fired.current) onTap()
    clear()
  }, [onTap, clear])

  return {
    onPointerDown, onPointerMove, onPointerUp,
    onPointerCancel: clear, onPointerLeave: clear,
    onContextMenu: (e: PointerEvent | { preventDefault: () => void }) => e.preventDefault(),
  }
}
```

- [ ] **Step 2: SyllableButton**

```tsx
import { useState } from 'react'
import { useSyllablePress } from '../hooks/useSyllablePress'

type Props = {
  text: string
  color: string
  highlighted: boolean
  fontSize: number
  onTap: () => void
  onLongPress: () => void
}

export function SyllableButton({ text, color, highlighted, fontSize, onTap, onLongPress }: Props) {
  const [bounce, setBounce] = useState(0)
  const press = useSyllablePress({ onTap: () => { setBounce((n) => n + 1); onTap() }, onLongPress })
  return (
    <div
      role="button"
      aria-label={text}
      data-testid="syllable"
      {...press}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 60, minHeight: 60, padding: '0 0.08em',
        fontFamily: 'var(--font-block)', fontWeight: 700, fontSize, lineHeight: 1.1,
        color, borderRadius: 12,
        background: highlighted ? '#fde047' : 'transparent',
        transition: 'background 150ms',
        touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent', cursor: 'pointer',
      }}
    >
      <span key={bounce} className={bounce ? 'cz-syl-bounce' : undefined} style={{ display: 'inline-block' }}>{text}</span>
    </div>
  )
}
```

Dodaj do `scene.css`: `@keyframes cz-syl-bounce { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} } .cz-syl-bounce { animation: cz-syl-bounce .25s ease-out; }`

- [ ] **Step 3:** `pnpm tsc -b` → 0 błędów.
- [ ] **Step 4: Commit** `git add src/modules/czytanki && git commit -m "feat(czytanki): SyllableButton z tap/long-press"`

---

### Task 8: `useReadAloud` + `CzytankaView`

**Files:**
- Create: `src/modules/czytanki/hooks/useReadAloud.ts`, `src/modules/czytanki/components/CzytankaView.tsx`

**Interfaces:**
- Consumes: `Czytanka`, `syllableAudioKey`, `wordAudioKey`, `getSyllableColor`, `SyllableButton`, `CzytankaScene`, `useCzytanki`, `usePageVisibility`, `useTapHandler`, `tapTargets/radii/colors`
- Produces: `useReadAloud({ czytanka, audioBus })` → `{ reading: boolean, activeWord: {s:number,w:number} | null, toggle(): void, stop(): void }`; `<CzytankaView czytanka audioBus onPrev onNext hasPrev hasNext />`

- [ ] **Step 1: useReadAloud**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Czytanka } from '../data/types'
import { wordAudioKey } from '../data/audioKeys'

const SENTENCE_PAUSE_MS = 600
export type WordPos = { s: number; w: number }

export function useReadAloud({ czytanka, audioBus }: { czytanka: Czytanka; audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const [activeWord, setActiveWord] = useState<WordPos | null>(null)
  const runId = useRef(0)

  const stop = useCallback(() => {
    runId.current += 1
    audioBus.stop()
    setActiveWord(null)
  }, [audioBus])

  const toggle = useCallback(() => {
    if (activeWord) { stop(); return }
    const id = ++runId.current
    audioBus.stop()
    void (async () => {
      for (let s = 0; s < czytanka.sentences.length; s++) {
        const sent = czytanka.sentences[s]!
        for (let w = 0; w < sent.length; w++) {
          if (runId.current !== id) return
          setActiveWord({ s, w })
          try { await audioBus.play(wordAudioKey(sent[w]!.syllables)) } catch { /* brak pliku — idziemy dalej */ }
        }
        if (runId.current !== id) return
        await new Promise((r) => setTimeout(r, SENTENCE_PAUSE_MS))
      }
      if (runId.current === id) setActiveWord(null)
    })()
  }, [activeWord, audioBus, czytanka, stop])

  useEffect(() => () => { runId.current += 1 }, [czytanka])

  return { reading: activeWord !== null, activeWord, toggle, stop }
}
```

- [ ] **Step 2: CzytankaView**

Rozmiar fontu per grupa: `{1: 64, 2: 54, 3: 46, 4: 40}`. Layout: kolumna 100% wysokości; scena `flex: 0 0 40%`; tekst `flex: 1` wyśrodkowany, `overflow: hidden`; zdania jako wiersze `display:flex; flexWrap:wrap; justifyContent:center; gap: '0 0.7em'`; słowo = `display:inline-flex; alignItems:baseline; gap:'0.15em'` + interpunkcja `<span style={{color: colors.text, fontSize}}>`.

```tsx
import { useCallback, useEffect, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii, tapTargets } from '@/app/theme'
import { getSyllableColor } from '@/shared/ui/syllableColors'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import type { Czytanka, CzytankaGroup } from '../data/types'
import { syllableAudioKey, wordAudioKey } from '../data/audioKeys'
import { useCzytanki } from '../store/czytankiStore'
import { SyllableButton } from './SyllableButton'
import { CzytankaScene } from './CzytankaScene'
import { useReadAloud } from '../hooks/useReadAloud'

const FONT_BY_GROUP: Record<CzytankaGroup, number> = { 1: 64, 2: 54, 3: 46, 4: 40 }
const WORD_HIGHLIGHT_MS = 600

type Props = {
  czytanka: Czytanka
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onPrev?: () => void
  onNext?: () => void
}

const roundBtn = {
  width: 72, height: 72, borderRadius: 36, border: `3px solid ${colors.accentBlue}`,
  background: '#fff', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
} as const

export function CzytankaView({ czytanka, audioBus, onPrev, onNext }: Props) {
  const markOpened = useCzytanki((s) => s.markOpened)
  const hasSeenIntro = useCzytanki((s) => s.hasSeenIntro)
  const markIntroSeen = useCzytanki((s) => s.markIntroSeen)
  const [heldWord, setHeldWord] = useState<{ s: number; w: number } | null>(null)
  const { activeWord, reading, toggle, stop } = useReadAloud({ czytanka, audioBus })

  useEffect(() => {
    markOpened(czytanka.id)
    audioBus.stop()
    if (!hasSeenIntro('czytanka-first')) {
      markIntroSeen('czytanka-first')
      void audioBus.play('czytanki-intro')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [czytanka.id])

  usePageVisibility({ onHidden: stop, onVisible: () => {}, enabled: true })

  const tapSyllable = useCallback((syl: string) => {
    stop()
    void audioBus.play(syllableAudioKey(syl))
  }, [audioBus, stop])

  const holdWord = useCallback((s: number, w: number, syllables: readonly string[]) => {
    stop()
    setHeldWord({ s, w })
    void audioBus.play(wordAudioKey(syllables))
    window.setTimeout(() => setHeldWord(null), WORD_HIGHLIGHT_MS)
  }, [audioBus, stop])

  const prevTap = useTapHandler({ onTap: () => { stop(); void audioBus.play('czytanki-ui-prev'); onPrev?.() }, disabled: !onPrev })
  const nextTap = useTapHandler({ onTap: () => { stop(); void audioBus.play('czytanki-ui-next'); onNext?.() }, disabled: !onNext })
  const readTap = useTapHandler({ onTap: toggle })

  const fontSize = FONT_BY_GROUP[czytanka.group]

  return (
    <div data-testid="czytanka-view" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: `0 ${tapTargets.minMargin}px ${tapTargets.minMargin}px`, position: 'relative' }}>
      <div style={{ flex: '0 0 40%', minHeight: 0, position: 'relative' }}>
        <CzytankaScene scene={czytanka.scene} />
        {onPrev && <button type="button" aria-label="Poprzednia czytanka" {...prevTap} style={{ ...roundBtn, position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>◀</button>}
        {onNext && <button type="button" aria-label="Następna czytanka" {...nextTap} style={{ ...roundBtn, position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>▶</button>}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.2em', overflow: 'hidden' }}>
        {czytanka.sentences.map((sent, s) => (
          <div key={s} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.7em' }}>
            {sent.map((word, w) => {
              const isActive = (activeWord?.s === s && activeWord.w === w) || (heldWord?.s === s && heldWord.w === w)
              return (
                <span key={w} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.15em' }}>
                  {word.syllables.map((syl, i) => (
                    <SyllableButton key={i} text={syl} color={getSyllableColor(i)} fontSize={fontSize} highlighted={isActive}
                      onTap={() => tapSyllable(syl)} onLongPress={() => holdWord(s, w, word.syllables)} />
                  ))}
                  {word.punct && <span aria-hidden="true" style={{ fontFamily: 'var(--font-block)', fontWeight: 700, fontSize, color: colors.text }}>{word.punct}</span>}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <button type="button" aria-label={reading ? 'Zatrzymaj' : 'Przeczytaj całość'} data-testid="read-aloud" {...readTap}
        style={{ ...roundBtn, position: 'absolute', right: tapTargets.minMargin, bottom: tapTargets.minMargin, background: reading ? '#fde047' : '#fff', borderRadius: radii.kid }}>
        {reading ? '⏹' : '▶'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3:** `pnpm tsc -b` → 0 błędów (`radii` użyte — jeśli lint marudzi o nieużytych importach, usuń).
- [ ] **Step 4: Commit** `git add src/modules/czytanki && git commit -m "feat(czytanki): ekran czytanki — tap/long-press/czytaj całość"`

---

### Task 9: Lista + kafelek + routing modułu

**Files:**
- Create: `src/modules/czytanki/components/CzytankaTile.tsx`, `src/modules/czytanki/components/CzytankaList.tsx`, `src/modules/czytanki/index.tsx`

**Interfaces:**
- Produces: `<CzytankiModule audioBus? />` z routes `index` i `:id`

- [ ] **Step 1: CzytankaTile**

```tsx
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import type { Level } from '@/shared/settings/types'
import { radii } from '@/app/theme'
import type { Czytanka, CzytankaGroup } from '../data/types'

export const GROUP_LEVEL: Record<CzytankaGroup, Level> = { 1: 'iskierka', 2: 'plomyk', 3: 'ognik', 4: 'pochodnia' }

export function CzytankaTile({ czytanka, opened, onOpen }: { czytanka: Czytanka; opened: boolean; onOpen: (id: string) => void }) {
  const tap = useTapHandler({ onTap: () => onOpen(czytanka.id) })
  const level = GROUP_LEVEL[czytanka.group]
  return (
    <button type="button" data-testid={`tile-${czytanka.id}`} id={`tile-${czytanka.id}`} aria-label={czytanka.title} {...tap}
      style={{
        position: 'relative', width: '100%', aspectRatio: '1', minHeight: 120,
        borderRadius: radii.kid * 1.5, background: LEVEL_TILE_BG[level], border: `4px solid ${LEVEL_TILE_BORDER[level]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, cursor: 'pointer',
        touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
      }}>
      <span aria-hidden="true">{czytanka.emoji}</span>
      {opened && <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 22 }}>⭐</span>}
    </button>
  )
}
```

- [ ] **Step 2: CzytankaList**

```tsx
import { useEffect } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { LEVEL_ICONS, LevelStars } from '@/shared/ui/levelIcons'
import { colors } from '@/app/theme'
import { CZYTANKI, GROUP_ORDER, getCzytankiByGroup } from '../data/czytanki'
import { useCzytanki } from '../store/czytankiStore'
import { CzytankaTile, GROUP_LEVEL } from './CzytankaTile'

export function CzytankaList({ audioBus, onOpen }: { audioBus: Pick<AudioBus, 'play' | 'stop'>; onOpen: (id: string) => void }) {
  const openedIds = useCzytanki((s) => s.openedIds)
  const lastOpenedId = useCzytanki((s) => s.lastOpenedId)
  const hasSeenIntro = useCzytanki((s) => s.hasSeenIntro)
  const markIntroSeen = useCzytanki((s) => s.markIntroSeen)

  useEffect(() => {
    if (!hasSeenIntro('czytanki-list-intro')) {
      markIntroSeen('czytanki-list-intro')
      void audioBus.play('czytanki-list-intro')
    }
    if (lastOpenedId) document.getElementById(`tile-${lastOpenedId}`)?.scrollIntoView({ block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div data-testid="czytanki-list" style={{ height: '100%', overflowY: 'auto', scrollbarGutter: 'stable', padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <IskraMascot size={72} />
        <span aria-hidden="true" style={{ fontSize: 48 }}>📖</span>
        <span style={{ fontFamily: 'var(--font-handwritten)', fontSize: 28, color: colors.text, opacity: 0.6 }}>{openedIds.length} / {CZYTANKI.length}</span>
      </div>
      {GROUP_ORDER.map((g) => {
        const level = GROUP_LEVEL[g]
        const icon = LEVEL_ICONS[level]
        return (
          <section key={g} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
              <span aria-hidden="true" style={{ fontSize: 32 }}>{icon.kind === 'emoji' ? icon.value : '🔥'}</span>
              <LevelStars level={level} size={20} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {getCzytankiByGroup(g).map((c) => (
                <CzytankaTile key={c.id} czytanka={c} opened={openedIds.includes(c.id)} onOpen={onOpen} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

Sprawdź w `levelIcons.tsx`, czy istnieje komponent renderujący ikonę `torch` (np. `LevelIconView`/`TorchIcon`); jeśli tak, użyj go zamiast fallbacku `'🔥'`.

- [ ] **Step 3: index.tsx**

```tsx
import { useCallback } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { CZYTANKI, getCzytankaById } from './data/czytanki'
import { CzytankaList } from './components/CzytankaList'
import { CzytankaView } from './components/CzytankaView'

type Bus = Pick<AudioBus, 'play' | 'stop'>

export function CzytankiModule({ audioBus = defaultAudioBus }: { audioBus?: Bus } = {}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <KidNav />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<ListRoute audioBus={audioBus} />} />
          <Route path=":id" element={<ViewRoute audioBus={audioBus} />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function ListRoute({ audioBus }: { audioBus: Bus }) {
  const navigate = useNavigate()
  const onOpen = useCallback((id: string) => { audioBus.stop(); void audioBus.play('czytanki-ui-open'); navigate(id) }, [audioBus, navigate])
  return <CzytankaList audioBus={audioBus} onOpen={onOpen} />
}

function ViewRoute({ audioBus }: { audioBus: Bus }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const czytanka = id ? getCzytankaById(id) : undefined
  if (!czytanka) return <Navigate to=".." replace />
  const idx = CZYTANKI.indexOf(czytanka)
  const prev = CZYTANKI[idx - 1]
  const next = CZYTANKI[idx + 1]
  return (
    <CzytankaView
      key={czytanka.id}
      czytanka={czytanka}
      audioBus={audioBus}
      onPrev={prev ? () => navigate(`../${prev.id}`, { relative: 'path' }) : undefined}
      onNext={next ? () => navigate(`../${next.id}`, { relative: 'path' }) : undefined}
    />
  )
}
```

KidNav „wstecz" = `navigate(-1)` — z czytanki po strzałkach historia rośnie; przekaż `<KidNav onBack={() => navigate('/czytanki')} />` wewnątrz `ViewRoute`-owego kontekstu: prościej — w `CzytankiModule` użyj `useLocation()` i jeśli path ≠ `/czytanki` przekaż `onBack={() => navigate('/czytanki')}`.

- [ ] **Step 4:** `pnpm tsc -b` → 0.
- [ ] **Step 5: Commit** `git add src/modules/czytanki && git commit -m "feat(czytanki): lista kafelków + routing modułu"`

---

### Task 10: Integracja — App, Home, Raport, eksport, CLAUDE.md, STATUS

**Files:**
- Modify: `src/app/App.tsx`, `src/app/Home.tsx`, `src/shared/stats/components/ReportScreen.tsx`, `src/shared/stats/exporter.ts`, `CLAUDE.md`, `docs/STATUS.md`

- [ ] **Step 1: App.tsx** — import `CzytankiModule` i `useCzytanki`; w `SettingsPage` dodaj `const resetCzytanki = useCzytanki((s) => s.resetAllProgress)` i wywołaj w `onResetConfirmed` (jeden globalny reset — istniejący wzorzec, zamiast osobnego przycisku ze speca); `isCzytanki = pathname.startsWith('/czytanki')` dołączony do `showKidNav` i klasy `overflow-hidden`; `<Route path="/czytanki/*" element={<CzytankiModule />} />`.

- [ ] **Step 2: Home.tsx** — grid `repeat(2, 1fr)`, `maxWidth: 820`, kafelki `minHeight: 220`; 4. kafelek:

```tsx
<button type="button" data-testid="module-czytanki" aria-label="Czytanki" {...czytankiTap}
  style={{ /* jak inne */ background: '#f3e8ff', border: '4px solid #9333ea', color: '#6b21a8' }}>
  <div aria-hidden="true" style={{ fontSize: 96, lineHeight: 1 }}>📚</div>
  <div aria-hidden="true" style={{ fontFamily: 'var(--font-block)', fontSize: 28, fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1, display: 'flex', gap: 6 }}>
    <span><span style={{ color: '#1d4ed8' }}>TA</span><span style={{ color: '#dc2626' }}>TA</span></span>
    <span style={{ color: '#1d4ed8' }}>MA</span>
    <span><span style={{ color: '#1d4ed8' }}>KO</span><span style={{ color: '#dc2626' }}>TA</span></span>
  </div>
  <span style={{ fontFamily: 'var(--font-handwritten)', fontSize: 32, fontWeight: 700 }}>Czytanki</span>
</button>
```

Handler `handleCzytanki` (stop + navigate('/czytanki')). Onboarding: dołącz `else if (!czytankiIntroSeen) { play('home-czytanki-intro'); markCzytankiIntro(...) }` z `useCzytanki`. Sprawdź `Home.test.tsx` (jeśli istnieje) — dopisz asercję na `module-czytanki`.

- [ ] **Step 3: ReportScreen** — po `<NumbersStats />` dodaj `<CzytankiStats />` (w tym samym pliku, wzór `ReadingStats`): `Czytanki (moduł 4)` → „Otwarte: X / 60", lista tytułów otwartych (`CZYTANKI.filter(c => openedIds.includes(c.id)).map(c => \`${c.emoji} ${c.title}\`).join(', ')`), per grupa „Grupa 1: 3/15".

- [ ] **Step 4: exporter.ts** — dodaj opcjonalny 6. parametr `czytankiSnapshot?: { openedIds: string[] }`; sekcja:

```ts
if (czytankiSnapshot) {
  lines.push('## Czytanki'); lines.push('')
  lines.push(`- **Otwarte**: ${czytankiSnapshot.openedIds.length}/${CZYTANKI.length}`)
  for (const g of GROUP_ORDER) {
    const inGroup = getCzytankiByGroup(g)
    const n = inGroup.filter((c) => czytankiSnapshot.openedIds.includes(c.id)).length
    lines.push(`  - Grupa ${g}: ${n}/${inGroup.length}`)
  }
  lines.push('')
}
```

W `ReportScreen.handleCopy` przekaż `{ openedIds: useCzytanki.getState().openedIds }`. Jeśli `exporter.test.ts` snapshotuje wynik — zaktualizuj oczekiwania.

- [ ] **Step 5: CLAUDE.md** — w Strukturze dodaj `modules/czytanki/`, w persist dodaj `iskierki-czytanki-v1`, w komendach `pnpm audio:czytanki`, liczbę mp3 zaktualizuj po `audio:check`. `docs/STATUS.md` — nowa sekcja na górze „Moduł 4 Czytanki ukończony (2026-08-26)" + lista sylab do manual override z Task 4.

- [ ] **Step 6:** `pnpm tsc -b && pnpm test --run && pnpm build` → wszystko zielone.
- [ ] **Step 7: Commit** `git add -A && git commit -m "feat(czytanki): integracja — Home, App, raport rodzica, docs"`

---

### Task 11: Weryfikacja w przeglądarce (iPad viewport)

- [ ] **Step 1:** `pnpm dev` w tle; chrome-devtools-mcp `emulate` iPad (1180×820 landscape, potem 820×1180 portrait).
- [ ] **Step 2:** Home → 4 kafelki widoczne bez scrolla w obu orientacjach. Screenshot.
- [ ] **Step 3:** `/czytanki` → 4 sekcje, 60 kafelków, scroll działa; intro audio gra (sprawdź konsolę: brak 404 na `/audio/*.mp3`).
- [ ] **Step 4:** Otwórz `cz-01`, `cz-16`, `cz-31`, `cz-46` — tekst mieści się bez scrolla przy 40% sceny w obu orientacjach; jeśli grupa 4 nie mieści się w portrait, zmniejsz `FONT_BY_GROUP[4]` do 36 i/lub scenę do `35%`. Screenshot każdej.
- [ ] **Step 5:** Tap sylaby → request `cz-syl-*.mp3` 200; long-press (`drag` z opóźnieniem lub `evaluate_script` dispatch pointerdown, czekaj 600 ms, pointerup) → `cz-word-*.mp3`; ▶ → sekwencja słów, podświetlenie przesuwa się; drugi tap ▶ zatrzymuje.
- [ ] **Step 6:** Strzałki ◀ ▶ zmieniają czytankę; na `cz-01` brak ◀, na `cz-60` brak ▶; KidNav wstecz → lista, przewinięta do ostatniej.
- [ ] **Step 7:** Raport: sekcja Czytanki pokazuje liczbę otwartych; Reset w ustawieniach zeruje `iskierki-czytanki-v1`.
- [ ] **Step 8:** Popraw znalezione problemy, commit `fix(czytanki): …`, `git push`, `gh run watch` → deploy zielony. Sprawdź live URL na 1 czytance.
