# Iskierki — moduł 3 (Matematyka) v3.1 polish

**Status:** spec — czeka na review
**Data:** 2026-04-29
**Scope:** raport rodzica (sekcja matematyki), SettingsScreen UI dla `numbers.*`, dedykowane animacje ConceptIntro per koncept (20 unikalnych)
**Bazuje na:** `2026-04-28-iskierki-math-module-design.md` (moduł 3 implementacja v3.0)

---

## 1. Problem

Po implementacji modułu 3 (commit `e73f3c6`) trzy obszary zostały świadomie odłożone do v3.1 (zob. `docs/STATUS.md` sekcja "TODO przed v3"):

1. **Raport rodzica** nie ma sekcji matematyki — rodzic widzi tylko statystyki liter (moduł 1) i czytania (moduł 2). Drzewko Mistrzostwa jest dostępne dla dziecka przez `/numbers/tree`, ale rodzic w raporcie nie widzi: ile konceptów opanowane, które fakty trudne, gdzie są luki.
2. **SettingsScreen** nie eksponuje 5 ustawień `numbers.*` — typ `NumbersSettings`, defaults i merge są w storze, ale brak UI. Rodzic może edytować tylko przez DevTools localStorage.
3. **ConceptIntro** pokazuje tylko 💡 emoji + przycisk "→". Spec v3.0 zakłada "worked examples per koncept (Renkl/Sweller fading)", ale aktualna implementacja jest placeholderem. NumberBlocks-style dedykowane animacje (TenFrame fillujący się, NumberBondShape budujący się) zostały odłożone do v3.1.

## 2. Cele

- Rodzic w jednym ekranie raportu zobaczy postęp matematyki dziecka analogicznie do sekcji czytania (znana, zaakceptowana struktura).
- Wszystkie ustawienia `numbers.*` edytowalne w UI bez DevTools.
- Każdy z 20 konceptów ma dedykowaną worked-example animację synchronizowaną z istniejącym audio Iskry.
- Brak nowych nagrań audio (reuse 121 mp3 z fazy 3 modułu 3).
- Brak nowych dependencji.
- Wszystko reużywa istniejących komponentów (`representations/`, `useTapHandler`, `audioBus`, `colors/radii`, `ToggleField`, `SliderField`).

## 3. Non-goals

- Trendy aktywności matematyki dziennej (na wzór `ActivitySection` dla liter) — rozważone, odłożone do v3.2.
- Tekstowe sugestie nauczania (na wzór `SuggestionsSection`) — rozważone, odłożone do v3.2.
- Nowe nagrania audio dla animacji intro — wszystkie animacje synchronizują się z istniejącym `intro-<conceptId>.mp3`.
- Migracja persistencji — `iskierki-numbers-v1` ma już wszystkie potrzebne dane (concepts, facts, sessions).
- Nowy typ ćwiczenia, nowy koncept matematyczny — tylko polish istniejących.

## 4. Architektura — przegląd

Trzy niezależne zmiany, każda commit-able osobno. Brak nowych dependencji.

**Pliki nowe (25):**
- `src/shared/stats/components/NumbersStats.tsx` — sekcja matematyki w raporcie
- `src/shared/stats/components/NumbersStats.test.tsx` — smoke test
- `src/modules/numbers/data/conceptLabels.ts` — wyciągnięty `CONCEPT_LABELS: Record<ConceptId, string>` z `MasteryTree.tsx` jako shared single source of truth
- `src/modules/numbers/components/intros/IntroFrame.tsx` — wspólny szkielet animacji (przycisk →, audio orkiestracja, fallback timer)
- `src/modules/numbers/components/intros/animations/<conceptId>.tsx` × 20 — animacje per koncept
- `src/modules/numbers/components/intros/animations/index.ts` — registry `INTRO_ANIMATIONS: Record<ConceptId, Animation>`
- `src/modules/numbers/components/intros/animations/animations.test.tsx` — smoke test data-driven

**Pliki edytowane (5):**
- `src/shared/stats/components/ReportScreen.tsx` — mount `<NumbersStats />` po `<ReadingStats />`
- `src/shared/stats/exporter.ts` — sekcja "## Matematyka" w markdown raportu (sygnatura rozszerzona o opcjonalny snapshot `useNumbers`)
- `src/shared/settings/components/SettingsScreen.tsx` — sekcja "Matematyka (moduł 3)" przed "Reset postępów"
- `src/modules/numbers/components/intros/ConceptIntro.tsx` — refaktor na router → `INTRO_ANIMATIONS[conceptId]` w `<IntroFrame>`
- `src/modules/numbers/components/MasteryTree.tsx` — usunięcie lokalnego `CONCEPT_LABELS`, import z `data/conceptLabels.ts`

## 5. Sekcja 1: Raport rodzica — `NumbersStats`

### 5.1 Lokalizacja i mount

`src/shared/stats/components/NumbersStats.tsx`. Mountowany w `ReportScreen.tsx` po `<ReadingStats />` (linia ~303). Style identyczne z `ReadingStats` (białe karty z `border: 1px solid #e2e2e8; borderRadius: 12; padding: 16`).

### 5.2 Trzy karty wewnętrzne

**(a) Koncepty (X/20)**

Źródło: `useNumbers((s) => s.concepts)` + `CONCEPTS` z `numbers/data/concepts.ts`.

```
Opanowane: N / 20
[lista pierwszych 10 etykiet konceptów z `concepts[id].masteredAt !== undefined`]
W nauce: M (mają wpis w concepts ale bez masteredAt)
Nietknięte: 20 - N - M
[link tekstowy] Zobacz drzewko →   (nawigacja do /numbers/tree)
```

Etykiety konceptów: import z `src/modules/numbers/data/conceptLabels.ts` (wyciągnięte z `MasteryTree.tsx:12-33` — istniejący kompletny mapping 20 konceptów na polskie nazwy: "Liczenie do 5", "Rozkład 5", "Podwójki", "Po 2", "Mnożenie", itd.). Refaktor wyciąga lokalny `CONCEPT_LABELS` z MasteryTree do shared, eliminując duplikację.

**(b) Trudne fakty (top 10)**

Źródło: `useNumbers((s) => s.facts)`.

Algorytm: filtruj fakty z `recentWrong > 0`. Sortuj DESC po `recentWrong`, ASC po `box`. Top 10.

Wyświetlenie: pille (chip) — `2+3` `7-4` `4×3`. Pod każdą pillą małym fontem `n×wrong`.

Pusty state: "Brak trudnych faktów — wszystko idzie!" (zielony, `colors.accentGreen`).

Parser `factId` → display: helper `formatFactId(id: MathFactId): string` w `NumbersStats.tsx`. Format `factId` udokumentowany w `numbers/types.ts:5`: `<type>-<args>`. Konkretne typy w użyciu (z `concepts.ts` + `useNumbersSession.ts`):
- `bond-N-A-B` → `A + B = N` (np. `bond-7-3-4` → "3+4")
- `add-A-B` → `A + B` (np. `add-5-2` → "5+2")
- `sub-A-B` → `A - B` (np. `sub-7-3` → "7-3")
- `double-N` → `N + N` (np. `double-6` → "6+6")
- `neardouble-A-B` → `A + B` (np. `neardouble-6-7` → "6+7")
- `make10-A-B` → `A + B` (np. `make10-8-5` → "8+5")
- `skip2-stepN` → `+2 ×N` (np. `skip2-step3` → "+2 ×3" lub label "po 2")
- `mult-A-B` → `A × B` (np. `mult-3-2` → "3×2")
- `array-AxB` → `A × B` (np. `array-3x4` → "3×4")
- `tenframe-N` → "TF·N"

Helper jest defensywny — nieznany format zwraca surowy `factId` (no-op), nie crashuje.

**(c) Heatmapa typów konceptów**

Agregacja per **typ-konceptu** (8 grup):

| Grupa | Koncepty |
|---|---|
| Counting | counting-5, counting-10 |
| Subitizing/Rytm | subitizing-6, rhythm |
| Bonds | bonds-5, bonds-10 |
| Add/Sub do 10 | adding-concrete, tenframe, addsub-10 |
| Doubles | doubles, neardoubles |
| Make 10 | make10 |
| Skip count | skipcount-2, skipcount-5, skipcount-10 |
| Mnożenie (propedeutyka) | factfamily, factfamily-20, equalgroups, arrays, commutativity |

Per grupa: średnia trudność z faktów konceptów grupy = `mean(recentWrong + (5 - box))`. Kolor:
- `n=0` (brak danych) — szary `#f3f4f6`
- `<= 1` — zielony `#d1fae5`
- `<= 3` — żółty `#fef3c7`
- `> 3` — czerwony `#fee2e2`

Layout: grid 4 kolumny × 2 wiersze. Każda komórka: nazwa grupy (etykieta), pod nią `n=X` małym fontem.

### 5.3 Eksporter markdown

`src/shared/stats/exporter.ts` rozszerzony o sekcję "## Matematyka" wstawioną na końcu raportu (eksporter aktualnie zawiera tylko sekcje litery + aktywność + sugestie + flagi anti-cheat — nie ma sekcji czytania, więc nie ma ustalonej kolejności modułowej do której musimy się dostosować):

```markdown
## Matematyka

- **Koncepty**: opanowane N/20, w nauce M
- **Najtrudniejsze fakty (top 10)**: 2+3 (3×wrong), 7-4 (2×wrong), …
- **Heatmapa typów**: Counting [easy], Bonds [hard], …
```

Zachowuje wsteczną kompatybilność dla istniejących użyć (sekcja jest dodana, nic nie ubywa). Nowy parametr `numbers` (snapshot store'a `useNumbers`) musi być przekazany z `ReportScreen.tsx` do `exportReportToMarkdown` — sygnatura funkcji rozszerzona o opcjonalny argument; gdy brak, sekcja matematyki jest pomijana (zachowanie dla testów / starych wywołań).

## 6. Sekcja 2: SettingsScreen — sekcja matematyki

### 6.1 Lokalizacja i markup

Edycja `src/shared/settings/components/SettingsScreen.tsx`. Nowa sekcja `<section data-testid="section-numbers">` przed sekcją "Reset postępów".

### 6.2 5 kontrolek

| Setting | Typ kontrolki | Etykieta | Opis |
|---|---|---|---|
| `iskraThinkingAloud` | `ToggleField` | "Iskra mówi na głos" | "Iskra opowiada krok po kroku co robi (pomaga zrozumieć)" |
| `conceptIntros` | `ToggleField` | "Wprowadzenia do nowych konceptów" | "Krótkie animowane intro przed pierwszym pytaniem z nowego tematu" |
| `treeCelebrationsOn` | `ToggleField` | "Celebracje opanowania" | "Głośne celebracje gdy dziecko opanuje koncept w drzewku" |
| `questionCount` | radio group 6/8/10 | "Pytań na sesję" | "Mniej = krócej; więcej = solidniej" |
| `skipCountStep` | select 2/5/10/mixed | "Krok dla skip count (Pochodnia)" | "Liczenie 2,4,6… / 5,10,15… / 10,20,30… / mieszane" |

Reuse helper `ToggleField` z `SettingsScreen.tsx` (linia 33-95). Pattern radio group identyczny z `tilesPerQuestion` (linia 460). Pattern select identyczny z `selectStyle` (linia 210).

### 6.3 Update settingu

Każda kontrolka woła:
```ts
updateSetting('numbers', { ...settings.numbers, <field>: <newValue> })
```

To zachowuje cały `numbers` partial — przepisuje tylko zmienione pole.

## 7. Sekcja 3: ConceptIntro — 20 worked-example animacji

### 7.1 Architektura

`ConceptIntro.tsx` refaktor:

```tsx
export function ConceptIntro({ conceptId, audioBus, onContinue }) {
  return (
    <IntroFrame
      conceptId={conceptId}
      audioBus={audioBus}
      onContinue={onContinue}
      Animation={INTRO_ANIMATIONS[conceptId]}
    />
  )
}
```

`intros/IntroFrame.tsx` — wspólny szkielet:
- Audio orkiestracja (`audioBus.stop()` → `audioBus.play(introAudioKey)`)
- Tracking `audioFinished` (event lub fallback timer 4s — jak obecnie)
- `<Animation />` w środku layoutu (flex column center)
- Przycisk "→" disabled dopóki `audioFinished === false`
- Fallback `stage: 0` jeśli `Animation === undefined` (defensywne; testy zapewniają że registry kompletny)

`intros/animations/<conceptId>.tsx` × 20 — każda animacja:
- Pure component, props `{ stage: number }`
- Reuse komponentów z `representations/`
- ~50-80 linii, czysty CSS animation + state-driven render

`intros/animations/index.ts`:
```ts
import iskierkaCounting5 from './iskierka-counting-5'
// ... 20 importów
export const INTRO_ANIMATIONS: Record<ConceptId, ComponentType<{stage: number}>> = {
  'iskierka-counting-5': iskierkaCounting5,
  // ...
}
```

### 7.2 Audio sync

`AudioBus.play(key): Promise<void>` rezolvuje przy `ended` (sprawdzone w `src/shared/audio/AudioBus.ts:115-159`). Brak `currentTime` API — synchronizacja przez **wall-clock od momentu startu `play()`**, czyli `setTimeout` per scena, anulowany przy unmount.

`IntroFrame`:
1. `audioBus.stop()` → `audioBus.play(introAudioKey).then(() => setAudioFinished(true))`
2. Równolegle z `play()` startuje `setTimeout(() => setStage(1), SCENES[0].offsetMs)` itd.
3. Cleanup w `useEffect` return clear'uje wszystkie pending timeouts.

Każda animacja deklaruje swój manifest scen jako stała eksportowana razem z komponentem:

```ts
export const SCENES = [
  { stage: 1, offsetMs: 0 },
  { stage: 2, offsetMs: 1200 },
  { stage: 3, offsetMs: 2400 },
] as const
```

`IntroFrame` czyta `<Animation>.SCENES` lub akceptuje jako prop. Wszystkie offsetMs są względem startu `play()` — proste, działa również gdy audio nie wystartuje (iOS Safari pre-interaction): animacja toczy się dalej, `audioFinished` triggers po `play()` Promise (lub po fallback timer 4s jeśli `play()` rzuci, np. brak pliku audio).

**Brak nowego API w AudioBus.** Eliminuje wcześniejsze ryzyko (Section 11) o dodawaniu `getCurrentTime()`.

### 7.3 Manifest 20 animacji

Wszystkie z narracją audio (intro-<conceptId>), sequential reveal:

| ConceptId | Styl | Sceny | Reuse |
|---|---|---|---|
| iskierka-counting-5 | Renkl | TenFrame fillujący się 1→5 z liczeniem | TenFrame |
| iskierka-counting-10 | Renkl | TenFrame fillujący się 6→10 (dolny rząd) | TenFrame |
| iskierka-subitizing-6 | Renkl | DotPattern dice — 3 patterns flash sekwencyjnie | DotPattern |
| iskierka-rhythm | Renkl | 3 ConcreteIcons + 3 + 3 (rytm 3-3-3) | ConcreteIcons |
| iskierka-adding-concrete | CPA | 2 jabłka → +1 jabłko → 3 jabłka (sekwencyjnie) | ConcreteIcons |
| plomyk-bonds-5 | CPA | 5 kropek → NumberBondShape rozdziela na 2+3 | NumberBondShape |
| plomyk-bonds-10 | CPA | 10 kropek → różne pary (4+6, 7+3) cyklicznie | NumberBondShape |
| plomyk-tenframe | Renkl | TenFrame: 7 fill → 3 puste = "10" | TenFrame |
| plomyk-addsub-10 | Renkl | TenFrame: 4+3 (build), potem 7-2 (remove) | TenFrame |
| plomyk-factfamily | CPA | NumberBondShape statyczny → 4 równania pojawiają się | NumberBondShape, DigitTile |
| ognik-doubles | Renkl | Dwie identyczne grupy (4+4) — mirror animation | ConcreteIcons |
| ognik-neardoubles | Renkl | 4+4=8 → +1 → 4+5=9 (pokaż relację) | ConcreteIcons, DigitTile |
| ognik-make10 | Renkl | 8+5: weź 2 z 5 do 8 → 10+3 = 13 (TenFrame magic) | TenFrame |
| ognik-factfamily-20 | CPA | Większy NumberBondShape (15=8+7) → 4 równania | NumberBondShape, DigitTile |
| pochodnia-skipcount-2 | Renkl | 2,4,6,8,10 — kroki na liczbie + bounce | DigitTile |
| pochodnia-skipcount-5 | Renkl | 5,10,15,20 — kroki + bounce | DigitTile |
| pochodnia-skipcount-10 | Renkl | 10,20,30 — kroki + bounce | DigitTile |
| pochodnia-equalgroups | Renkl | 3 grupy po 4 jabłka, "trzy razy cztery" | ConcreteIcons |
| pochodnia-arrays | Renkl | Macierz 3×4 zapełnia się rząd-po-rzędzie, total 12 | ConcreteIcons (grid) |
| pochodnia-commutativity | CPA | Macierz 3×4 obraca się 90° → 4×3 (ten sam total) | ConcreteIcons (grid) |

### 7.4 Settings respect — gotowe

Guard `settings.numbers.conceptIntros` JUŻ JEST w `SessionView.tsx:68-77`:

```ts
const conceptsIntrosOn = settings.numbers?.conceptIntros ?? true
const showIntro = useMemo(() => {
  if (!conceptsIntrosOn) return false
  // ...
}, [...])
```

Refaktor ConceptIntro (router → INTRO_ANIMATIONS) nie wymaga zmian w SessionView ani w guard'zie — kontrakt props ConceptIntro zostaje (`{conceptId, audioBus, onContinue}`).

## 8. Testy

Zgodnie z preferencją "nie pisz nadmiarowych testów":

- `NumbersStats.test.tsx` (1 plik):
  - Render z fake store (concepts: 5 mastered, 3 in-progress; facts: 15 z różnym recentWrong/box)
  - Sprawdzenie `5/20` w sekcji koncepty
  - Sprawdzenie że top 10 trudnych pokazane (przynajmniej 3 pierwsze etykiety)
  - Sprawdzenie kolorów heatmapy (data-testid `phoneme-cell-X` na wzór ReadingStats; tu `concept-group-cell-<grupa>`)

- `SettingsScreen.test.tsx` (rozszerzenie istniejącego):
  - 1 test smoke: sekcja "section-numbers" obecna po unlocku, kliknięcie 5 toggle/radio/select wywołuje `updateSetting('numbers', ...)`

- `ConceptIntro` smoke test (1 plik, data-driven):
  - For each `conceptId` w `CONCEPTS` — render z fake `audioBus`, sprawdzenie że nie crashuje, że `INTRO_ANIMATIONS[conceptId]` istnieje
  - Bez testów per-stage CSS (zbyt brittle)

Reszta — manualna weryfikacja w przeglądarce + iPad.

## 9. Reuse istniejącego

- `representations/`: TenFrame, DotPattern, ConcreteIcons, NumberBondShape, DigitTile (wszystkie 5)
- `useTapHandler` (w przycisku "→")
- `audioBus` singleton
- `colors`, `radii`, `tapTargets` z `@/app/theme`
- `ToggleField`, `SliderField` (lokalne helpery w `SettingsScreen.tsx` — nie wyciągamy)
- `Button` z `@/shared/ui/Button` (jeśli potrzeba w `NumbersStats`)

## 10. Implementacja — kolejność

Zadania mają jasne granice → naturalne kandydaty do parallel agents:

**Faza A — niezależne (parallel):**
1. **conceptLabels.ts extraction + MasteryTree refaktor** — wyciągnięcie istniejącego `CONCEPT_LABELS` do shared. Drobne, blokuje NumbersStats.
2. **SettingsScreen sekcja matematyki** — 5 kontrolek, niezależne.
3. **IntroFrame + animations/index.ts szkielet** — pusty registry, smoke test sprawdza tylko że `INTRO_ANIMATIONS[id]` istnieje (po wypełnieniu).

**Faza B — po Fazie A (parallel):**
4. **NumbersStats** (raport) — używa conceptLabels z Fazy A.1.
5. **20 animacji per koncept** — można split na 4 agentów (per poziom: Iskierka 5, Płomyk 5, Ognik 4, Pochodnia 6). Każda animacja niezależna od pozostałych. Jeden agent uzupełnia też `animations/index.ts`.

**Faza C — finalny:**
6. **ConceptIntro refaktor** — podpięcie nowych animacji przez `INTRO_ANIMATIONS[conceptId]`.
7. **Eksporter markdown rozszerzenie** + mount NumbersStats w ReportScreen.

Każdy etap: `pnpm tsc -b && pnpm test --run` zielone przed commitem.

## 11. Risks (open questions zamknięte podczas self-review)

- **iPad performance**: 20 animacji CSS — ryzyko jankowania na starszym iPadzie. Mitigacja: każda animacja prosta (1-3 keyframes), brak heavy DOM, używamy `transform`/`opacity` (composited). Test na iPadzie po implementacji.
- **Build size**: każdy plik animacji ~2-3 kB — 20 plików = ~50 kB więcej. STATUS już ostrzega o 504 kB warning. Rozważyć lazy import animacji per koncept (`React.lazy`) — odłożone do v3.2 jeśli istotne (decyzja przy implementacji jeśli build size przekroczy 600 kB).
- **Audio drift dla długich animacji**: synchronizacja przez `setTimeout` od startu `play()` ma jitter ±10ms (standardowe JS event loop). Dla animacji 3-scenowych (~3s) to nieistotne. Gdyby któraś animacja chciała 6+ scen → rozważyć refresh sync na każdy `Promise.then` z mid-tracks (out of scope v3.1).

## 12. Acceptance criteria

- [ ] Raport rodzica pokazuje 3 karty matematyki (koncepty / trudne fakty / heatmapa typów) po `<ReadingStats />`.
- [ ] Markdown export raportu zawiera sekcję `## Matematyka`.
- [ ] SettingsScreen pokazuje sekcję "Matematyka (moduł 3)" z 5 kontrolkami; każda zmiana persistuje w `iskierki-state-v4 → settings.numbers.*`.
- [ ] Każdy z 20 konceptów ma dedykowaną animację ConceptIntro synchronizowaną z istniejącym audio.
- [ ] `settings.numbers.conceptIntros: false` przeskakuje ConceptIntro w sesji.
- [ ] `pnpm tsc -b` ✓
- [ ] `pnpm test --run` zielone (≥ 554 testów: 551 obecnie + min. 3 nowe smoke testy)
- [ ] `pnpm build` ✓ (warning build-size dopuszczalny, ale nie eksplodujący ponad ~600 kB)
- [ ] Manualna weryfikacja w przeglądarce: 4 poziomy × po 1 sesji każdy → 4 ConceptIntro (każdy unikalny), Raport (3 karty matematyki), Settings (5 kontrolek edytowalnych).
