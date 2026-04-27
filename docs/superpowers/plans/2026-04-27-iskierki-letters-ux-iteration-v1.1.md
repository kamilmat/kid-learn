# Iskierki — moduł liter, iteracja UX v1.1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementacja iteracji UX v1.1 modułu rozpoznawania liter w aplikacji Iskierki — cieplejszy odzew dla dziecka (mascotka w sesji, SFX, ciepłe pochwały, streak'i, perfekcyjna sesja) + spokojniejsze tempo (per-level countdown, 500ms wdech, łagodna paleta) + mikrotask CSS variable dla v2.

**Architecture:** Fixy do istniejącego modułu liter. Audio źródłowe rozszerzone (`audio-source/ui-strings.json` + 2 SFX w `manual-overrides/`), `useSession` orchestruje nowe audio sequence + streak + 500ms wdech z `audioBus.stop()`, `QuizCard` pokazuje mascotkę w status barze + mini-mascotkę dla wrong, `FeedbackOverlay` używa pełnej `IskraMascot` per-wariant, `Settings` rozszerzone o per-level `showCountdownBar` i opcję `25s`.

**Tech Stack:** React 19 + TS strict + Tailwind 4 + Zustand persist + Vitest + Edge TTS pipeline (Python wrapper).

**Spec:** `docs/superpowers/specs/2026-04-27-iskierki-letters-ux-iteration-v1.1-design.md`

---

## File Structure (mapping)

**Audio source (JSON + manual overrides):**
- `audio-source/ui-strings.json` — modyfikacja: dodanie pochwał 7-12, correction-prefix-1/2/3/contrastive, streak-3/5/7-plus, session-end-perfect, sfx-correct-ding, sfx-mastery-fanfara; usunięcie timeout-1/2 i dead keys
- `audio-source/manual-overrides/sfx-correct-ding.mp3` — nowy plik CC0
- `audio-source/manual-overrides/sfx-mastery-fanfara.mp3` — nowy plik CC0

**CSS:**
- `src/index.css` — dodanie `--font-handwritten` CSS variable

**Settings:**
- `src/shared/settings/types.ts` — `TimeLimit` rozszerzone o `25`, `Settings.showCountdownBar` przejście na `Partial<Record<Level, boolean>>`
- `src/shared/settings/defaults.ts` — `levelDefaults` rozszerzone o `showCountdownBar`, helper `getEffectiveShowCountdownBar`
- `src/shared/settings/settingsStore.ts` — merge callback drop'uje stary boolean
- `src/shared/settings/components/SettingsScreen.tsx` — UI dla 25s opcji + per-level showCountdownBar

**Letters module:**
- `src/modules/letters/hooks/useSession.ts` — picker pochwał no-repeat, picker correction-prefix kontekstowy, scalanie timeout/dontKnow audio, streak counter, perfect detection, SFX play, 500ms wdech + audioBus.stop, cue 5s→3s, STREAK_AUDIO_DURATION_MS
- `src/modules/letters/components/QuizCard.tsx` — mała `IskraMascot` w status bar (intensywność z streak'a), mini-mascotka dla wrong, łagodna paleta countdown
- `src/modules/letters/components/FeedbackOverlay.tsx` — pełna `IskraMascot` per-wariant zamiast emoji, CSS var dla fontFamily
- `src/modules/letters/components/SessionView.tsx` — `getEffectiveShowCountdownBar(settings, level)` + przekazanie `currentStreak` do QuizCard
- `src/modules/letters/components/SessionEnd.tsx` — wariant perfect (dla `correctRate === 1 && totalQuestions === sessionLength`)

**Components z hardcoded `Caveat/Itim/cursive` do podmiany na CSS var:**
- `src/shared/ui/HandwrittenLetter.tsx:28`
- `src/modules/letters/components/LetterTile.tsx:77`
- `src/modules/letters/components/FeedbackOverlay.tsx:201`
- `src/app/Home.tsx:79,128`

---

## Task 1: Audit i czyszczenie nieużywanych kluczy w `ui-strings.json`

**Files:**
- Modify: `audio-source/ui-strings.json`

- [ ] **Step 1: Zweryfikować że klucze są faktycznie nieużywane (grep)**

Run:
```bash
cd /Users/kamilmat87/kid-learn && for key in feedback-wrong-prefix feedback-correct-suffix still-there try-again summary-intro; do echo "=== $key ==="; grep -rn "$key" src/ scripts/ 2>/dev/null | grep -v "ui-strings.json" | grep -v ".test." || echo "(brak referencji w kodzie)"; done
```

Expected: każdy klucz zwróci "(brak referencji w kodzie)" lub trafi tylko w komentarzach. Jeśli któryś jest faktycznie używany — pominąć go w step 2.

- [ ] **Step 2: Usunąć dead keys + timeout-1/2 + correction-prefix z `ui-strings.json`**

Edit `audio-source/ui-strings.json` — usuń linie:
- `"timeout-1": "spróbuj szybciej",`
- `"timeout-2": "następnym razem szybciej",`
- `"correction-prefix": "to była literka",`
- `"feedback-wrong-prefix": "posłuchaj jeszcze raz...",`
- `"feedback-correct-suffix": "...to była",`
- `"still-there": "jesteś tam? wracaj!",`
- `"try-again": "spróbuj jeszcze raz",`
- `"summary-intro": "zebraliśmy razem"`

- [ ] **Step 3: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add audio-source/ui-strings.json && git commit -m "audio(ui-strings): drop dead keys + stare timeout/correction-prefix przygotowanie pod B3"
```

---

## Task 2: Dodanie nowych kluczy tekstowych w `ui-strings.json`

**Files:**
- Modify: `audio-source/ui-strings.json`

- [ ] **Step 1: Dorzucić do `audio-source/ui-strings.json` 12 nowych pozycji**

Po istniejącym `praise-6` dodaj pochwały 7-12, po `dont-know-3` dodaj nowe correction-prefix i streak/perfect klucze. Konkretne klucze i wartości:

```json
"praise-7": "wow!",
"praise-8": "umiesz to!",
"praise-9": "super ci poszło!",
"praise-10": "świetna robota!",
"praise-11": "pięknie!",
"praise-12": "tak, tak!",
"correction-prefix-1": "ojej, posłuchaj!",
"correction-prefix-2": "to była literka...",
"correction-prefix-3": "spokojnie, słuchamy",
"correction-prefix-contrastive": "ach, te dwie są podobne — to literka...",
"streak-3": "trzy z rzędu!",
"streak-5": "pięć z rzędu!",
"streak-7-plus": "ognisty streak!",
"session-end-perfect": "perfekcyjna sesja! wszystkie literki!"
```

(Plus dwa SFX klucze, dodawane w Task 4.)

- [ ] **Step 2: Walidacja JSON**

Run:
```bash
cd /Users/kamilmat87/kid-learn && python3 -c "import json; json.load(open('audio-source/ui-strings.json'))" && echo OK
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add audio-source/ui-strings.json && git commit -m "audio(ui-strings): nowe klucze (B3 pochwały + correction prefix, B4 streak + perfect)"
```

---

## Task 3: Pobranie SFX z mixkit i wrzucenie jako manual overrides

**Files:**
- Create: `audio-source/manual-overrides/sfx-correct-ding.mp3`
- Create: `audio-source/manual-overrides/sfx-mastery-fanfara.mp3`

- [ ] **Step 1: Pobrać dwa pliki CC0 z mixkit**

Wybór konkretny (sprawdzone licencje CC0 — mixkit Free Sound Effects):
- ding: https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3 ("correct-answer-tone")
- fanfara: https://assets.mixkit.co/active_storage/sfx/1990/1990-preview.mp3 ("achievement-bell")

Run:
```bash
cd /Users/kamilmat87/kid-learn && mkdir -p audio-source/manual-overrides && curl -fsSL -o audio-source/manual-overrides/sfx-correct-ding.mp3 "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" && curl -fsSL -o audio-source/manual-overrides/sfx-mastery-fanfara.mp3 "https://assets.mixkit.co/active_storage/sfx/1990/1990-preview.mp3" && ls -la audio-source/manual-overrides/sfx-*.mp3
```

Expected: dwa pliki >5KB każdy. Jeśli URL zwróci 404, alternatywnie użyć https://mixkit.co/free-sound-effects/game/ i znaleźć krótkie chime/bell pliki ręcznie.

- [ ] **Step 2: Sprawdzenie że pliki grają (krótka długość)**

Run (macOS):
```bash
cd /Users/kamilmat87/kid-learn && afinfo audio-source/manual-overrides/sfx-correct-ding.mp3 | grep -E "duration|estimated" && afinfo audio-source/manual-overrides/sfx-mastery-fanfara.mp3 | grep -E "duration|estimated"
```

Expected: ding ≤1s, fanfara ≤2s. Jeśli dłuższe — znaleźć inne pliki na mixkit.co.

- [ ] **Step 3: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add audio-source/manual-overrides/sfx-correct-ding.mp3 audio-source/manual-overrides/sfx-mastery-fanfara.mp3 && git commit -m "audio(sfx): SFX mixkit CC0 — correct ding + mastery fanfara"
```

---

## Task 4: Dorzucenie SFX kluczy do `ui-strings.json` z hash `_sfx_`

**Files:**
- Modify: `audio-source/ui-strings.json`

Cel: pipeline `generate-audio.ts` iteruje tylko po kluczach z SOURCE_FILES; bez wpisu w JSON manual override nigdy nie zostanie skopiowany do `public/audio/`.

- [ ] **Step 1: Dorzucić dwa klucze SFX do `ui-strings.json`**

Po `session-end-perfect` (z Task 2) dodaj:

```json
"sfx-correct-ding": "_sfx_",
"sfx-mastery-fanfara": "_sfx_"
```

Wartość `"_sfx_"` to pseudo-hash — nie używana przez TTS bo `manual-overrides/` wygrywa nad TTS w `decideAction` (`scripts/generate-audio.ts:215`).

- [ ] **Step 2: Walidacja JSON**

Run:
```bash
cd /Users/kamilmat87/kid-learn && python3 -c "import json; json.load(open('audio-source/ui-strings.json'))" && echo OK
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add audio-source/ui-strings.json && git commit -m "audio(sfx): klucze sfx-correct-ding/sfx-mastery-fanfara w ui-strings.json (pseudo-hash)"
```

---

## Task 5: Regeneracja audio (`pnpm audio:build`)

- [ ] **Step 1: Odpalić build**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm audio:build
```

Expected: dla każdej z 14 nowych pozycji `→ <key> (generuję, no manifest entry)` (TTS); dla SFX `→ sfx-correct-ding (override copied)` i `→ sfx-mastery-fanfara (override copied)`. Końcowo `Done. generated=12 copied=2 cached=~115`.

- [ ] **Step 2: Sprawdzenie**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm audio:check && ls public/audio/sfx-*.mp3 public/audio/praise-{7,8,9,10,11,12}.mp3 public/audio/streak-*.mp3 public/audio/correction-prefix-*.mp3 public/audio/session-end-perfect.mp3
```

Expected: `audio:check` przechodzi (zielono), wszystkie pliki istnieją.

- [ ] **Step 3: Commit zaktualizowanego manifestu + nowych mp3**

```bash
cd /Users/kamilmat87/kid-learn && git add public/audio/ && git commit -m "audio(build): regen + nowe mp3 (B3 pochwały, correction prefix, streak, perfect, SFX)"
```

---

## Task 6: CSS variable `--font-handwritten` (mikrotask v1.1, ułatwia v2)

**Files:**
- Modify: `src/index.css`
- Modify: `src/shared/ui/HandwrittenLetter.tsx`
- Modify: `src/modules/letters/components/LetterTile.tsx`
- Modify: `src/modules/letters/components/FeedbackOverlay.tsx`
- Modify: `src/app/Home.tsx`
- Modify: `src/shared/ui/HandwrittenLetter.test.tsx`

- [ ] **Step 1: Dodaj CSS variable do `src/index.css`**

Read pliku. Do najwyższego `:root { ... }` (lub stwórz jeśli nie ma) dorzuć:

```css
:root {
  --font-handwritten: 'Caveat', 'Itim', cursive;
}
```

Jeśli nie ma `:root`, dodaj na początku (po `@import`):

```css
:root {
  --font-handwritten: 'Caveat', 'Itim', cursive;
}
```

- [ ] **Step 2: Podmień `HandwrittenLetter.tsx`**

W `src/shared/ui/HandwrittenLetter.tsx:28` zamień:

```typescript
const FONT_FAMILY = "'Caveat', 'Itim', cursive"
```

na:

```typescript
const FONT_FAMILY = "var(--font-handwritten)"
```

- [ ] **Step 3: Podmień `LetterTile.tsx`**

W `src/modules/letters/components/LetterTile.tsx:77` zamień string `'"Caveat", "Itim", cursive'` na `'var(--font-handwritten)'`. Edit konkretnie:

`old:` `style={{ fontFamily: '"Caveat", "Itim", cursive', fontStyle: 'italic', fontSize, lineHeight: 1 }}`

`new:` `style={{ fontFamily: 'var(--font-handwritten)', fontStyle: 'italic', fontSize, lineHeight: 1 }}`

- [ ] **Step 4: Podmień `FeedbackOverlay.tsx`**

W `src/modules/letters/components/FeedbackOverlay.tsx` znajdź linie ~200-202 z `'"Caveat", "Itim", cursive'` i zamień na `'var(--font-handwritten)'`.

- [ ] **Step 5: Podmień `Home.tsx` (2 miejsca)**

W `src/app/Home.tsx` znajdź dwa wystąpienia `"'Caveat', 'Itim', cursive"` (linie ~79 i ~128) i zamień oba na `"var(--font-handwritten)"`.

- [ ] **Step 6: Zaktualizuj test `HandwrittenLetter.test.tsx`**

W `src/shared/ui/HandwrittenLetter.test.tsx` test `"uses the cursive font-family stack"` aktualnie sprawdza `toContain('Caveat')` i `toContain('cursive')`. Zamień na sprawdzenie zawartości CSS variable. Nowa asercja:

```typescript
expect(text?.getAttribute('font-family')).toBe('var(--font-handwritten)')
```

(usuń linie sprawdzające 'Caveat' i 'cursive').

- [ ] **Step 7: Run tests**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/shared/ui/HandwrittenLetter.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Type check + build sanity**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b
```

Expected: zero błędów.

- [ ] **Step 9: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/index.css src/shared/ui/HandwrittenLetter.tsx src/shared/ui/HandwrittenLetter.test.tsx src/modules/letters/components/LetterTile.tsx src/modules/letters/components/FeedbackOverlay.tsx src/app/Home.tsx && git commit -m "refactor(font): CSS variable --font-handwritten (przygotowanie pod v2 elementarza)"
```

---

## Task 7: Settings types — `TimeLimit` + `showCountdownBar` per-level

**Files:**
- Modify: `src/shared/settings/types.ts`

- [ ] **Step 1: Rozszerz `TimeLimit` o `25`**

W `src/shared/settings/types.ts:16` zamień:

```typescript
export type TimeLimit = 'off' | 10 | 15 | 20
```

na:

```typescript
export type TimeLimit = 'off' | 10 | 15 | 20 | 25
```

- [ ] **Step 2: Zmień `showCountdownBar` na per-level mapę**

W `src/shared/settings/types.ts:29` zamień:

```typescript
showCountdownBar: boolean
```

na:

```typescript
// override per poziom; brak klucza = używaj domyślnej wartości poziomu
showCountdownBar: Partial<Record<Level, boolean>>
```

- [ ] **Step 3: Type check (oczekiwane błędy w consumerach — nie commit'ujemy jeszcze)**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -40
```

Expected: błędy w `defaults.ts` (showCountdownBar boolean), `settingsStore.test.ts` (asercje), `SettingsScreen.tsx` (usage), `SessionView.tsx` (passing). To naprawimy w kolejnych taskach.

(Bez commit — kontynuujemy do Task 8 i 9.)

---

## Task 8: Settings defaults — per-level `showCountdownBar` + helper

**Files:**
- Modify: `src/shared/settings/defaults.ts`

- [ ] **Step 1: Rozszerz `levelDefaults` typ + wartości**

W `src/shared/settings/defaults.ts:64-80` zamień blok `levelDefaults` na:

```typescript
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

- [ ] **Step 2: Zmień `defaultSettings.showCountdownBar` na pustą mapę**

W `src/shared/settings/defaults.ts:83-94` zamień:

```typescript
showCountdownBar: true,
```

na:

```typescript
showCountdownBar: {},
```

- [ ] **Step 3: Dodaj helper `getEffectiveShowCountdownBar`**

Na końcu `src/shared/settings/defaults.ts` (przed ostatnim `}` jeśli istnieje export, albo po nim) dorzuć:

```typescript
/**
 * Zwraca efektywną wartość `showCountdownBar` dla poziomu — override z
 * `settings.showCountdownBar[level]` jeśli ustawiony, inaczej `levelDefaults`.
 */
export function getEffectiveShowCountdownBar(
  settings: Settings,
  level: Level,
): boolean {
  return (
    settings.showCountdownBar?.[level] ?? levelDefaults[level].showCountdownBar
  )
}
```

- [ ] **Step 4: Type check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -30
```

Expected: błędy w `defaults.ts` znikły, ale są jeszcze w `settingsStore.test.ts`, `SettingsScreen.tsx`, `SessionView.tsx`. Kontynuujemy.

---

## Task 9: Settings store — migracja drop'ująca stary boolean

**Files:**
- Modify: `src/shared/settings/settingsStore.ts`
- Modify: `src/shared/settings/settingsStore.test.ts`

- [ ] **Step 1: Bump version + napisz failing test migracji w `settingsStore.test.ts`**

Read pliku, zaobserwuj jak są skonstruowane testy. Na końcu pliku, w istniejącej sekcji (lub nowej `describe('migration', ...)`), dorzuć:

```typescript
describe('showCountdownBar migration (v2 → v3)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  it('drops legacy boolean showCountdownBar from persisted state', () => {
    // Symulujemy stary persist (v2): showCountdownBar był boolean
    const legacyPersisted = {
      state: {
        settings: {
          ...defaultSettings,
          showCountdownBar: true as unknown as Settings['showCountdownBar'],
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 2,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersisted))
    // Force rehydrate
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.showCountdownBar).toEqual({})
  })
})
```

(Importy: `defaultSettings` z `'./defaults'`, `initialMathGateState` z `'./mathGate'`, `Settings` z `'./types'` — dopisz jeśli brakuje.)

- [ ] **Step 2: Run test — oczekiwany FAIL**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/shared/settings/settingsStore.test.ts -t "migration"
```

Expected: FAIL — bo merge callback nie czyści starego boolean.

- [ ] **Step 3: Update merge callback w `settingsStore.ts`**

W `src/shared/settings/settingsStore.ts:123-133` zamień blok `version: 2` + `merge:` na:

```typescript
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

- [ ] **Step 4: Run test — oczekiwany PASS**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/shared/settings/settingsStore.test.ts -t "migration"
```

Expected: PASS.

- [ ] **Step 5: Aktualizacja istniejących testów które oczekiwały boolean**

W `src/shared/settings/settingsStore.test.ts` znajdź linie ~80-84:

```typescript
it('updates timeLimit and showCountdownBar independently', () => {
  useSettings.getState().updateSetting('timeLimit', 'off')
  ...
  expect(s.timeLimit).toBe('off')
})
```

Jeśli sprawdza `showCountdownBar` jako boolean — zaktualizuj na sprawdzanie mapy. Konkretnie szukaj `toBe(true)` / `toBe(false)` dla `showCountdownBar` i zamień na `toEqual({...})`. Jeśli test tylko `timeLimit` — nic nie zmieniaj.

- [ ] **Step 6: Run all settingsStore tests**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/shared/settings/settingsStore.test.ts
```

Expected: wszystko PASS.

- [ ] **Step 7: Commit (Tasks 7+8+9 razem — spójna zmiana typowa + migracja + defaulty)**

```bash
cd /Users/kamilmat87/kid-learn && git add src/shared/settings/types.ts src/shared/settings/defaults.ts src/shared/settings/settingsStore.ts src/shared/settings/settingsStore.test.ts && git commit -m "feat(settings): TimeLimit 25s + per-level showCountdownBar (drop legacy boolean v2→v3)"
```

---

## Task 10: Settings UI — opcja `25s` + per-level `showCountdownBar`

**Files:**
- Modify: `src/shared/settings/components/SettingsScreen.tsx`

- [ ] **Step 1: Read `SettingsScreen.tsx` linii 420-460 (sekcja TimeLimit + showCountdownBar)**

Run:
```bash
cd /Users/kamilmat87/kid-learn && sed -n '420,460p' src/shared/settings/components/SettingsScreen.tsx
```

Skup się na tym jak są renderowane radio dla `TimeLimit`. Skopiuj wzorzec do nowej opcji `25` i per-level showCountdownBar.

- [ ] **Step 2: Dodaj opcję `25` do TimeLimit radios**

W `SettingsScreen.tsx` znajdź array opcji TimeLimit (linia ~425-440). Aktualnie array jest np. `['off', 10, 15, 20]`. Zamień na `['off', 10, 15, 20, 25]`.

Poprawka: jeśli array jest hard-coded inline w `.map()`, dorzuć `25` jako kolejny element. Jeśli to const u góry pliku — dorzuć tam.

- [ ] **Step 3: Zamień globalny showCountdownBar checkbox na per-level**

W `SettingsScreen.tsx:447-...` znajdź sekcję `{settings.timeLimit !== 'off' && (` z `showCountdownBar`. Aktualnie jest jeden checkbox boolean dla globalnego ustawienia. Zamień na per-level (4 checkboxy: iskierka, płomyk, ognik, pochodnia), każdy ustawiający `settings.showCountdownBar[level]`.

Konkretny zamienik (zachowaj otaczający `{settings.timeLimit !== 'off' && (` warunek):

```tsx
<div data-testid="show-countdown-per-level" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
  <div style={{ fontWeight: 600 }}>Pokaż pasek czasu (per poziom):</div>
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
        <span>{lvl}</span>
      </label>
    )
  })}
</div>
```

(Importy na górze pliku: dorzuć `getEffectiveShowCountdownBar` z `'../defaults'`. `Level` powinno być już zaimportowane lub ze ścieżki types.)

- [ ] **Step 4: Type check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -20
```

Expected: zero błędów w SettingsScreen. Jeśli SessionView/inne dalej krzyczą — to OK, naprawimy w Task 14.

- [ ] **Step 5: Run SettingsScreen test (jeśli przechodzi — bonus)**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/shared/settings/components/SettingsScreen.test.tsx 2>&1 | tail -20
```

Expected: część testów może padać (stare oczekiwania na boolean). Notuj failures, nie naprawiamy teraz — to robimy w Task 14 razem z aktualizacją SessionView.

- [ ] **Step 6: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/shared/settings/components/SettingsScreen.tsx && git commit -m "feat(settings UI): 25s opcja + per-level showCountdownBar checkboxy"
```

---

## Task 11: useSession — picker pochwał `pickPraiseKey` (no-repeat-with-last)

**Files:**
- Modify: `src/modules/letters/hooks/useSession.ts`
- Modify: `src/modules/letters/hooks/useSession.test.ts` (jeśli istnieje) lub Create: `src/modules/letters/hooks/useSession.pickPraiseKey.test.ts`

- [ ] **Step 1: Napisz failing test pickera**

Create `src/modules/letters/hooks/useSession.pickPraiseKey.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { pickPraiseKey, PRAISE_KEYS } from './useSession.pickers'

describe('pickPraiseKey', () => {
  it('picks one of the 12 praise keys', () => {
    const key = pickPraiseKey(null, () => 0)
    expect(PRAISE_KEYS).toContain(key)
  })

  it('returns first key when rng=0 and no last', () => {
    const key = pickPraiseKey(null, () => 0)
    expect(key).toBe(PRAISE_KEYS[0])
  })

  it('skips last key — never returns it twice in a row', () => {
    const last = PRAISE_KEYS[0]
    // rng=0 zwykle zwróciłby PRAISE_KEYS[0], ale ten jest "last" → skip do następnego
    const next = pickPraiseKey(last, () => 0)
    expect(next).not.toBe(last)
  })

  it('cycles deterministically with mock rng', () => {
    // Z 12 kluczy, rng=0.5 → idx=6 (Math.floor(0.5*12) = 6)
    const next = pickPraiseKey(null, () => 0.5)
    expect(next).toBe(PRAISE_KEYS[6])
  })
})
```

- [ ] **Step 2: Run test — oczekiwany FAIL (modułu nie ma)**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.pickPraiseKey.test.ts
```

Expected: FAIL — `Cannot find module './useSession.pickers'`.

- [ ] **Step 3: Stwórz `src/modules/letters/hooks/useSession.pickers.ts`**

Create plik:

```typescript
// Pickery wyodrębnione z useSession dla testowalności i czystości hooka.

export const PRAISE_KEYS = [
  'praise-1',
  'praise-2',
  'praise-3',
  'praise-4',
  'praise-5',
  'praise-6',
  'praise-7',
  'praise-8',
  'praise-9',
  'praise-10',
  'praise-11',
  'praise-12',
] as const

export type PraiseKey = (typeof PRAISE_KEYS)[number]

/**
 * Picker pochwał no-repeat-with-last. Gdy losowanie trafi w `lastKey`, dobieramy
 * następny w kolejności (cyklicznie). Zawsze zwraca klucz != lastKey.
 */
export function pickPraiseKey(
  lastKey: PraiseKey | null,
  rng: () => number,
): PraiseKey {
  const idx = Math.floor(rng() * PRAISE_KEYS.length)
  const candidate = PRAISE_KEYS[idx] as PraiseKey
  if (candidate !== lastKey) return candidate
  // Last hit — bierzemy następny modulo
  const fallbackIdx = (idx + 1) % PRAISE_KEYS.length
  return PRAISE_KEYS[fallbackIdx] as PraiseKey
}
```

- [ ] **Step 4: Run test — oczekiwany PASS**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.pickPraiseKey.test.ts
```

Expected: 4 testy PASS.

- [ ] **Step 5: Commit (incremental — picker oddzielnie od integracji)**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/hooks/useSession.pickers.ts src/modules/letters/hooks/useSession.pickPraiseKey.test.ts && git commit -m "feat(useSession): pickPraiseKey no-repeat-with-last (12 pochwał)"
```

---

## Task 12: useSession — picker correction-prefix kontekstowy

**Files:**
- Modify: `src/modules/letters/hooks/useSession.pickers.ts`
- Create: `src/modules/letters/hooks/useSession.pickCorrectionPrefix.test.ts`

- [ ] **Step 1: Napisz failing test**

Create `src/modules/letters/hooks/useSession.pickCorrectionPrefix.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { pickCorrectionPrefix, CORRECTION_PREFIX_KEYS } from './useSession.pickers'

describe('pickCorrectionPrefix', () => {
  const pairs = { b: ['d', 'p'], d: ['b'], m: ['w'], w: ['m'] }

  it('returns contrastive when chosen is in CONTRASTIVE_PAIRS[target]', () => {
    expect(pickCorrectionPrefix('b', 'd', pairs, () => 0)).toBe(
      'correction-prefix-contrastive',
    )
    expect(pickCorrectionPrefix('m', 'w', pairs, () => 0.5)).toBe(
      'correction-prefix-contrastive',
    )
  })

  it('returns one of 1/2/3 random when chosen is not contrastive', () => {
    const result = pickCorrectionPrefix('a', 'z', pairs, () => 0)
    expect(CORRECTION_PREFIX_KEYS).toContain(result)
    expect(result).not.toBe('correction-prefix-contrastive')
  })

  it('handles target with no entry in pairs', () => {
    const result = pickCorrectionPrefix('x', 'y', pairs, () => 0)
    expect(CORRECTION_PREFIX_KEYS).toContain(result)
  })

  it('rng=0 → first prefix', () => {
    const result = pickCorrectionPrefix('a', 'z', pairs, () => 0)
    expect(result).toBe(CORRECTION_PREFIX_KEYS[0])
  })

  it('rng=0.99 → last prefix', () => {
    const result = pickCorrectionPrefix('a', 'z', pairs, () => 0.99)
    expect(result).toBe(CORRECTION_PREFIX_KEYS[2])
  })
})
```

- [ ] **Step 2: Run test — oczekiwany FAIL**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.pickCorrectionPrefix.test.ts
```

Expected: FAIL — funkcji nie ma.

- [ ] **Step 3: Dodaj do `useSession.pickers.ts`**

Append do `src/modules/letters/hooks/useSession.pickers.ts`:

```typescript
export const CORRECTION_PREFIX_KEYS = [
  'correction-prefix-1',
  'correction-prefix-2',
  'correction-prefix-3',
] as const

export type CorrectionPrefixKey =
  | (typeof CORRECTION_PREFIX_KEYS)[number]
  | 'correction-prefix-contrastive'

/**
 * Picker correction-prefix dla wariantu `wrong`. Jeśli `chosenLetter` jest
 * w parze contrastive z `targetLetter` (z `CONTRASTIVE_PAIRS`), zwraca
 * `correction-prefix-contrastive` — inaczej losuje 1/2/3.
 */
export function pickCorrectionPrefix(
  targetLetter: string,
  chosenLetter: string,
  contrastivePairs: Record<string, readonly string[] | string[]>,
  rng: () => number,
): CorrectionPrefixKey {
  const pairs = contrastivePairs[targetLetter] ?? []
  if (pairs.includes(chosenLetter)) {
    return 'correction-prefix-contrastive'
  }
  const idx = Math.floor(rng() * CORRECTION_PREFIX_KEYS.length)
  return CORRECTION_PREFIX_KEYS[idx] as CorrectionPrefixKey
}
```

- [ ] **Step 4: Run test — oczekiwany PASS**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.pickCorrectionPrefix.test.ts
```

Expected: 5 testów PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/hooks/useSession.pickers.ts src/modules/letters/hooks/useSession.pickCorrectionPrefix.test.ts && git commit -m "feat(useSession): pickCorrectionPrefix kontekstowy (contrastive vs 1/2/3)"
```

---

## Task 13: useSession — streak counter + intensity + perfect detection (pure)

**Files:**
- Modify: `src/modules/letters/hooks/useSession.pickers.ts`
- Create: `src/modules/letters/hooks/useSession.streak.test.ts`

- [ ] **Step 1: Napisz failing test streak/intensity/perfect**

Create `src/modules/letters/hooks/useSession.streak.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  streakIntensity,
  streakAudioKey,
  detectPerfectSession,
} from './useSession.pickers'
import type { SessionEvent } from '@/modules/letters/types'

describe('streakIntensity', () => {
  it('returns spark for streak < 3', () => {
    expect(streakIntensity(0)).toBe('spark')
    expect(streakIntensity(1)).toBe('spark')
    expect(streakIntensity(2)).toBe('spark')
  })
  it('returns flame for 3 ≤ streak < 5', () => {
    expect(streakIntensity(3)).toBe('flame')
    expect(streakIntensity(4)).toBe('flame')
  })
  it('returns fire for 5 ≤ streak < 7', () => {
    expect(streakIntensity(5)).toBe('fire')
    expect(streakIntensity(6)).toBe('fire')
  })
  it('returns torch for streak ≥ 7', () => {
    expect(streakIntensity(7)).toBe('torch')
    expect(streakIntensity(20)).toBe('torch')
  })
})

describe('streakAudioKey', () => {
  it('returns null for streak < 3', () => {
    expect(streakAudioKey(0)).toBeNull()
    expect(streakAudioKey(2)).toBeNull()
  })
  it('returns streak-3 exactly at 3', () => {
    expect(streakAudioKey(3)).toBe('streak-3')
  })
  it('returns null between 4 and 4 (no audio for non-threshold)', () => {
    expect(streakAudioKey(4)).toBeNull()
  })
  it('returns streak-5 exactly at 5', () => {
    expect(streakAudioKey(5)).toBe('streak-5')
  })
  it('returns null at 6', () => {
    expect(streakAudioKey(6)).toBeNull()
  })
  it('returns streak-7-plus at 7', () => {
    expect(streakAudioKey(7)).toBe('streak-7-plus')
  })
  it('returns streak-7-plus for every milestone above 7 (10, 15)', () => {
    expect(streakAudioKey(10)).toBe('streak-7-plus')
    expect(streakAudioKey(15)).toBe('streak-7-plus')
  })
})

describe('detectPerfectSession', () => {
  function answer(outcome: 'correct' | 'wrong' | 'dontKnow' | 'timeout'): SessionEvent {
    return { type: 'answer', ts: 0, outcome, responseMs: 100 }
  }
  function questionStart(letter: string): SessionEvent {
    return {
      type: 'question-start',
      ts: 0,
      targetLetter: letter,
      distractors: [],
      positions: [0, 1, 2, 3],
      style: 'print',
      case: 'upper',
    }
  }

  it('returns false when answer count !== sessionLength', () => {
    const events: SessionEvent[] = [questionStart('a'), answer('correct')]
    expect(detectPerfectSession(events, 10)).toBe(false)
  })

  it('returns false when sessionLength events all correct but length wrong', () => {
    // 3 correct ale sessionLength=10 → exploit "1 correct + quit"
    const events: SessionEvent[] = [
      questionStart('a'), answer('correct'),
      questionStart('b'), answer('correct'),
      questionStart('c'), answer('correct'),
    ]
    expect(detectPerfectSession(events, 10)).toBe(false)
  })

  it('returns true when length === sessionLength and all correct', () => {
    const events: SessionEvent[] = []
    for (let i = 0; i < 5; i++) {
      events.push(questionStart('a'), answer('correct'))
    }
    expect(detectPerfectSession(events, 5)).toBe(true)
  })

  it('returns false when one answer is wrong even at correct length', () => {
    const events: SessionEvent[] = []
    for (let i = 0; i < 4; i++) {
      events.push(questionStart('a'), answer('correct'))
    }
    events.push(questionStart('a'), answer('wrong'))
    expect(detectPerfectSession(events, 5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — oczekiwany FAIL**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.streak.test.ts
```

Expected: FAIL — funkcje nie istnieją.

- [ ] **Step 3: Dodaj funkcje do `useSession.pickers.ts`**

Append do `src/modules/letters/hooks/useSession.pickers.ts`:

```typescript
import type { SessionEvent } from '@/modules/letters/types'
import type { IskraIntensity } from '@/shared/ui/IskraMascot'

export type StreakAudioKey = 'streak-3' | 'streak-5' | 'streak-7-plus'

/** Mapuje streak count na intensywność mascotki Iskry. */
export function streakIntensity(streak: number): IskraIntensity {
  if (streak >= 7) return 'torch'
  if (streak >= 5) return 'fire'
  if (streak >= 3) return 'flame'
  return 'spark'
}

/**
 * Zwraca klucz audio dla TRESHOLD streak'a — null jeśli streak nie jest
 * progiem (3, 5, 7+). Próg 7+ obejmuje wszystkie wartości ≥7 (każda kolejna
 * correct po 7 leci `streak-7-plus`).
 */
export function streakAudioKey(streak: number): StreakAudioKey | null {
  if (streak === 3) return 'streak-3'
  if (streak === 5) return 'streak-5'
  if (streak >= 7) return 'streak-7-plus'
  return null
}

/**
 * Perfect session = wszystkie pytania sesji odpowiedziane (sesja nie przerwana
 * przez quit) i wszystkie outcome = 'correct'.
 */
export function detectPerfectSession(
  events: readonly SessionEvent[],
  sessionLength: number,
): boolean {
  const answers = events.filter((e) => e.type === 'answer')
  if (answers.length !== sessionLength) return false
  return answers.every((e) => e.type === 'answer' && e.outcome === 'correct')
}
```

- [ ] **Step 4: Run test — oczekiwany PASS**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.streak.test.ts
```

Expected: wszystkie testy PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/hooks/useSession.pickers.ts src/modules/letters/hooks/useSession.streak.test.ts && git commit -m "feat(useSession): streak intensity + audio key + perfect session detection (pure functions)"
```

---

## Task 14: useSession — integracja pickers + streak state + 500ms wdech + audioBus.stop

**Files:**
- Modify: `src/modules/letters/hooks/useSession.ts`
- Modify: `src/modules/letters/components/SessionView.tsx`

To jest największa zmiana — orchestracja audio sequence + nowy state + nowe timery. Robimy w jednym tasku ale step-by-step.

- [ ] **Step 1: Importy + nowe stałe**

Read `src/modules/letters/hooks/useSession.ts` linii 1-60 (importy i komentarze).

W sekcji importów (po linii 50, przed `export type UseSessionConfig`) dorzuć:

```typescript
import {
  pickPraiseKey,
  pickCorrectionPrefix,
  streakIntensity,
  streakAudioKey,
  detectPerfectSession,
  CORRECTION_PREFIX_KEYS,
  PRAISE_KEYS,
  type PraiseKey,
} from './useSession.pickers'
import type { IskraIntensity } from '@/shared/ui/IskraMascot'
```

Usuń stary const `PRAISE_KEYS` z linii 99-106 — używamy z pickers.

W sekcji stałych (przed `defaultUuid`) zamień blok:

```typescript
const COUNTDOWN_3S_WARNING_MS = 5000
```

na:

```typescript
const COUNTDOWN_3S_WARNING_MS = 3000
const POST_FEEDBACK_BREATH_MS = 500
const STREAK_AUDIO_DURATION_MS = 2000
```

Również usuń stałe `DONTKNOW_KEYS` i `TIMEOUT_KEYS` (linie ~107-108) — `TIMEOUT_KEYS` nie jest już potrzebny (scalanie z dontKnow), `DONTKNOW_KEYS` zostaje ale przeniesiony jako lokalna stała (lub zostawić jak jest).

Konkretnie: zostaw `DONTKNOW_KEYS` jak jest, usuń `TIMEOUT_KEYS`. (Compile error w `handleOutcome` dla 'timeout' naprawimy w step 4.)

- [ ] **Step 2: Dodaj API rozszerzenie — `currentStreak` + `mascotIntensity`**

W `UseSessionApi` (linie ~81-97) dorzuć po `iskierki: number`:

```typescript
  /** Aktualny streak w sesji (resetowany po dowolnej nie-correct). */
  currentStreak: number
  /** Intensywność mascotki w status barze QuizCard (z streak'a). */
  mascotIntensity: IskraIntensity
```

- [ ] **Step 3: Dodaj state + ref dla streak i lastPraise**

W body hooka, w sekcji `useState`/`useRef` (po linii ~290), dorzuć:

```typescript
  const [currentStreak, setCurrentStreak] = useState(0)
  const lastPraiseKeyRef = useRef<PraiseKey | null>(null)
```

Streak ma osobny `useState` (rerender) bo `QuizCard` musi widzieć zmianę intensywności. `lastPraiseKey` w refie (logika no-repeat).

- [ ] **Step 4: Modify `handleOutcome` — nowy audio sequence**

Read `src/modules/letters/hooks/useSession.ts` linii 530-610 (`handleOutcome`). Zamień blok `switch (variant)` (~553-588) na:

```typescript
      // Audio sequence (non-blocking) + streak update
      const isCorrectOutcome = outcome === 'correct'
      const newStreak = isCorrectOutcome ? currentStreakRef.current + 1 : 0
      currentStreakRef.current = newStreak
      setCurrentStreak(newStreak)

      let extraDurationMs = 0

      switch (variant) {
        case 'correct': {
          void cfg.audioBus.play('sfx-correct-ding')
          const praiseKey = pickPraiseKey(lastPraiseKeyRef.current, cfg.rng)
          lastPraiseKeyRef.current = praiseKey
          void cfg.audioBus.play(praiseKey)
          try {
            const assoc = getAssociation(target)
            void cfg.audioBus.play(assoc.audioKey)
          } catch {
            // brak asocjacji = pomijamy bez kruszenia hooka
          }
          // Streak audio (jeśli próg)
          const skey = streakAudioKey(newStreak)
          if (skey !== null) {
            void cfg.audioBus.play(skey)
            extraDurationMs += STREAK_AUDIO_DURATION_MS
          }
          break
        }
        case 'wrong': {
          const prefixKey = pickCorrectionPrefix(
            target,
            chosenLetter ?? '',
            CONTRASTIVE_PAIRS as Record<string, readonly string[]>,
            cfg.rng,
          )
          void cfg.audioBus.play(prefixKey)
          void cfg.audioBus.play(`letter-${target}`)
          break
        }
        case 'dontKnow':
        case 'timeout': {
          // Scalone audio — dla obu wariantów leci ten sam zestaw
          void cfg.audioBus.play(pickRandom(DONTKNOW_KEYS, cfg.rng))
          void cfg.audioBus.play(pickRandom(CORRECTION_PREFIX_KEYS, cfg.rng))
          void cfg.audioBus.play(`letter-${target}`)
          break
        }
        case 'mastery': {
          void cfg.audioBus.play('sfx-mastery-fanfara')
          void cfg.audioBus.play('mastery-celebration')
          break
        }
      }
```

Wymaga też: dorzuć `currentStreakRef` w sekcji refs (krok 3 dorzucił state, też trzeba ref dla closures):

W sekcji refs (po `lastPraiseKeyRef`):

```typescript
  const currentStreakRef = useRef<number>(0)
```

- [ ] **Step 5: Modify timer — 500ms wdech + audioBus.stop**

W `handleOutcome` znajdź końcowy blok `feedbackTimerRef.current = setTimeout(...)` (~590-605). Zamień na:

```typescript
      // Po feedbacku — następne pytanie lub koniec.
      // Sekwencja: feedback overlay znika → 500ms wdech → audioBus.stop() (urywa
      // ewentualny ogon streak audio) → generateNextQuestion (czysta kolejka).
      clearFeedbackTimer()
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null
        const nextNum = questionNumberRef.current + 1
        if (nextNum >= cfg.sessionLength) {
          finishSession()
          return
        }
        // Zamykamy overlay, ale nie generujemy pytania — wdech.
        setLastFeedback(null)
        setStatus('playing')
        // Drugi timer — wdech 500ms
        feedbackTimerRef.current = setTimeout(() => {
          feedbackTimerRef.current = null
          // Czyścimy kolejkę audio przed nowym promptem (urywa ewentualny
          // ogon streak audio — dla 7-latka 100-200ms ucięcia niedostrzegalne).
          cfg.audioBus.stop()
          questionNumberRef.current = nextNum
          setQuestionNumber(nextNum)
          generateNextQuestion()
        }, POST_FEEDBACK_BREATH_MS)
      }, durationMs + extraDurationMs)
```

Zmienna `durationMs` jest dalej obliczana w step 4 (linia ~541). Pozostawiamy poprzedni kod do `durationMs` bez zmian, dorzucamy tylko `+ extraDurationMs` w `setTimeout`.

- [ ] **Step 6: Modify `start` — reset streak + lastPraise**

W `start` callback (linia ~622-651), w sekcji "re-init letter states" (po `setLastFeedback(null)`), dorzuć:

```typescript
    currentStreakRef.current = 0
    setCurrentStreak(0)
    lastPraiseKeyRef.current = null
```

- [ ] **Step 7: Modify cue warning — guard na showCountdownBar**

W `startCountdown` (linia ~354-387), znajdź blok `if (!warned3sRef.current && remaining <= COUNTDOWN_3S_WARNING_MS && remaining > 0)`. Dorzuć dodatkowy guard:

```typescript
      if (
        !warned3sRef.current &&
        cfgRef.current.showCountdownBar &&
        remaining <= COUNTDOWN_3S_WARNING_MS &&
        remaining > 0
      ) {
        warned3sRef.current = true
        void cfgRef.current.audioBus.play('cue-warning-3s')
      }
```

(Cue tylko gdy showCountdownBar=true, bo bez paska dziecko nie ma kontekstu wizualnego.)

- [ ] **Step 8: Modify `finishSession` — perfect detection + audio**

W `finishSession` (linia ~465-482), po `setStatus('finished')` zamień:

```typescript
    void cfgRef.current.audioBus.play('session-end')
```

na:

```typescript
    const isPerfect = detectPerfectSession(eventsRef.current, cfgRef.current.sessionLength)
    void cfgRef.current.audioBus.play(isPerfect ? 'session-end-perfect' : 'session-end')
```

- [ ] **Step 9: Eksport `currentStreak` + `mascotIntensity` w return**

W return statement hooka (linia ~725-741) dorzuć:

```typescript
    currentStreak,
    mascotIntensity: streakIntensity(currentStreak),
```

obok `iskierki`.

- [ ] **Step 10: Type check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -30
```

Expected: błędy w SessionView (nie używa `currentStreak`/`mascotIntensity`) — naprawiamy w step 11. Inne błędy: zaadresować.

- [ ] **Step 11: Update SessionView**

Read `src/modules/letters/components/SessionView.tsx`. Znajdź destructuring `useSession` (np. `const { ... } = useSession(...)`). Dorzuć `currentStreak` i `mascotIntensity` do destructuringu.

Następnie znajdź miejsce gdzie `useSession` dostaje config — jeśli `showCountdownBar: settings.showCountdownBar` jest passing globalnego booleana, podmień na:

```typescript
import { getEffectiveShowCountdownBar } from '@/shared/settings/defaults'
// ...
showCountdownBar: getEffectiveShowCountdownBar(settings, level),
```

Następnie w renderowanym `<QuizCard ...>` dorzuć propsy `currentStreak={currentStreak}` i `mascotIntensity={mascotIntensity}` (te propsy będą dodane do QuizCard w Task 15 — TypeScript pewnie nie krzyczy, bo prop'sy się dorzuca po fakcie).

- [ ] **Step 12: Run useSession tests (mogą być failing, ale wiele powinno być sensownych)**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run src/modules/letters/hooks/useSession.test.ts 2>&1 | tail -40
```

Expected: dużo failures z powodu zmian w API. Sukcesy: pickery testy z Tasków 11-13. Zrób krótki audit failures — jeśli są to "stale assertions" (oczekiwania na stary tekst/klucz), to OK, naprawiamy w Task 17. Jeśli są regresje logiczne — debug.

- [ ] **Step 13: Type check final**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -20
```

Expected: zero błędów (lub tylko w testach jak STATUS.md mówił że niektóre są stale).

- [ ] **Step 14: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/hooks/useSession.ts src/modules/letters/components/SessionView.tsx && git commit -m "feat(useSession): integracja pickerów + streak state + perfect detection + 500ms wdech + audioBus.stop"
```

---

## Task 15: QuizCard — Iskra w status bar + countdown paleta + mini-mascotka dla wrong

**Files:**
- Modify: `src/modules/letters/components/QuizCard.tsx`

- [ ] **Step 1: Importy + propsy rozszerzone**

Read `src/modules/letters/components/QuizCard.tsx`. Importy — dorzuć:

```typescript
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
```

`QuizCardProps` — dorzuć po `iskierki: number`:

```typescript
  /** Liczba poprawnych z rzędu w sesji — wpływa na intensywność mascotki. */
  currentStreak: number
  /** Intensywność małej Iskry w status barze (z useSession). */
  mascotIntensity: IskraIntensity
  /** Litera kliknięta przy wrong — używana do mini-mascotki nad kafelkiem. */
  lastWrongSlot?: import('@/modules/letters/types').Slot | null
```

- [ ] **Step 2: Łagodniejsza paleta countdown**

Znajdź funkcję `countdownColor` (linia ~44-48):

```typescript
function countdownColor(ratio: number): string {
  if (ratio > 0.5) return colors.accentGreen
  if (ratio > 0.2) return '#e6c554' // żółty
  return '#e26a4f' // czerwony
}
```

Zamień na:

```typescript
// Łagodna paleta — usunięta intensywna czerwień. Kontrast ≥3.0 do tła #eeeef2.
function countdownColor(ratio: number): string {
  if (ratio > 0.4) return colors.accentGreen // zielony
  if (ratio > 0.15) return '#e6c554' // ciepły żółty
  return '#e89270' // miękki pomarańczowy
}
```

- [ ] **Step 3: Dorzuć małą Iskrę do status bara obok licznika iskierek**

W `QuizCard` znajdź sekcję `<div data-testid="iskierki-counter" ...>`. Owińmy ją w wrapper z mascotką. Konkretnie zamień blok:

```tsx
<div
  data-testid="iskierki-counter"
  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 20 }}
>
  <span aria-hidden="true">🔥</span>
  <span aria-label={`Iskierki: ${iskierki}`}>{iskierki}</span>
</div>
```

na:

```tsx
<div
  data-testid="iskierki-counter"
  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 20 }}
>
  <div data-testid="status-bar-mascot" style={{ width: 50, height: 50 }}>
    <IskraMascot size={50} state="idle" intensity={mascotIntensity} />
  </div>
  <span aria-label={`Iskierki: ${iskierki}`}>{iskierki}</span>
</div>
```

(Zastępujemy 🔥 mascotką — `data-testid="iskierki-counter"` zostaje na zewnętrznym divie, mascotka dostaje swoje testid.)

- [ ] **Step 4: Mini-mascotka dla wrong nad klikniętym kafelkiem**

W siatce kafelków (`<div data-testid="tile-grid" ...>`), dla każdego kafelka jeśli `lastWrongSlot === slot`, renderuj overlay z mini-Iskrą `surprise/spark`. Konkretnie: wewnątrz `.map((letter, idx) => { ... return <div key=...>...<LetterTile /> })`, dorzuć przed `<LetterTile`:

```tsx
{lastWrongSlot === slot && (
  <div
    data-testid={`mini-mascot-wrong-${slot}`}
    style={{
      position: 'absolute',
      top: -20,
      left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      zIndex: 10,
    }}
  >
    <IskraMascot size={64} state="surprise" intensity="spark" />
  </div>
)}
```

I wrapping div kafelka — dorzuć `position: 'relative'` do jego `style`:

```tsx
<div
  key={`${question.index}-${slot}`}
  style={{ ...tileStyle, display: 'flex', minHeight: 0, position: 'relative' }}
>
```

- [ ] **Step 5: Type check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -20
```

Expected: błąd "Property 'currentStreak' is missing" w SessionView jeśli nie był propagowany w Task 14 step 11. Otwórz `SessionView.tsx` i upewnij się że `<QuizCard currentStreak={currentStreak} mascotIntensity={mascotIntensity} ... />` jest. Jeśli `lastWrongSlot` brakuje — w SessionView bierzemy z `lastFeedback?.variant === 'wrong' ? lastFeedback.chosenSlot : null`.

Konkret w SessionView — przy renderowaniu QuizCard:

```typescript
const lastWrongSlot = lastFeedback?.variant === 'wrong' ? lastFeedback.chosenSlot ?? null : null
// ...
<QuizCard
  // ... istniejące propsy
  currentStreak={currentStreak}
  mascotIntensity={mascotIntensity}
  lastWrongSlot={lastWrongSlot}
/>
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/components/QuizCard.tsx src/modules/letters/components/SessionView.tsx && git commit -m "feat(QuizCard): mała Iskra w status bar + mini-mascotka dla wrong + łagodna paleta countdown"
```

---

## Task 16: FeedbackOverlay — pełna IskraMascot per-wariant

**Files:**
- Modify: `src/modules/letters/components/FeedbackOverlay.tsx`

- [ ] **Step 1: Importy**

Dorzuć do `src/modules/letters/components/FeedbackOverlay.tsx`:

```typescript
import { IskraMascot, type IskraState, type IskraIntensity } from '@/shared/ui/IskraMascot'
```

- [ ] **Step 2: Mapper wariantu na stan/intensywność**

Po istniejącej `headlineFor` (linia ~67), dorzuć:

```typescript
function mascotConfigFor(
  variant: FeedbackState['variant'],
): { state: IskraState; intensity: IskraIntensity } | null {
  switch (variant) {
    case 'correct':
      return { state: 'happy', intensity: 'flame' }
    case 'mastery':
      return { state: 'dance', intensity: 'torch' }
    case 'dontKnow':
    case 'timeout':
      return { state: 'idle', intensity: 'spark' }
    case 'wrong':
      return null // wrong nie renderuje overlayu — mascotka jest w QuizCard
  }
}
```

- [ ] **Step 3: Zamień gołe emoji 🔥 na pełną IskraMascot**

W `FeedbackOverlay` znajdź blok (linia ~181-189):

```tsx
{feedback.variant === 'mastery' && (
  <div
    data-testid="iskra-mascot"
    aria-hidden="true"
    style={{ fontSize: 96 }}
  >
    🔥
  </div>
)}
```

Zamień na:

```tsx
{(() => {
  const cfg = mascotConfigFor(feedback.variant)
  if (cfg === null) return null
  return (
    <div data-testid="feedback-mascot" aria-hidden="true">
      <IskraMascot
        size={feedback.variant === 'mastery' ? 140 : 96}
        state={cfg.state}
        intensity={cfg.intensity}
        oneshotKey={`${feedback.targetLetter}-${feedback.variant}`}
      />
    </div>
  )
})()}
```

Mascotka teraz pojawia się dla `correct`/`mastery`/`dontKnow`/`timeout` (nie tylko mastery). `oneshotKey` wymusza remount → restart animacji per pytanie.

- [ ] **Step 4: Type check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -10
```

Expected: zero błędów.

- [ ] **Step 5: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/components/FeedbackOverlay.tsx && git commit -m "feat(FeedbackOverlay): pełna IskraMascot per-wariant zamiast emoji"
```

---

## Task 17: SessionEnd — wariant perfect

**Files:**
- Modify: `src/modules/letters/components/SessionEnd.tsx`

- [ ] **Step 1: Importy + propsy**

W `src/modules/letters/components/SessionEnd.tsx` dorzuć import:

```typescript
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { detectPerfectSession } from '@/modules/letters/hooks/useSession.pickers'
```

W `SessionEndProps` dorzuć:

```typescript
sessionLength: number
```

(Potrzebne do `detectPerfectSession` — bez tego nie wiemy ile było pytań planowanych vs faktycznych.)

- [ ] **Step 2: Wykryj perfect + render warianta**

W body komponentu, po `summarize` useMemo, dorzuć:

```typescript
const isPerfect = useMemo(
  () => detectPerfectSession(events, sessionLength),
  [events, sessionLength],
)
```

- [ ] **Step 3: Zamień gołe emoji 🔥 na warunkowy wariant**

W JSX (linia ~95-99) zamień:

```tsx
<div data-testid="iskra-end" style={{ fontSize: 96 }} aria-hidden="true">
  🔥
</div>
```

na:

```tsx
<div data-testid="iskra-end" aria-hidden="true">
  <IskraMascot
    size={isPerfect ? 180 : 120}
    state={isPerfect ? 'dance' : 'happy'}
    intensity={isPerfect ? 'torch' : 'flame'}
    oneshotKey={isPerfect ? 'perfect' : 'normal'}
  />
</div>
{isPerfect && (
  <div
    data-testid="perfect-sparkle"
    aria-hidden="true"
    style={{ fontSize: 48 }}
  >
    ✨ 🎉 ✨
  </div>
)}
```

- [ ] **Step 4: Pass `sessionLength` z SessionView**

W `src/modules/letters/components/SessionView.tsx` znajdź `<SessionEnd ... />` i dorzuć prop `sessionLength={settings.sessionLength}` (lub odpowiedni source — sprawdź jak `totalQuestions` jest przekazywany).

- [ ] **Step 5: Type check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b 2>&1 | head -10
```

Expected: zero błędów.

- [ ] **Step 6: Commit**

```bash
cd /Users/kamilmat87/kid-learn && git add src/modules/letters/components/SessionEnd.tsx src/modules/letters/components/SessionView.tsx && git commit -m "feat(SessionEnd): wariant perfect (Iskra dance + sparkle) z detectPerfectSession"
```

---

## Task 18: Naprawa stale testów + finalny build + manual smoke

**Files:**
- Modify: pliki testów które padły (zidentyfikowane wcześniej)

- [ ] **Step 1: Run pełna suita testów — zaobserwuj failures**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run 2>&1 | tail -50
```

Wynotuj failing testy. Typowe stale:
- testy useSession oczekujące starych tekstów ('Spróbuj się nie spieszyć', `correction-prefix`, `feedback-correct`)
- testy SessionView oczekujące pasek countdown zawsze widoczny
- testy SettingsScreen oczekujące checkbox boolean

- [ ] **Step 2: Naprawiaj per-test (stale assertions, NOT logic)**

Dla każdego failing testu otwórz plik, znajdź failed assertion, popraw do nowej rzeczywistości. **NIE naprawiaj jeśli failure wskazuje na regresję logiczną** — wtedy wracamy do useSession i debugujemy.

Typowe poprawki:
- `correction-prefix` → `correction-prefix-1` (lub mock pickera)
- `feedback-correct` → `sfx-correct-ding`
- "Spróbuj się nie spieszyć" → usunąć asercję (timeout audio scalono)
- testy showCountdownBar checkbox → expect 4 checkboxy per-level

Każda poprawka per plik to mały commit.

- [ ] **Step 3: Run testów do zielonego**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm test --run 2>&1 | tail -10
```

Expected: zielono (lub minimalna lista skipped). Jeśli coś dalej pada — debug.

- [ ] **Step 4: Type check + production build**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm tsc -b && pnpm build 2>&1 | tail -10
```

Expected: build przechodzi, output ~ 320 KB JS / 100 KB gzip (lekko więcej niż obecne 315/98 z powodu nowych SFX i rozszerzeń).

- [ ] **Step 5: Audio sanity check**

Run:
```bash
cd /Users/kamilmat87/kid-learn && pnpm audio:check
```

Expected: zielono, wszystkie pliki na miejscu.

- [ ] **Step 6: Manual browser smoke test**

Run dev server (foreground):
```bash
cd /Users/kamilmat87/kid-learn && pnpm dev
```

W przeglądarce na localhost:5173 (lub kolejny port):
1. Otwórz `letters/`, wybierz Iskierka — sprawdź że pasek countdown NIE jest widoczny (per-level showCountdownBar=false)
2. Zacznij sesję — zobacz Iskrę w status barze
3. Kliknij poprawnie 3× z rzędu — usłysz "trzy z rzędu!" i intensywność mascotki zmienia się na flame
4. Kliknij źle — zobacz mini-mascotkę surprise nad złym kafelkiem
5. Wróć do home, wybierz Ognik — pasek countdown widoczny + cue audio dopiero przy 3s pozostałego
6. Zakończ perfekcyjnie — usłysz "perfekcyjna sesja!" i Iskra dance w SessionEnd
7. Otwórz settings (math gate) — sprawdź 25s opcję + per-level checkboxy

Jeśli coś dziwne — debug, fix, repeat.

- [ ] **Step 7: Update STATUS.md**

W `docs/STATUS.md` zaktualizuj:
- Ostatnia sesja: "2026-04-27 — UX iteration v1.1 zaimplementowane (B + A, D odłożone)"
- Co zrobione: pkt'y dla każdego z B1-B4 i A
- Build/testy stan

- [ ] **Step 8: Final commit**

```bash
cd /Users/kamilmat87/kid-learn && git add docs/STATUS.md && git commit -m "docs(STATUS): UX iteration v1.1 ukończona (B+A, D odłożone do v2)"
```

---

## Self-Review

**Spec coverage:** każda sekcja specu (B1-B4, A1-7, audit, CSS var, D-odłożone, audio-odłożone, out-of-scope) jest pokryta tasksem lub jest świadomie poza scope (D, audio voice). ✓

**Placeholder scan:** każdy step zawiera kompletny kod lub konkretną komendę. Brak "TBD"/"implement later". Wybór SFX URL'i jest konkretny (mixkit assets URL z fallbackiem manualnym jeśli URL pada). ✓

**Type consistency:** `pickPraiseKey`/`pickCorrectionPrefix`/`streakIntensity`/`streakAudioKey`/`detectPerfectSession` mają spójne sygnatury między tasks 11-13 (definicja) i 14 (użycie). `IskraIntensity`/`IskraState` re-eksportowane z `IskraMascot`. `currentStreak: number` + `mascotIntensity: IskraIntensity` w UseSessionApi spójne między task 14 a 15. ✓

**Spec gaps wykryte podczas pisania planu:** żadne — wszystkie known issues z review już są w specu po fixach.

---

## Execution Handoff

Plan zapisany do `docs/superpowers/plans/2026-04-27-iskierki-letters-ux-iteration-v1.1.md`. Dwie opcje wykonania:

**1. Subagent-Driven** (rekomendowane przez skill): świeży subagent per task, review między taskami, szybka iteracja.
**2. Inline Execution**: tasks w bieżącej sesji przez executing-plans, batch z checkpointami.

Wybór: **Subagent-Driven**, bo user (memory) chce parallel agentów + nie patrzeć na każdy krok.

**Plan paralelizacji** (które taski mogą iść równolegle, które sekwencyjnie):

- **Round 1 (parallel):** Task 1 (audit JSON) + Task 3 (SFX fetch) + Task 6 (CSS var) — wszystkie niezawisłe.
- **Round 2 (sequential po Round 1):** Task 2 (nowe klucze JSON) → Task 4 (SFX klucze JSON) → Task 5 (audio:build) — zależne od siebie + od JSON-ów z Tasków 1+3.
- **Round 3 (parallel):** Task 7 + 8 + 9 (settings types/defaults/migration) — sekwencyjne między sobą logicznie ale jeden agent może je zrobić sequencjnie szybko + Task 11 + 12 + 13 (pickery — niezawisłe od settings).
- **Round 4 (sequential po Round 3):** Task 10 (settings UI) — zależne od 7-9.
- **Round 5 (sequential po wszystkim wcześniej):** Task 14 (useSession integracja).
- **Round 6 (parallel po Task 14):** Task 15 (QuizCard) + Task 16 (FeedbackOverlay) + Task 17 (SessionEnd).
- **Round 7 (sequential):** Task 18 (testy + smoke).
