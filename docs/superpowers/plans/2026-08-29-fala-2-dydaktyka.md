# Iskierki — Fala 2 ulepszeń dydaktyczno-UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dołożyć **akt liczenia** (1:1, kardynalność), **rozumienie** (znaczenie słowa + pytanie do czytanki) i **pętlę rodzica z jedną akcją**, plus szlif dyskryminacji, reprezentacji, powtórki i dostępności.

**Architecture:** Bez nowych modułów. Zmiany w `src/modules/{letters,reading,numbers,czytanki}` + `src/shared/{ui,srs,stats,settings,engagement}`. Dwa route'y w module liter (`/letters/hard`, `/letters/daily`), pasek „Literka dnia" na `app/Home.tsx`, generowany `audio-source/czytanki-questions.json`. Migracje persist: `numbersStore` v2→v3, `czytankiStore` v2→v3, `settingsStore` v5→v6, `lettersStore` v1→v2.

**Tech Stack:** React 19, TS strict, Zustand persist, react-router-dom 7, Vitest, tsx, Edge TTS (zofia) + Azure Speech (agnieszka).

**Spec:** `docs/superpowers/specs/2026-08-29-fala-2-dydaktyka-design.md` — sekcja „Decyzje" na końcu jest wiążąca.
**Zależność:** `docs/superpowers/specs/2026-08-29-fala-1-dydaktyka-design.md` — Fala 1 jest **zmergowana przed startem**. Zakładamy: `src/modules/letters/audio/promptKeys.ts` (`promptAudioKeys(letter, mode)`), kontrakt drugiej próby (`status 'retry'`, `attempt: 1|2`, `settings.secondAttempt`), klucze `strategy-*`, paleta Okabe–Ito (`getSyllableCue(index) → { color, underline }`), globalne `settings.questionsPerSession`, statystyki tapów czytanek (`czytankiStore` v2 z `wordTaps`/`timeMs`), `settingsStore` v5.

## Global Constraints

- TS strict, brak `any` / `@ts-ignore`. Function components, named exports. Komentarze tylko gdy WHY niejasne.
- Klucze audio **lowercase**, tylko `[a-z0-9_-]` — APFS maskuje 404, które wychodzą na Linux GH Pages.
- Tap-targety ≥60×60, UI dziecka bez tekstu do czytania, polskie napisy dla rodzica, brak scrolla w 1180×820.
- Tokeny z `@/app/theme`; fonty `var(--font-block)` (Lexend) i `var(--font-handwritten)` (Kalam).
- Każdy persist store ma `merge` z defaultem dla każdego pola **i** `migrate` — bez `migrate` zustand odrzuca persist przy bumpie `version` i kasuje postęp.
- `audioBus.play()` zwraca `Promise<boolean>`, nigdy nie rzuca; `true` = klip wystartował. Kolejka FIFO.
- Żadnych timerów, punktów ani streaków dla dziecka. Testy tylko tam, gdzie plan je wypisuje.
- Commit po każdym tasku, message po polsku, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Audio:** `zofia`/`edge` buduje się bez klucza API; `agnieszka`/`azure` (Task 7 i 14) wymaga `.env.local` z `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=westeurope`. Zawsze `pnpm audio:dry` przed `audio:build`.
- Baseline: `pnpm tsc -b` czysty, `pnpm test --run` bez failów (po Fali 1 liczba testów > 746 — porównuj do „0 failed").

---

### Task 1: `useReducedMotion` + statyczne warianty celebracji (#20)

**Files:** Create `src/shared/ui/useReducedMotion.ts`, `src/shared/ui/useReducedMotion.test.ts`. Modify `src/modules/reading/components/WildCelebration.tsx`, `WordScene.tsx`, `celebrations/{RocketBlast,ScreenFlip,RainbowRun,FallingFruits,DancingAvocado}.tsx`, `WildCelebration.test.tsx`.

**Interfaces:** Produces `useReducedMotion(): boolean`.

- [ ] **Step 1: Test hooka** — `useReducedMotion.test.ts`, `matchMedia` stubowany przez `vi.stubGlobal`: (a) `matches: true` → `true`; (b) subskrybent `change` z `{ matches: true }` przełącza wynik (`renderHook` + `act`); (c) brak `matchMedia` → `false`. Run → FAIL.

- [ ] **Step 2: Implementacja**

```ts
// src/shared/ui/useReducedMotion.ts
import { useEffect, useState } from 'react'
const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia(QUERY).matches : false,
  )
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mql = matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}
```

- [ ] **Step 3: `WildCelebration` — wariant statyczny.** Audio i długość zostają identyczne; znika sam ruch.

```tsx
const STATIC_EMOJI: Record<string, string> = { rocket:'🚀', fruits:'🍎', flip:'✨', avocado:'🥑', rainbow:'🌈' }
const reduced = useReducedMotion()

useEffect(() => {
  if (!reduced) return
  const t = setTimeout(handleComplete, def.durationMs)   // handleComplete jest idempotentne
  return () => clearTimeout(t)
}, [reduced, def])   // eslint-disable-line react-hooks/exhaustive-deps

// Wariant statyczny: fixed inset:0, zIndex:1500, pointerEvents:'none',
// wyśrodkowane STATIC_EMOJI[def.id] (fontSize 140) na tle rgba(254,249,242,0.9).
if (reduced) return <div data-testid="wild-static" aria-hidden="true" style={staticStyle}>{STATIC_EMOJI[def.id] ?? '⭐'}</div>
return <def.Component onComplete={handleComplete} />
```

- [ ] **Step 4: `WordScene`** — przy `reduced` renderuj scenę bez `animation` (emoji w pozycjach docelowych, `transition: 'none'`). Czas i audio bez zmian.

- [ ] **Step 5: Pas i szelki** — w pięciu plikach `celebrations/*.tsx` przenieś `@keyframes` + regułę `animation` do wnętrza `@media (prefers-reduced-motion: no-preference) { … }` w bloku `<style>`, a element opisz klasą zamiast inline `animation`.

- [ ] **Step 6: Test komponentu** — dopisz do `WildCelebration.test.tsx`: przy `matchMedia().matches === true` render zwraca `wild-static` (a nie `def.Component`), `audioBus.play` dostaje klucze z `def.audio`, a po `vi.advanceTimersByTime(def.durationMs)` `onComplete` woła się dokładnie raz.

- [ ] **Step 7: Run** `pnpm tsc -b && pnpm test --run` → 0 błędów TS, 0 failed.
- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(a11y): prefers-reduced-motion — statyczne warianty celebracji i scenek

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Czterolinia w kafelkach pisanych (A-9)

**Files:** Modify `src/shared/ui/HandwrittenLetter.tsx`, `src/modules/letters/components/LetterTile.tsx`. Create `src/modules/letters/components/LetterTile.handwritten.test.tsx`.

**Interfaces:** `HandwrittenLetter({ letter, size?, lineColor?, accentColor?, width?, pair? })` — nowy `pair?: boolean`.

- [ ] **Step 1: Test** — styl `tylko-pisane` renderuje `screen.getByTestId('handwritten-letter')` będący `<svg>` z **4** elementami `<line>`; styl `tylko-drukowane` nadal renderuje `print-letter` i **nie** renderuje svg. Run → FAIL (lokalny komponent to `<span>`).

- [ ] **Step 2: Prop `pair` w shared** — dopisz `pair?: boolean` do propsów, `pair = false` w destrukturyzacji i na `<text>`: `letterSpacing={pair ? size * 0.18 : undefined}` (SVG `letterSpacing` jest liczbą użytkownikową, nie stringiem `em`).

- [ ] **Step 3: Podmiana w `LetterTile.tsx`** — usuń lokalną funkcję `HandwrittenLetter` (linia ~78), dodaj `import { HandwrittenLetter } from '@/shared/ui/HandwrittenLetter'`, a w miejscu użycia (linia ~206):

```tsx
{showHandwritten && <HandwrittenLetter letter={text} size={Math.round(fontSize / 0.7)} pair={isPair} />}
```

(shared przyjmuje `size` = wysokość czterolinii, font to `size * 0.7`). `PAIR_LETTER_SPACING` zostaje — używa go `PrintLetter`.

- [ ] **Step 4: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 5: Przeglądarka** — `/letters/session/iskierka`, `styleMode: tylko-pisane`: czterolinia mieści się w kafelku 120 px, „Bb" przy `caseMode: para` nie zlepia się.
- [ ] **Step 6: Commit** — `feat(litery): czterolinia w kafelkach pisanych — shared HandwrittenLetter` (+ trailer).

---

### Task 3: `NEAR_MISS_OFFSETS` wszędzie + odpalenie martwych `mastery-*` (C-20, C-14)

**Files:** Modify `src/modules/numbers/components/exercises/{SubitizeFlashExercise,MatchDigitDotsExercise,ConcreteAddExercise,ConcreteAddSubtract,TenFrameFill,SubtractMaintenance}.tsx`, `src/modules/numbers/hooks/useNumbersSession.ts`. Create `src/modules/numbers/data/masteryAudio.ts` + `.test.ts`, `src/modules/numbers/utils/buildChoices.nearmiss.test.ts`.

**Interfaces:** Produces `masteryAudioKey(conceptId: ConceptId): string`.

- [ ] **Step 1: Test regresyjny dystraktorów** (`buildChoices.nearmiss.test.ts`) — dla 50 seedów `buildChoices(6, { min:1, max:10, offsets: NEAR_MISS_OFFSETS, rng })` zawiera 6, każda wartość jest w ±3 od 6 i w `[1,10]`; dla `correct = 1` wynik ma 4 **różne** opcje. Run → PASS (opisuje istniejący `buildChoices`).

- [ ] **Step 2: Dołóż `offsets`** — w każdym z sześciu ćwiczeń znajdź `buildChoices(correct, { min, max })` i dopisz `offsets: NEAR_MISS_OFFSETS` (import z `'../../utils/buildChoices'`). `min`/`max` bez zmian, poza `SubitizeFlashExercise` (Task 4). `Doubles`, `NearDoubles`, `Make10` już mają; `CountObjects` powstaje z nimi w Task 12.

- [ ] **Step 3: Mapa mastery audio.** W `math-ui-strings.json` jest **19** kluczy `mastery-*` przy 20 konceptach — `ognik-factfamily-20` nie ma własnego.

```ts
// src/modules/numbers/data/masteryAudio.ts
import type { ConceptId } from '../types'

// Klucze mastery-* istnieją od modułu 3, ale nikt ich dotąd nie odtwarzał.
const MASTERY_AUDIO: Record<ConceptId, string> = {
  'iskierka-counting-5': 'mastery-counting-5', 'iskierka-counting-10': 'mastery-counting-10',
  'iskierka-subitizing-6': 'mastery-subitizing', 'iskierka-rhythm': 'mastery-rhythm',
  'iskierka-adding-concrete': 'mastery-adding-concrete',
  'plomyk-bonds-5': 'mastery-bonds-5', 'plomyk-bonds-10': 'mastery-bonds-10',
  'plomyk-tenframe': 'mastery-tenframe', 'plomyk-addsub-10': 'mastery-addsub-10',
  'plomyk-factfamily': 'mastery-factfamily',
  'ognik-doubles': 'mastery-doubles', 'ognik-neardoubles': 'mastery-neardoubles',
  'ognik-make10': 'mastery-make10',
  // Brak dedykowanego nagrania — dzieli komunikat z rodziną liczb do 10.
  'ognik-factfamily-20': 'mastery-factfamily',
  'pochodnia-skipcount-2': 'mastery-skipcount-2', 'pochodnia-skipcount-5': 'mastery-skipcount-5',
  'pochodnia-skipcount-10': 'mastery-skipcount-10', 'pochodnia-equalgroups': 'mastery-equalgroups',
  'pochodnia-arrays': 'mastery-arrays', 'pochodnia-commutativity': 'mastery-commutativity',
}

export function masteryAudioKey(conceptId: ConceptId): string { return MASTERY_AUDIO[conceptId] }
```

Test (`masteryAudio.test.ts`): każdy `ConceptId` z `CONCEPT_LABELS` ma niepusty klucz, a każdy klucz istnieje w zaimportowanym `audio-source/math-ui-strings.json`.

- [ ] **Step 4: Odtwarzanie w `persistResults`** (`useNumbersSession.ts` ~193) — zamiast boolowego `newlyMastered`:

```ts
const before = useNumbers.getState().concepts
const newlyMastered = (Object.entries(updatedConcepts) as [ConceptId, ConceptMastery][])
  .filter(([id, c]) => c.state === 'mastered' && before[id]?.state !== 'mastered')
  .map(([id]) => id)
for (const id of newlyMastered) void audioBus.play(masteryAudioKey(id))
if (newlyMastered.length > 0) void audioBus.play('tree-grow')
```

Kolejka FIFO gwarantuje `mastery-*` przed `tree-grow` — bez timerów.

- [ ] **Step 5: Run** `pnpm tsc -b && pnpm test --run` → 0 failed; `pnpm audio:check` → 0 braków (żadnych nowych kluczy).
- [ ] **Step 6: Commit** — `feat(cyferki): near-miss dystraktory we wszystkich ćwiczeniach + odtwarzanie mastery-*` (+ trailer).

---

### Task 4: Struktura 5, feedback nad reprezentacją, mastery jako okno (#15)

**Files:** Modify `src/modules/numbers/components/representations/TenFrame.tsx`, `components/exercises/{SubitizeFlashExercise,TenFrameFill}.tsx`, `components/SessionView.tsx`, `types.ts`, `hooks/useNumbersSession.ts`, `store/numbersStore.ts`, `hooks/useNumbersSession.test.ts`. Create `representations/TenFrame.test.tsx`, `store/numbersStore.migrate3.test.ts`.

**Interfaces:** `TenFrame({ …, dotColorSecond?: string, fiveStructure?: boolean })` (`fiveStructure` default `true`); `ConceptMastery + recentOutcomes: ('correct'|'wrong')[]` (cap 10) `+ factsCorrect: string[]`; `numbersStore` `version: 3` + `migrateNumbersV3`.

- [ ] **Step 1: Testy** — `TenFrame.test.tsx`: przy `count={7}`, `dotColor="#aa0000"`, `dotColorSecond="#00aa00"` pierwsze 5 kropek ma kolor A, pozostałe 2 kolor B; przy `fiveStructure={false}` wszystkie mają jeden kolor. `numbersStore.migrate3.test.ts`: wejście v2 `{ concepts: { x: { state:'mastered', factsTouched:['a','b'] } } }` po `migrateNumbersV3` daje `state:'mastered'`, `factsCorrect:['a','b']`, `recentOutcomes: []`. Run → FAIL.

- [ ] **Step 2: TenFrame** — nowe propy przekazane do `FrameGrid`; kolor kropki:

```tsx
const isSecondHalf = fiveStructure && (offset + idx) % 10 >= 5
const baseColor = isSecondHalf ? (dotColorSecond ?? lighten(dotColor, 0.25)) : dotColor
const background = useHighlight ? highlightColor : baseColor
```

`lighten(hex, amount)` — czysta funkcja w tym samym pliku (hex → rgb → mieszanie z bielą); wejście nie-hex zwraca bez zmian. Separator piątki: komórka o `idx === 5` dostaje `marginLeft: 2` + `boxShadow: inset 2px 0 0 ${colors.text}44`.

- [ ] **Step 3: `TenFrameFill`** — przekaż `fiveStructure={false}`: tam dziecko dokłada brakujące kropki i drugi kolor myli się z „już wypełnione".

- [ ] **Step 4: Subitizing** — w `SubitizeFlashExercise` payload dostaje `conceptId` (hook już zna `fact.conceptId`):

```tsx
const maxN = payload.conceptId === 'iskierka-counting-10' ? 10 : 6
const correct = clamp(payload.args[0] ?? 1, 1, maxN)
// DotPattern zna układ 'dice' tylko do 6 — powyżej wymuszamy scattered.
const [pattern] = useState<'dice'|'scattered'>(() => (correct > 6 || Math.random() >= 0.6 ? 'scattered' : 'dice'))
const choices = useMemo(() => buildChoices(correct, { min: 1, max: maxN, offsets: NEAR_MISS_OFFSETS }), [correct, maxN])
```

- [ ] **Step 5: Feedback jako pas, nie zasłona** — w `FeedbackOverlay` (`SessionView.tsx`) rozdziel styl:

```tsx
const isCorrection = outcome !== 'correct'
// Pas: absolute top/left/right, height '28%', tło rgba(239,68,68,0.92), flex center,
// biały tekst, pointerEvents 'auto' i zIndex 900 (<2000 → PauseOverlay nad pasem,
// >StatusBar → pas widoczny). correct zostaje pełnoekranowy (zIndex 50) — nagroda, nie korekta.
const overlayStyle: CSSProperties = isCorrection ? BAND_STYLE : FULLSCREEN_STYLE
```

Przy korekcie emoji ma `fontSize: 64`, liczba `56`. Zadanie pod spodem pokazuje **poprawną** liczbę: `SessionView` przekazuje ćwiczeniom `revealValue: number | null` (= `correctValue` gdy `status === 'feedback' && lastOutcome !== 'correct'`); ćwiczenia z `TenFrame`/`DotPattern` renderują `revealValue ?? count`, reszta prop ignoruje.

- [ ] **Step 6: Mastery jako okno** — w `types.ts` dopisz do `ConceptMastery`: `factsTouched` zostaje **wyłącznie dla migracji**, dochodzą `recentOutcomes: ('correct'|'wrong')[]` i `factsCorrect: string[]`. W `computeMasteryProgress`:

```ts
const RECENT_WINDOW = 10
const recent = [...(prev.recentOutcomes ?? [])]
const factsCorrect = new Set(prev.factsCorrect ?? [])
for (const ev of evs) {
  factsTouched.add(ev.factId)
  const ok = ev.outcome === 'correct'
  if (ok) { streak += 1; factsCorrect.add(ev.factId) } else { streak = 0 }
  recent.push(ok ? 'correct' : 'wrong')   // dontKnow liczy się jak błąd
}
const window = recent.slice(-RECENT_WINDOW)
const correctInWindow = window.filter((o) => o === 'correct').length
// Próg proporcjonalny do minStreakForMastery; dla domyślnego 10 daje 8/10.
const required = Math.min(RECENT_WINDOW, Math.max(1, Math.ceil((def.minStreakForMastery / RECENT_WINDOW) * 8)))
const meets = window.length >= RECENT_WINDOW && correctInWindow >= required &&
  factsCorrect.size >= def.minFacts && ageMs >= MIN_AGE_FOR_MASTERY_MS
// Mastery nie cofa się przez okno 8/10.
const state = prev.state === 'mastered' ? 'mastered' : meets ? 'mastered' : 'learning'
updated[conceptId] = { state, firstSeenAt, lastSeenAt: endedAt, correctStreak: streak,
  factsTouched: Array.from(factsTouched), recentOutcomes: window, factsCorrect: Array.from(factsCorrect) }
```

- [ ] **Step 7: Migracja v2→v3** w `numbersStore.ts`:

```ts
export function migrateNumbersV3(persisted: unknown): unknown {
  const p = (persisted ?? {}) as { concepts?: Record<string, Record<string, unknown>> }
  if (!p.concepts || typeof p.concepts !== 'object') return p
  const concepts: Record<string, unknown> = {}
  for (const [id, c] of Object.entries(p.concepts)) {
    const touched = Array.isArray(c['factsTouched']) ? (c['factsTouched'] as string[]) : []
    concepts[id] = { ...c, factsCorrect: touched, recentOutcomes: [] }
  }
  return { ...p, concepts }
}
// version: 3
migrate: (persisted, version) => {
  let p = persisted
  if (version < 2) p = migrateNumbersPersist(p)
  if (version < 3) p = migrateNumbersV3(p)
  return p as NumbersState
},
```

W `merge` znormalizuj brakujące pola konceptów (`recentOutcomes: []`, `factsCorrect: []`).

- [ ] **Step 8: Testy mastery** — dopisz do `useNumbersSession.test.ts` (tą samą ścieżką, którą plik już testuje sesję): 8 correct + 2 wrong w oknie 10 → `mastered`; 7 correct + 3 wrong → `learning`; 2 wrong na starcie + 8 correct → `mastered` (dziś streak by się zerował).

- [ ] **Step 9: Run** `pnpm tsc -b && pnpm test --run` → 0 failed. Przeglądarka `/numbers/session/plomyk`: pas zajmuje górne ~28%, zadanie pod nim widać, `PauseOverlay` przykrywa pas, TenFrame pokazuje 5+N w dwóch odcieniach.
- [ ] **Step 10: Commit** — `feat(cyferki): struktura 5 w ten frame, pas feedbacku zamiast zasłony, mastery jako okno 8/10 (store v3)` (+ trailer).

---

### Task 5: Dystraktory kontrastywne dla sylab (#14)

**Files:** Create `src/modules/reading/data/contrastiveSyllables.ts` + `.test.ts`. Modify `src/modules/reading/hooks/useReadingSession.ts`, `src/shared/srs/distractors.ts`.

**Interfaces:** Produces `CONTRASTIVE_SYLLABLES: Record<string, readonly string[]>` (klucze = teksty sylab). Modifies `pickDistractors(target, activePool, targetState: BaseItemState & { totalSeen: number }, contrastivePairs, rng?, count?, useShapeGroups?)`.

- [ ] **Step 1: Test tabeli** — mapa zamknięta w `ALL_SYLLABLES` (klucze i wartości), symetryczna (`b ∈ map[a] ⇒ a ∈ map[b]`), bez self-reference, każda z 24 sylab ma wpis (choćby pusty). Run → FAIL.

- [ ] **Step 2: Implementacja** (wzór: `letters/data/contrastivePairs.ts`)

```ts
// src/modules/reading/data/contrastiveSyllables.ts
// Bez tego pytanie da się rozwiązać po pierwszej literze. Pary wyłącznie na 24
// sylabach z data/syllables.ts; KA/GA, SA/ZA, TY/DY nie mają pokrycia w puli.
import { ALL_SYLLABLES } from './syllables'

const RAW_PAIRS: readonly (readonly [string, string])[] = [
  ['MA','MO'],['TA','TO'],['LA','LO'],['KO','KU'],['DA','DO'],['DO','DU'],
  ['NA','NO'],['NO','NU'],['RA','RO'],['RO','RU'],['SA','SO'],   // samogłoska
  ['PA','BA'],['TA','DA'],                                        // dźwięczność
  ['MA','NA'],['MO','NO'],['TA','KA'],['DA','BA'],['LA','RA'],['NU','DU'], // artykulacja
] as const

// buildSymmetricMap: dla każdej sylaby z ALL_SYLLABLES pusty Set, potem dla każdej
// pary dodaj w obie strony (pomijając a === b), na końcu Object.freeze każdej listy.
export const CONTRASTIVE_SYLLABLES: Record<string, readonly string[]> = buildSymmetricMap()
```

- [ ] **Step 3: Zawężenie typu w `pickDistractors`** — zmień `targetState: LetterState` na `targetState: BaseItemState & { totalSeen: number }` (funkcja czyta wyłącznie `box` i `totalSeen`, więc litery bez zmian) i dodaj siódmy parametr `useShapeGroups: boolean = true`. W gałęzi errorless: `!partners.has(l) && (!useShapeGroups || shapeOf(l) !== targetShape)` — `shapeOf` jest liter-specyficzne.

- [ ] **Step 4: Wpięcie w `generateSyllableMatch`**

```ts
const targetState = statesMap[targetId]
const poolTexts = activePool.map((id) => id.replace('syl-', ''))
let distractorTexts: string[]
try {
  if (!targetState) throw new Error('brak stanu sylaby')
  distractorTexts = pickDistractors(targetSyllable, poolTexts, targetState,
    CONTRASTIVE_SYLLABLES, rng, CHOICE_COUNT - 1, false)
} catch {
  // Pula < 4 sylaby (możliwe przy override) — wracamy do losowania.
  distractorTexts = pickRandomDistinct(ALL_SYLLABLES, CHOICE_COUNT - 1, [targetId], rng).map((d) => d.text)
}
const choices = shuffled([targetSyllable, ...distractorTexts], rng)
```

- [ ] **Step 5: Test zachowania** — dopisz dwa przypadki z seedowanym rng (`let i=0; const rng=()=>SEQ[i++ % SEQ.length]`): dla `box: 3, totalSeen: 9` i pierwszego losowania <0.7 wśród dystraktorów jest partner z tabeli; dla `box: 1, totalSeen: 1` (errorless) żaden dystraktor partnerem nie jest.
- [ ] **Step 6: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 7: Commit** — `feat(czytanie): kontrastywne dystraktory sylab w Iskierce` (+ trailer).

---

### Task 6: Wygaszanie koloru sylab wraz z boxem (B-7)

**Files:** Modify `src/modules/reading/components/{SyllableText,WordTile,WordAlbum,SessionView}.tsx`, `components/exercises/SyllableFillExercise.tsx`. Create `src/modules/reading/components/SyllableText.box.test.tsx`.

**Interfaces:** `SyllableText({ word, syllables?, box? })`, `WordTile({ …, box? })`, `SyllableFillExercise({ …, box? })` — `box?: Box` (1–5).

- [ ] **Step 1: Test** — render `<SyllableText word="MAMA" syllables={['MA','MA']} box={n} />` i asercje na `style` pierwszego wewnętrznego `<span>` (kontener ma `data-testid="syllable-text"`): `box: 1` → kolor palety i brak `opacity`; `box: 3` → `opacity === '0.55'`; `box: 5` → `color` równe `colors.text` (porównaj po konwersji hex→rgb, jsdom normalizuje) i brak `opacity`. Run → FAIL.

- [ ] **Step 2: Implementacja**

```tsx
// Kolor sylab to rusztowanie, nie format docelowy: im pewniejsze słowo,
// tym bliżej zwykłego czarnego druku.
function cueStyle(index: number, box: Box | undefined): CSSProperties {
  const cue = getSyllableCue(index)
  if (box === undefined || box <= 2) return { color: cue.color, borderBottom: `3px ${cue.underline} ${cue.color}` }
  if (box <= 4) return { color: cue.color, opacity: 0.55, borderBottom: `3px ${cue.underline} ${cue.color}` }
  return { color: colors.text }
}
```

Render: `<span data-testid="syllable-text" aria-hidden="true">` z `<span key={i} style={cueStyle(i, box)}>`.

- [ ] **Step 3: Przekazanie `box` w górę** — `WordTile` i `SyllableFillExercise` przyjmują `box?: Box` i podają dalej (WordTile tylko w stanie `idle`). `SessionView` czyta box targetu: ``useReading((s) => s.words[`word-${q.targetWord}`]?.box)``. **`WordAlbum` nigdy nie przekazuje `box` i renderuje `<SyllableText word={w.text} />` bez `syllables`** — album jest wystawą, zawsze czarny.

- [ ] **Step 4: Run** `pnpm tsc -b && pnpm test --run` → 0 failed. Przeglądarka `/reading/session/ognik`: słowo świeże kolorowe, opanowane czarne.
- [ ] **Step 5: Commit** — `feat(czytanie): kolor sylab gaśnie wraz z boxem — rusztowanie znika przy opanowaniu` (+ trailer).

---

### Task 7: Czytanki — „scal sylaby" + licznik przeczytań (#19) · **AUDIO (Azure)**

**Files:** Modify `src/shared/settings/{types.ts,defaults.ts,settingsStore.ts,components/SettingsScreen.tsx}`, `src/modules/czytanki/store/czytankiStore.ts`, `src/modules/czytanki/components/{CzytankaView,CzytankaTile,CzytankaList,SyllableButton}.tsx`, `src/modules/czytanki/index.tsx`, `src/shared/stats/components/ReportScreen.tsx`, `src/shared/stats/exporter.ts`, `audio-source/czytanki-ui-strings.json`. Create `src/modules/czytanki/store/czytankiStore.readCounts.test.ts`.

**Interfaces:** `settings.czytanki.mergedSyllables: boolean` (default `false`), `settingsStore` v5 → **v6**; `CzytankiState + readCounts: Record<string, number>` + `lastCountedAt`, `markOpened(id, nowMs?)` z guardem 60 s, `czytankiStore` v2 → **v3**.

- [ ] **Step 1: Ustawienie + migracja settings** — `mergedSyllables: boolean` w `settings.czytanki` (obiekt istnieje od Fali 1), default `false`. `settingsStore` `version: 6`, `migrate` bez zmian (pole dokłada `merge`), deep-merge `czytanki` dostaje `mergedSyllables: typeof p.czytanki?.mergedSyllables === 'boolean' ? p.czytanki.mergedSyllables : false`. Przełącznik w `SettingsScreen`, sekcja Czytanki.

- [ ] **Step 2: Test store'u** (`czytankiStore.readCounts.test.ts`) — `markOpened('cz-01', t)` daje `readCounts['cz-01'] === 1`; powtórka po 30 s **nie** inkrementuje, po 90 s inkrementuje do 2; `migrateCzytankiV3({ openedIds:['cz-02'], wordTaps:{}, timeMs:{} })` zachowuje `openedIds` i daje `readCounts: {}`; `mergeCzytankiState({ openedIds:['cz-03'] }, current)` defaultuje `readCounts`/`lastCountedAt` na `{}`. Run → FAIL.

- [ ] **Step 3: Store**

```ts
const RECOUNT_GUARD_MS = 60_000
// …state: readCounts: {} as Record<string, number>, lastCountedAt: {} as Record<string, number>,

markOpened: (id: string, nowMs: number = Date.now()) =>
  set((s) => {
    // Wejście-wyjście-wejście w 20 s to nadal jedno czytanie.
    const fresh = nowMs - (s.lastCountedAt[id] ?? 0) >= RECOUNT_GUARD_MS
    return {
      lastOpenedId: id,
      openedIds: s.openedIds.includes(id) ? s.openedIds : [...s.openedIds, id],
      readCounts: fresh ? { ...s.readCounts, [id]: (s.readCounts[id] ?? 0) + 1 } : s.readCounts,
      lastCountedAt: fresh ? { ...s.lastCountedAt, [id]: nowMs } : s.lastCountedAt,
    }
  }),
```

`migrateCzytankiV3(p)` dopisuje `readCounts: {}`, `lastCountedAt: {}` gdy ich nie ma. `version: 3` z łańcuchem `if (version < 2) p = migrateCzytankiV2(p); if (version < 3) p = migrateCzytankiV3(p)` (v2 pochodzi z Fali 1). `mergeCzytankiState` i `resetAllProgress` obejmują obie mapy.

- [ ] **Step 4: Przełącznik w `CzytankaView`** — przycisk 60×60 obok ▶, `data-testid="merge-syllables"`, `aria-label={merged ? 'Rozdziel sylaby' : 'Scal sylaby'}`, ikona tekstowa `KO|TA` ↔ `KOTA`. Tap: zapis ustawienia + `audioBus.stop()` + `play(merged ? 'czytanki-ui-merge-off' : 'czytanki-ui-merge-on')`.

```tsx
<span style={{ /* obwolutka słowa ZOSTAJE w obu trybach */ gap: merged ? 0 : '0.12em' }}>
  {word.syllables.map((syl, i) => (
    <SyllableButton key={i} text={syl} fontSize={fontSize}
      color={merged ? colors.text : getSyllableCue(i).color}
      underline={merged ? 'none' : getSyllableCue(i).underline}
      onTap={…} onLongPress={…} />
  ))}
</span>
```

`SyllableButton` dostaje `underline?: string` i renderuje `borderBottom` tylko gdy `!== 'none'`. Tap i long-press bez zmian — to warstwa czysto wizualna. **Auto-fit:** `useEffect(() => { fitStepRef.current = 0; setFontSize(BASE_FONT); setSceneBasis(SCENE_BASIS_DEFAULT) }, [merged])` — zmiana odstępu musi wymusić przeliczenie `FIT_SAFETY`.

- [ ] **Step 5: Kropki na kafelku** (decyzja ze speca: **kropki, nie cyfra**). `CzytankaTile` dostaje `readCount`: ⭐ przy ≥1, a przy ≥2 dodatkowo `data-testid={'reads-'+id}` z `Math.min(readCount,3)` kropkami 8 px w prawym dolnym rogu; `CzytankaList` przekazuje `readCounts`. **`markOpened` przenieś z tapu w kafelek do `useEffect` na mount w `ViewRoute`** — licznik mierzy wejścia, nie tapy.

- [ ] **Step 6: Raport** — w `CzytankiStats` dopisz „Przeczytane ≥2×: N" + listę tytułów. `CzytankiSnapshot` w `exporter.ts` zyskuje `readCounts`, a sekcja `## Czytanki` te same dwie linie (kontrakt: treść UI ≡ markdown).

- [ ] **Step 7: Audio — 2 klucze** w `czytanki-ui-strings.json` (`agnieszka`/`azure`):

```json
"czytanki-ui-merge-on": "Teraz sylaby są razem.",
"czytanki-ui-merge-off": "Teraz widzisz sylaby osobno."
```

- [ ] **Step 8: Build audio** (wymaga `.env.local` z kluczem Azure)

```bash
pnpm audio:dry    # plan: dokładnie 2 nowe klucze azure
pnpm audio:build  # ~10 s (throttling ~3,1 s/request)
pnpm audio:check  # 0 braków
afplay public/audio/czytanki-ui-merge-on.mp3
```

- [ ] **Step 9: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 10: Commit** — `feat(czytanki): przełącznik scalania sylab + licznik przeczytań (store v3, settings v6)` (+ trailer).

---

### Task 8: „Trudne literki" — selektor + route `/letters/hard` (#16a)

**Files:** Create `src/modules/letters/data/hardLetters.ts` + `.test.ts`, `src/modules/letters/components/HardLettersSession.tsx`. Modify `src/modules/letters/index.tsx`, `components/LevelSelect.tsx`, `hooks/useSession.ts`, `src/shared/stats/types.ts`, `src/shared/stats/components/LiveSessionSection.tsx`, `audio-source/ui-strings.json`.

**Interfaces:** Produces `selectHardLetters(letters, now, cap?): string[]`, `configLevelForHard(sessions): Level`, `HARD_LETTERS_CAP = 8`. Modifies `export type SessionMode = Level | 'hard' | 'daily'` i `SessionLog.level: SessionMode`; `UseSessionConfig + targetPool?: string[]`.

- [ ] **Step 1: Test selektora** — pomija `totalSeen === 0`; pomija `box: 4, recentWrong: 0`; bierze `recentWrong > 0` nawet przy `box: 5` oraz `box <= 2`; cap 8 przy 10 kandydatach; `configLevelForHard([])` → `'iskierka'`, a przy logu z `level: 'ognik'` → `'ognik'`. Run → FAIL.

- [ ] **Step 2: Implementacja**

```ts
// src/modules/letters/data/hardLetters.ts
import { scoreItem } from '@/shared/srs/scoring'
export const HARD_LETTERS_CAP = 8
const LEVEL_ORDER: readonly Level[] = ['iskierka', 'plomyk', 'ognik', 'pochodnia']

/** Litery „do poprawki": widziane i (świeżo mylone albo słabo utrwalone). */
export function selectHardLetters(letters: Record<string, LetterState>, now: number, cap = HARD_LETTERS_CAP): string[] {
  return Object.values(letters)
    .filter((s) => s.totalSeen > 0 && (s.recentWrong > 0 || s.box <= 2))
    .sort((a, b) => scoreItem(b, now) - scoreItem(a, now))
    .slice(0, cap).map((s) => s.letter)
}

/** Config (case/style/tiles) z najwyższego poziomu, na którym dziecko grało. */
export function configLevelForHard(sessions: SessionLog[]): Level {
  let best = -1
  for (const s of sessions) { const i = LEVEL_ORDER.indexOf(s.level as Level); if (i > best) best = i }
  return LEVEL_ORDER[best] ?? 'iskierka'
}
```

- [ ] **Step 3: `SessionMode`** — w `src/shared/stats/types.ts` dodaj `export type SessionMode = Level | 'hard' | 'daily'` i użyj go w `SessionLog.level` (oraz `UnifiedSession`). W `LiveSessionSection.tsx` dopisz do `LEVEL_LABEL`: `hard: 'Trudne literki'`, `daily: 'Literka dnia'` — inaczej etykieta wyjdzie `undefined`.

- [ ] **Step 4: `targetPool` w `useSession`** — pytania mają lecieć z puli trudnych, a dystraktory z **pełnej** puli poziomu:

```ts
const targetPool = cfg.targetPool && cfg.targetPool.length > 0 ? cfg.targetPool : cfg.activeLetters
const target = pickNextLetter(statesRef.current, targetPool, lastTargetRef.current, cfg.now(), cfg.rng)
```

- [ ] **Step 5: `HardLettersSession`** — reużywa `SessionView` modułu liter: `activeLetters` = pełna pula `configLevelForHard(sessions)`, `targetPool` = `selectHardLetters(...)`, `sessionLength = Math.min(HARD_LETTERS_CAP, hard.length)`, config case/style/tiles z tego samego poziomu. Na mount `void audioBus.play('letters-hard-intro')` (za każdym razem, nie `playIntroOnce`). Log zapisuje `level: 'hard'`.

- [ ] **Step 6: Kafelek 🔁** — pod siatką 2×2 w `LevelSelect`, `data-testid="hard-letters-tile"`, ≥60 px, ikona 🔁 + kropki = rozmiar puli. Gdy `hard.length < 3`: `opacity: 0.4`, tap gra `letters-hard-empty` i **nie** nawiguje. Inaczej `navigate('../hard', { replace: true })` (konwencja `handleSelect`).

- [ ] **Step 7: Route** — `<Route path="hard" element={<HardLettersRoute … />} />` przed `path="*"` w `letters/index.tsx`; wyjście `navigate('..', { state: { fromExit: true }, replace: true })` + `quitRef`, jak w `LettersSession`.

- [ ] **Step 8: Audio — 2 klucze** w `ui-strings.json` (`zofia`/`edge`):

```json
"letters-hard-intro": "Poćwiczymy literki, które są trudne.",
"letters-hard-empty": "Nie ma dziś trudnych literek. Brawo!"
```

- [ ] **Step 9: Build audio** `pnpm audio:dry && pnpm audio:build && pnpm audio:check` (bez klucza Azure — `edge` jest darmowy).
- [ ] **Step 10: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 11: Commit** — `feat(litery): tryb Trudne literki — selektor SRS, kafelek 🔁 i route /letters/hard` (+ trailer).

---

### Task 9: „Literka dnia" — mikrosesja + pasek na Home (#16b)

**Files:** Create `src/modules/letters/data/dailyLetter.ts` + `.test.ts`, `src/modules/letters/components/DailyLetterSession.tsx`. Modify `src/modules/letters/store/lettersStore.ts`, `src/modules/letters/index.tsx`, `src/app/Home.tsx`, `audio-source/ui-strings.json`.

**Interfaces:** Produces `dayKey(now: number): string` (`YYYY-MM-DD`, lokalnie), `pickDailyLetter(letters, pool, now): string | null`. Modifies `lettersStore + dailyLetter: { letter: string; dayKey: string } | null`, `+ dailyDoneDayKey: string | null`, `+ setDailyLetter`, `+ markDailyDone`; `version: 1` → **2**.

- [ ] **Step 1: Test** — `dayKey` stabilny w obrębie doby lokalnej i zmienia się o północy; `pickDailyLetter` wybiera literę o najwyższym `scoreItem`; pusta pula → `null`. Run → FAIL.

- [ ] **Step 2: Implementacja**

```ts
/** Klucz doby w czasie LOKALNYM — toISOString() przesunęłoby dobę o strefę. */
export function dayKey(now: number): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function pickDailyLetter(letters: Record<string, LetterState>, pool: readonly string[], now: number): string | null {
  let best: { letter: string; score: number } | null = null
  for (const letter of pool) {
    const st = letters[letter]
    const score = st ? scoreItem(st, now) : Number.POSITIVE_INFINITY   // nigdy niewidziana ma pierwszeństwo
    if (!best || score > best.score) best = { letter, score }
  }
  return best?.letter ?? null
}
```

- [ ] **Step 3: Store** — pola `dailyLetter` (default `null`) i `dailyDoneDayKey` (default `null`) w `initialLettersState`, `partialize`, `merge` (`p.dailyLetter ?? null`); akcje `setDailyLetter`, `markDailyDone`; `resetAllProgress` je czyści. `version: 2`, `migrate` zostaje pass-through (`merge` dokłada pola).

- [ ] **Step 4: Mikrosesja `DailyLetterSession`** — 60–90 s, bez `SessionEnd`, iskierek i sugestii poziomu: (1) `play('letters-daily-intro')`; (2) litera — gdy `dailyLetter?.dayKey === dayKey(now)` użyj jej, inaczej `pickDailyLetter(letters, getLevelPool(configLevelForHard(sessions)), now)` + `setDailyLetter`; czytaj **raz**, w `useState(() => …)`, żeby zmiana daty w trakcie nie przelosowała litery; (3) 4 ekspozycje przez `SessionView` z `targetPool: [letter]`, `sessionLength: 4`, `activeLetters` = pula poziomu, `forceReverseIndices: [1]` (prop z Task 10); (4) słowo-kotwica `getAssociation(letter)` — emoji + `play(assoc.audioKey)`, ~2,5 s; (5) `letters-daily-end` → `markDailyDone(dayKey(now))` → `navigate('/')`. Wyniki idą do SRS normalnie i do `sessions` jako log z `level: 'daily'`.

- [ ] **Step 5: Pasek na Home** (decyzja ze speca: **wąski pasek pod siatką 2×2**, siatka zostaje 2×2):

`<button data-testid="home-daily-letter" aria-label="Literka dnia">` na całą szerokość (`maxWidth: 820`, `minHeight: 64`, `marginTop: 4`, `borderRadius: radii.kid`, tło `#ecfdf5`, ramka `4px solid #10b981`), w środku `✔`/`✨` + litera w `var(--font-handwritten)`, `fontSize: 32`.

Tap: gdy `dailyDoneDayKey === dayKey(now)` → `play('letters-daily-done')` bez nawigacji; inaczej `navigate('/letters/daily')`. Intro Home rozszerz o `home-daily-letter` przez `playIntroOnce`. **Weryfikacja:** Home ma ~70 px zapasu w 820 px — jeśli w przeglądarce pojawi się scroll, zmniejsz `minHeight` kafelków modułów z 196 na 188.

- [ ] **Step 6: Route** `<Route path="daily" element={<DailyLetterRoute … />} />` w `letters/index.tsx` (`App.tsx` bez zmian — `/letters/*` już tam jest).
- [ ] **Step 7: Audio — 4 klucze** w `ui-strings.json` (`zofia`/`edge`):

```json
"letters-daily-intro": "Literka dnia! Posłuchaj i popatrz.",
"letters-daily-end": "To była literka dnia. Do jutra!",
"letters-daily-done": "Literkę dnia już znasz. Wróć jutro.",
"home-daily-letter": "Tu jest literka dnia — jedna literka, króciutko."
```

- [ ] **Step 8: Build audio** `pnpm audio:dry && pnpm audio:build && pnpm audio:check`
- [ ] **Step 9: Test mikrosesji** — render `/letters/daily`: dokładnie 4 pytania i wszystkie z tą samą `targetLetter`; `dailyLetter` niezmieniony przy ponownym renderze w tym samym `dayKey` i przelosowany po przesunięciu zegara na następny dzień.
- [ ] **Step 10: Run** `pnpm tsc -b && pnpm test --run` → 0 failed; Home bez scrolla w 1180×820.
- [ ] **Step 11: Commit** — `feat(litery): Literka dnia — mikrosesja 60-90 s, pasek na Home, dailyLetter w store (v2)` (+ trailer).

---

### Task 10: Zadanie odwrotne „widzisz literę → wybierz dźwięk" (A-13)

**Files:** Create `src/modules/letters/components/ReverseQuizCard.tsx`, `src/modules/letters/hooks/useSession.reverse.test.ts`. Modify `src/modules/letters/types.ts`, `hooks/useSession.ts`, `components/SessionView.tsx`, `components/DailyLetterSession.tsx`, `audio-source/ui-strings.json`.

**Interfaces:** `Question + kind: 'sound-to-letter' | 'letter-to-sound'`; `UseSessionConfig + reverseEvery?: number` (default 5) `+ forceReverseIndices?: number[]`.

- [ ] **Step 1: Test** — pytania o indeksach 4 i 9 mają `kind: 'letter-to-sound'`, reszta `'sound-to-letter'`; wywołanie odsłuchu kandydata woła `audioBus.play`, ale **nie** `answer()` (status zostaje `playing`). Run → FAIL.

- [ ] **Step 2: `kind` w generatorze** (`generateNextQuestion`):

```ts
const reverseEvery = cfg.reverseEvery ?? 5
const forced = cfg.forceReverseIndices ?? []
// Indeksy 4, 9, … — wariant trudniejszy nie zaczyna sesji.
const kind: Question['kind'] =
  forced.includes(num) || (reverseEvery > 0 && (num + 1) % reverseEvery === 0)
    ? 'letter-to-sound' : 'sound-to-letter'
```

Dla `letter-to-sound` przytnij `tiles` do 3 (target + 2 dystraktory) i przelicz `targetSlot`; prompt to `letters-reverse-prompt` zamiast `promptAudioKeys(target, mode)`.

- [ ] **Step 3: `ReverseQuizCard`** — duża litera (`fontSize: 160`, `chosenStyle`/`chosenCase` jak w wariancie podstawowym) + trzy kafelki 🔊 120×120. Tap kafelka = `onPlayCandidate(letter)` (kolejkuje `promptAudioKeys(letter, promptMode)`), **nie** odpowiedź; pod każdym kafelkiem osobny przycisk ✔ 60×60 → `onTileClick(letter, slot)`. Zachowaj 🤷 i ⏸ z `QuizCard`. `SessionView` wybiera komponent po `question.kind`.

- [ ] **Step 4: Idle-timer** — `onPlayCandidate` musi resetować idle (dziecko słuchające trzech kandydatów dostałoby auto-pauzę po 20 s): `SessionView` woła istniejący reset aktywności.

- [ ] **Step 5: Feedback** — bez zmian, ta sama ścieżka co wariant podstawowy, łącznie z drugą próbą z Fali 1 (`retry` przycina do 2 kafelków również tutaj).

- [ ] **Step 6: Literka dnia** — przekaż `forceReverseIndices: [1]` z `DailyLetterSession`.

- [ ] **Step 7: Audio — 1 klucz** w `ui-strings.json` (`zofia`/`edge`): `"letters-reverse-prompt": "Widzisz literkę. Posłuchaj i wybierz, jak brzmi."`
- [ ] **Step 8: Build audio** `pnpm audio:dry && pnpm audio:build && pnpm audio:check`
- [ ] **Step 9: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 10: Commit** — `feat(litery): wariant odwrotny litera → dźwięk co 5. pytanie i raz w Literce dnia` (+ trailer).

---

### Task 11: Sugestia poziomu na `SessionEnd` modułu 2 (B-10)

**Files:** Create `src/modules/reading/data/levelSuggestion.ts` + `.test.ts`. Modify `src/modules/reading/components/SessionEnd.tsx`, `hooks/useReadingSession.ts`, `audio-source/reading-ui-strings.json`.

**Interfaces:** `suggestLevel(input: { correctRatio: number; avgBox: number; previousRatios: number[] }): 'up' | 'down' | null`.

- [ ] **Step 1: Test** — `{0.85, 3.6, []}` → `'up'`; `{0.9, 2.9, []}` → `null`; `{0.3, 2, []}` → `null`, ale `{0.3, 2, [0.35]}` → `'down'` (dopiero druga słaba z rzędu); `{0.4, 2, [0.9]}` → `null`. Run → FAIL.

- [ ] **Step 2: Implementacja**

```ts
const UP_RATIO = 0.8, UP_AVG_BOX = 3.5, DOWN_RATIO = 0.4

/** Sugestia informacyjna — niczego nie blokuje ani nie przełącza. */
export function suggestLevel(i: { correctRatio: number; avgBox: number; previousRatios: number[] }): 'up' | 'down' | null {
  if (i.correctRatio >= UP_RATIO && i.avgBox >= UP_AVG_BOX) return 'up'
  const prev = i.previousRatios[i.previousRatios.length - 1]
  if (i.correctRatio <= DOWN_RATIO && prev !== undefined && prev <= DOWN_RATIO) return 'down'
  return null
}
```

- [ ] **Step 3: Dane** — `SessionResult` zyskuje `correctRatio: number` i `avgBox: number` (średni `box` **puli poziomu**, nie tylko pytanych elementów). `previousRatios` liczy `SessionEnd` z `useReading((s) => s.sessions)` — ostatnie sesje **tego samego poziomu**, ratio = `correct / wszystkie odpowiedzi`.

- [ ] **Step 4: UI** — pod podsumowaniem: `'up'` → ⬆ 72 px + `play('reading-level-up')`; `'down'` → ⬇ + `play('reading-level-down')`. Bez przycisku zmiany poziomu — wybór zostaje na `ReadingLevelSelect`.

- [ ] **Step 5: Audio — 2 klucze** w `reading-ui-strings.json` (`zofia`/`edge`):

```json
"reading-level-up": "Umiesz już dużo! Spróbuj trudniejszego poziomu.",
"reading-level-down": "Wróćmy na chwilę do łatwiejszego poziomu."
```

- [ ] **Step 6: Build audio** `pnpm audio:dry && pnpm audio:build && pnpm audio:check`
- [ ] **Step 7: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 8: Commit** — `feat(czytanie): sugestia awansu/cofnięcia poziomu na końcu sesji` (+ trailer).

---

### Task 12: `CountObjectsExercise` — liczenie 1:1 (#13)

**Files:** Create `src/modules/numbers/components/exercises/CountObjectsExercise.tsx` + `.test.tsx`. Modify `src/modules/numbers/types.ts`, `hooks/exerciseRouter.ts`, `hooks/useNumbersSession.ts`, `components/SessionView.tsx`, `audio-source/math-ui-strings.json`.

**Interfaces:** `ExerciseType | 'count-objects'`; `exerciseTypeForFact(fact, level, questionIndex = 0)`; `CountObjectsExercise({ audioBus, payload: { n, emoji, seed }, onAnswer })`.

- [ ] **Step 1: Test** — (a) drugi tap w ten sam obiekt nie gra `number-2`; (b) po ostatnim obiekcie pojawia się `count-cardinality` i leci `count-objects-howmany`; (c) `onAnswer` woła się dopiero z kafelka cyfry (`count-choice`), nigdy ze stukania; (d) router: `exerciseTypeForFact(count5Fact,'iskierka',0) === 'count-objects'`, `…,1) === 'subitize-flash'`; `count10Fact` odpowiednio `'count-objects'` / `'match-digit-dots'`. Run → FAIL.

- [ ] **Step 2: Router** — `exerciseTypeForFact(fact, level, questionIndex = 0)`; w gałęziach `iskierka-counting-5` i `iskierka-counting-10` zwróć `'count-objects'` gdy `questionIndex % 2 === 0`, inaczej dotychczasowy typ (subitizing zostaje w rotacji). `pickAndSetQuestion` przekazuje `questionIdx`.

- [ ] **Step 3: Komponent.** Faza `counting`: na mount `play('count-objects-prompt')`; N obiektów (`data-testid="count-object"`, tap-target 72 px) rozłożonych **nieregularnie** z `mulberry32(seed)`, sąsiednie ≥72 px od siebie — porządek liczenia narzuca dziecko, nie layout. `onPointerDown` z guardem `pointerId` (multi-touch: pierwszy palec). Tap w nieoznaczony → trwały znacznik (obwódka + wyszarzenie) + ``void audioBus.play(`number-${marked.length + 1}`)``; **bez `audioBus.stop()`** — FIFO ma zachować kolejność liczb. Tap w oznaczony → nic. `marked.length === n` → `phase = 'cardinality'` + `play('count-objects-howmany')`.

  Faza `cardinality` (`count-cardinality`): 4 kafelki cyfr (`count-choice`) z `buildChoices(n, { min:1, max:10, offsets: NEAR_MISS_OFFSETS })`, wybór → `onAnswer(v === n ? 'correct' : 'wrong')`. **Tylko ta odpowiedź trafia do SRS i logu** — inaczej anti-cheat `fast-click` flaguje stukanie. Błąd → `count-objects-recount`, znaczniki gasną, lektor liczy `number-1..n` z podświetleniem co 700 ms, potem druga próba z kontraktu Fali 1. `n === 1` → start od razu w `cardinality`. Pauza nie odmontowuje ćwiczenia (znaczniki zostają); po `resume` powtórz prompt.

- [ ] **Step 4: `SessionView`** — gałąź `case 'count-objects'` w `ExerciseSwitch`, payload `{ n: fact.args[0], emoji: pickIconSet(seed).emoji, seed }` (`data/concreteSets.ts`).

- [ ] **Step 5: Audio — 3 klucze** w `math-ui-strings.json` (`zofia`/`edge`); `number-1..10` z `numbers.json` już istnieją (dotąd martwe):

```json
"count-objects-prompt": "Stukaj w każdy przedmiot, a ja będę liczyć.",
"count-objects-howmany": "Ile jest razem?",
"count-objects-recount": "Policzmy jeszcze raz, powoli."
```

- [ ] **Step 6: Build audio** `pnpm audio:dry && pnpm audio:build && pnpm audio:check`
- [ ] **Step 7: Run** `pnpm tsc -b && pnpm test --run` → 0 failed. Przeglądarka `/numbers/session/iskierka`: obiekty się nie nakładają, tap-target ≥60 px, liczby lecą po kolei bez ucinania.
- [ ] **Step 8: Commit** — `feat(cyferki): CountObjectsExercise — liczenie 1:1 z dotykiem i pytaniem o kardynalność` (+ trailer).

---

### Task 13: `WordMeaningExercise` — obrazek → słowo (#18)

**Files:** Create `src/modules/reading/components/exercises/WordMeaningExercise.tsx` + `.test.tsx`. Modify `src/modules/reading/types.ts`, `data/words.ts`, `hooks/useReadingSession.ts`, `components/SessionView.tsx`, `audio-source/reading-ui-strings.json`.

**Interfaces:** `ReadingQuestion | { type: 'word-meaning'; targetWord: string; choices: string[] }`; `NO_MEANING_WORDS: readonly string[]`; `MEANING_QUESTION_INDICES = [2, 5]`.

- [ ] **Step 1: Test** — każdy wpis `NO_MEANING_WORDS` istnieje w `ALL_WORDS`; `generateWordMeaning` zwraca 4 `choices` o **różnych** `albumEmoji` i różnych pierwszych sylabach; słowo z `NO_MEANING_WORDS` nigdy nie jest targetem; `word-meaning` pojawia się dokładnie na indeksach 2 i 5, tylko w `ognik`/`pochodnia`, a przy `questionsPerSession === 5` tylko na indeksie 2. Run → FAIL.

- [ ] **Step 2: Dane** — w `words.ts`:

```ts
// Emoji abstrakcyjne albo dwuznaczne — dobre w albumie, złe jako pytanie o
// znaczenie (💧 to równie dobrze WODA jak ROSA). Blokuje bycie targetem, nie dystraktorem.
export const NO_MEANING_WORDS: readonly string[] = ['ROSA','KOSA','TAMA','DUDA','NORA','RAMA','KORA']
```

Zweryfikuj listę względem aktualnego `ALL_WORDS` — kryterium: emoji nie jest jednoznacznym desygnatem słowa.

- [ ] **Step 3: Generator**

```ts
export const MEANING_QUESTION_INDICES = [2, 5] as const

function generateWordMeaning(statesMap, activePool, lastTarget, rng, now) {
  const eligible = activePool.filter((id) => {
    const w = getWordById(id); return w !== undefined && !NO_MEANING_WORDS.includes(w.text)
  })
  const target = getWordById(pickNextItem(statesMap, eligible, lastTarget, now, rng))!
  const pool = ALL_WORDS.filter((w) => w.level === target.level && w.id !== target.id &&
    w.albumEmoji !== target.albumEmoji && w.syllables[0] !== target.syllables[0])
  if (pool.length < 3) throw new Error('word-meaning: za mała pula')
  return { type: 'word-meaning' as const, targetWord: target.text,
           choices: shuffled([target.text, ...shuffled(pool, rng).slice(0, 3).map((w) => w.text)], rng) }
}
```

W `generateQuestion`, przed `switch`: gdy `level ∈ {ognik, pochodnia}` **i** `MEANING_QUESTION_INDICES.includes(questionIndex)` **i** `questionIndex < questionsPerSession` — spróbuj `generateWordMeaning`, a przy rzuconym wyjątku (pula < 4) po cichu wróć do typu poziomu. Prompt: `playPromptAudio` dla `word-meaning` gra **wyłącznie** `reading-meaning-prompt` — nigdy `word-*`, inaczej znów jest to zadanie słuchowe.

- [ ] **Step 4: Komponent** — `albumEmoji` targetu (`fontSize: 200`) na środku, pod nim 4 `WordTile` w siatce 2×2 (bez `box` — pełny kolor sylab wspiera dekodowanie). 🤷 i 🔊 (powtarza prompt) jak w pozostałych ćwiczeniach.

- [ ] **Step 5: `SessionView`** — nowa gałąź warunkowana **typem pytania**, nie poziomem: `{q && q.type === 'word-meaning' && <WordMeaningExercise … />}`. Upewnij się, że istniejące gałęzie mają w warunku `q.type === '<typ>'`, żeby nie renderować dwóch ćwiczeń naraz.

- [ ] **Step 6: SRS i feedback** — bez zmian: target liczy się do boxa normalnie, druga próba z Fali 1 przycina `choices` do 2.
- [ ] **Step 7: Audio — 1 klucz** w `reading-ui-strings.json` (`zofia`/`edge`): `"reading-meaning-prompt": "Popatrz na obrazek. Które to słowo?"`
- [ ] **Step 8: Build audio** `pnpm audio:dry && pnpm audio:build && pnpm audio:check`
- [ ] **Step 9: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 10: Commit** — `feat(czytanie): sprawdzian rozumienia obrazek → słowo w Ogniku i Pochodni` (+ trailer).

---

### Task 14: Mini-pytanie o rozumienie do 60 czytanek (#17) · **AUDIO (Azure, 63 klucze)**

**Files:** Modify `src/modules/czytanki/data/{types.ts,czytanki.ts,audioKeys.ts}`, `store/czytankiStore.ts`, `components/CzytankaView.tsx`, `scripts/czytanki-audio-source.ts`, `audio-source/czytanki-ui-strings.json`. Create `src/modules/czytanki/components/ComprehensionQuestion.tsx`, `src/modules/czytanki/data/comprehension.test.ts`, `audio-source/czytanki-questions.json` (generowany).

**Interfaces:** `Comprehension = { question: string; options: readonly [string,string,string]; answer: 0|1|2 }`, `Czytanka + comprehension?: Comprehension`; `questionAudioKey(id): string` → `cz-q-01` … `cz-q-60`; `czytankiStore + answeredQuestionIds: string[]` + `markQuestionAnswered(id)`.

- [ ] **Step 1: Typ + klucz audio**

```ts
// data/types.ts
export type Comprehension = {
  question: string                             // "Kto jadł trawę?"
  options: readonly [string, string, string]   // emoji, dokładnie 3
  answer: 0 | 1 | 2
}
// Czytanka: … comprehension?: Comprehension

// data/audioKeys.ts — 'cz-01' → 'cz-q-01'
export function questionAudioKey(czytankaId: string): string { return czytankaId.replace(/^cz-/, 'cz-q-') }
```

- [ ] **Step 2: Test danych** — napisz PRZED pytaniami, to on egzekwuje reguły autorskie:

```ts
// src/modules/czytanki/data/comprehension.test.ts
describe('comprehension', () => {
  it('wszystkie 60 czytanek mają pytanie', () => {
    for (const c of CZYTANKI) expect(c.comprehension, c.id).toBeDefined()
  })
  it('3 różne emoji, answer w zakresie, ≤5 słów, znak zapytania, bez przeczeń', () => {
    for (const c of CZYTANKI) {
      const q = c.comprehension!
      expect(new Set(q.options).size).toBe(3)
      expect([0, 1, 2]).toContain(q.answer)
      expect(q.question.trim().split(/\s+/).length, c.id).toBeLessThanOrEqual(5)
      expect(q.question.endsWith('?'), c.id).toBe(true)
      expect(/\bnie\b|dlaczego/i.test(q.question), c.id).toBe(false)
      expect(questionAudioKey(c.id)).toMatch(AUDIO_KEY_RE)
      for (const o of q.options) expect(/[\u{1F3FB}-\u{1F3FF}]/u.test(o), `${c.id} ${o}`).toBe(false)
    }
  })
  it('pozycja poprawnej odpowiedzi rozłożona: każdy indeks ≥15 razy', () => {
    const counts = [0, 0, 0]
    for (const c of CZYTANKI) counts[c.comprehension!.answer]! += 1
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(15)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(60)
  })
})
```

Run → FAIL.

- [ ] **Step 3: NAPISZ WSZYSTKIE 60 PYTAŃ.** Dopisz pole `comprehension` do **każdego** wpisu w `src/modules/czytanki/data/czytanki.ts`. Przed napisaniem pytania przeczytaj `sentences` danej czytanki — odpowiedź musi z nich wynikać dosłownie.

  **REGUŁY AUTORSKIE (wiążące):**
  1. **Pytanie dosłowne** — odpowiedź stoi wprost w tekście: *kto? / co? / gdzie? / co robi?*. Zero wnioskowania, zero „dlaczego", zero przeczeń („Kto **nie** spał?" jest zakazane).
  2. **Maks. 5 słów, jedno zdanie zakończone `?`**, słownictwo wyłącznie z tej czytanki.
  3. **Poprawne emoji = rzeczownik obecny w tekście.** Dystraktory z **tej samej kategorii** (zwierzę / jedzenie / osoba / miejsce / przedmiot) i **nieobecne jako odpowiedź**; mogą występować w scenie, ale **scena nie może pokazywać wyłącznie poprawnej odpowiedzi** — inaczej dziecko odgaduje z obrazka, nie z tekstu (zakaz three-cueing). Gdy scena ma jednego aktora będącego odpowiedzią — zadaj inne pytanie do tej czytanki.
  4. **Trzy emoji wyraźnie różne wizualnie** — nie 🐕/🐩, nie 🍎/🍏; bez modyfikatorów koloru skóry.
  5. **Pozycja poprawnej odpowiedzi rozłożona równomiernie** — ~20 na indeks 0, 1 i 2 (test wymaga ≥15). Prowadź licznik w trakcie pisania.

  Schemat + 5 przykładów wzorcowych ze speca (przepisz je 1:1 dla tych id, resztę napisz analogicznie):

```ts
comprehension: { question: 'Kto ma kota?',        options: ['👩','👨','👵'],   answer: 1 }, // cz-03
comprehension: { question: 'Co jadła krowa?',     options: ['🌾','🍎','🐟'],   answer: 0 }, // cz-14
comprehension: { question: 'Gdzie był pies?',     options: ['🏠','🌳','🚗'],   answer: 1 }, // cz-22
comprehension: { question: 'Co Ola piła?',        options: ['🥛','🧃','☕'],   answer: 0 }, // cz-38
comprehension: { question: 'Kto spał na drzewie?',options: ['🐿️','🐦','🐈'], answer: 2 }, // cz-51
```

- [ ] **Step 4: Run** `pnpm vitest --run src/modules/czytanki/data/comprehension.test.ts` → PASS. Popraw **dane**, nie test.

- [ ] **Step 5: Generator audio-source** — w `scripts/czytanki-audio-source.ts` dodaj trzeci plik wyjściowy i zwróć go z `buildCzytankiSource`:

```ts
const QUESTIONS_OUT = join(AUDIO_SOURCE_DIR, 'czytanki-questions.json')
// Pełne zdania — Azure wymawia je poprawnie z ortografii, więc plain SSML.
const questions: Record<string, string> = { _voice: 'agnieszka', _engine: 'azure' }
for (const c of CZYTANKI) if (c.comprehension) questions[questionAudioKey(c.id)] = c.comprehension.question
```

plus `writeFileSync(QUESTIONS_OUT, JSON.stringify(questions, null, 2) + '\n', 'utf8')` i rozszerzony `console.log`.

- [ ] **Step 6: Store** — `answeredQuestionIds: string[]` (default `[]` w `initialState`, `merge` i `migrateCzytankiV3`) + idempotentne `markQuestionAnswered(id)`. Bez punktów i bez SRS — jedyny cel to ✔ na przycisku ❓.

- [ ] **Step 7: UI** — ❓ 72 px obok ▶ (**nie zasłania ◀ ▶**), widoczne gdy czytanka ma `comprehension` **i** (▶ doszło do końca **albo** dotknięto ≥60% sylab w tej wizycie — lokalny `Set` kluczy `s-w-i`, próg `Math.ceil(0.6 * wszystkieSylaby)`). ✔ gdy `answeredQuestionIds` zawiera id.

  Overlay `ComprehensionQuestion` (z-index poniżej `PauseOverlay`): 3 kafelki emoji 120 px; na mount `audioBus.stop()` + `czytanki-q-intro` + `questionAudioKey(id)`; 🔊 60 px powtarza. Poprawnie → 👏 + `czytanki-q-praise` + `markQuestionAnswered`, znika po ~1500 ms. Źle → `czytanki-q-again` i **odpada jeden zły kafelek** (zostają 2, w tym poprawny); druga próba zawsze kończy się 👏. `prefers-reduced-motion` wyłącza animację odrzucenia. Unmount: `audioBus.stop()` + `takePendingCue()`. Brak `comprehension` → brak ❓, zero błędu. Test: po błędzie w DOM zostają 2 kafelki, w tym poprawny.

- [ ] **Step 8: Audio UI — 3 klucze** w `czytanki-ui-strings.json` (`agnieszka`/`azure`):

```json
"czytanki-q-intro": "Mam do ciebie pytanie o tę czytankę.",
"czytanki-q-praise": "Tak! Dobrze przeczytałeś.",
"czytanki-q-again": "Nie to. Posłuchaj jeszcze raz."
```

- [ ] **Step 9: Build audio** (wymaga `.env.local` z kluczem Azure)

```bash
pnpm audio:czytanki   # generuje czytanki-questions.json (60 kluczy)
pnpm audio:dry        # plan: 63 nowe klucze azure, 0 azure-ipa
pnpm audio:build      # ~4 min przy F0 (~20 req/min)
pnpm audio:check      # 0 braków
afplay public/audio/cz-q-01.mp3 && afplay public/audio/cz-q-30.mp3 && afplay public/audio/czytanki-q-praise.mp3
```

Gdy któreś pytanie brzmi źle — dopisz `{ "text": "…" }` do `audio-source/pronunciation-overrides.json` i powtórz `audio:build` (regeneruje tylko zmienione klucze).

- [ ] **Step 10: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 11: Commit** — dwa commity, bo sieć usera zrywa uploady >2 MB:

```bash
git add src scripts audio-source && git commit -m "$(cat <<'EOF'
feat(czytanki): mini-pytanie o rozumienie dla wszystkich 60 czytanek + generator cz-q-*

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
git add public/audio && git commit -m "$(cat <<'EOF'
chore(audio): 63 nagrania pytań o rozumienie (Agnieszka, Azure)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Raport — „Następny krok", sugestie ze wszystkich modułów, flagi po ludzku (#12)

**Files:** Create `src/shared/stats/suggestions.ts` + `.test.ts`, `src/shared/stats/components/{NextStepCard,CollapsibleSection}.tsx`. Modify `src/shared/stats/components/{ReportScreen,SuggestionsSection,AntiCheatSection,AntiCheatSection.test}.tsx`, `src/shared/engagement/antiCheatFlags.ts`, `src/shared/stats/exporter.ts`.

**Interfaces:** `Suggestion = { id: string; text: string; why: string; priority: number; module: StatsModuleId | 'czytanki' | 'all' }`; `generateSuggestions(input: SuggestionInput): Suggestion[]` (malejąco po `priority`, zawsze ≥1); `antiCheatFlagText(type): { title: string; hint: string }`; `CollapsibleSection({ title, summary, children, defaultOpen? })`.

- [ ] **Step 1: Testy** — brak danych → **dokładnie 1** sugestia (fallback z „Litery"); przy sesji sprzed 4 dni **i** jednej sesji dziś pierwszy element ma `id: 'no-activity'` (priorytet 1 wygrywa nad 6); `numbers: undefined` nie rzuca; moduł nigdy nietknięty dostaje tekst „zacznij", nie „wróć". Osobno, wyczerpująco na unii: każdy z sześciu `AntiCheatFlagType` ma niepuste `title` i `hint`. Run → FAIL.

- [ ] **Step 2: `suggestions.ts`**

```ts
export type SuggestionInput = {
  now: number
  letters: Record<string, LetterState>
  allSessions: UnifiedSession[]
  reading?: { syllables: Record<string, SyllableState>; words: Record<string, WordState> }
  numbers?: NumbersSnapshot
  czytanki?: { openedIds: string[]; readCounts: Record<string, number> }
}
const FALLBACK: Suggestion = { id:'fallback', priority:0, module:'all',
  text:'Usiądźcie razem do jednej sesji Liter — 8 minut wystarczy.',
  why:'Jeszcze za mało danych, żeby coś doradzić.' }
```

Reguły — **pierwsza pasująca ma najwyższy `priority`**, sortujemy malejąco, `out[0]` idzie do karty:

| priority | id | warunek | text (skrót) |
|---|---|---|---|
| 6 | `no-activity` | brak sesji od ≥3 dni | „Wróćcie do nauki — wystarczy jedna krótka sesja." |
| 5 | `module-cold` | moduł nietknięty ≥7 dni albo nigdy | nigdy → „Zacznijcie…"; był → „Wróćcie do…" |
| 4 | `hard-items` | ≥3 litery/sylaby z `recentWrong ≥ 2` | „Trudne literki, 5 minut" |
| 3 | `concept-stuck` | koncept w `learning` ≥14 dni | nazwa z `CONCEPT_LABELS` |
| 2 | `reread` | żadna czytanka bez `readCounts ≥ 2` | „Przeczytajcie ulubioną czytankę drugi raz." |
| 1 | `two-sessions` | dzisiejszych sesji == 1 | „Dwie krótkie zamiast jednej długiej." |

Każda `Suggestion` ma jednozdaniowe `why`. Snapshot `undefined` → reguła go pomija. Gdy nic nie pasuje → `[FALLBACK]`.

- [ ] **Step 3: `antiCheatFlagText`** w `antiCheatFlags.ts` — teksty **dosłownie ze speca**:

```ts
const FLAG_TEXT: Record<AntiCheatFlagType, { title: string; hint: string }> = {
  'fast-click':    { title:'Klika bardzo szybko, prawie bez patrzenia.', hint:'Może to zmęczenie — spróbujcie krótszej sesji.' },
  'same-position': { title:'Wybiera ciągle ten sam kafelek.', hint:'Warto usiąść obok.' },
  'no-answer':     { title:'Zdarza się, że nie odpowiada wcale.', hint:'Sprawdźcie, czy zadanie nie jest za trudne.' },
  'many-dont-know':{ title:'Często mówi »nie wiem« — to uczciwe, ale poziom może być za trudny.', hint:'Rozważcie łatwiejszy poziom.' },
  visibility:      { title:'Sesja była przerwana wyjściem z aplikacji.', hint:'Krótsze sesje łatwiej dokończyć.' },
  'long-inactivity':{ title:'Dłuższa przerwa w środku sesji.', hint:'Może warto zrobić przerwę świadomie i wrócić później.' },
}
export function antiCheatFlagText(type: AntiCheatFlagType) { return FLAG_TEXT[type] }
```

`AntiCheatSection` renderuje `title` (16 px, `fontWeight: 600`) + `hint` (14 px, szary) zamiast żargonowego `FLAG_LABEL` (stała zostaje wyeksportowana dla zgodności, ale nie jest renderowana). Zaktualizuj asercje w `AntiCheatSection.test.tsx`.

- [ ] **Step 4: `CollapsibleSection` + `NextStepCard`** — `CollapsibleSection`: `<button>` nagłówka ≥44 px z `aria-expanded`, tytułem i **jednolinijkowym podsumowaniem** („Litery — 18/35 opanowanych"); stan w `useState`, **nie** w persist. `NextStepCard`: białe tło, ramka `colors.accentGreen`, `text` (20 px, bold) + `why` (15 px, szary).

- [ ] **Step 5: `ReportScreen`** — `NextStepCard` na samej górze, nad wszystkimi sekcjami. Pozostałe sekcje owinięte w `CollapsibleSection`, **wszystkie zwinięte domyślnie**. `SuggestionsSection` dostaje `reading`, `numbers`, `czytanki`, `allSessions` i renderuje `out.slice(1)` jako „Więcej sugestii". Snapshoty ze store'ów (`useReading`, `useNumbers`, `useCzytanki`) — jak dziś w `CzytankiStats`.

- [ ] **Step 6: Eksport MD** — `exportReportToMarkdown` dostaje `## Następny krok` zaraz po `Wygenerowano:` (z `text` + `why`) i te same opisy flag przez `antiCheatFlagText`. Kontrakt: **treść UI ≡ markdown** — obie ścieżki wołają te same czyste funkcje.

- [ ] **Step 7: Run** `pnpm tsc -b && pnpm test --run` → 0 failed. Przeglądarka `/report` (przez math gate): karta na górze, sekcje zwinięte, nagłówki ≥44 px, „Skopiuj raport" zawiera `## Następny krok`.
- [ ] **Step 8: Commit** — `feat(raport): karta Następny krok, sugestie ze wszystkich modułów, flagi anti-cheat po ludzku` (+ trailer).

---

### Task 16: Dokumentacja + weryfikacja końcowa

**Files:** Modify `docs/STATUS.md`, `CLAUDE.md`.

- [ ] **Step 1: Pełna weryfikacja**

```bash
pnpm tsc -b       # 0 błędów
pnpm test --run   # 0 failed
pnpm audio:dry    # 0 kluczy do wygenerowania
pnpm audio:check  # 0 braków
pnpm build        # production build przechodzi
```

- [ ] **Step 2: Dług po Fali 1 — stare klucze `letter-<x>`.** Sprawdź, czy ktoś je jeszcze odtwarza:

```bash
grep -rn "letter-\${" src ; grep -rn "'letter-'" src
```

Pusto (poza `promptKeys.ts`, który buduje `letter-name-*` / `phon-*`) → usuń klucze `letter-*` z `audio-source/letters.json`, `pnpm audio:build`, `pnpm audio:check`. Cokolwiek ich jeszcze używa → **nie ruszaj** i dopisz do STATUS.md jako dług Fali 3.

- [ ] **Step 3: Test w przeglądarce (1180×820)** — Home bez scrolla z paskiem „Literka dnia"; `/letters` kafelek 🔁; `/letters/daily` 4 ekspozycje + jedna odwrotna + kotwica; `/letters/session/*` co 5. pytanie odwrotne i czterolinia; `/reading/session/ognik` pytania 3. i 6. obrazek→słowo, gasnący kolor sylab, ⬆/⬇ na końcu; `/numbers/session/iskierka` co drugie pytanie liczenie 1:1, pas błędu nie zasłania; `/czytanki/cz-01` scalanie sylab, ❓, kropki na kafelku; `/report` karta na górze, sekcje zwinięte; `prefers-reduced-motion: reduce` → celebracje statyczne.

- [ ] **Step 4: `docs/STATUS.md`** — sekcja „Fala 2 (2026-08-29)": co weszło (16 pozycji), migracje persist (`numbersStore` v3, `czytankiStore` v3, `settingsStore` v6, `lettersStore` v2), nowe klucze audio (~78: 3 count-objects, 6 liter, 1 reverse, 2 poziom, 1 meaning, 2 merge, 63 czytanki), znane ograniczenia (brak dedykowanego `mastery-factfamily-20`, ewentualny dług `letter-*`).

- [ ] **Step 5: `CLAUDE.md`** — drzewo `src/` o nowe pliki z tasków 1–15; `audio-source/` o `czytanki-questions.json` (generowany); nowe wersje w „Persist kilka storage"; liczba plików w `public/audio/`; dwa wpisy w „Gdzie ŁATWO się pomylić": **mastery liczy się z okna 8/10, nie ze streaka — `factsTouched` to już tylko pole migracyjne** oraz **`SessionLog.level` to `SessionMode` (`Level | 'hard' | 'daily'`) — `LEVEL_LABEL` musi mieć wpis dla każdego**.

- [ ] **Step 6: Commit** — `docs: STATUS i CLAUDE.md po Fali 2 — dydaktyka, migracje persist, nowe audio` (+ trailer).

---

## Podsumowanie audio

**Wymagają klucza Azure** (`agnieszka`/`azure`): Task 7 — 2 klucze w `czytanki-ui-strings.json`; Task 14 — 60 w generowanym `czytanki-questions.json` + 3 w `czytanki-ui-strings.json`.
**Bez klucza** (`zofia`/`edge`): Task 8 (2) i 9 (4) i 10 (1) w `ui-strings.json`; Task 11 (2) i 13 (1) w `reading-ui-strings.json`; Task 12 (3) w `math-ui-strings.json`.
Task 3 odtwarza istniejące `mastery-*`, Task 12 istniejące `number-1..10` — buildu nie wymagają.
