# Iskierki — Fala 2 ulepszeń dydaktyczno-UX (design)

**Data:** 2026-08-29 · **Status:** do akceptacji
**Źródło:** `docs/superpowers/research/2026-08-29-ux-dydaktyka-research.md` — pozycje #12–#20 syntezy + wybrane S/M z załączników A–E.
**Zakłada Falę 1 jako zrobioną** (#1–#11) i jej nie powtarza.

## Cel

Dołożyć trzy brakujące rzeczy: **akt liczenia** (zamiast samego rozpoznawania liczebności), **rozumienie** (zamiast samego dekodowania) i **pętlę rodzica z jedną akcją**. Plus szlif dyskryminacji, reprezentacji, powtórki i dostępności.

## Nie-cele

Plan na dziś, jedna ekonomia nagród, tracing, poziom CVC, oś liczbowa, porównywanie zbiorów, multi-profil, nagrywanie dziecka, ASR — Fala 3. Żadnych nowych per-level suwaków poza wymienionymi. Żadnych timerów, punktów, streaków dla dziecka.

---

## 12. Raport: karta „Następny krok" + sugestie ze wszystkich modułów

**Dziś:** `stats/components/ReportScreen.tsx:395-399` — 7 sekcji, wszystkie rozwinięte. `SuggestionsSection.tsx` liczy wyłącznie z `{ letters, sessions }`. `AntiCheatSection.tsx` pokazuje żargon z `engagement/antiCheatFlags.ts`.

**Nowe:**
- `NextStepCard` na samej górze: jedno zdanie akcji na tydzień + jedna linijka „dlaczego". Zawsze dokładnie jedna sugestia (fallback: „Usiądźcie razem do jednej sesji Liter — 8 minut wystarczy").
- `SuggestionsSection` dostaje `reading`, `numbers`, `czytanki` (snapshoty store'ów) + `allSessions: UnifiedSession[]` z `shared/stats/aggregate.ts`. `generateSuggestions` zwraca `Suggestion[] = { id, text, why, priority, module }`; najwyższy `priority` idzie do karty, reszta do zwiniętej sekcji „Więcej sugestii".
- Priorytety (pierwsza pasująca wygrywa): 1) brak aktywności ≥3 dni; 2) moduł nietknięty ≥7 dni; 3) ≥3 litery/sylaby z `recentWrong ≥ 2` → „Trudne literki, 5 minut"; 4) koncept w `learning` ≥14 dni (nazwa z `conceptLabels.ts`); 5) żadna czytanka nie przeczytana 2× → „przeczytajcie ulubioną drugi raz"; 6) sesje 1×/dzień → „dwie krótkie zamiast jednej długiej".
- Wszystkie sekcje poza kartą **zwinięte domyślnie**: `CollapsibleSection` z nagłówkiem ≥44 px i jednolinijkowym podsumowaniem („Litery — 18/35 opanowanych"). Stan w `useState`, nie w persist.
- Flagi po ludzku — `antiCheatFlagText(type): { title, hint }`: `fast-click` → „Klika bardzo szybko, prawie bez patrzenia. Może to zmęczenie — spróbujcie krótszej sesji."; `same-position` → „Wybiera ciągle ten sam kafelek. Warto usiąść obok."; `no-answer` → „Zdarza się, że nie odpowiada wcale."; `many-dont-know` → „Często mówi »nie wiem« — to uczciwe, ale poziom może być za trudny."; `visibility` → „Sesja była przerwana wyjściem z aplikacji."; `long-inactivity` → „Dłuższa przerwa w środku sesji."

**Dane/audio:** brak nowych ustawień i **brak nowego audio** (ekran rodzica jest tekstowy). `exportReportToMarkdown` dostaje `## Następny krok` na początku i te same opisy flag (kontrakt: treść UI ≡ markdown).

**Brzegi:** zero sesji → fallback; snapshot modułu `undefined` → pomijamy go; moduł nigdy nietknięty dostaje tekst „zacznij", nie „wróć".

**Testy:** priorytet 1 wygrywa nad 6 przy obu spełnionych; brak danych → dokładnie 1 sugestia; każdy `AntiCheatFlagType` ma niepusty `title` (test wyczerpujący unię).

---

## 13. Cyferki: liczenie 1:1 z dotykiem (`CountObjectsExercise`)

**Dziś:** `hooks/exerciseRouter.ts:13-19` — `iskierka-counting-5` → `subitize-flash`, `iskierka-counting-10` → `match-digit-dots`. Oba testują rozpoznanie liczebności; aktu liczenia (1:1, stały porządek, kardynalność) nie ma.

**Nowe:** `components/exercises/CountObjectsExercise.tsx`, typ `'count-objects'` w `types.ExerciseType`. Router: oba koncepty liczenia trafiają na `count-objects` **co drugie pytanie** (parzystość indeksu), żeby zachować subitizing.

1. N obiektów (emoji z `data/concreteSets.ts`) rozłożonych **nieregularnie** (porządek narzuca dziecko, nie layout), tap-target ≥60 px.
2. Prompt `count-objects-prompt`. Tap obiektu → trwały znacznik (obwódka + wyszarzenie) + lektor mówi `number-<k>`. Ponowny tap w policzony obiekt: nic.
3. Po ostatnim: `count-objects-howmany` + 4 kafelki cyfr (`buildChoices` z `NEAR_MISS_OFFSETS`, 1–10). **To** jest odpowiedź idąca do SRS.
4. Błąd → `count-objects-recount`, znaczniki gasną, lektor liczy `number-1..N` z podświetleniem co 700 ms, potem druga próba z fali 1.

**Dane/audio:** bez nowych ustawień, bez zmian w faktach (`count5-N`, `count10-N`). Reużycie martwych dotąd `number-0..20` (`audio-source/numbers.json`, Zofia, `edge`). Nowe w `math-ui-strings.json` (`zofia`/`edge`):
- `count-objects-prompt`: „Stukaj w każdy przedmiot, a ja będę liczyć."
- `count-objects-howmany`: „Ile jest razem?"
- `count-objects-recount`: „Policzmy jeszcze raz, powoli."

**Brzegi:** multi-touch → guard na `pointerId`, obsługujemy pierwszy; **nie** wołać `audioBus.stop()` przy tapie (FIFO ma zachować kolejność liczb); pauza w trakcie → znaczniki zostają, po `resume` powtarzamy prompt; N=1 → od razu kardynalność; jako `answer` logujemy wyłącznie odpowiedź o kardynalność (inaczej anti-cheat `fast-click` flaguje stukanie).

**Testy:** powtórny tap nie zwiększa licznika; po ostatnim obiekcie faza `cardinality`; `answer()` przed tą fazą jest ignorowane; router zwraca `count-objects` dla obu konceptów przy właściwej parzystości.

---

## 14. Czytanie: dystraktory kontrastywne dla sylab

**Dziś:** `useReadingSession.ts:152-168` (`generateSyllableMatch`) losuje 3 dystraktory `pickRandomDistinct(ALL_SYLLABLES,…)` — da się rozwiązać po pierwszej literze. `shared/srs/distractors.ts:73` (`pickDistractors`) ma gotowe errorless + 70% pary kontrastywnej, używane tylko przez litery.

**Nowe:** `modules/reading/data/contrastiveSyllables.ts` — mapa symetryczna budowana z listy par (wzór: `letters/data/contrastivePairs.ts`), wyłącznie na 24 sylabach z `data/syllables.ts`:
- samogłoska: MA/MO, TA/TO, LA/LO, KO/KU, DA/DO, DO/DU, NA/NO, NO/NU, RA/RO, RO/RU, SA/SO;
- dźwięczność: PA/BA, TA/DA;
- miejsce artykulacji: MA/NA, MO/NO, TA/KA, DA/BA, LA/RA, NU/DU.
Pary bez pokrycia w puli (KA/GA, SA/ZA, TY/DY) **nie** wchodzą; plik ma test spójności z `ALL_SYLLABLES`.

`generateSyllableMatch` woła `pickDistractors(targetText, poolTexts, targetState, CONTRASTIVE_SYLLABLES, rng, CHOICE_COUNT - 1)`. `SyllableState` ma `BaseItemState` + `totalSeen`, więc pasuje; w razie potrzeby zawęzić typ parametru do `BaseItemState & { totalSeen: number }` bez zmiany zachowania liter. Errorless (`box === 1 && totalSeen ≤ 2`) daje sylaby odległe — pożądane dla świeżych.

**Dane/audio:** brak nowych kluczy i ustawień.

**Brzegi:** pula < 4 sylaby (możliwe przy override) → `pickDistractors` rzuca; fallback do `pickRandomDistinct`. `shapeOf` jest liter-specyficzne — dla sylab gałąź kształtu pomijamy (parametr opcjonalny).

**Testy:** tabela symetryczna i zamknięta w `ALL_SYLLABLES`; dla `box ≥ 2` i seedowanego rng ≥1 dystraktor jest partnerem; dla świeżej sylaby żaden nie jest.

---

## 15. Cyferki: struktura 5, feedback nad reprezentacją, mastery jako okno

**Dziś:** `representations/TenFrame.tsx` — 10 kropek jednym `dotColor`, bez kodowania piątki. Feedback w `components/SessionView.tsx` to pełnoekranowy overlay zasłaniający zadanie. `useNumbersSession.ts:320-337` — `correctStreak` zerowany każdym błędem + `factsTouched.size >= minFacts`. `SubitizeFlashExercise.tsx:56` używa `pattern="dice"` i zakresu 1–6, choć `DotPattern.tsx:5` umie `scattered`.

**Nowe:**
- **Struktura 5:** `TenFrame` renderuje kropki 1–5 kolorem `dotColor`, 6–10 jaśniejszym `dotColorSecond` (default: `dotColor` rozjaśniony ~25%) + 2 px separator między kolumną 5 a 6. Prop `fiveStructure?: boolean` (default `true`) do wyłączenia tam, gdzie przeszkadza (`TenFrameFill`).
- **Feedback nie zasłania:** przy `wrong`/`dontKnow` overlay staje się **półprzezroczystym pasem** (górne ~28%, alfa 0.92, `pointerEvents:'auto'`, z-index < 2000 czyli pod `PauseOverlay`, pod `StatusBar`), a zadanie pod spodem przerysowuje się na **poprawną liczbę kropek**. `correct` zostaje pełnoekranowy (nagroda, nie korekta).
- **Mastery jako okno:** `ConceptMastery` zyskuje `recentOutcomes: ('correct'|'wrong')[]` (rolling, cap 10) i `factsCorrect: string[]`. Warunek: `recentOutcomes.length ≥ 10 && correct ≥ 8` (przy `minStreakForMastery < 10` próg proporcjonalny) **i** `factsCorrect.length ≥ minFacts` **i** `ageMs ≥ MIN_AGE_FOR_MASTERY_MS`. `factsTouched` zostaje w typie do migracji, przestaje być kryterium. `numbersStore` → `version: 3`, `migrate` kopiuje `factsTouched → factsCorrect` i ustawia `recentOutcomes: []`.
- **Subitizing:** `SubitizeFlashExercise` losuje `pattern` (60% `dice`, 40% `scattered`), zakres do 10 dla `iskierka-counting-10`, `buildChoices` z `NEAR_MISS_OFFSETS`.

**Dane/audio:** bez nowych ustawień i kluczy. Przy okazji **odpalamy martwe `mastery-*`** (20 kluczy w `math-ui-strings.json`) przy przejściu konceptu na `mastered` — w `SessionEnd` Cyferek, w kolejce przed `tree-grow`.

**Brzegi:** bez `migrate` bump wersji kasuje postęp (kontrakt CLAUDE.md); koncept `mastered` nigdy nie cofa się do `learning` przez okno 8/10.

**Testy:** 7 kropek → 5 w kolorze A i 2 w B; 8/10 masteruje, 7/10 nie; 8 poprawnych po 2 błędach masteruje (dziś streak by się zerował); migracja v2→v3 zachowuje `mastered`.

---

## 16. Litery: „Trudne literki" + „Literka dnia"

**Dziś:** `modules/letters/index.tsx` ma tylko `/letters` i `/letters/session/:level`. Dane obu trybów (`recentWrong`, `box`, `lastSeenAt`) już są w `lettersStore`.

**Trudne literki** — kafelek 🔁 na `components/LevelSelect.tsx` pod czterema poziomami, route `/letters/hard` (osobny, żeby nie rozszerzać unii `Level`). Pula: litery z `totalSeen > 0` i (`recentWrong > 0` lub `box ≤ 2`), sortowane score'em SRS, cap 8; sesja = `min(8, pula.length)` pytań. Config (case/style/tiles) z najwyższego poziomu, na którym była sesja; fallback `iskierka`. Dystraktory z **pełnej** puli tego poziomu (nie tylko z trudnych). Pula < 3 → kafelek wyszarzony, tap gra `letters-hard-empty` i nie nawiguje.

**Literka dnia** — mały kafelek ✨ + litera na `app/Home.tsx` **pod** siatką 2×2 (siatka zostaje 2×2), route `/letters/daily`. Wybór: najwyższy score SRS spośród `due`, zamrożony na dobę w `lettersStore.dailyLetter: { letter, dayKey }` (`dayKey = YYYY-MM-DD` lokalnie). Przebieg 60–90 s: `letters-daily-intro` → **4 ekspozycje** tej samej litery (dystraktory kontrastywne; jedno z pytań to wariant odwrotny z A-13) → słowo-kotwica z `data/associations.ts` (obraz + audio) → `letters-daily-end` → Home. Bez `SessionEnd`, bez iskierek, bez sugestii poziomu. Wyniki idą do SRS normalnie i do `sessions` jako `SessionLog` z `level: 'daily'`. Po ukończeniu kafelek pokazuje ✔, tap gra `letters-daily-done`.

**Nowe klucze** w `ui-strings.json` (`zofia`/`edge`):
- `letters-hard-intro`: „Poćwiczymy literki, które są trudne."
- `letters-hard-empty`: „Nie ma dziś trudnych literek. Brawo!"
- `letters-daily-intro`: „Literka dnia! Posłuchaj i popatrz."
- `letters-daily-end`: „To była literka dnia. Do jutra!"
- `letters-daily-done`: „Literkę dnia już znasz. Wróć jutro."
- `home-daily-letter`: „Tu jest literka dnia — jedna literka, króciutko."

**Brzegi:** zmiana daty w trakcie mikrosesji nie przelosowuje litery; reset postępu czyści `dailyLetter`; `lettersStore` bump wersji + `migrate` + default `dailyLetter: null` w `merge`.

**Testy:** selektor pomija `totalSeen === 0` i litery z `box ≥ 3 && recentWrong === 0`; `dailyLetter` stabilny w obrębie `dayKey`, przelosowany po zmianie dnia; mikrosesja daje dokładnie 4 pytania z tą samą `targetLetter`.

---

## 17. Czytanki: mini-pytanie o rozumienie

**Dziś:** `modules/czytanki/data/types.ts` — `Czytanka` bez pola rozumienia; po przeczytaniu tylko `markOpened`.

**Schemat** (pole opcjonalne w typie, wypełnione dla wszystkich 60):
```ts
export type Comprehension = {
  question: string                             // "Kto jadł trawę?"
  options: readonly [string, string, string]   // emoji, dokładnie 3
  answer: 0 | 1 | 2
}
// Czytanka: … comprehension?: Comprehension
```

**Reguły autorskie** (treść powstaje w planie):
1. Pytanie **dosłowne** — odpowiedź wprost w tekście (kto? co? gdzie? co robi?). Bez wnioskowania, bez „dlaczego", bez przeczeń.
2. Maks. 5 słów, jedno zdanie, słownictwo z tej czytanki.
3. Poprawne emoji = rzeczownik **obecny** w tekście; dystraktory z tej samej kategorii (zwierzę/jedzenie/osoba) i **nieobecne** jako odpowiedź, ale mogą występować w scenie — scena nigdy nie może pokazywać wyłącznie poprawnej odpowiedzi (zakaz three-cueing).
4. Trzy emoji wyraźnie różne wizualnie (nie 🐕/🐩), bez wariantów koloru skóry.
5. Pozycja poprawnej odpowiedzi rozłożona równomiernie (~20 na indeks 0/1/2).

| id | question | options | answer |
|---|---|---|---|
| cz-03 | Kto ma kota? | 👩 👨 👵 | 1 |
| cz-14 | Co jadła krowa? | 🌾 🍎 🐟 | 0 |
| cz-22 | Gdzie był pies? | 🏠 🌳 🚗 | 1 |
| cz-38 | Co Ola piła? | 🥛 🧃 ☕ | 0 |
| cz-51 | Kto spał na drzewie? | 🐿️ 🐦 🐈 | 2 |

**UI:** po zakończeniu ▶ **albo** dotknięciu ≥60% sylab pojawia się przycisk ❓ (72 px). Tap → overlay `ComprehensionQuestion`: 3 emoji-kafelki 120 px, auto-play pytania, guzik 🔊 do powtórzenia. Poprawnie → 👏 + `czytanki-q-praise`, overlay znika po ~1,5 s. Źle → `czytanki-q-again`, odpada jeden zły kafelek, **zostają 2** — druga próba zawsze kończy się 👏. Bez punktów, bez SRS: w store tylko `answeredQuestionIds`, żeby ❓ pokazywało ✔.

**Audio:** nowy generowany `audio-source/czytanki-questions.json` (`_voice: agnieszka`, `_engine: azure` — zdania, więc plain SSML), produkowany przez `scripts/czytanki-audio-source.ts` (`pnpm audio:czytanki`) z pola `comprehension.question`; klucze `cz-q-01` … `cz-q-60`. W `czytanki-ui-strings.json` (agnieszka/`azure`):
- `czytanki-q-intro`: „Mam do ciebie pytanie o tę czytankę."
- `czytanki-q-praise`: „Tak! Dobrze przeczytałeś."
- `czytanki-q-again`: „Nie to. Posłuchaj jeszcze raz."

**Brzegi:** czytanka bez `comprehension` → brak ❓, zero błędu; wyjście w trakcie overlayu → `audioBus.stop()` + wyczyszczony `pendingCue`; ❓ nie zasłania ◀▶; `prefers-reduced-motion` wyłącza animację odrzucenia kafelka.

**Testy:** wszystkie 60 mają `comprehension`; `options.length === 3`, `answer ∈ {0,1,2}`, emoji unikalne w trójce; każdy indeks odpowiedzi występuje ≥15 razy; po błędzie w komponencie zostają 2 kafelki, w tym poprawny.

---

## 18. Czytanie: sprawdzian rozumienia obrazek → słowo

**Dziś:** `types.ReadingQuestion` ma 4 warianty, `LEVEL_TO_EXERCISE` wiąże 1 typ z poziomem. `data/words.ts` ma `albumEmoji` używane tylko w albumie — znaczenie nigdy nie jest testowane (scenka to nagroda po odpowiedzi).

**Nowe:** wariant `{ type: 'word-meaning'; targetWord: string; choices: string[] }` + `components/exercises/WordMeaningExercise.tsx`: duże `albumEmoji` (200 px) na środku, pod nim 4 kafelki ze **słowami pisanymi** (`WordTile`, kolor sylab). Prompt `reading-meaning-prompt`, **bez wypowiadania słowa** (inaczej to znów zadanie słuchowe).

**Wplecenie:** w Ogniku i Pochodni `generateQuestion` podmienia pytania o indeksach 2 i 5 (przy 8 pytaniach → 2–3 na sesję; przy krótszej tylko indeks 2). Target z tej samej puli SRS, liczy się do boxa normalnie. Dystraktory: 3 słowa z poziomu o **różnym** `albumEmoji` i różnej pierwszej sylabie.

**Audio** — nowy klucz w `reading-ui-strings.json` (`zofia`/`edge`):
- `reading-meaning-prompt`: „Popatrz na obrazek. Które to słowo?"

**Brzegi:** słowa o abstrakcyjnym emoji (ROSA → 💧) są niejednoznaczne → lista `NO_MEANING_WORDS` w `words.ts` (blokuje bycie targetem, nie dystraktorem); pula < 4 słowa → fallback do typu poziomu; feedback korzysta z istniejącej ścieżki drugiej próby.

**Testy:** `word-meaning` pojawia się dokładnie na zadanych indeksach i tylko w ognik/pochodnia; 4 `choices` mają różne `albumEmoji`; słowo z `NO_MEANING_WORDS` nigdy nie jest targetem.

---

## 19. Czytanki: „scal sylaby" + licznik przeczytań

**Dziś:** `SyllableButton.tsx` zawsze koloruje i rozdziela sylaby (0,15em). `czytankiStore` trzyma tylko `openedIds` — ponowne otwarcie nie zostawia śladu; `CzytankaTile.tsx` pokazuje ⭐ albo nic.

**Nowe:**
- **Przełącznik „scal sylaby"** — ikonowy przycisk 60 px obok ▶ (ikona `KO|TA` ↔ `KOTA`). Stan globalny w `settings.czytanki.mergedSyllables` (persist `iskierki-state-v1`, bump wersji + default w `merge`), żeby trzymał się między czytankami. Włączony: odstęp sylab `0`, jeden kolor (`colors.text`); obwolutka słowa **zostaje**. Tap/long-press działają identycznie — to wyłącznie warstwa wizualna.
- **Licznik przeczytań** — `czytankiStore.readCounts: Record<string, number>`, inkrementowany raz na wejście na czytankę, z guardem: kolejne wejście w ciągu <60 s nie liczy się. Kafelek: ⭐ przy 1, ⭐ + plakietka „2×"/„3×" przy ≥2 (cyfra jest czytelna dla 7-latka; wariant zapasowy — 2–3 kropki).
- Raport rodzica: w sekcji Czytanki „Przeczytane ≥2×: N" + lista tytułów.

**Nowe klucze** w `czytanki-ui-strings.json` (`agnieszka`/`azure`):
- `czytanki-ui-merge-on`: „Teraz sylaby są razem."
- `czytanki-ui-merge-off`: „Teraz widzisz sylaby osobno."

**Brzegi:** `mergedSyllables` nie dotyka kolorów w module 2 ani na Home; auto-fit (`FIT_SAFETY`) musi przeliczyć się po zmianie odstępu; `czytankiStore` → `version: 2` z `readCounts: {}` w `merge` **i** `migrate` (inaczej giną `openedIds`).

**Testy:** `markOpened` inkrementuje `readCounts`, ale nie przy powtórce <60 s; `mergeCzytankiState` daje `readCounts: {}` dla starego stanu i zachowuje `openedIds`; tryb scalony renderuje jeden kolor.

---

## 20. Czytanie: `prefers-reduced-motion`

**Dziś:** uwzględniane tylko w `IskraMascot.tsx:310`, `IskraHero.tsx:152`, `czytanki/scene.css:31`. `components/celebrations/*` (RocketBlast, ScreenFlip, RainbowRun, FallingFruits, DancingAvocado) i `WordScene.tsx` animują bezwarunkowo.

**Nowe:** `shared/ui/useReducedMotion.ts` — `matchMedia('(prefers-reduced-motion: reduce)')` + subskrypcja `change`, default `false`. `WildCelebration` przy `reduced` renderuje wariant **statyczny** (emoji + błysk tła; ta sama długość, to samo audio — nagroda zostaje, znika ruch); `WordScene` renderuje scenę bez keyframe'ów. Dodatkowo keyframes w tych plikach opakowane w `@media (prefers-reduced-motion: no-preference)` — pas i szelki, bo część animacji siedzi w CSS-in-JS.

**Audio/ustawienia:** bez zmian (audio celebracji gra dalej — to nie jest ruch).

**Testy:** hook zwraca `true` przy `matches: true` i reaguje na `change`; `WildCelebration` z `reduced` nie renderuje węzła animowanego, ale renderuje treść i woła `onDone` po tym samym czasie.

---

## Dodatki z załączników (S/M — wchodzą do tej fali)

**A-9. Czterolinia w kafelkach pisanych.** `LetterTile.tsx:78` ma lokalny `HandwrittenLetter` bez liniatury → podmienić na `@/shared/ui/HandwrittenLetter` (gotowy, proporcje 0 / 0,3 / 0,7 / 1,0), lokalny usunąć. Shared przyjmuje `size`, nie `fontSize` → `size = fontSize / 0.7`; dopisać prop `pair` (letterSpacing dla „Bb"). *Test:* kafelek pisany renderuje `<svg>` z 4 liniami, drukowany bez zmian.

**A-13. Zadanie odwrotne „widzisz literę → wybierz dźwięk".** `Question.kind: 'sound-to-letter' | 'letter-to-sound'`, wariant odwrotny co ~5. pytanie (indeksy 4, 9, …) i zawsze raz w Literce dnia. Ekran: duża litera, 3 kafelki-głośniki 🔊; tap **odtwarza** kandydata (`letter-<x>` w trybie promptu z fali 1), zatwierdza osobne ✔ pod kafelkiem. Nowy klucz `letters-reverse-prompt` w `ui-strings.json` (`zofia`/`edge`): „Widzisz literkę. Posłuchaj i wybierz, jak brzmi." *Brzegi:* odsłuch nie jest odpowiedzią; idle-timer resetuje się przy odsłuchu; feedback jak w wariancie podstawowym. *Test:* co 5. pytanie ma `kind: 'letter-to-sound'`, odsłuch nie woła `answer()`.

**C-20. `NEAR_MISS_OFFSETS` wszędzie.** Dziś tylko `DoublesExercise`, `NearDoublesExercise`, `Make10Exercise` (`utils/buildChoices.ts:25`). Dołożyć w `SubitizeFlash`, `MatchDigitDots`, `ConcreteAdd`, `ConcreteAddSubtract`, `TenFrameFill`, `SubtractMaintenance`, `CountObjects`. *Test:* dystraktory w ±3 od poprawnej, z poszanowaniem `min`/`max`.

**C-14. Odpalenie martwych `mastery-*`** — opisane w #15.

**B-7. Wygaszanie koloru sylab wraz z boxem.** `SyllableText` / `WordTile` / `SyllableFillExercise` przyjmują `box?: 1|2|3|4|5`: 1–2 → pełny kolor palety (z fali 1), 3–4 → ten sam kolor z `opacity: 0.55`, 5 → `colors.text`. Kolor jest rusztowaniem, nie formatem docelowym. *Brzeg:* album zawsze czarny. *Test:* `box: 5` → kolor tekstu, `box: 1` → kolor palety.

**B-10. Sugestia poziomu na `SessionEnd` (moduł 2).** Awans: `correctRatio ≥ 0.8` **i** średni `box` puli ≥ 3,5 → ⬆ + `reading-level-up`. Cofnięcie: `correctRatio ≤ 0.4` w **dwóch kolejnych** sesjach → ⬇ + `reading-level-down`. Sugestia niczego nie blokuje. Nowe klucze w `reading-ui-strings.json` (`zofia`/`edge`): `reading-level-up`: „Umiesz już dużo! Spróbuj trudniejszego poziomu."; `reading-level-down`: „Wróćmy na chwilę do łatwiejszego poziomu." *Test:* dwie słabe sesje → ⬇, jedna → brak sugestii.

**C-10. `dontKnow` → podpowiedź + druga próba (warunkowo).** Jeśli fala 1 objęła drugą próbą tylko `wrong`, rozszerzyć na `dontKnow`: najpierw audio strategii (`strategy-*` z fali 1), potem to samo pytanie z 2 kafelkami. Box: `dontKnow` zostaje `−1` niezależnie od wyniku poprawki. Jeśli fala 1 to pokrywa — punkt odpada.

---

## Kolejność implementacji

1. #20 + A-9 + C-20 (bez audio) → 2. #14 + #15 → 3. #13 (3 klucze) → 4. #16 (6) + A-13 (1) → 5. #18 (1) + B-7 + B-10 (2) → 6. #19 (2) → 7. #17 (63 klucze — największy blok autorski; build Azure przy F0 ~20 req/min ≈ 4 min) → 8. #12 (na końcu — agreguje efekty poprzednich).

Po każdej grupie `pnpm tsc -b` + `pnpm test --run`; po grupach z audio `pnpm audio:dry` → `audio:build` → `audio:check`.

## Decyzje (2026-08-29, po review speca)

- Fala 1 jest w tym momencie **specem**, nie kodem — fala 2 startuje po zmergowaniu fali 1; zależności (#16, A-13, B-7, C-10) realizowane w tej kolejności.
- „Literka dnia" na Home: wąski pasek pod siatką 2×2 (Home ma ~70 px zapasu w 820 px; zweryfikować w przeglądarce, w razie potrzeby zmniejszyć kafelki o 8 px).
- Licznik „przeczytana N×" na kafelku czytanki: **kropki** (●●), nie cyfra — zasada no-text.
