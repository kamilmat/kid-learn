# Iskierki — moduł 3: matematyka (cyferki, +/-, propedeutyka mnożenia)

**Data:** 2026-04-28
**Status:** zatwierdzony do implementacji (brainstorming + 3 passy researchu)
**Autor:** brainstorming session
**Poprzednie moduły:**
- [`2026-04-26-iskierki-letters-module-design.md`](./2026-04-26-iskierki-letters-module-design.md)
- [`2026-04-27-iskierki-reading-module-design.md`](./2026-04-27-iskierki-reading-module-design.md)

## 1. Wizja

Trzeci moduł platformy Iskierki — **edukacja matematyczna dla 7-latka (zerówka → 1. klasa)**. Skupia się na: liczeniu i rozpoznawaniu cyfr (1-10), rozkładzie liczby (number bonds), dodawaniu i odejmowaniu do 20 z przekraczaniem progu (Make 10 strategy + doubles + fact families) oraz **propedeutyce mnożenia** (skip counting, equal groups, arrays, repeated addition → 3×2). Pełna tabliczka mnożenia, dzielenie, ułamki — **poza zakresem** (klasa 2-3 wg polskiej podstawy MEN, badania o math anxiety przy zbyt wczesnym wkuwaniu).

Filozofia dydaktyczna: **CPA (Concrete-Pictorial-Abstract — Bruner / Singapore Math)** + **polska szkoła Edyty Gruszczyk-Kolczyńskiej** ("Dziecięca matematyka", "Edukacja matematyczna w klasie I" — kanon polskiej dydaktyki wczesnoszkolnej). Każdy nowy koncept wprowadzany przez konkret (ikony przedmiotów) → obraz (ten frame, number bond) → symbol (cyfra, równanie). Bez timera, bez wkuwania, bez gamifikacji punktowej.

**Wyróżnik na polskim rynku:** evidence-based dydaktyka (3 passy researchu: polska podstawa MEiN, NCTM, Common Core, Singapore MOE, NCETM, Eureka Math, Carol Dweck, Jo Boaler, Cowan working memory, Lepper overjustification, Klus-Stańska/Filipiak). Konkretne dyrektywy: hypercorrection feedback (Butterfield/Metcalfe), interleaving zamiast blokowania (Rohrer 2019), worked examples z fading (Renkl/Sweller), Iskra jako "competent other" (Wygotski).

## 2. Target user i kontekst

- **Główne dziecko:** 7 lat, zerówka, ma już doświadczenie tap/drag z modułu 1 i 2
- **Wiek dolny:** 5-6 lat (Iskierka = liczenie + subitizing 1-6 dostępne wcześniej)
- **Wiek górny:** 8-9 lat (Pochodnia = przygotowanie do tabliczki w kl. 2)
- **Rodzic:** kontrola ustawień przez bramę math (z modułu 1), wgląd w postępy + drzewko mistrzostwa
- **Urządzenie podstawowe:** iPad 10", RWD desktop/smartfon
- **Bez backendu, bez logowania.** Postęp w `localStorage` (osobny key od modułów 1 i 2)
- **Bez gating'u na poprzednie moduły** — Home pokazuje 3 kafelki obok siebie (Litery / Czytanie / Cyferki)

## 3. Cele dydaktyczne (na podstawie 3 researchów)

### 3.1 Polska podstawa programowa (MEiN 2017 + 2018)
- **Zerówka (wychowanie przedszkolne, IV.15):** liczenie 1-10, rozpoznawanie cyfr, porównywanie zbiorów (więcej/mniej/tyle samo), wykonywanie operacji na konkretach (dokładanie/odkładanie) jako prefiguracja dodawania/odejmowania, dostrzeganie rytmów i sekwencji
- **Klasa 1 (edukacja matematyczna):** dodawanie/odejmowanie do **20 z przekraczaniem progu**, **rozkład liczby** (7 = 5+2 = 3+4), znaki <, >, =, zadania jednodziałaniowe
- **Mnożenie** — klasa 2 (do 30), pełna tabliczka klasa 2-3 → **w naszej apce tylko propedeutyka** (skip counting, equal groups, arrays, repeated addition)

### 3.2 Evidence-based metody (konsensus badawczy)
- **CPA (Concrete-Pictorial-Abstract)** — Bruner 1966, Singapore Math, Maths No Problem; meta-analizy potwierdzają skuteczność
- **Subitizing** — Hannula-Sormunen 2015: subitizing w wieku przedszkolnym przewiduje wyniki matematyczne 7 lat później; perceptual 1-4, conceptual 5-10
- **Number bonds + ten frames** — Singapore MOE Primary 1; bezpośrednio realizują "rozkład liczby" z polskiej podstawy
- **Make 10 strategy** — White Rose Maths Y1, Eureka Math Module 1; krytyczne dla przekraczania progu dziesiątkowego
- **Doubles + near doubles** — kotwica memory dla 7-latka; **doubles wprowadzane przed Make 10** (Eureka, NCETM Mastering Number)
- **Skip counting + equal groups + arrays** — Mathnasium, Beast Academy 2A; jedyna evidence-based ścieżka do mnożenia w wieku 7 lat
- **Fact families** — Common Core 1.OA.B.4: "subtraction as unknown-addend"; Singapore MOE; odejmowanie wprowadzane razem z dodawaniem od początku
- **Interleaving > blocking** — Rohrer 2019 RCT: 61% vs 38% retencji po 1 miesiącu

### 3.3 Czego unikamy (potwierdzone badaniami)
- ❌ **Timery / testy na czas** — Boaler + Stanford 2013 (MRI): math anxiety u 1/3 dzieci, blokuje working memory
- ❌ **Wkuwanie tabliczki bez sensu liczbowego** — Boaler: high-achievers używają number sense, low-achievers tylko pamięci
- ❌ **Zabranianie palców** — APA 2025, SRCD: liczenie na palcach do końca kl.1 **poprawia** wyniki
- ❌ **Za wczesne formalne mnożenie** — bez bazy w skip counting i repeated addition staje się czystym wkuwaniem + math anxiety
- ❌ **Punkty/odznaki za każdy klik** — Lepper 1973 overjustification effect; ostrożnie z gamifikacją

### 3.4 10 zasad meta-uczenia (z trzeciego researchu)
1. Sesja **5-10 min, codziennie** (microlearning + sleep consolidation)
2. **Max 3 elementy aktywne** na ekranie (Cowan working memory 7-latka = 1.2-2.5)
3. **Każda interakcja = pytanie**, nie ekspozycja (Karpicke retrieval > re-reading)
4. **Spaced repetition rosnący**: 1d → 3d → 7d → 14d (Ebbinghaus + Leitner)
5. **Interleaving od początku** sesji, nie po opanowaniu typu (Rohrer)
6. **Worked examples → faded prompts → samodzielnie** (Renkl/Sweller; expertise reversal)
7. **Feedback po błędzie: krótki, informacyjny, bez oceny** (hypercorrection: Butterfield/Metcalfe; nigdy "źle")
8. **Pochwała za wysiłek/strategię, nigdy "mądry"** (Dweck growth mindset; rzadkie nieoczekiwane nagrody — Lepper)
9. **Dual coding: narracja głosowa + obraz, BEZ tekstu** (Mayer modality + redundancy)
10. **Drag-drop dla manipulacji konceptami liczbowymi** (Jansen 2024: drag > tap dla szacowania liczb)

## 4. Stack technologiczny

Bez zmian względem modułów 1+2:

- **React 19** + **Vite** + **TypeScript strict** + **Tailwind 4**
- **Zustand** — nowy store `numbersStore` (równoległy do `lettersStore`, `readingStore`)
- **Vitest** — testy logiki nietrywialnej (generator faktów, selektor SRS+interleaving, mastery threshold, distractor generator)
- **Edge TTS** (Python wrapper, `pnpm audio:build`) — generowanie audio
- **`react-router-dom`** — routing rozszerzony o `/numbers/*`
- **`@dnd-kit/core`** — drag-drop cyfr na ten frame / number bond / array (reuse z modułu 2)
- **Lexend** — czcionka cyfr (już mamy w `--font-block` z modułu 2; cyfry duże, czytelne, dyslexia-friendly)

## 5. Mapowanie 4 poziomów

| Poziom | Zakres | Główne koncepty |
|---|---|---|
| **Iskierka** | 1-10 (1-5 → 6-10 progres bar) | Liczenie + subitizing + cyfry + **rytm liczbowy** + **dokładanie/odkładanie konkretów** (prefiguracja, bez symbolu +) |
| **Płomyk** | do 10 | **Number bonds** + dodawanie/odejmowanie do 10 jako **fact families** (ten frame + Common Core 1.OA.B.4) |
| **Ognik** | do 20 | **Doubles → Make 10 → fact families** (kolejność ważna! Eureka/NCETM) |
| **Pochodnia** | propedeutyka × | Skip counting + repeated addition + equal groups + arrays + **commutativity (3×2 = 2×3)** + **15-20% maintenance odejmowania do 20** (interleaving) |

**Ważne dyrektywy:**
- **Bez dzielenia** (klasa 3 wg NCTM/Common Core)
- Pochodnia ma odejmowanie nie jako nowy koncept, tylko jako **interleaving maintenance** zapobiegające decay (Bjork & Bjork)
- Iskierka MA dodawanie konkretne (polska podstawa zerówki dosłownie wymaga "dokładania")

## 6. Typy ćwiczeń per poziom (4 typy każdy)

### 6.1 Iskierka (1-10 + rytmy + dokładanie konkretów)
1. **SubitizeFlashExercise** — kropki dice/scattered/ten frame przez ~2s, drag cyfry na obraz. Bez timera. Zakres 1-6 (perceptual subitizing).
2. **MatchDigitDotsExercise** — pokaz 7 kropek (ten frame), drag cyfry "7" z paska. Zakres 1-10 (conceptual subitizing).
3. **NumberRhythmExercise** — sekwencja kropek/cyfr (1,2,3,1,2,3,?), wybór następnego z 3-4 dystraktorów. Most do skip counting + krąg 2 Gruszczyk-Kolczyńskiej.
4. **ConcreteAddExercise** — "Były 3 jabłka, doszły 2, ile teraz?" Animacja pojawiania, drag cyfry wyniku. **Bez symbolu +** (prefiguracja).

### 6.2 Płomyk (do 10: number bonds + +/- + fact families)
1. **NumberBondBuilder** — całość 7 na górze, 2 puste pola, drag cyfr/kropek żeby zbudować rozkład. Po wykonaniu lektor: "Trzy i cztery to siedem!". CPA: konkret (kropki) → obraz (number bond shape) → symbol (cyfry).
2. **TenFrameFill** — 6 kropek na ten frame, "ile brakuje do 10?", drag brakujących kropek. Most do Make 10.
3. **ConcreteAddSubtract** — "5 + 2", lektor mówi, ten frame z 5 kropkami i 2 z boku, drag cyfry wyniku. Pojawia się symbol "+" i "=" (przejście do abstraction).
4. **FactFamilyTriangle** (lite) — 3 liczby w trójkącie (np. 3, 4, 7), dziecko buduje 4 równania (3+4=7, 4+3=7, 7-3=4, 7-4=3). Łączy +/- (Common Core 1.OA.B.4).

### 6.3 Ognik (do 20: doubles → Make 10 → fact families)
1. **DoublesExercise** — "6+6", 2 ten frames po 6 kropek (mirror, ten sam kolor), drag cyfry. Kotwica memory, kognitywnie najłatwiejsze.
2. **NearDoublesExercise** — "6+7" jako "6+6 + 1": animacja (2 frames po 6 + dodatkowa kropka), drag wyniku. Strategy use.
3. **Make10Exercise** — "8+5", animacja worked example: rozłóż 5 na 2+3, 8+2 wypełnia ten frame, +3 z boku, drag wyniku. Worked examples → fading.
4. **FactFamilyTriangle** (full, do 20) — trójkąt z 3 liczbami (np. 7, 9, 16), drag 4 równania. Używa znaków +, -, =.

### 6.4 Pochodnia (propedeutyka × + 15-20% maintenance odejmowania)
1. **EqualGroupsExercise** — "3 koszyki, w każdym 2 jabłka, ile razem?" Drag cyfry. Pod spodem 2+2+2=6, potem (po kilku rundach) **3×2=6** (CPA → symbol).
2. **SkipCountChase** — lektor: "2, 4, 6, ?", drag 8. Najpierw po 10, potem 5, potem 2. Po opanowaniu — po 3.
3. **ArrayMatchExercise** — array 3×4 (3 rzędy po 4), pytanie "ile razem?" + drugie pytanie commutativity "a 4 rzędy po 3?". Nauka **3×4 = 4×3**.
4. **SubtractMaintenanceExercise** (15-20% sesji) — "13-5" z ten frame, drag wyniku. Interleaving, nie nowy koncept.

## 7. Reprezentacje wizualne (3, nie więcej)

### 7.1 Ten Frame (Singapore Math standard) — reprezentacja główna
- Siatka **2 rzędy × 5 kratek** = 10
- Wypełniana kropkami od góry-lewa (konwencja Singapore)
- 11-20: **dwa ten frames** obok siebie
- Pusty: szare obwódki kratek; wypełniony: kolorowe kropki
- Number bonds: każda część innym kolorem (3 czerwone + 4 niebieskie = 7)
- Doubles: dwie połówki tym samym kolorem (mirror)
- Make 10: wypełnione kratki zielone, "wystające" pomarańczowe

### 7.2 Ikony przedmiotów (CPA "concrete" layer)
- Realne obiekty z polskiej rzeczywistości dziecka — emoji lub proste SVG: 🍎 jabłka, ⭐ gwiazdki, 🎈 baloniki, 🚗 autka, 🌸 kwiatki, 🐶 piesy
- Iskierka: dokładanie konkretów, liczenie
- Pochodnia: equal groups (koszyki/grupy z przedmiotami), arrays
- Każda grupa innym kolorem (koszyk 1: czerwony, koszyk 2: niebieski, koszyk 3: zielony)

### 7.3 Kropki dice/scattered (subitizing wczesny)
- Klasyczne układy kości (1-6) + scattered (rozproszone, dla flexibility)
- **Tylko zakres 1-6** — powyżej przechodzimy na ten frame
- Iskierka: subitize flash, rytm liczbowy

### Czego NIE używamy (świadomie):
- Numberblocks-style klocki (redundantne z ten frame)
- DragonBox Noomy (brak Singapore alignment)
- Number line (v2, dla kl.2)
- Pisanie cyfr palcem (v3 z modułem liter)

### Cyfry — typografia + kolor:
- **Lexend** (już w `--font-block`); rozmiar: min 80px głównej cyfry, 48-56px w kafelkach-odpowiedziach
- Cyfry **monochromatyczne** (`#2d2d33` na `#fef9f2`) — research nie wspiera kolorowania samych cyfr (rozprasza)
- Kropki/elementy konkretne **kolorowe** wg konwencji powyżej

## 8. Audio strategia

### 8.1 Strategia głosów (memory `project_audio_voice_consistency.md`)
- **Lektor TTS Zofia** — wszystkie instrukcje, pytania, pochwały, korekty, intros
- **Iskra TTS Marek** — easter eggs + thinking-aloud (competent other)
- **Manual override** tylko gdy konkretny TTS źle brzmi

### 8.2 Nowe pliki w `audio-source/`

```
numbers.json              # ~30 kluczy
math-ui-strings.json      # ~60-70 kluczy
iskra-reactions.json      # ROZSZERZAMY istniejący (~10 nowych math)
```

### 8.3 `numbers.json` (~30 kluczy)
- `number-0` ... `number-20` ("zero", "jeden", ..., "dwadzieścia")
- `op-plus`, `op-minus`, `op-times`, `op-equals`
- `count-2by2` ("dwa, cztery, sześć, osiem, dziesięć...")
- `count-5by5`, `count-10by10`

### 8.4 `math-ui-strings.json` (~60-70 kluczy)

**Intros per koncept (15 kluczy)** — `seenIntros` rozszerzony per koncept (nie tylko per poziom):
- Iskierka: counting, subitizing, rhythm, adding
- Płomyk: numberbond, tenframe, addsubtract, factfamily
- Ognik: doubles, neardoubles, make10, factfamily
- Pochodnia: equalgroups, skipcount, arrays, multiplication

**Pochwały (8-10 wariantów rotujących, growth-mindset Dweck):**
- `praise-effort`: "Pokombinowałeś!"
- `praise-strategy`: "Udało ci się to rozgryźć!"
- `praise-precision`: "Dokładnie tak!"
- `praise-mastery`: "Coraz lepiej!"
- `praise-think`: "Świetnie pomyślane!"
- Reuse: "Brawo!", "Super!", "Tak jest!"

**Korekty (hypercorrection Butterfield/Metcalfe, BEZ "źle"):**
- `correct-show-N` (N=0..20): "Tu było {N}!" (21 kluczy)
- `correct-bond-template`: per fakt
- `correct-make10`: "Najpierw do dziesięciu, potem reszta!"
- `try-again`: "Spróbuj jeszcze raz!"
- `try-again-soft`: "Prawie! Patrz jeszcze raz."

**Instrukcje per ćwiczenie:**
- `ask-howmany`, `ask-howmany-total`, `ask-howmany-left`, `ask-whats-next`, `ask-howmany-missing`
- `ask-build-bond`, `ask-equal-groups` (template), `ask-skip-count`

**Sesja + Drzewko Mistrzostwa:**
- `session-start-{level}` × 4
- `session-end-good`
- `tree-grow`
- `mastery-{koncept}` × ~10-15 ("Liczysz do dziesięciu!", "Znasz rozkład siódemki!", "Robisz dziesięć!")

### 8.5 `iskra-reactions.json` rozszerzenie (~10 math-specific)
- Zostają wszystkie z modułu 2 (8 easter eggs, silly z humorMode, komiczny fail)
- **Nowe math-specific:**
  - `iskra-thinking-aloud-fingers`: "Hmm... policzę na palcach: jeden, dwa, trzy..."
  - `iskra-thinking-aloud-tenframe`: "Czekaj, rozłożę na ten frame..."
  - `iskra-thinking-aloud-doubles`: "Sześć i sześć to dwanaście, więc..."
  - `iskra-skipcount-singing`: "Lubię liczyć po dwa! Dwa, cztery, sześć..." (sing-songy)
  - `iskra-bond-discovery`: "O! Number bond!"
  - `iskra-tenframe-fill`: "Pełne dziesięć!"
- Iskra "competent other" (Klus-Stańska + Wygotski) — pojawia się **rzadko** (max 1-2× per sesja, after long pause/idle), nigdy nie podpowiada, tylko **rozumuje obok**

### 8.6 Razem nowych plików: **~100 mp3**, generowane przez `pnpm audio:build` (idempotent)

## 9. Struktura projektu

```
src/modules/numbers/
├── components/
│   ├── NumbersIndex.tsx                    # entry routes (/numbers/*)
│   ├── NumbersLevelSelect.tsx              # wybór 4 poziomów + wejście do drzewka
│   ├── SessionView.tsx                     # orkiestrator widoków ćwiczeń
│   ├── exercises/
│   │   ├── SubitizeFlashExercise.tsx       # Iskierka
│   │   ├── MatchDigitDotsExercise.tsx      # Iskierka
│   │   ├── NumberRhythmExercise.tsx        # Iskierka
│   │   ├── ConcreteAddExercise.tsx         # Iskierka
│   │   ├── NumberBondBuilder.tsx           # Płomyk
│   │   ├── TenFrameFill.tsx                # Płomyk
│   │   ├── ConcreteAddSubtract.tsx         # Płomyk
│   │   ├── FactFamilyTriangle.tsx          # Płomyk + Ognik (configurable scope)
│   │   ├── DoublesExercise.tsx             # Ognik
│   │   ├── NearDoublesExercise.tsx         # Ognik
│   │   ├── Make10Exercise.tsx              # Ognik
│   │   ├── EqualGroupsExercise.tsx         # Pochodnia
│   │   ├── SkipCountChase.tsx              # Pochodnia
│   │   ├── ArrayMatchExercise.tsx          # Pochodnia
│   │   └── SubtractMaintenance.tsx         # Pochodnia (15-20%)
│   ├── representations/
│   │   ├── TenFrame.tsx                    # 2x5 grid + animacje fill
│   │   ├── DotPattern.tsx                  # dice/scattered patterns 1-6
│   │   ├── ConcreteIcons.tsx               # emoji/SVG przedmioty
│   │   ├── DigitTile.tsx                   # cyfra w kafelku (drag/drop)
│   │   └── NumberBondShape.tsx             # whole + 2 parts visual
│   ├── intros/
│   │   └── ConceptIntro.tsx                # worked example animations per concept
│   ├── MasteryTree.tsx                     # drzewko mistrzostwa konceptów
│   ├── SessionEnd.tsx                      # podsumowanie + tree growth
│   └── PauseOverlay.tsx                    # reuse z shared/ jeśli możliwe
├── data/
│   ├── concepts.ts                         # lista konceptów per poziom + mastery thresholds
│   ├── levelPools.ts                       # fakty/zadania per poziom
│   ├── facts.ts                            # arytmetyczne fakty: bonds, doubles, sums, multiplications
│   ├── rhythmPatterns.ts                   # wzorce rytmów liczbowych
│   └── concreteSets.ts                     # zestawy ikon dla equal groups
├── hooks/
│   ├── useNumbersSession.ts                # orkiestrator (analog useReadingSession)
│   ├── useDragDigit.ts                     # drag-drop cyfr (reuse @dnd-kit)
│   └── useConceptIntro.ts                  # logic worked examples gating
├── store/
│   └── numbersStore.ts                     # Zustand persist (key: iskierki-numbers-v1)
├── types.ts
└── index.tsx                               # /numbers + /numbers/session/:level + /numbers/tree
```

## 10. Routing + Home

### 10.1 Routes
- `/numbers` — index (NumbersLevelSelect + wejście do drzewka)
- `/numbers/session/:level` — sesja
- `/numbers/tree` — Drzewko Mistrzostwa (full screen)

### 10.2 Home — 3 kafelki
Update `src/app/Home.tsx` — dodać kafelek "Cyferki" obok Litery i Czytanie.
**Ikona:** stylizowane cyfry **1 2 3** (Lexend, kolorowe niebieski/czerwony/zielony — konwencja polskich elementarzy) — analogicznie do "A B C" dla Liter.

## 11. Persistence

### 11.1 Klucz: `iskierki-numbers-v1`

```ts
type NumbersState = {
  facts: Record<string, BaseItemState>;     // SRS dla każdego faktu
  concepts: Record<ConceptId, ConceptMastery>;  // drzewko mistrzostwa
  seenIntros: Set<string>;                  // worked example intros pokazane
  sessionLog: SessionEvent[];               // last N events dla raportu
}

type ConceptMastery = {
  state: 'unseen' | 'learning' | 'mastered';
  firstSeenAt: number;
  lastSeenAt: number;
  correctStreak: number;                    // do mastery threshold
}
```

### 11.2 Klucze faktów (przykłady)
- `bond-7-3-4` (number bond rozkład 7=3+4)
- `add-5-2`, `sub-7-3`
- `double-6`, `near-double-6-7`
- `make10-8-5`
- `eqgroups-3x2`, `array-3x4`
- `skip2-step3` (po 2, krok 3)
- `mult-3-2` (3×2)

### 11.3 Concept IDs (przykłady)
- `iskierka-counting-5`, `iskierka-counting-10`
- `iskierka-subitizing-6`, `iskierka-rhythm`, `iskierka-adding-concrete`
- `plomyk-bonds-5`, `plomyk-bonds-10`, `plomyk-tenframe`, `plomyk-addsub-10`, `plomyk-factfamily`
- `ognik-doubles`, `ognik-neardoubles`, `ognik-make10`, `ognik-factfamily-20`
- `pochodnia-skipcount-2`, `pochodnia-skipcount-5`, `pochodnia-skipcount-10`, `pochodnia-equalgroups`, `pochodnia-arrays`, `pochodnia-commutativity`

## 12. Settings (rozszerzenie `iskierki-state-v4`)

Dodać do istniejącego `Settings` typu (backward-compat merge w `settingsStore`):

```ts
numbers: {
  iskraThinkingAloud: boolean;              // default true
  questionCount: 6 | 8 | 10;                // default 8
  treeCelebrationsOn: boolean;              // default true
  skipCountStep: 2 | 5 | 10 | 'mixed';     // default 'mixed' (Pochodnia)
  conceptIntros: boolean;                   // default true (worked examples on/off dla wracających)
}
```

**Math gate** — niezmieniony, ten sam dla całej app (rodzic chroni przed dzieckiem).

## 13. Stats / Raport rodzica

Rozszerzenie `ReportScreen` — nowa sekcja **Matematyka** (równolegle do Liter i Czytania).

**Per koncept:** mastery state, czas opanowania, częstość błędów.
**Heatmapa faktów:** które są trudne (np. number bonds 8/9 częściej myli niż 5/6).
**Drzewko mistrzostwa** zwizualizowane także w raporcie (live snapshot tego co dziecko widzi).
**Łączny czas matematyki** + sesje per dzień (microlearning compliance check).

## 14. Drzewko Mistrzostwa Konceptów

**Wizualizacja kompetencji** (nie kolekcjonerstwo!) — zgodne z Self-Determination Theory (Deci & Ryan: kompetencja = jedna z 3 potrzeb wewnętrznych), unika overjustification (Lepper).

### 14.1 Reguły
- **Drzewko zaczyna jako mała sadzonka** 🌱
- Każdy opanowany koncept = nowy element (liść / gałąź / kwiat)
- **Nie ma "wszystkich liczb do zebrania"** — koncepty (~20) są **skończone**
- Wzrost pasywny — pojawia się na końcu sesji gdy nowy koncept przekroczył próg mastery
- Wizualizacja: drzewko z liśćmi/gałęziami/kwiatami (ciepły wizualny język, **bez punktów**)

### 14.2 Mastery threshold per koncept
- `correctStreak >= 8` (consecutive correct answers per fact w tym koncepcie)
- + minimum **3 different facts** opanowane (nie tylko jeden powtarzany)
- + `firstSeenAt` co najmniej **2 dni temu** (sleep consolidation guard)

### 14.3 Mastery audio celebration
- Jednorazowo per koncept: lektor + Iskra: "Drzewko rośnie! Opanowałeś rozkład siódemki!"
- Drzewko widoczne na końcu sesji + dostępne przez `/numbers/tree`

## 15. Engagement reuse z modułu 2

- **Wild celebrations co 8±2** (z rotacji 5 typów modułu 2 — rakieta, frukty, salto, awokado, tęcza)
- **Iskra easter eggs** (8 z modułu 2 + 6 nowych math)
- **Status bar:** licznik 💎 + 8 kropek postępu + pauza
- **Anti-cheat:** idle 20s + page visibility → auto-pauza (reuse z `shared/engagement/`)

## 16. Worked example intros (Renkl/Sweller fading)

### 16.1 Mechanizm
- Per koncept: pierwsza ekspozycja = animowany **worked example** (lektor + animacja)
- Po obejrzeniu: `seenIntros[conceptId] = true`
- Następne sesje: koncept już bez intro, dziecko od razu pyta
- **Settings.numbers.conceptIntros = false** → wyłącza intros dla wracających dzieci

### 16.2 Przykład (intro Make 10)
1. Pojawia się: "8 + 5"
2. Lektor: "Patrz! Najpierw zrób dziesięć!"
3. Animacja: ten frame z 8 kropkami; rozkład 5 → 2+3
4. Animacja: 2 kropki dolatują do ten frame (wypełnia się), zielony błysk "10!"
5. Lektor: "A teraz dodaj resztę: dziesięć i trzy to trzynaście!"
6. Pojawia się "8 + 5 = 13"
7. **Następne pytania** już bez animacji — dziecko sam, Make 10 strategy w głowie

## 17. Testing

Tylko nietrywialna logika (zgodnie z preferencją user'a, memory):

- **`facts.test.ts`** — generator faktów per poziom (kompletność, brak duplikatów)
- **`useNumbersSession.test.ts`** — selektor next fact (SRS + interleaving 80/20 dla Pochodni)
- **`mastery.test.ts`** — threshold logic (8 streak + 3 facts + 2 days)
- **`distractors.test.ts`** — generator dystraktorów dla cyfr-odpowiedzi (length matching, plausibility)

**Test w przeglądarce > unit testy** dla UI, animacji, audio sequencing.

## 18. Phasing implementacji

| Faza | Scope | Acceptance criteria |
|---|---|---|
| **1. Foundation** | store, routing, home tile, persist, audio source files (puste/szablony) | `pnpm tsc -b` ✓, `/numbers` dostępne, kafelek na home |
| **2. Iskierka** | 4 ćwiczenia + ten frame + dot pattern + concrete icons | Sesja Iskierki gra od początku do końca, 8 pytań |
| **3. Płomyk** | 4 ćwiczenia + number bond builder + ten frame fill | Sesja Płomyka gra, drag-drop cyfr działa na iPad |
| **4. Ognik** | 4 ćwiczenia + doubles + Make 10 + fact family triangle | Sesja Ognika gra, worked example intros działają |
| **5. Pochodnia** | 4 ćwiczenia + equal groups + skip count + arrays + maintenance odejmowania | Sesja Pochodni gra, interleaving 80/20 |
| **6. Mastery + Raport** | Drzewko Mistrzostwa + raport rodzica + mastery thresholds | Drzewko wizualne, mastery wskaźnik w raporcie |
| **7. Audio** | Generation pełnego seta (~100 mp3) | `pnpm audio:check` ✓, all keys mapped |
| **8. QA** | chrome-devtools-mcp full pass + iPad test | 0 console errors, drag-drop palcem działa |

## 19. Risks / Open Questions

- **Audio: ~100 nowych mp3** — czas TTS ~5-10 min na laptopie. Opt-in manual override przez `tools/recorder/`.
- **Drag-drop cyfr na ten frame** — reuse @dnd-kit z modułu 2; ważne `touch-action: none` (memory `project_dnd_kit_drag_button.md`).
- **Iskra thinking-aloud** — predefiniowane ~10 fraz, wybór losowy z fallback. **Bez TTS na żywo** (no backend).
- **Drzewko Mistrzostwa wizualizacja** — emoji 🌱→🌲 + animowane SVG leaves; alternatywnie dedicated illustration. Decyzja w fazie 6.
- **Audio assoc-* clean** — pamiętać memory `project_assoc_xjaky_abandoned.md` — żadnych "X jak Y".
- **Audio keys lowercase** — pamiętać memory `project_audio_lowercase_keys.md` — wszystkie klucze lowercase od początku.

## 20. Out of scope (świadomie pominięte)

- **Liczenie powyżej 20** (poza polską podstawą kl.1; v2 dla kl.2)
- **Pełna tabliczka mnożenia** (klasa 2-3; w naszym module tylko propedeutyka)
- **Dzielenie** (klasa 3 wg NCTM; v3 z modułem dzielenia)
- **Pisanie cyfr** (canvas tracing, palec/Apple Pencil) — v3 z modułem liter, wspólny komponent
- **Number line / oś liczbowa** — v2 dla kl.2 (decyzja po user-test)
- **Ułamki, geometria, miara, czas, pieniądze** — v3+ jako osobne moduły
- **Album cyferek** (kolekcjonerstwo) — odrzucony świadomie (Lepper overjustification); zastąpiony Drzewkiem Mistrzostwa

## 21. Spójność z poprzednimi modułami

- **Reuse `shared/`:** SRS (`BaseItemState`, Leitner), AudioBus, settings (math gate, humorMode), stats (SessionLog), engagement (idle, page visibility), ui (KidNav, IskraMascot, useTapHandler)
- **Reuse z modułu 2:** wild celebrations (5 typów), Iskra easter eggs (8 z humor toggle), drag-drop @dnd-kit, status bar pattern
- **Persist osobny:** `iskierki-numbers-v1` — reset jednego nie kasuje pozostałych modułów
- **Audio voice consistency:** Lektor TTS Zofia, Iskra TTS Marek (memory `project_audio_voice_consistency.md`)

## 22. Sources (kluczowe badania)

**Polska podstawa programowa:**
- [Rozporządzenie MEN 14.02.2017 — wychowanie przedszkolne](https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20170000356/O/D20170356.pdf)
- [Podstawa programowa I-III, OKE Łódź](https://lodz.oke.gov.pl/lodz.oke.gov.pl/wp-content/uploads/2021/12/Podstawa-programowa-edukacja-matematyczna-i-techniczna_formula-2022.pdf)

**Polska szkoła dydaktyki:**
- Gruszczyk-Kolczyńska & Zielińska, "Dziecięca matematyka"
- Klus-Stańska, "(Anty)edukacja wczesnoszkolna"
- Filipiak, "Uczenie się w klasie szkolnej w perspektywie socjokulturowej"

**Evidence-based metody (międzynarodowe):**
- Bruner 1966 — CPA approach
- [Singapore MOE Mathematics Syllabus Primary 2021](https://www.moe.gov.sg/-/media/files/primary/2021-mathematics-syllabuses.pdf)
- [Common Core Math Standards](https://www.thecorestandards.org/Math/Content/1/OA/)
- [White Rose Maths Y1 Scheme](https://whiteroseeducation.com/)
- [NCETM Mastering Number](https://www.ncetm.org.uk/maths-hubs-projects/mastering-number/)
- Hannula-Sormunen 2015 — subitizing predicts math 7 years later
- Roediger & Karpicke 2006 — retrieval practice
- Rohrer 2019 RCT — interleaving in math
- Renkl & Sweller — worked examples + fading
- Kirschner, Sweller, Clark 2006 — direct instruction > minimal guidance
- Boaler "Fluency Without Fear" — math anxiety from timed tests
- Dweck — growth mindset
- Cowan 2017 — working memory in children
- Lepper, Greene, Nisbett 1973 — overjustification effect
- Butterfield & Metcalfe 2001 — hypercorrection effect
- Mayer — multimedia learning principles
- Jansen et al. 2024 — drag > tap for number estimation in preschoolers
- APA 2025 — finger counting helps math skills

---

**Status końcowy:** Spec zatwierdzony przez user'a w sesji brainstormingu (3 passy researchu, wszystkie zmiany techniczne A-C zaakceptowane). Następny krok: implementation plan (writing-plans skill).
