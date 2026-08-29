# Iskierki — Fala 3 (duże inwestycje) — design

**Data:** 2026-08-29
**Status:** do akceptacji
**Podstawa:** `docs/superpowers/research/2026-08-29-ux-dydaktyka-research.md` §2 „Większe inwestycje"
**Założenie:** Fala 1 i 2 są **wdrożone** — spec nie powtarza ich ustaleń (czyste fonemy `letter-*`, synteza, druga próba, stopping cue, pochwały procesowe, paleta Okabe–Ito, „następny krok", tapy w czytankach, „scal sylaby", „przeczytana 2×").

## Cel

Siedem dużych zmian, które spinają cztery moduły w jedną ścieżkę uczenia się: wspólny plan dnia, wspólna ekonomia wysiłku, motoryka liter, brakujący szczebel CV→CVC→zdanie, brakujące pojęcia matematyczne (porównywanie, oś liczbowa), narracja w czytankach z własnym nagraniem oraz obsługa rodzeństwa.

## Nie-cele

Backend i sync. ASR/ocena wymowy. Punkty wymienialne, sklep, streak dla dziecka. Timery i rekordy. Ocena „ładności" pisma. Haptyka (iPad web nie ma Vibration API). Kolejne per-level suwaki w `SettingsScreen` — nowe ustawienia to pojedyncze przełączniki.

---

## A. Plan na dziś (E‑1)

**Stan obecny.** `src/app/Home.tsx` (404 l.) — 4 kafelki 2×2, intro 1× per moduł, brak jakiejkolwiek sugestii „co teraz". Stan SRS żyje osobno w `iskierki-letters-v1`, `-reading-v1`, `-numbers-v1` (`BaseItemState`: `box`, `lastSeen`, `recentWrong` — `src/shared/srs/types.ts`), postęp czytanek w `-czytanki-v1` (`openedIds`). Selekcja itemów: `src/shared/srs/select.ts`, scoring `scoring.ts`.

**Projekt.**

`src/shared/plan/planner.ts` — funkcja czysta, bez importów React i store'ów:

```ts
export type PlanStepKind = 'letters' | 'reading' | 'numbers' | 'czytanka'
export type PlanStep = { kind: PlanStepKind; level?: Level; czytankaId?: string; questions?: number; reason: 'due' | 'learning' | 'new' | 'fallback' }
export type PlanInput = { today: string; letters: DueSummary; reading: DueSummary; numbers: ConceptSummary; czytanki: { openedIds: string[]; lastOpenedId: string | null }; lastPlan: DailyPlan | null }
export function buildPlan(input: PlanInput): PlanStep[]   // zawsze 2–3 kroki
```

Reguły (deterministyczne, bez `Math.random` — losowość wstrzykiwana jako `pickIndex`):
1. Policz „due" per moduł: `box ≤ 2 || recentWrong > 0 || (now − lastSeen) > boxInterval(box)`; `DueSummary = { dueCount, level }` (poziom = `lastUsedLevel`, w Cyferkach dodatkowo koncepty w stanie `learning`).
2. Krok 1 = moduł z największą liczbą due (remis: kolejność Litery → Czytanie → Cyferki). Krok 2 = kolejny inny moduł. Krok 3 = **zawsze czytanka** (domykająca, przyjemna): pierwsza nieotwarta z najniższej grupy, w której dziecko ma ≥1 otwartą; jeśli brak — powtórka `lastOpenedId` (wspiera „przeczytana 2×" z Fali 2).
3. Gdy dane puste (pierwsze uruchomienie) — `['letters@iskierka', 'czytanka']`, `reason: 'new'`.
4. `questions` = 6 (krok 1) i 6 (krok 2) — łącznie ≤ 15 min; nie czytamy `sessionLength` z ustawień, plan ma być krótszy niż sesja z kafelka.

`src/shared/plan/planStore.ts` — Zustand + persist, klucz `iskierki-plan-v1`, `version: 1`, `migrate`, `merge` z defaultami (wymóg CLAUDE.md):

```ts
type DailyPlan = { date: string; steps: PlanStep[]; completed: boolean[]; startedAt: number | null; finishedAt: number | null }
type PlanState = { today: DailyPlan | null; history: DailyPlan[] }  // history cap 30 dni
```
`ensurePlanForToday(input)` generuje plan raz dziennie (klucz = lokalna data `YYYY-MM-DD`); zmiana daty archiwizuje poprzedni do `history`.

**UI dziecka.** Nowa karta na górze Home (nad siatką kafelków, wysokość ~120 px): ikona Iskry + **3 kółka 72 px** z ikonami modułów; ukończony krok dostaje ✅ i wygaszenie (opacity .5). Zero tekstu. Tap w kartę = start planu. Kafelki 2×2 zostają w pełni funkcjonalne — plan jest **opcjonalny** i nigdy nie blokuje.

**Przepływ miksu.** Nowy route `/plan` (`src/shared/plan/PlanRunner.tsx`) — nie renderuje UI sesji, tylko steruje: ustawia `planStore.startedAt`, `navigate(<route kroku>, { replace: true, state: { plan: true } })`. Moduły nie zmieniają swojej logiki poza jednym miejscem: hook sesji na `finish()` sprawdza `location.state?.plan` i zamiast `SessionEnd` z przyciskiem „jeszcze raz" pokazuje `SessionEnd` w wariancie `planStep` (patrz B) z jednym przyciskiem ▶ → `planStore.completeStep(i)` → `navigate('/plan')`. Wyjście 🏠 w trakcie = plan zostaje niedokończony (bez kary, następnego dnia nowy). Po ostatnim kroku: `plan-done` + ekran domknięcia (Iskra + 3 ✅), przycisk 🏠 jako jedyny.

**Audio** (`audio-source/ui-strings.json`, głos Zofia, `edge`):
- `plan-intro` — „Mam dla ciebie plan na dziś. Trzy zadania i koniec."
- `plan-next` — „Pierwsze zrobione! Idziemy dalej."
- `plan-last` — „Zostało ostatnie — czytanka."
- `plan-done` — „Cały plan zrobiony. Na dziś wystarczy, brawo!"
- `home-plan-intro` — „Tu jest twój plan na dziś. Dotknij, żeby zacząć."

**Raport rodzica.** `src/shared/stats/components/PlanSection.tsx` — widok tygodniowy: 7 kolumn (pn–nd) × 3 kropki (krok wykonany / nie), pod spodem „Plan ukończony 4 z 7 dni". Eksport MD: sekcja `## Plan na dziś` w `src/shared/stats/exporter.ts`.

**Ustawienia.** Jeden przełącznik `plan.enabled` (default `true`) w `SettingsScreen` — off ukrywa kartę z Home.

**Brzegowe.** Zmiana daty w trakcie sesji planu → plan bieżący dokańczamy (`date` zamrożony w `today`). Reset postępu modułu → plan przeliczany przy następnym wejściu na Home. Nieprawidłowy `czytankaId` po zmianie danych (F) → krok podmieniany na pierwszą czytankę grupy 1. Plan nie startuje sesji, gdy pula poziomu jest pusta (override liter) → krok pomijany.

**Testy.** `planner.test.ts`: 3 kroki, brak dwóch kroków tego samego modułu, krok 3 zawsze czytanka, pusty stan → wariant startowy, determinizm przy stałym `pickIndex`. `planStore.test.ts`: jeden plan na dzień, archiwizacja przy zmianie daty, `merge` daje defaulty.

**Rozmiar.** M/L — ~6 nowych plików, 1 route, dotyka 4 hooków sesji w jednym miejscu.

---

## B. Jedna ekonomia nagród (E‑6)

**Stan obecny.** Cztery ekonomie: `iskierki` liczone lokalnie na koniec sesji (`src/modules/letters/components/SessionEnd.tsx:185`, `src/modules/reading/components/SessionEnd.tsx:210`, `SessionView.tsx:244`) i **nietrwałe**; ściana mistrzostwa w `letters/components/LevelSelect.tsx`, album w `reading/components/WordAlbum.tsx`, drzewko w `numbers/components/MasteryTree.tsx`, „X/60" w czytankach.

**Projekt.** `src/shared/rewards/rewardsStore.ts` — persist `iskierki-rewards-v1`:

```ts
type RewardsState = { total: number; byModule: Record<ModuleId, number>; daily: Record<string, number>; seededFromLegacy: boolean }
earn(module: ModuleId, source: RewardSource, n = 1): void   // total tylko rośnie
```

**Za co iskierka** (`src/shared/rewards/rules.ts`, czysta funkcja `iskierkiFor(event)`):
| Zdarzenie | Iskierki |
|---|---|
| odpowiedź na pytanie (dowolny wynik, także 🤷) | 1 |
| poprawa w drugiej próbie (Fala 1) | +1 |
| ukończona sesja / krok planu | +3 |
| czytanka przeczytana 2× (licznik z Fali 2) | +2 |
| ukończony cały plan dnia | +5 |

Zasady: nigdy nie odejmujemy (brak „utraty"), brak wymiany na cokolwiek, brak progu/celu dziennego pokazywanego dziecku. Album/drzewko/ściana **zostają jako widoki kompetencji** — nie kupuje się ich za iskierki; celebracje (wild celebration, ceremonia albumu, gałąź drzewka) pozostają nieoczekiwane i niezależne od licznika.

**Wspólny SessionEnd.** `src/shared/rewards/SessionEndShell.tsx` — props: `iskierkiEarned`, `total`, `breakdown` (correct/wrong/dontKnow), `variant: 'standalone' | 'planStep' | 'planFinal'`, `slot` (moduł wstawia swoje treści: nowe karty albumu, gałąź drzewka, sugestia poziomu). Trzy istniejące `SessionEnd` zostają jako cienkie wrappery karmiące `slot` — nie przepisujemy ich zawartości merytorycznej.

**Home.** Pod kartą planu pasek: 🔥 + licznik `total` (liczba, bez tekstu) — jedyne miejsce, gdzie suma jest widoczna dla dziecka.

**Migracja.** Przy pierwszym uruchomieniu (`seededFromLegacy === false`): `total = Σ correct` z `sessions[]` w `lettersStore`, `readingStore`, `numbersStore` + `2 × openedIds.length` w czytankach; `byModule` analogicznie; flaga na `true`. Kod ziarna w `rewards/seedFromLegacy.ts`, wołany raz z `App.tsx` (po rehydracji wszystkich store'ów).

**Audio.** Bez nowych kluczy (używamy istniejących pochwał i `session-end-*`). Jedyne dopisanie w Fali 3: `rewards-milestone` — „Uzbierałeś całą garść iskierek!" — grane przy przekroczeniu 100/250/500/1000 (rzadko, nieoczekiwanie, nigdy jako cel).

**Brzegowe.** Podwójny `earn` przy remount `SessionEnd` — `earn` jest wołany wyłącznie z hooka sesji przy flush `finishedRef` (idempotentnie, kontrakt z CR 2026‑08‑28). Reset postępu w `SettingsScreen`: dodać checkbox „wyczyść też iskierki" (domyślnie **nie**, żeby reset jednego modułu nie zabierał wspólnego śladu wysiłku). Zegar cofnięty → klucz `daily` po prostu dostaje starą datę, `total` bez zmian.

**Testy.** `rules.test.ts` (tabela zdarzeń), `rewardsStore.test.ts` (monotoniczność `total`, idempotentny seed, `merge`), `seedFromLegacy.test.ts` (suma z trzech store'ów, drugie wywołanie nic nie zmienia).

**Rozmiar.** M — 4 nowe pliki, dotyka 4 `SessionEnd` + `Home` + `SettingsScreen`.

---

## C. Tracing / air‑writing liter (A‑6)

**Stan obecny.** Brak. Jest `src/shared/ui/HandwrittenLetter.tsx` (czterolinia + font Kalam) i `letters/components/LetterTile.tsx`. 32 litery w `letters/data/alphabet.ts`.

**Decyzja zakresu.** Start: **druk, wielkie + małe** = 64 glify. Wariant pisany (Kalam) — dopiero po weryfikacji na iPadzie, w osobnym kroku (te same struktury danych, inne `strokes`).

**Dane.** `src/modules/letters/data/letterPaths.ts`:

```ts
export type Stroke = { d: string; startHint: { x: number; y: number } }   // viewBox 0 0 100 100
export type GlyphPaths = { char: string; case: DisplayCase; strokes: Stroke[] }
export const LETTER_PATHS: Record<string, GlyphPaths>   // klucz: `${char}-${case}`
```

**Proces autorstwa ścieżek.** `scripts/generate-letter-paths.ts` (jednorazowy, wynik commitowany jako dane, nie generowany w buildzie):
1. Baza: **Hershey simplex** (public domain, już rozbity na kreski) → polilinie → normalizacja do `viewBox 0 0 100 100`, kolejność kresek jak w piśmie (pion przed poziomem, góra→dół).
2. Diakryty PL (ą ę ć ł ń ó ś ź ż) — kreski glifu bazowego + kreska diakrytu jako **ostatni** stroke.
3. Podgląd `scripts/letter-paths-preview.html` — 64 glify z numerami kresek i strzałkami; ręczna korekta `d` tam, gdzie Hershey odbiega od polskiego wzoru (`Ł`, `Ż`, `J`).

**Komponent.** `src/modules/letters/components/TracingCanvas.tsx`:
- SVG: szara ścieżka-duch (stroke 10, `stroke-linecap: round`) + zielona kropka startowa + animowana strzałka kierunku (2 s po wejściu, potem znika).
- Palec: `pointerdown/move` → próbkowanie. Checkpointy co 8 % długości kreski liczone przez `SVGGeometryElement.getPointAtLength` (jsdom tego nie ma → w testach czysta funkcja `nearestOnPolyline` na spróbkowanych punktach, próbkowanie robimy raz przy montowaniu).
- Tolerancja: 28 px promienia (skalowane do rozmiaru SVG); wyjście poza tolerancję **nie kończy porażką** — ślad się nie rysuje dalej, a po 1,5 s bezruchu wraca strzałka podpowiedzi.
- Kreska zaliczona po osiągnięciu ostatniego checkpointu → SFX `sfx-pop`, następna kreska podświetlona. Po ostatniej: `trace-done` + krótka animacja litery.
- **Bez oceny**: brak procentów, brak „źle", brak zapisu jakości. Do store'a trafia wyłącznie `tracedCount` per litera (raport rodzica: „obrysował 12 liter").

**Wejścia.**
1. Tryb „Rysuj" z `LevelSelect` — nowy kafelek ✏️ obok poziomów, route `/letters/draw`: siatka liter puli poziomu → wybór → `TracingCanvas` pełnoekranowo, ◀▶ do sąsiednich liter.
2. Po poprawnej odpowiedzi w sesji — `settings.letters.tracingAfterCorrect: 'off' | 'sometimes' | 'always'` (default `'sometimes'` = co 4. poprawna, tylko dla liter box ≤ 3). Overlay `TracingOverlay` nad `FeedbackOverlay` z przyciskiem „pomiń" (▶); pominięcie nie liczy się jako błąd i nie wydłuża feedbacku ponad limit (`MAX_FEEDBACK_MS` nie obejmuje tracingu — tracing zatrzymuje auto-advance do czasu zamknięcia).

**Store.** `lettersStore`: `tracing: Record<string, number>` + `markTraced(char)`; `version: 2` + `migrate` + default w `merge`.

**Audio** (Zofia, `edge`):
- `trace-intro` — „Poprowadź palcem po literce. Zacznij od zielonej kropki."
- `trace-hint` — „Zacznij tutaj i jedź po szarej ścieżce."
- `trace-stroke-next` — „Teraz druga kreska."
- `trace-done` — „Udało się! Napisałeś literkę palcem."

**Brzegowe.** Multi-touch (dwa palce) — bierzemy pierwszy `pointerId`, resztę ignorujemy. `pointercancel` (przyjście powiadomienia) → reset kreski, bez komunikatu. `prefers-reduced-motion` → strzałka statyczna. Litery z dwoma kreskami rozłącznymi (`i`, `j`, `ł`) — kolejność wymuszona, nie da się zacząć od kropki. Landscape/portrait: SVG kwadratowy, `min(60vh, 70vw)`.

**Testy.** `letterPaths.test.ts`: 64 klucze, każdy ma ≥1 stroke, `d` zaczyna się od `M`, wszystkie współrzędne w 0–100. `tracing.test.ts` (czysta logika): `nearestOnPolyline`, zaliczanie checkpointów w kolejności, punkt poza tolerancją nie cofa postępu.

**Rozmiar.** L — 1 skrypt autorski + 64 zestawy ścieżek + 3 komponenty + tryb/route.

---

## D. Czytanie: poziom pośredni CV→CVC (B‑8) + most do zdań (B‑9)

**Stan obecny.** `LEVEL_TO_EXERCISE` w `src/modules/reading/types.ts` sztywno wiąże 4 poziomy z 4 ćwiczeniami; Płomyk = 20 słów CV‑CV (`data/words.ts`), Ognik startuje od CZAP‑KA/MUSZ‑KA. `SessionEnd` kończy na słowie.

**Decyzja.** **Nie dodajemy piątego `Level`** (typ `Level` jest wspólny dla 4 modułów i ustawień). Płomyk dostaje **dwa etapy**:

```ts
export type PlomykStage = 1 | 2      // 1: CV-CV (MAMA), 2: CVC (KOT)
```
`WordData` dostaje opcjonalne `stage?: PlomykStage` (tylko dla `level: 'plomyk'`). Nowe słowa etapu 2 (14): KOT, DOM, LAS, MAK, SOK, LEW, NOS, RAK, SER, DYM, KOC, MUR, BAT, SUM.

**Ćwiczenie.** `word-assembly` w etapie 2 składa słowo z **2 kafelków: sylaba otwarta + spółgłoska wygłosowa** (`KO` + `T`). Kafelek spółgłoski gra **czysty fonem** z Fali 1 (`letter-t`) — zero nowych kluczy audio dla kod. Dystraktory: kody kontrastywne (T/K/P, S/Z, M/N) z `contrastiveSyllables.ts` (Fala 2) rozszerzonego o mapę kod.

**Promocja etapu.** `readingStore.plomykStage` liczony z danych: etap 2 gdy ≥70 % słów etapu 1 ma `box ≥ 4`; przełączenie ogłaszane cue `reading-plomyk-stage2`. Override rodzica: `settings.reading.plomykStage: 'auto' | 1 | 2` (jedno pole, nie per-level).

**Most do zdań.** `src/modules/reading/data/sentenceTemplates.ts` + czysta funkcja:

```ts
buildBridgeSentence(mastered: WordData[], templates, pick): BridgeSentence | null
```
Szablony (wyłącznie ze słów opanowanych, `box ≥ 4`): `TO JEST [N].`, `[OSOBA] MA [N].`, `[N] I [N].`, `TU JEST [N].`. Słowa funkcyjne (TO, JEST, MA, I, TU, OSOBA=MAMA/TATA/OLA) traktujemy jako stały, mały słownik z własnymi kluczami audio.

`src/modules/reading/components/SentenceBridge.tsx` renderowany w `SessionEnd` (etap 2 Płomyka, Ognik, Pochodnia), 1–2 zdania: **reużycie `SyllableButton` z `src/modules/czytanki/components/`** i kluczy `cz-syl-*` / `cz-word-*` (Agnieszka, azure/azure‑ipa) — tap sylaby, long-press słowa, ▶ czyta całość przez `useReadAloud`. Brakujące klucze dodajemy przez rozszerzenie `scripts/czytanki-audio-source.ts`: skrypt dodatkowo przechodzi po `ALL_WORDS` modułu 2 i słowniku funkcyjnym, więc oba moduły dzielą jeden zestaw plików (idempotentnie, hash-based). Szacunek: ~30 nowych `cz-word-*` + ~10 `cz-syl-*` (kody CVC) ≈ 40 wywołań Azure ≈ 2–3 min przy throttlingu 3,1 s.

**Audio** (Agnieszka dla zdań; Zofia dla cue):
- `reading-bridge-intro` — „Przeczytaj zdanie ze swoich słów!" (Zofia)
- `reading-plomyk-stage2` — „Teraz trudniejsze słowa — z literką na końcu." (Zofia)
- `cz-word-to`, `cz-word-jest`, `cz-word-tu`, `cz-word-ma`, `cz-word-i` + `cz-word-<nowe słowa CVC>` (Agnieszka, `azure`).

**Brzegowe.** Zbyt mało opanowanych słów (<3) → `buildBridgeSentence` zwraca `null`, `SessionEnd` bez mostu (nigdy pusty prostokąt). Zdanie nie może użyć dwa razy tego samego słowa. Długie zdanie w portrait — reużyć auto-fit z `CzytankaView` (wydzielić hook `useAutoFit`, dziś inline). Przełączenie etapu w trakcie sesji nie zachodzi (etap zamrożony na `start()`).

**Testy.** `words.test.ts`: każde słowo `stage: 2` ma dokładnie 1 sylabę + kodę i tylko fonemy z puli poziomu. `sentenceTemplates.test.ts`: zdanie tylko z opanowanych, brak duplikatów, `null` przy pustej puli, determinizm przy stałym `pick`. `plomykStage.test.ts`: próg 70 %.

**Rozmiar.** M/L — 14 słów + 1 wariant ćwiczenia + 1 komponent + rozszerzenie skryptu audio.

---

## E. Cyferki: porównywanie zbiorów i oś liczbowa (C‑11, C‑13)

**Stan obecny.** 20 konceptów w `numbers/data/concepts.ts`, routing `hooks/exerciseRouter.ts`, reprezentacje w `components/representations/` (`TenFrame`, `DotPattern`, `ConcreteIcons`, `NumberBondShape`) — **brak osi liczbowej i porównywania**; `SkipCountChase` istnieje jako ćwiczenie bez reprezentacji liniowej.

**Nowe koncepty** (`ConceptId`, `CONCEPTS`, `levelFacts.ts`):
- `iskierka-compare-5` (`minFacts: 5`, `minStreak: 8`) — dwa zbiory ≤5 (ConcreteIcons), pytanie „gdzie jest więcej?" → tap w zbiór; po 3 poprawnych wariant ze znakiem.
- `plomyk-compare-10` — dwa ten frame'y ≤10, wybór znaku `<` / `>` / `=` (3 duże kafelki, **tap-to-place**, nie drag — NN/g dla 6–8 lat).
- `plomyk-numberline-10` — „gdzie na osi jest 7?" (estymacja pozycji, tolerancja ±0,5 działki).

Fakty: `cmp-<a>-<b>` (a≠b i a=b w proporcji 3:1), `nl-<n>`; generowane w `data/facts.ts` obok istniejących.

**Reprezentacja.** `components/representations/NumberLine.tsx` — props `{ min, max, step, marks?: number[], marker?: number, ghost?: number, labels: 'all' | 'ends' | 'step' }`; podziałka z etykietami cyfrowymi, znacznik jako 🐸 (skacze) albo ✨. Reużyta w trzech miejscach: nowe ćwiczenie estymacji, feedback porównywania (oba porównywane liczby na osi — hiperkorekcja osadzona w modelu, zgodnie z Falą 1), oraz przeprojektowany `SkipCountChase` (wyścig liniowy: żabka skacze co 2/5/10 po osi, dziecko wskazuje następne lądowanie).

**Ćwiczenia.** `components/exercises/CompareSetsExercise.tsx`, `components/exercises/NumberLineExercise.tsx`; wpięcie w `exerciseRouter.ts` (`compare-sets`, `number-line`). `SkipCountChase` zachowuje id ćwiczenia, zmienia się jego warstwa wizualna (bez migracji faktów).

**Audio** (Zofia, `edge`; liczby biorą istniejące `number-0..20`):
- `intro-iskierka-compare-5` — „Popatrz na dwie grupy. Której jest więcej? Policz i pokaż."
- `intro-plomyk-compare-10` — „Znak pokazuje, gdzie jest więcej. Otwarta buzia zawsze patrzy na większą liczbę."
- `intro-plomyk-numberline-10` — „To jest oś liczbowa. Liczby idą po kolei — od małych do dużych."
- `cmp-which-more` — „Gdzie jest więcej?" · `cmp-which-sign` — „Który znak pasuje?" · `cmp-equal` — „Tyle samo!"
- `nl-where` — „Gdzie na osi jest ta liczba?" · `nl-jump` — „Skacz co dwa!" (wariantowo `co pięć`, `co dziesięć`)
- `mastery-compare`, `mastery-numberline` (wzorem istniejących `mastery-*`)
- strategia po błędzie (spójnie z Falą 1): `strategy-compare` — „Ustaw obok siebie i sprawdź, która grupa jest dłuższa."

**Ustawienia.** Bez nowych. Nowe koncepty wchodzą w istniejące wagi konceptów (Fala 1 #5) i gating `prerequisites` (`compare-5` przed `compare-10`).

**Brzegowe.** `a = b` w porównaniu — feedback nie może mówić „więcej"; osobna gałąź audio (`cmp-equal`). Estymacja na osi: tolerancja liczona w jednostkach osi, nie w pikselach (portret/landscape). Skala `0–20` na iPadzie portrait — etykiety co 2 (`labels: 'step'`), inaczej crowding. Mastery nowych konceptów nie może wpaść do drzewka bez ikony — dodać 2 gałęzie w `MasteryTree`.

**Testy.** `facts.test.ts` (rozszerzenie): unikalne id `cmp-*`/`nl-*`, proporcja par równych. `compare.test.ts`: poprawny znak dla (a,b) w trzech przypadkach. `numberLine.test.ts`: mapowanie wartość↔pozycja jest liniowe i odwracalne, tolerancja ±0,5 działki.

**Rozmiar.** M — 1 reprezentacja + 2 ćwiczenia + 3 koncepty + fakty + audio.

---

## F. Czytanki: serie z bohaterami (D‑9) i „nagraj siebie" (D‑8)

**Stan obecny.** `src/modules/czytanki/data/czytanki.ts` — 60 czytanek, imiona rotują przypadkowo (Ola, Ula, Ela, Tola, Lola); `CzytankaList.tsx` grupuje po `group: 1|2|3|4`; store trzyma `openedIds`, `lastOpenedId`, `seenIntros` (+ tapy/powtórki z Fali 2).

**Serie.** `src/modules/czytanki/data/series.ts`:

```ts
export type SeriesId = 'ola-burek' | 'dom' | 'las' | 'przedszkole' | 'pory-roku'
export type Series = { id: SeriesId; title: string; emoji: string; color: string; cast: string[] }
```
5 serii × 12 czytanek, **po 3 w każdej grupie** — seria rośnie razem z dzieckiem. `Czytanka` dostaje `series: SeriesId` + `seriesIndex: 1..12`.

Stały skład: **OLA** (7 lat), **TATA**, **MAMA**, **BUREK** (pies), **MRUCZEK** (kot), **DZIADEK**.

Reguły przepisania (nienaruszalne): (1) inwentarz fonologiczny grupy bez zmian — w G1 tylko OLA/MAMA/TATA/LALA, BUREK/MRUCZEK/DZIADEK od G2; (2) liczba zdań i słów per grupa bez zmian; (3) zmieniamy wyłącznie imiona i rekwizyty, czasowniki zostają (koszt audio); (4) seria = spójna sceneria `SceneSpec.bg` i rodzina emoji; (5) `title` z prefiksem serii („Ola i Burek — Burek śpi").

**Koszt audio.** Regenerują się tylko klucze zmienione (hash w manifeście). Szacunek: ~150 nowych `cz-word-*` i ~15 `cz-syl-*` ⇒ ~165 wywołań Azure ≈ **9–10 min** przy throttlingu 3,1 s (tier F0). Osierocone klucze zostają w `public/audio` (nieszkodliwe) — `pnpm audio:check` liczy tylko wymagane.

**Lista.** `CzytankaList` — nad sekcjami grup pasek 5 ikon serii + ✳️ „wszystkie" (filtr, `useState`, bez route'u; wybór **nie blokuje** reszty). Kafelek dostaje mikro-ikonę serii w rogu przeciwnym do ⭐. Cue `czytanki-series-<id>` przy wyborze filtra.

**Nagraj siebie.** `src/modules/czytanki/hooks/useRecorder.ts` (MediaRecorder; `isTypeSupported('audio/mp4')` → fallback `audio/webm`; iPad Safari zwraca `audio/mp4`), `src/modules/czytanki/audio/recordingsDb.ts` (IndexedDB `iskierki-recordings`, store `byCzytanka`):
- limit **60 s** na nagranie (auto-stop), max **10 nagrań** (LRU po `createdAt`), miękki limit **25 MB**; przekroczenie → kasujemy najstarsze, `QuotaExceededError` → komunikat dla rodzica i 🎤 znika do końca sesji.
- UI: 🎤 (72 px) obok ▶ — tap = nagrywanie (pulsująca kropka + pasek czasu, bez cyfr), tap = stop; potem 👩 lektor / 🧒 ja obok siebie. Nagranie **nigdy nie opuszcza urządzenia**.
- **Uprawnienia po dorosłemu**: `czytanki.recordingEnabled` (default `off`) w `SettingsScreen`; włączenie woła `getUserMedia` **na ekranie rodzica**, więc prompt widzi dorosły. `denied` → przełącznik wraca na off + „Przeglądarka odmówiła dostępu do mikrofonu". Dziecko promptu nie widzi.

**Audio** (Agnieszka, `azure`): `czytanki-rec-start` — „Teraz ty. Czytaj powoli.", `czytanki-rec-stop` — „Gotowe! Posłuchaj siebie.", `czytanki-rec-compare` — „A teraz posłuchaj, jak czytam ja."

**Brzegowe.** Nagrywanie i `useReadAloud` wzajemnie się wykluczają (start nagrania → `audioBus.stop()`, ▶ zablokowane). `visibilitychange` w trakcie nagrywania → stop + zapis tego, co jest. Tryb prywatny / brak IndexedDB → 🎤 ukryte. Reset postępu czytanek kasuje też nagrania (jedna operacja, komunikat dla rodzica).

**Testy.** `series.test.ts`: 5 serii × 12, po 3 na grupę, każda czytanka ma `series`, `seriesIndex` unikalny w serii, inwentarz sylab G1 bez zmian (regresja na dotychczasowym teście `czytanki.test.ts`). `recordingsDb.test.ts` (fake-indexeddb): LRU trzyma 10, kasowanie najstarszego, brak wycieku przy `QuotaExceededError`.

**Rozmiar.** L — przepisanie 60 tekstów + regeneracja audio + 3 pliki nagrywania + zmiany listy.

---

## G. Multi‑profil (E‑12)

**Stan obecny.** 5 kluczy `localStorage` bez prefiksu (`iskierki-state-v1`, `-letters-v1`, `-reading-v1`, `-numbers-v1`, `-czytanki-v1`), reset zbiorczy w `SettingsScreen`, raport = jedno dziecko.

**Projekt.** `src/shared/profiles/profilesStore.ts` — persist pod **nieprefiksowanym** kluczem `iskierki-profiles-v1`:

```ts
type Profile = { id: string; avatar: string; color: string; createdAt: number }   // bez imienia — dziecko nie czyta
type ProfilesState = { profiles: Profile[]; activeId: string }                     // max 3
```

**Prefiksowanie.** `src/shared/profiles/storageKey.ts`:
```ts
export function storageKey(base: string): string   // 'p1' → base (bez zmian), inny → `${base}__${id}`
```
Profil `p1` używa dotychczasowych kluczy ⇒ **migracja istniejącego dziecka jest zerowa** (żadnego przenoszenia danych; nowe profile dostają czysty stan). Wszystkie 7 store'ów (5 obecnych + `plan` z A + `rewards` z B) wołają `storageKey(...)` w `persist({ name })`.

**Przełączanie.** `persist.name` jest ustalane przy tworzeniu store'a, więc zmiana profilu wykonuje: `profilesStore.setActive(id)` → `audioBus.stop()` → `location.reload()`. Reload jest akceptowalny (PWA, <1 s) i eliminuje ryzyko wycieku stanu między profilami; po nim `audioBus.unlock()` zachodzi przy pierwszym tapie jak zwykle.

**Podział ustawień.** Cały `iskierki-state-v1` jest **per profil** (poziomy, pule liter, długości sesji, ustawienia modułów). Wyjątki dzielone na urządzenie — wyprowadzone do nowego, nieprefiksowanego `iskierki-device-v1`: stan `MathGate` (`failedAttempts`, `cooldownUntil`) i `czytanki.recordingEnabled` (zgoda na mikrofon jest urządzeniowa). Migracja `settingsStore` → `version: 5`: przeniesienie tych dwóch pól, `migrate` je usuwa z profilu.

**UI dziecka.** Home: gdy `profiles.length > 1` — rząd 2–3 avatarów 64 px nad kartą planu; aktywny ma obwódkę i pełną krycie, pozostałe 60 %. Tap = przełączenie (cue `profile-switch` — „Cześć! Teraz twoja kolej.", bez imienia). Gdy 1 profil — rzędu nie ma (zero zmian dla obecnego użytkownika).

**UI rodzica.** `SettingsScreen` → sekcja „Dzieci": dodaj (avatar z 12 emoji + kolor), usuń (potwierdzenie; kasuje klucze `localStorage` i nagrania), przełącz. `ReportScreen` dostaje selektor profilu; eksport MD nagłówek z id profilu; `shared/stats/aggregate.ts` liczy **tylko** aktywny profil.

**Brzegowe.** Usunięcie aktywnego profilu → przełączenie na `p1` + reload. Próba dodania 4. profilu → przycisk zablokowany. Klucze osierocone po ręcznym czyszczeniu `iskierki-profiles-v1` → store'y `p2/p3` pozostają w `localStorage`; sprzątanie przy usuwaniu profilu (`Object.keys(localStorage).filter(endsWith('__'+id))`). `iskierki-recordings` (IndexedDB) — nazwa store'a wewnątrz bazy prefiksowana `${id}:${czytankaId}`.

**Testy.** `storageKey.test.ts`: `p1` → klucz bazowy, inne → sufiks, brak kolizji. `profilesStore.test.ts`: max 3, usunięcie aktywnego przełącza na `p1`, `merge` daje default `p1`. `settingsStore.test.ts` (rozszerzenie): migracja v4→v5 wyprowadza math gate do `iskierki-device-v1` bez utraty pozostałych ustawień.

**Rozmiar.** M/L — 3 nowe pliki, dotknięcie 7 store'ów w jednej linii każdy, migracja settings, 2 ekrany rodzica.

---

## Kolejność implementacji i zależności

| # | Blok | Zależy od | Dlaczego tu |
|---|---|---|---|
| 1 | **G — multi‑profil** | — | Wprowadza `storageKey`; zrobione pierwsze, wszystkie następne store'y (`plan`, `rewards`) rodzą się już prefiksowane. Ryzyko migracji izolowane od reszty fali. |
| 2 | **B — jedna ekonomia** | G | `SessionEndShell` jest potrzebny A (wariant `planStep`); seed z legacy najlepiej odpalić zanim przybędzie źródeł iskierek. |
| 3 | **A — plan na dziś** | B (SessionEnd), G | Spina moduły; po nim wszystkie kolejne bloki dokładają tylko treść. |
| 4 | **F(serie) — przepisanie czytanek** | A (krok 3 planu odwołuje się do czytanek) | Regeneracja ~165 kluczy Azure trwa ~10 min i blokuje limit F0 — odpalić wcześnie, równolegle z pracą nad D. |
| 5 | **D — CVC + most do zdań** | F(audio — wspólny skrypt `czytanki-audio-source`) | Most reużywa `SyllableButton` i klucze `cz-*`; jeden przebieg audio dla D i F. |
| 6 | **E — porównywanie + oś liczbowa** | — (niezależny) | Można robić równolegle z D w osobnym worktree; dotyka wyłącznie modułu 3. |
| 7 | **C — tracing** | — (niezależny) | Największa niepewność (jakość ścieżek, palec na iPadzie) — na końcu, żeby ewentualne cięcie zakresu (tylko wielkie litery) nie blokowało reszty. |
| 8 | **F(nagrywanie)** | F(serie), G (prefiks IndexedDB) | Osobny krok po seriach; wymaga testu na realnym iPadzie (uprawnienia mikrofonu w Safari). |

Równoległość: **(4+5)**, **(6)** i **(7)** to trzy niezależne worktree'y po ukończeniu (1–3). Po każdym bloku: `pnpm tsc -b`, `pnpm test --run`, `pnpm audio:check`, smoke w Chrome (viewport iPad), aktualizacja `docs/STATUS.md`.

**Ryzyka.** (a) Limit Azure F0 przy F+D — użyć `pnpm audio:dry` przed buildem i rozbić na dwie tury. (b) Push dużych paczek mp3 — commity ≤1 MB (znany problem sieci). (c) `location.reload()` przy zmianie profilu i odblokowanie audio na iOS — zweryfikować palcem. (d) Ścieżki Hershey dla polskich diakrytów mogą wymagać więcej korekt ręcznych niż zakłada `scripts/letter-paths-preview.html`.

## Decyzje (2026-08-29, po review speca)

- Zmiana profilu przez `location.reload()` — akceptowalne.
- Serie czytanek: zachować obecne teksty tam, gdzie imię/bohater już pasuje (tańsze audio); przeredagować swobodnie tylko gdy narracja serii tego wymaga.
- Tracing po poprawnej odpowiedzi domyślnie **off**; tryb ✏️ zawsze dostępny z LevelSelect; rodzic włącza „co 4. poprawną" w ustawieniach.
- Iskierki **nie** są pokazywane jako liczba na Home (research: unikać waluty); widoczne na SessionEnd i w raporcie rodzica.
