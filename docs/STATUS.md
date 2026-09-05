# Iskierki — Status

**Live**: https://kamilmat.github.io/kid-learn/ (PWA, instalowalna)
**Repo**: https://github.com/kamilmat/kid-learn (public)

## Tryb „po literkach" w czytankach (2026-09-05) — ukończony

Zadanie od usera: syn zapomina, jakie literki są w sylabie — potrzebny tryb, w którym tap w sylabę wymawia jej litery pojedynczo, jak w module 1.

- **Guzik `A|B`** w rzędzie pod sceną (6. przełącznik, obok `KO|TA`), stan globalny `settings.czytanki.spellMode` (default `false`). Cue włączenia/wyłączenia: `czytanki-ui-letters-on/-off`.
- **Przebieg tapu w trybie:** literka po literce (podświetlenie grającej jednostki na `#fde047`), pauza 220 ms między literkami, 380 ms przed klamrą, na końcu cała sylaba z podświetleniem wszystkich liter. Sylaba jednoliterowa (`O`, `A`) gra raz, bez klamry.
- **Dwuznak = jedna literka** — `data/letterUnits.ts` (`splitToLetterUnits`): SZ, CZ, RZ, CH, DZ, DŹ, DŻ. `DESZCZ → D·E·SZ·CZ`, `DZIEŃ → DZ·I·E·Ń`. Miękkie „i" (NIE, CIA) zostaje osobną literką — decyzja usera.
- **Audio:** pojedyncze litery grają `letter-*` z modułu 1 (nagrania rodzica), 7 dwuznaków to nowe `cz-let-*` (Agnieszka, `azure-ipa`, teksty „szy/czy/rzy/chy/dzy/dży/dzi" — końcowe „y" jak w fonemach modułu 1). Razem **9 nowych kluczy** (7 dwuznaków + 2 cue UI).
- **Bez zmian:** long-press = całe słowo, ▶, echo, tempo, scalanie sylab, ❓, statystyki (jeden tap = jedno dotknięcie sylaby niezależnie od liczby liter). Każda inna akcja na ekranie przerywa literowanie.
- **Persist:** `iskierki-state-v1` 6 → **7** (`czytanki.spellMode`; `migrate` + default w `merge`).

### Liczby

- `pnpm tsc -b` — czysto. `pnpm test --run` — **1074/1074** (nowe: 7 testów segmentacji/kluczy + 5 testów sekwencji literowania).
- `pnpm audio:check` — **1390/1390**; `ls public/audio/*.mp3 | wc -l` = **1397** (te same 7 nadwyżkowych co wcześniej).
- `pnpm build` — OK, 1423 precache entries (16672,80 KiB).

### Sprawdzone w przeglądarce (Chrome DevTools, 1180×820 i 820×1180)

Guzik mieści się w rzędzie w obu orientacjach (w portrait z widocznym ❓ zostaje ~73 px luzu do każdej strzałki). Sekwencja `DZIE` potwierdzona w DOM: `DZ → I → E → DZ+I+E → koniec`, pliki `cz-let-dz.mp3`, `letter-i.mp3`, `letter-e.mp3`, `cz-syl-dzie.mp3` odpowiadają 206.

### Do odsłuchu przez usera

9 nowych nagrań Agnieszki: `cz-let-sz/-cz/-rz/-ch/-dz/-dz-/-dz_` + `czytanki-ui-letters-on/-off`. Najbardziej ryzykowne: **`cz-let-dz_`** („dzi" — dźwięk nieużywany w żadnej czytance) i **`cz-let-ch`** (IPA `xˈɨ`). Zły klucz → `audio-source/pronunciation-overrides.json` + `pnpm audio:build`. Gdybyś wolał własny głos także dla dwuznaków, wystarczy wrzucić `audio-source/manual-overrides/cz-let-sz.mp3` itd. — override wygrywa nad TTS bez zmiany kodu.

### Znane, niezałatane

- `src/modules/reading/hooks/useReadingSession.meaning.test.ts` („ognik: pytanie na indeksie 2…") jest **flaky** — losowanie dystraktorów czasem daje dwa słowa o tej samej pierwszej sylabie. Wywrócił się raz na ~5 przebiegów, niezależnie od tej zmiany (moduł 2). Do naprawy przy okazji dotykania generatora.

## Fala 2 (2026-08-29) — ukończona (branch `feat/fala-2`, tip `1a25b8b`)

Spec: `docs/superpowers/specs/2026-08-29-fala-2-dydaktyka-design.md`. Plan: `docs/superpowers/plans/2026-08-29-fala-2-dydaktyka.md`.
Ledger tasków (briefy + raporty + review): `.superpowers/sdd/2026-08-29-fala-2-dydaktyka/`.
16 tasków, subagent-driven (worktree'e równoległe, review po każdym, fix-roundy: T4, T9, T10, T12, T14, T15).
Punkt powrotu sprzed fali: tag `v4.1-fala-1` (Fala 1), `v4.0-po-cr` (przed falami).

**Cel:** dołożyć **akt liczenia** (zamiast samego rozpoznawania liczebności), **rozumienie** (zamiast samego dekodowania) i **pętlę rodzica z jedną akcją**.

### Co wdrożone — per moduł

**Litery (moduł 1)**
- **Czterolinia w kafelkach pisanych** (A-9) — lokalny `HandwrittenLetter` z `LetterTile` zastąpiony przez `@/shared/ui/HandwrittenLetter` (SVG, 4 linie, `size = fontSize / 0.7`), nowy prop `pair` (letterSpacing dla „Bb").
- **Wariant odwrotny „widzisz literę → wybierz dźwięk"** (A-13) — `Question.kind: 'sound-to-letter' | 'letter-to-sound'`, co 5. pytanie (`reverseEvery`, default 5, `0` wyłącza) + `forceReverseIndices`. `ReverseQuizCard`: wielka litera + 3 kafelki 🔊 (odsłuch) z osobnym ✔ pod każdym. Prompt `letters-reverse-prompt` nie zdradza dźwięku.
- **„Trudne literki"** — route `/letters/hard` + kafelek 🔁 na `LevelSelect`. Pula: `totalSeen > 0 && (recentWrong > 0 || box ≤ 2)`, sort po `scoreItem`, cap 8; sesja = `min(8, pula)`. Config (case/style/tiles) z najwyższego poziomu z historii, fallback `iskierka`. Dystraktory z pełnej puli poziomu. Pula < 3 → kafelek wyszarzony + `letters-hard-empty`, wejście z URL-a redirectuje.
- **„Literka dnia"** — route `/letters/daily` + pasek pod siatką 2×2 na Home. Litera zamrożona na dobę (`lettersStore.dailyLetter: { letter, dayKey }`, doba lokalna). Przebieg: `letters-daily-intro` → 4 ekspozycje (w tym jedna odwrotna, `forceReverseIndices: [1]`) → kotwica słowna z `associations.ts` → `letters-daily-end` → Home. Bez `SessionEnd`, bez sugestii poziomu. Po ukończeniu ✔ + `letters-daily-done`.

**Czytanie (moduł 2)**
- **Dystraktory kontrastywne dla sylab** (#14) — `data/contrastiveSyllables.ts` (mapa symetryczna: samogłoska / dźwięczność / miejsce artykulacji, tylko na 24 sylabach z `syllables.ts`); `generateSyllableMatch` woła `pickDistractors(..., useShapeGroups: false)` z fallbackiem na `pickRandomDistinct` przy puli < 4.
- **Wygaszanie koloru sylab wraz z boxem** (B-7) — `syllableColorForBox(index, box)` w `shared/ui/syllableColors.ts`: box 1-2 → pełny kolor + podkreślenie, 3-4 → `opacity: 0.55`, 5 → `colors.text` bez podkreślenia. Kolor to rusztowanie, nie format docelowy. Album zawsze czarny.
- **Sprawdzian rozumienia obrazek → słowo** (#18) — wariant `word-meaning` + `WordMeaningExercise` (emoji 200 px, 4 `WordTile`). Ognik/Pochodnia, pytania o indeksach **2 i 5**. Prompt `reading-meaning-prompt` nie wypowiada słowa. `NO_MEANING_WORDS` (16 pozycji) blokuje bycie targetem.
- **Sugestia poziomu na `SessionEnd`** (B-10) — ⬆ przy `correctRatio ≥ 0.8` **i** średnim `box` puli ≥ 3,5; ⬇ przy `correctRatio ≤ 0.4` w dwóch kolejnych sesjach tego poziomu. Sugestia niczego nie blokuje.
- **`prefers-reduced-motion`** (#20) — `shared/ui/useReducedMotion.ts`; `WildCelebration` renderuje wariant statyczny (to samo audio, ta sama długość, `onComplete` po `durationMs`), `WordScene` bez keyframe'ów; keyframes w `celebrations/*` dodatkowo w `@media (prefers-reduced-motion: no-preference)`.

**Cyferki (moduł 3)**
- **`CountObjectsExercise` — liczenie 1:1** (#13) — trzy fazy `counting → cardinality → recount`. N emoji na siatce 110×130 px (≥96 px między środkami, kolejność slotów losowa), tap → trwały znacznik + `number-<k>`; po ostatnim `count-objects-howmany` + 4 kafelki (`buildChoices` z `NEAR_MISS_OFFSETS`). Do SRS idzie **wyłącznie** odpowiedź o kardynalność. Router: oba koncepty liczenia co drugie pytanie (parzystość `questionIdx`).
- **Struktura 5 w `TenFrame`** (#15) — kropki 6-10 w jaśniejszym odcieniu (`dotColorSecond`, default `lighten(dotColor, 0.25)`) + separator; `fiveStructure` (default `true`), wyłączone w `TenFrameFill`.
- **Feedback nie zasłania zadania** (#15) — przy `wrong`/`dontKnow` overlay to **pas 28% w przepływie** (`position: relative`, `zIndex: 900`) + przezroczysty scrim `zIndex: 899` pochłaniający tapy; zadanie pod spodem przerysowuje się na poprawną liczbę (`revealValue` → `SubitizeFlash`, `TenFrameFill`). `correct` zostaje pełnoekranowy.
- **Mastery jako okno 8/10** (#15) — `recentOutcomes` (cap 10) + `factsCorrect`; `factsTouched` zdegradowane do pola migracyjnego. `dontKnow` liczy się jak błąd. Mastery nie cofa się.
- **`NEAR_MISS_OFFSETS` wszędzie** (C-20) — dołożone w `MatchDigitDots`, `ConcreteAdd`, `ConcreteAddSubtract`, `TenFrameFill`, `SubitizeFlash`, `CountObjects`.
- **Odpalenie martwych `mastery-*`** (C-14) — `data/masteryAudio.ts` mapuje 20 `ConceptId` → 19 kluczy; grane w `persistResults` przed `tree-grow`.

**Czytanki (moduł 4)**
- **Mini-pytanie o rozumienie** (#17) — `Comprehension { question, options: [3× emoji], answer }` w 59 z 60 czytanek. ❓ (72 px) widoczne po zakończeniu ▶ **albo** dotknięciu ≥60% sylab. Overlay `ComprehensionQuestion` (`zIndex: 1500`, pod `PauseOverlay`): auto-play `czytanki-q-intro` + `cz-q-NN`, 🔊 do powtórzenia, ✋ do wyjścia. Poprawnie → 👏 + `czytanki-q-praise`; źle → `czytanki-q-again` + powtórka pytania, zły kafelek znika (zostają 2). Druga pomyłka → `czytanki-q-miss` + krótkie podświetlenie poprawnego, bez ✔. Bez punktów i SRS — `answeredQuestionIds` dla ✔ (tylko trafione za 1./2. razem) + `comprehensionResults: Record<id,'first'|'second'|'miss'>` → raport rodzica („Pytania o rozumienie: X za 1. razem, Y za 2., Z nietrafione") i eksport MD. ✋ (`czytanki-q-close`) widoczne także w trakcie pochwały.
- **„Scal sylaby"** (#19) — przycisk `KO|TA` ↔ `KOTA` obok ▶; `settings.czytanki.mergedSyllables` (globalne). Scalone: odstęp 0, jeden kolor, bez podkreśleń; obwolutka słowa zostaje, tap/long-press bez zmian. Auto-fit przelicza się po zmianie trybu.
- **Licznik przeczytań** (#19) — `readCounts` + `lastCountedAt` z guardem 60 s; od CR fali zaliczane przez `markRead` dopiero z tym samym dowodem co ❓ (▶ do końca albo ≥60% sylab), `markOpened` na mouncie ustawia tylko `openedIds` (`timeMs` liczy się od mountu). Kafelek: ⭐ przy 1, ⭐ + 2-3 kropki przy ≥2 (kropki, nie cyfra — zasada no-text). Raport: „Przeczytane ≥2×: N" + lista tytułów, także w eksporcie MD.

**Raport rodzica** (#12)
- `NextStepCard` na samej górze: jedno zdanie akcji + linijka „dlaczego"; zawsze dokładnie jedna sugestia (fallback gdy brak danych).
- `shared/stats/suggestions.ts` — `generateSuggestions` po wszystkich modułach: `no-activity` (6) > `module-cold` (5) > `hard-items` (4) > `concept-stuck` (3) > `reread` (2) > `two-sessions` (1). Najwyższy priorytet → karta, reszta → „Więcej sugestii".
- `CollapsibleSection` — wszystkie 8 sekcji **zwinięte domyślnie**, nagłówek ≥44 px z `aria-expanded` i jednolinijkowym podsumowaniem. Stan w `useState`, nie w persist.
- `antiCheatFlagText(type)` — flagi po ludzku („Klika bardzo szybko, prawie bez patrzenia…") zamiast żargonu; ten sam tekst w UI i w eksporcie MD.
- `exportReportToMarkdown` dostał `## Następny krok` na początku (kontrakt: treść UI ≡ markdown).

### Migracje persist (WSZYSTKIE cztery bumpnięte w tej fali)

| store | klucz | było → jest | nowe pola |
|---|---|---|---|
| `settingsStore` | `iskierki-state-v1` | 5 → **6** | `czytanki.mergedSyllables`; `migrate` v5→v6 mapuje `promptMode: 'both'` → `'phoneme'` |
| `lettersStore` | `iskierki-letters-v1` | 1 → **2** | `dailyLetter: { letter, dayKey } \| null`, `dailyDoneDayKey` |
| `numbersStore` | `iskierki-numbers-v1` | 2 → **3** | `factsCorrect` (kopiowane z `factsTouched`), `recentOutcomes: []` |
| `czytankiStore` | `iskierki-czytanki-v1` | 2 → **3** | `readCounts`, `lastCountedAt`, `answeredQuestionIds` |

`readingStore` bez zmian (`version: 1`). Każdy store ma `migrate` **i** default w `merge` — bez obu bump kasuje postęp.

### Liczby po implementacji

- `pnpm tsc -b` — czysto.
- `pnpm vitest run --dir src` — **943/943** zielone (po CR fali).
- `pnpm test --run` — **1062/1062** zielone (943 src + 119 scripts). `vitest.config.ts` wyklucza teraz `**/.claude/**` (bez tego zbierał testy ze starych worktree'ów agentów).
- `pnpm build` — OK, `669 kB` JS, 1411 precache entries (16491,43 KiB).
- `pnpm audio:check` — **1380/1380** kluczy źródłowych (po CR: +`czytanki-q-miss`, `czytanki-q-close`). `ls public/audio/*.mp3 | wc -l` = **1387** (te same 7 nadwyżkowych co po Fali 1: `correction-prefix` używany w runtime + 6 osieroconych).
- **+77 nowych kluczy audio**: 59 `cz-q-*` (Agnieszka/azure, generowane) + 3 `czytanki-q-*` + 2 `czytanki-ui-merge-*` (Agnieszka/azure) + 6 liter (`letters-hard-intro/-empty`, `letters-daily-intro/-end/-done`, `home-daily-letter`) + 1 `letters-reverse-prompt` + 2 `reading-level-up/-down` + 1 `reading-meaning-prompt` + 3 `count-objects-*` (Zofia/edge).

### CR całej fali (3 obszary, po T16) — poprawione

- **Litery:** biały ekran w Trudnych literkach/Literce dnia (50 sesji `hard`/`daily` wypychało poziomowe z historii → `configLevelForHard` spadał na Iskierkę, `targetPool` z Pochodni bez przecięcia z `activeLetters` → `pickNextItem` rzucał). Teraz `targetPool ∩ activeLetters` (fallback: cała pula), `configLevelForHard(sessions, lastUsedLevel)`, zamrożona `dailyLetter` walidowana względem puli, `src/app/ErrorBoundary.tsx` (↻/🏠, bez tekstu) wokół `Routes`. Wariant odwrotny: dźwięk celu pomijany TYLKO gdy faktycznie będzie retry (`willRetry`), nie przy `attempt 2`/`dontKnow`/`timeout`. ⬅ z Literki dnia = 🏠. Pasek Literki dnia na Home przelicza `dayKey` co 60 s + na `visibilitychange`/`focus`.
- **Czytanie:** `previousRatios` w sugestii poziomu pomija `attempt: 2` (wcześniej ⬇ było praktycznie nieosiągalne przy włączonej drugiej próbie).
- **Czytanki:** ⭐/`readCounts` za dowód przeczytania, nie za wejście; druga pomyłka w ❓ nie jest chwalona; `comprehensionResults` w raporcie.
- **Cyferki:** odliczanie recountu w `count-objects` gaśnie po pauzie/🤷 (prop `active`); pas korekty 28% w przepływie tylko dla ćwiczeń z reveal (`subitize-flash`, `ten-frame-fill`), reszta ma pełnoekranowy overlay + scrim; `restrictChoicesTo` trzymane też w `feedback` po 2. próbie (kafelki nie skaczą 2→4).
- **Raport:** `stuck-concept` wymaga `lastSeenAt` ≤14 dni i ≥5 ostatnich wyników z <50% poprawnych; memoizacja flag.
- **Odłożone z CR:** czterolinia w `ReverseQuizCard` (litera-cel gołym spanem), pomiar wysokości Home na iPadzie w landscape (arytmetyka na styk, ~6-10 px), `revealValue` dla ćwiczeń konkretnych (dziś tylko 2 z 15).

### Odstępstwa od speca / planu (świadome, zaakceptowane w review)

- **Próg mastery = 8/10, nie 7/10.** Wzór z planu `ceil((minStreakForMastery / 10) * 8)` przy realnym `minStreakForMastery: 8` dawał 7/10, sprzecznie z testami („7 poprawnych → learning"). Zastosowano `min(10, max(1, minStreakForMastery))` — czytamy próg jako „tyle poprawnych z ostatnich dziesięciu".
- **Miękkie odblokowanie prerekwizytu = 40%** — `ceil(minStreakForMastery / 2)` spełniane ALBO przez `correctStreak`, ALBO przez liczbę poprawnych w oknie (przy domyślnych 8 → 4/10). Decyzja produktowa: skoro mastery nie wymaga już serii, sam streak przestał być wiarygodną miarą postępu; bez tego dziecko z 6/10 poprawnych bez serii utknęłoby na koncepcie wejściowym.
- **Separator piątki w `TenFrame` jest poziomy, nie pionowy** — ramka to 5 kolumn × 2 rzędy, więc pierwsza piątka to GÓRNY rząd; pionowa kreska w komórce 5 nie oznaczałaby niczego.
- **`iskierka-counting-10` routuje na `match-digit-dots`**, więc gałąź `maxN = 10` w `SubitizeFlashExercise` jest dziś nieosiągalna — zostawiona jako gotowość na zmianę routingu.
- **`LEVEL_LABEL` NIE zostało poszerzone o `hard`/`daily`** — zostaje `Record<Level, string>` (indeksuje UI ustawień, `ActiveLettersEditor`, `exporter`); rozszerzenie żyje lokalnie jako `SESSION_MODE_LABEL` w `LiveSessionSection.tsx`.
- **`SyllableButton` dostał flagę `merged`, nie `color` + `underline`** — po Fali 1 komponent bierze `cue: SyllableCue`, a `SyllableUnderline` to unia bez `'none'`; rozszerzanie jej wykraczało poza zakres. Kontrakt wizualny identyczny.
- **⭐ na kafelku czytanki pokazuje się przy `opened || readCount ≥ 1`** — po migracji v2→v3 `openedIds` są pełne, a `readCounts` puste; sam `readCount ≥ 1` skasowałby gwiazdki na wszystkich przeczytanych.
- **Przykłady pytań ze speca #17 przeniesione do innych czytanek** — treść przykładów nie zgadzała się z faktycznymi tekstami (`cz-03` to balony, `cz-14` to kot, `cz-22` to koń, przykład `cz-22` był wewnętrznie sprzeczny). Reguła „odpowiedź stoi wprost w tekście" jest wiążąca, więc pytania trafiły do `cz-01`/`cz-16`/`cz-38`/`cz-46`/`cz-51`.
- **`cz-12` („Pada i pada.") świadomie BEZ pytania** — zdanie nie zawiera żadnego rzeczownika, więc literalne pytanie jest niemożliwe. Stąd **59 pytań, nie 60**. Alternatywa (zmiana `sentences`) odrzucona — inne taski fali stoją na tych danych. Do decyzji usera.
- **Zakaz three-cueing egzekwowany jako „≥1 dystraktor widoczny w scenie"** — dosłowna reguła jest niewykonalna przy scenach z 2-4 aktorami jednej kategorii. Test `comprehension.test.ts` pilnuje wersji wykonalnej; 0 naruszeń po fix-roundzie T14.
- **Brak kroku syntezy (`playBlend`) po `word-meaning`** — to zadanie o znaczenie, nie o dekodowanie. `playCorrectionAudio` nadal gra `word-<target>` przy błędzie (feedback, nie prompt).
- **`NO_MEANING_WORDS` rozszerzone z 7 do 16** — doszły m.in. `AUTO` + `SAMOCHÓD` (🚗/🚙 to ten sam desygnat, a filtr `albumEmoji !== target.albumEmoji` ich nie rozdziela → pytanie z dwiema poprawnymi odpowiedziami).
- **`no-activity` NIE odpala się, gdy dziś była sesja** — brief przewidywał inaczej, ale karta „Wróćcie do nauki" dziecku, które właśnie ćwiczyło, byłaby błędem. Reguła liczy dni od OSTATNIEJ sesji.
- **Box 5 bez podkreślenia** — celowe wygaszenie rusztowania (jak album), nie przeoczenie.
- **Wyjście przez pauzę → „Zakończ" w „Literce dnia" liczy dobę jako zrobioną** — `quit()` idzie tą samą ścieżką co normalny koniec. Świadome uproszczenie.

### Odłożone drobiazgi (deferred, poza zakresem Fali 2)

- **Dev-only podwójne cue w StrictMode** — `reading-level-up`/`reading-level-down` i `session-stop-enough` w `reading/SessionEnd` nie mają guardu `playedRef` (jak istniejący `level-up-suggest`). Tylko w dev, kosmetyczne.
- **`phon-*` (32 klucze Azure, moduł 1) nie grają** — hotfix `90b7e90` ustawił domyślny tryb promptu na `phoneme` = nagrania rodzica `letter-*`. Pliki i źródło zostają w repo na wypadek powrotu do fonemów. **Dług z Fali 1 („usuń klucze `letter-*`") jest tym samym zamknięty w drugą stronę: `letters.json` NIE jest martwe.**
- **Brak dedykowanego `mastery-ognik-factfamily-20`** — koncept dzieli klucz z `plomyk-factfamily`.
- **Podwójna prezentacja litery w wariancie odwrotnym** (pytanie + feedback) — do oceny na iPadzie, czy nie nudzi.
- **`CountObjectsExercise` nie powtarza promptu po `resume`** — wymagałoby haka na `resume` w `useNumbersSession`, czyli zmiany zachowania wszystkich 16 ćwiczeń. Dziecko ma 🔊 w `StatusBar`.
- **Board `CountObjects` ma stałą szerokość 900 px** (`max-width: 100%`, ale absolutnie pozycjonowane obiekty się nie skalują) — może wyjść poza kadr na telefonie w portrait. Wzorzec zgodny z resztą modułu.
- **`Question.kind` jest wymagane** — `QuizCard.test.tsx` konstruuje literał bez tego pola; testy nie są typecheckowane (`.test.ts*` poza `tsconfig.app.json`), więc przechodzi. Do uzupełnienia gdyby ktoś włączył typecheck testów.
- **`module-cold` może wyemitować kilka pozycji** (po jednej na zimny moduł), wszystkie z `priority: 5` i tym samym `id` — sortowanie stabilne, kolejność deterministyczna.

### Do odsłuchu przez usera (agent nie ma wyjścia audio)

64 nowe nagrania Agnieszki (Azure — 59 `cz-q-*`, 3 `czytanki-q-*`, 2 `czytanki-ui-merge-*`) nie były odsłuchane. Priorytet: **`cz-q-60`** („Wielki Wóz" — nazwa własna), **`cz-q-47`** („na ścieżce"), **`cz-q-54`** („długą trąbę"). Zły klucz → `audio-source/pronunciation-overrides.json` (`{"text": "…"}`) + `pnpm audio:build` (regeneruje tylko zmieniony klucz).

### Do sprawdzenia w przeglądarce / na iPadzie (runda wizualna NIE wykonana)

Agenci nie mieli dostępu do GUI; poniższe przeszło tylko testy jednostkowe i rachunek na sucho:
- **T4 (Cyferki)** — czy pas 28% nie zasłania górnej części zadania w najgęstszych ćwiczeniach (Make10 z dwiema ramkami); czy `PauseOverlay` faktycznie kryje pas; czytelność dwóch odcieni kropek przy `size={36}`.
- **T2 (Litery)** — czterolinia w kafelku 120 px, para „Bb" bez zlepienia (`styleMode: tylko-pisane`).
- **T9 (Home)** — wysokość zmierzona w Chrome (**813,7 px** w 1180×820, pasek kosztował ~92 px, zostało ~6 px luzu), ale sam przebieg mikrosesji nie. Kolejny element na Home wymaga realnego cięcia kafelków.
- **T10 (wariant odwrotny)** — layout `ReverseQuizCard` w 1180×820 (rachunek się mieści, przeglądarka nie sprawdzona).
- **T12 (`CountObjects`)** — board 900×400 + rząd kafelków 88 px; portrait telefonu.
- **T14 (❓ w czytankach)** — rząd 🗣 ▶ 🐢 KO|TA ❓ (~376 px) vs absolutnie pozycjonowane ◀ ▶.
- **T15 (`/report`)** — karta na górze, sekcje zwinięte, przejście przez math gate.
- **`prefers-reduced-motion: reduce`** — celebracje statyczne w module 2 i w overlayu ❓.

## Fala 1 (2026-08-29/30) — ukończona

**Zmergowane do `main` i wdrożone** (2026-08-30); tag `v4.1-fala-1`. Punkt powrotu sprzed fali: `v4.0-po-cr`.
Spec: `docs/superpowers/specs/2026-08-29-fala-1-dydaktyka-design.md`. Plan: `docs/superpowers/plans/2026-08-29-fala-1-dydaktyka.md`.
14 tasków, subagent-driven (worktree'e równoległe + review po każdym + fix-roundy + reconcile po konfliktach mergowania).

**Cel:** domknąć lukę z researchu — uczymy rozpoznawania, za mało produkcji i strategii.

### Co wdrożone (11 pozycji speca)

1. **Czyste fonemy liter + tryb promptu** — `phon-<litera>` (azure-ipa, ciągłe wydłużone `ː`, zwarte bez przedłużenia) + `letter-name-<litera>` (azure, nazwy szkolne „be"/„ce"); `settings.letters.promptMode: 'phoneme'|'name'|'both'` (default `both`, kolejność nazwa→fonem), override per poziom.
2. **Krok syntezy „MA + MA = MAMA"** (Czytanie) — po każdym pytaniu słownym sylaby po kolei + całe słowo, `FeedbackOverlay` podświetla aktualną sylabę; `pnpm audio:reading` dogenerował 65 brakujących sylab (91 kluczy razem) z sumy `SYLLABLE_TEXTS` ∪ sylab `ALL_WORDS`.
3. **Druga próba po błędzie** (Litery/Czytanie/Cyferki) — wspólny kontrakt: SRS aktualizowany od razu na pierwszą pomyłkę; status `retry` z 2 opcjami (poprawna + wybrana); wynik `attempt: 2` nie dotyka SRS ani statystyk correct/wrong. Wyłączone tam, gdzie odpowiedź nie jest wyborem z listy (`word-assembly`, `number-bond-builder`, `fact-family-triangle`). `settings.secondAttempt` (default `true`).
4. **Wypowiadanie liczb zadania** (Cyferki) — `promptAudioKeys(question)` gra `number-a op-X number-b ask-*` zamiast jednego generycznego klucza; ożywiło 29 martwych kluczy `number-*`/`op-*`.
5. **Wagi konceptów + `prerequisites`** (Cyferki) — dwustopniowe losowanie: koncept ważony stanem (`pickConcept.ts`), potem fakt w obrębie konceptu. **Ruling ponad spec**: miękkie odblokowanie (prereq spełniony też przy `learning` ze streakiem ≥ połowa progu mastery, nie tylko `mastered`) + peek-ahead (waga 0.2 gdy pula faktów <8) + family remap (prerekwizyt wycięty ustawieniem `skipCountStep` zastępowany rodzeństwem) — bez tego Płomyk startowałby z 2 faktami na 2 doby.
6. **Audio strategii po błędzie** (Cyferki) — `strategy-count-on/-make10/-doubles/-near-doubles/-count-back`, max 2× na sesję, po drugiej próbie.
7. **Czytanki: echo + tempo** — 🗣 (pauza 2,5s po zdaniu, tap = skip) i 🐢 (`playbackRate` 0.75, `AudioBus.setPlaybackRate` przypisywany w `playOne` przy każdym klipie). `settings.czytanki.{echoMode, tempo}`.
8. **Stopping cue + jedna kontrolka długości sesji** — `settings.questionsPerSession: 5|8|12` (globalne, default 8, `sessionLength` usunięte); `session-stop-enough` gra na każdym `SessionEnd` gdy `todaySessions.ts` naliczy ≥2 sesje dziś (dowolny moduł) — wtedy 🏠 staje się głównym przyciskiem.
9. **Czytanki: licznik tapów i czas → raport** — `czytankiStore` v2 (`wordTaps`, `timeMs`), `CzytankiStats` dostaje „Najczęściej dotykane" (top 5) + łączny czas; eksport MD rozszerzony.
10. **Pochwały procesowe** — `praise-proc-*` (Litery 10, Czytanie 6, Cyferki 6), `pickPraiseMixed.ts` losuje 50/50 między listą procesową i wynikową, potem no-repeat wewnątrz wybranej.
11. **Paleta sylab bezpieczna dla daltonistów** — Okabe–Ito (`#0072B2`/`#B35900`/`#009E73`/`#CC79A7`, pomarańcz przyciemniony dla kontrastu ≥3:1) + `getSyllableCue` z niezależnym stylem podkreślenia (kolor nigdy jedynym nośnikiem granicy sylaby).

### Liczby po implementacji (2026-08-30)

- `pnpm tsc -b` — czysto.
- `pnpm vitest run --dir src` — **759/759** zielone (94 pliki).
- `pnpm vitest run --dir scripts` — **119/119** zielone (4 pliki).
- **Razem 878/878** (baseline przed Falą 1: 746).
- `pnpm build` — OK, `615.25 kB` JS (gzip `173.86 kB`), 1334 precache entries (15094.16 KiB) — rośnie głównie audio.
- `pnpm audio:check` — **1301/1301** kluczy źródłowych na miejscu. `ls public/audio/*.mp3 | wc -l` = **1308**: 7 nadwyżka: `correction-prefix` jest UŻYWANY w runtime (`useReadingSession` drag-drop SFX) bez wpisu w audio-source — dodać klucz źródłowy; osierocone: `feedback-correct-suffix`, `feedback-wrong-prefix`, `still-there`, `summary-intro`, `timeout-1`, `timeout-2`) — nie w żadnym `audio-source/*.json`, kandydaci do sprzątnięcia, nieusunięte (poza zakresem Taska 14).

### Do odsłuchu przez usera (Task 2 — nie zrobione, agent nie ma wyjścia audio)

`ffprobe` potwierdził, że żaden `phon-*` nie jest ciszą/plikiem zerowym (0,25–0,47 s), ale nie wyklucza trzasku/artefaktu/złej barwy. Priorytety:

1. **Zwarte/afrykaty** (ryzyko: Azure renderuje izolowaną zwartą jako cisza/trzask): `phon-b`, `phon-p`, `phon-t`, `phon-k`, `phon-d`, `phon-g`, `phon-c`, `phon-c_`
2. **Ciągłe wydłużone `ː`** (ryzyko: nienaturalne „mmmm"): `phon-s`, `phon-r`, `phon-l_`, `phon-f`, `phon-h`, `phon-j`, `phon-l`, `phon-m`, `phon-n`, `phon-n_`, `phon-s_`, `phon-w`, `phon-z`, `phon-z_`, `phon-z-`
3. **Nazwy liter** (ryzyko: Azure czyta ortografię zamiast nazwy): `letter-name-a_` (ą), `letter-name-e_` (ę), `letter-name-o_` („u otwarte" — czy nie rozjeżdża się na 2 słowa), `letter-name-z_` (ziet), `letter-name-z-` (żet), `letter-name-l_` (eł), `letter-name-g` (gie), `letter-name-c_` (cie)
4. **Nowe sylaby złożone** (pierwszy raz przez `polishG2p`): `syl-dz_wiedz_`, `syl-s_liw`, `syl-nia_dz`, `syl-ge_s_`, `syl-ksie_`, `syl-chl_o`, `syl-czap`, `syl-musz`, `syl-tek`

Zły klucz → `audio-source/pronunciation-overrides.json` (`{"ipa":…}` albo `{"text":…}`) + `pnpm audio:build`. Jeśli zwarta dalej wychodzi jako cisza → plan B `audio-source/manual-overrides/phon-<slug>.mp3` (istniejący mechanizm, wygrywa nad TTS).

### Otwarte ryzyka

- **Izolowane zwarte w Azure** — to jedyne ryzyko ze speca, które mogłoby wywrócić pozycję #1 (fonemy liter); dopóki odsłuch nie zrobiony, traktować `phon-b/p/t/k/d/g/c/c_` jako niezweryfikowane.
- **Diakrytyki w nazwach plików** (`phon-a_.mp3`, `syl-ge_s_.mp3` — slugPl unika ich w nazwie, ale historyczne `letter-ą.mp3` nadal istnieje) — sprawdzić 404 w Network po deployu na GH Pages (Linux, case+encoding-sensitive; lokalnie macOS maskuje).
- **Wydłużenie sesji** — tryb `both` (nazwa+fonem), synteza sylab, retry i strategia razem mogą wydłużyć sesję o 1-2 min; częściowo skompensowane obniżeniem domyślnego `questionsPerSession` do 8. Zmierzyć realny czas na iPadzie.

### Odłożone drobiazgi (deferred, poza zakresem Fali 1)

- **Migracja `word-*` na `slugPl`** (moduł 2, ~12-16 kluczy z diakrytykami: `word-gęś`, `word-niedźwiedź`, `word-chłopiec`, `word-księżyc`, `word-ogórek`, `word-sałata`, `word-pieniądz`, `word-ziemniak`, `word-czwartek`, `word-żaba`…) — zgłoszone w Task 1, powtórzone w Task 2 i Task 11; wymaga git mv + przepisanie manifestu, osobny task.
- **Dev-only podwójne cue w StrictMode** (retry-flow, analogicznie do istniejącego `level-up-suggest`) — kosmetyczny, tylko w dev.
- **Nazwa stałej `SESSION_LENGTH_OPTIONS`** (`shared/settings/components/SettingsScreen.tsx:185`, wartości `[5, 8, 12]`) nieaktualna — steruje teraz globalnym `questionsPerSession`, nie „długością sesji"; rename bez zmiany zachowania.
- **Tap-target sylab czytanek 56 px** (nie 60) — auto-fit najdłuższych czytanek w portrait nie mieści się przy 60 px; świadome odstępstwo sprzed Fali 1, nadal aktualne.
- **Quit z ekranu retry w Czytaniu** gubi kropkę postępu w UI (Task 9, UI-only, dane sesji nie tracą się).
- **Ponowne odpalenie efektu promptu przy tym samym `factId` pod rząd** (Make10/ConcreteAdd, Task 5/6) — tylko gdy SRS wylosuje ten sam fakt 2× z rzędu; anti-repeat to w praktyce blokuje.

### Do sprawdzenia na iPadzie

- Odsłuch fonemów/nazw liter/nowych sylab (lista wyżej) — priorytet 1 przed pushem/mergem.
- Realny czas trwania sesji po wydłużeniu feedbacku (`both`, synteza, retry, strategia).
- 🗣 echo i 🐢 tempo w Czytankach — `playbackRate` 0.75 na fizycznym Safari (ryzyko zniekształcenia głosu <0.5 jest teoretyczne, ale 0.75 nie testowane na urządzeniu).
- Retry (2 kafelki) w Literach/Czytaniu/Cyferkach palcem i Apple Pencil — layout 1×2 nowy, niesprawdzony fizycznie.
- Network tab po deployu: zero 404 na `/audio/*.mp3` z diakrytykami w kluczu.
- `session-stop-enough` i zmiana głównego przycisku na 🏠 po 2. sesji dziś — realny flow dwóch sesji tego samego dnia.
- Paleta Okabe–Ito + podkreślenia sylab — czy odróżnialne przy różnych typach daltonizmu i przy MIN_FONT (odnotowane już w Task 3).

---

## Stan po CR (2026-08-28/29) — 6 przeglądów, ~60 poprawek, live

**main `9111e00`**, deploy zielony, live https://kamilmat.github.io/kid-learn/.
Testy: **659 (`src`) + 119 (`scripts`)** zielone, `pnpm tsc -b` czysto, `pnpm build` OK,
`pnpm audio:check` 1135/1135.

Przebieg: 3 niezależne przeglądy całej aplikacji (poprawność `/code-review`,
UX dziecka + audio + PWA, dane/SRS/persist/wydajność) → poprawki w 10 batchach
(A–J, równoległe worktree'y) → smoke test w Chrome (19/19) → 3 przeglądy końcowe
(diff, regresje po scaleniu, świeże spojrzenie) → poprawki → scoped re-review
(werdykt: mergeable) → merge → push w kawałkach.

### Nowe kontrakty (nie wracać do starych założeń)

- **AudioBus**: `play()` → `Promise<boolean>`, nigdy nie rzuca; resolve przy
  końcu lub anulowaniu; `true` = audio faktycznie wystartowało (nawet jeśli
  potem przerwane), `false` = nigdy nie wystartowało (autoplay/404/anulowane
  w kolejce). `stop()` anuluje przez token generacji — bez zombie drain,
  wszystkie promisy się settlują. `audioBus.unlock()` w pierwszym geście
  (Home, level-selecty, KidNav). Flagi intro przez `playIntroOnce`
  (seen = wystartowało; retry gdy anulowane przed startem).
- **Nawigacja**: wejście do sesji `navigate(..., { replace: true })`; KidNav
  renderowany w komponentach route'ów; ⬅️/🏠 w sesji = `quit()` z flush
  (idempotentny `finishedRef`; unmount-safety flush). KidNav back z guardem
  `history.state.idx` i ręcznym `..`. Cue `nav-back`/`nav-home` grają.
- **PauseOverlay** wspólny (`shared/ui/PauseOverlay.tsx`, ikony, zIndex 2000);
  overlaye feedbacku/scenki/celebracji ukryte przy pauzie; `pause()` zatrzymuje
  audio; resume ponawia audio korekty (Litery/Czytanie/Cyferki), bez podwójnego
  advance.
- **Feedback**: Czytanie i Cyferki advance po zakończeniu audio (`await play()`)
  z `MIN_FEEDBACK_MS` i bezpiecznikiem `MAX_FEEDBACK_MS = 12 s`; ćwiczenia
  Cyferek nie wołają `audioBus.stop()` na mount (FIFO serializuje powitanie →
  prompt).
- **Persist**: `migrate` we wszystkich store'ach (bez tego bump wersji kasował
  stan); `numbersStore` v2 mapuje `count-N` → `count5-N`/`count10-N`;
  override puli liter walidowany w edytorze (min = max(4, tilesPerQuestion)),
  filtrowany w merge, fallback do domyślnej puli tylko na odczycie;
  `settings.reading` deep-merge; sesje reading/numbers cap 50.
- **PWA**: fonty Kalam/Lexend self-hosted (`public/fonts`, OFL); `registerType:
  'prompt'` + `updateSW()` tylko na Home (poller bez wycieku); `100dvh`,
  `overscroll-behavior: none`, safe-area na strefie rodzica.
- **Raport rodzica**: `shared/stats/aggregate.ts` scala sesje wszystkich
  modułów (Aktywność/Live/Anti-cheat), `dontKnow` liczony osobno; eksport MD
  też; `formatFactId` zna `count5-`/`count10-` i legacy `count-`.

### Poprawki per moduł (skrót)

- **Litery**: indeks pytania (`generateNextQuestion(nextNum)`), pauza w
  „breath" bez martwego timera, selektory store'a, `Slot` = number, jedno
  źródło pul liter, `LevelSelect` timer cleanup, `recentWrong` clamp ≤3 w SRS.
- **Czytanie**: intro poziomu w kolejce `start()`, feedback auto-advance z
  ikoną + pochwały `reading-praise-*`, `reading-album-unlock`, eventy sesji,
  `questionsPerSession` (ustawienie per poziom w SettingsScreen), reset
  `wildCelebrationCounter` na start, shuffle Fisher–Yates, sylaba `SO`
  (SOWA), `WordAlbum` przez `playIntroOnce`, 🏠 w albumie ≥60 px, timeLimit
  usunięty.
- **Cyferki**: fold SRS sekwencyjny, unikalne id faktów (counting-10 = 1..10),
  bulk init faktów (1 zapis), guard `answer()` + overlay `pointerEvents:auto`,
  anti-cheat (idle 20 s poza ConceptIntro, visibility), 🔊/🤷 w StatusBar,
  `correct-show-25/30/40/50`, ustawienia `skipCountStep`/`treeCelebrationsOn`
  (`tree-grow`)/`iskraThinkingAloud` działają, maintenance Pochodni bez
  podwójnego liczenia, wspólne `buildChoices`/`DropTarget`, pauza ikonowa,
  ciche a11y dnd-kit, animacje intro z named exports.
- **Czytanki**: obwolutka wyrazów, auto-fit jednoprzebiegowy + scena oddaje
  miejsce, klawiatura/`onClick` w sylabach, `pendingCue` czyszczony przy
  wyjściu, aktorzy w zakresie 12–86 %.
- **Skrypty**: `audio:build` wymaga klucza Azure tylko gdy trzeba syntezować;
  `override-removed` regeneruje TTS po usunięciu nagrania (tylko gdy katalog
  overrides istnieje); `mathGate` bez rekurencji; scoring bez ujemnych wag.

### Znane odstępstwa / do sprawdzenia na iPadzie

- Tap-target sylab czytanek **56 px** (auto-fit; przy 60 nie mieszczą się
  najdłuższe czytanki w portrait) — zweryfikować palcem.
- Back z `/numbers/tree` i `/reading/album` trafia na Home (replace w historii).
- StatusBar Cyferek ma 3 przyciski 60 px — sprawdzić w portrait.
- Wznowienie po pauzie w trakcie feedbacku (wszystkie moduły) — przetestowane
  tylko na poziomie hooków.
- Long-press sylaby w Safari (WebkitTouchCallout: none) — do sprawdzenia.
- `DEFAULT_QUESTIONS_PER_SESSION` w `reading/constants.ts` (używane też przez hook).
- Klucz Azure w `.env.local` **do zregenerowania** w portalu (przeszedł przez czat).

## Aktualny stan (2026-08-26 — moduł 4 Czytanki)

Zbudowano moduł 4 — **Czytanki**: 60 czytanek: od 1 zdania × 3 słowa (grupa 1)
do 5–6 zdań × 3–6 słów (grupa 4), podzielonych na 4 grupy rosnącej trudności,
prezentowanych jako sylaby-kafelki. Dziecko
dotyka sylaby → słyszy audio sylaby; long-press na słowo → słyszy całe
słowo; przycisk ▶ czyta całą czytankę po kolei. Każda czytanka ma mini-scenkę
(tło + animowane emoji-aktorzy). Postęp (które czytanki otwarto) trzymany w
`iskierki-czytanki-v1` (Zustand + persist), bez SRS/scoringu — to moduł
czytania na głos, nie quiz.

Task 10 (ta integracja) doczepił moduł 4 do reszty appki:
- **Home**: 4. kafelek fioletowy (📚, `TATA MA KOTA` z kolorowanymi sylabami), grid 2×2 (`repeat(2, 1fr)`, maxWidth 820, kafelki minHeight 220), onboarding audio `home-czytanki-intro` (kolejność: litery → czytanie → cyferki → czytanki)
- **App.tsx**: route `/czytanki/*` → `CzytankiModule`; `isCzytanki` dołączony do `showKidNav`/`overflow-hidden`; reset postępu czytanek dopięty do jedynego globalnego przycisku resetu w `SettingsScreen` (bez osobnego przycisku)
- **Raport rodzica**: nowa sekcja `CzytankiStats` (po `NumbersStats`) — „Otwarte: X/60" + per-grupa breakdown + lista otwartych tytułów z emoji
- **Eksport MD**: `exportReportToMarkdown` przyjmuje opcjonalny 6. parametr `czytankiSnapshot`, dopisuje sekcję `## Czytanki`

**Testy**: 676/676 zielone (`pnpm test --run`), `pnpm tsc -b` czysto.
**Audio**: 1135 plików mp3 w `public/audio/`, `pnpm audio:check` potwierdza 1128 wymaganych kluczy na miejscu (11 source plików; `czytanki.json` rozbity na `czytanki-syllables.json` + `czytanki-words.json`, oba generowane przez `pnpm audio:czytanki` z `data/czytanki.ts`).

**Odsłuch zrobiony (2026-08-27)** — pełny przegląd wygenerowanych sylab/słów
przez usera. Wynik:
- Reguła G2P: `ki`/`gi` + samogłoska → zwarta palatalna `c`/`ɟ` (nie `kʲ`/`ɡʲ`),
  bo Azure wymawiała `kʲ`/`ɡʲ` niewyraźnie (`polishG2p.ts`, dotyczy 3 kluczy:
  `cz-syl-kie`, `cz-syl-kiem`, `cz-syl-kiet`).
- Nowy mechanizm `audio-source/pronunciation-overrides.json` — 10 kluczy z
  ręcznym IPA/tekstem wybranym przez odsłuch, ma pierwszeństwo przed G2P/tekstem
  (`cz-syl-deszcz`, `cz-syl-drze`, `cz-syl-kacz`, `cz-syl-s_wiecz`, `cz-syl-zi`,
  `cz-syl-l_u`, `cz-syl-au`, `cz-word-co`, `cz-word-lale`, `cz-word-tola`).
- `pnpm audio:build` przegenerował dokładnie tych 13 kluczy, `pnpm audio:check`
  potwierdza 1128/1128.

**Odsłuch tura 2 (2026-08-27)** — pozostałe 11 sylab z listy "do manual
recording" rozwiązane bez nagrywania: `pronunciation-overrides.json` wpisy
mogą teraz nieść opcjonalne `voice` (`zofia`/`agnieszka`/`marek`), które
zastępuje `_voice` pliku źródłowego tylko dla danego klucza (hash liczy się
z efektywnego głosu, więc zmiana głosu w override sama wymusza regenerację).
13 kluczy przegenerowanych: `cz-syl-be_`, `cz-syl-z-e_`, `cz-syl-me_`,
`cz-syl-re_`, `cz-syl-l_e_`, `cz-syl-cje_`, `cz-syl-fe_`, `cz-syl-ke_`,
`cz-syl-dz-a`, `cz-syl-z`, `cz-word-z`, `cz-syl-w`, `cz-word-w` — część czytana
domyślnym głosem Agnieszka po korekcie tekstu, część przełączona na Zofię
albo Marka tam, gdzie Agnieszka źle wymawiała izolowany dźwięk. Lista
"pending manual recording" jest teraz pusta — wszystko rozwiązane przez
overridy tekstu/IPA/głosu. `tools/recorder/` nadal wspiera grupy
Czytanki-sylaby/Czytanki-słowa na wypadek gdyby przyszłe sylaby wymagały
faktycznego nagrania.

**Status**: zmergowane do `main` i **live** (2026-08-28, deploy zielony). Audio
czytanek głosem Agnieszki (Azure), z przyciętą ciszą i obwolutką wokół wyrazów.
Zweryfikowane w Chrome (iPad viewport landscape+portrait); do sprawdzenia na
fizycznym iPadzie: long-press w Safari, przycisk 🔊 nad sceną. Historia audio w
gicie jest pocięta na małe commity („audio część i/n") — sieć usera zrywa duże
pushe; przy kolejnych zmianach mp3 pushować po jednym commicie.
Klucz Azure w `.env.local` — po tej sesji zregenerować w portalu (przeszedł przez czat).

## Wymowa izolowanych sylab — backend `azure-ipa` (2026-08-26)

**Problem**: Edge TTS (darmowy endpoint, bez SSML) czyta izolowane sylaby
czytanek jako *nazwy liter* albo zmyślone słowa: „lo" → „elo", „ka" → „ka a",
„ry" → „ri". Dla modułu 4, gdzie dziecko dotyka sylaby żeby usłyszeć dokładnie
ten kawałek słowa, to psuje sens ćwiczenia.

**Ewaluacja ASR** (Whisper jako sędzia — transkrypcja wygenerowanych mp3 i
porównanie z oczekiwaną sylabą):
- Edge TTS: **52%** trafień na izolowanych sylabach (na całych słowach i zdaniach
  Edge jest w porządku — problem dotyczy tylko sylab bez kontekstu)
- Piper (lokalny, model pl): jakość nie do użycia dla dziecka — odrzucony
- **Decyzja: Azure Speech** — ten sam głos (pl-PL-ZofiaNeural), ale SSML
  `<phoneme alphabet="ipa" ph="…">` podaje wymowę wprost i całkowicie omija
  G2P silnika. Darmowy tier F0 pokrywa cały korpus.

**Co jest zrobione**:
- `scripts/polishG2p.ts` — deterministyczny G2P polski (`toIpa`): dwuznaki,
  zmiękczenia przez „i", nosówki ą/ę zależnie od kontekstu, ubezdźwięcznienie
  wygłosowe, regresywna asymilacja w zbitkach, akcent główny. 375/375 sylab
  czytanek daje IPA ze zbioru pl-PL Azure (test w `scripts/polishG2p.test.ts`,
  wyrywkowo skonfrontowany z `espeak-ng -v pl --ipa -q`).
- `scripts/azureTts.ts` — `buildSsml` + REST (`synthesizeAzure`, retry na 429/5xx)
  + mini-loader `.env.local`.
- `scripts/generate-audio.ts` — metadane `_engine: "edge" | "azure-ipa"` per plik
  źródłowy, osobny hash dla azure (zawiera IPA), tryb `--dry-run`.
- `audio-source/czytanki-syllables.json` (375, `azure-ipa`) i
  `audio-source/czytanki-words.json` (407, edge) zamiast jednego `czytanki.json`.

**Następne kroki**:
1. ~~Wpisać klucz do `.env.local`~~ / ~~`pnpm audio:build`~~ / ~~odsłuch~~ — zrobione,
   patrz „Odsłuch zrobiony (2026-08-27)" wyżej.
2. Nagrać manual override dla 11 kluczy z listy „Nadal do zrobienia" powyżej.
3. Jeśli wyjdzie dobrze — przełączyć `audio-source/syllables.json` (23 sylaby
   modułu 2) na `_engine: azure-ipa` tym samym mechanizmem.

## Następna sesja — visual review round 3 (atrakcyjność dla dziecka)

User poprosił o kolejny review skupiony na "atrakcyjniejszych wizualnie treściach dla dziecka". Round 1+2 v3.1 polish (gwiazdki, kolory poziomów, drzewko stages, mini-ikony konceptów, mastery filter) już wypchnięty (commits do `0b74ec4`).

**Do zrobienia w kolejnej sesji** — systematyczny pass przez wszystkie ekrany w przeglądarce (`pnpm dev` + chrome-devtools-mcp) z perspektywy nieczytającego 7-latka:

- **Home**: czy maskotka Iskra obok tytułu wystarczy, czy potrzeba więcej życia (np. animowany welcome scene, machające IskraMascot, drobne floating elementy)
- **LevelSelect** (3 moduły): kafelki mają tła pastelowe + gwiazdki — czy dodać sub-animacje (np. iskry orbitujące wokół ikony kafelka, hover/tap feedback wizualny, lekkie skalowanie)
- **Sesja Letters**: 4 kafelki literek w pionowym layoucie zajmują pełną szerokość — czy lepszy 2×2 grid? Plus kafelki literek same w sobie są bardzo statyczne (wpisana litera + nic więcej)
- **Sesja Reading**: kafelki sylab, drag-drop slot — czy dodać mini-sceny dla sylab (jak `MiniScene` dla słów już mamy)
- **Sesja Numbers**: ćwiczenia różne — czy każde ma wystarczająco "show" przy poprawnej odpowiedzi (oprócz mini-celebrations)
- **Status bar w sesji**: 8 kropek progresu wszystkie identyczne — czy ostatnia kropka mogłaby być jaśniejsza/specjalna ("dochodzisz do końca!")
- **FeedbackOverlay**: pochwały, IskraMascot dance — sprawdzić czy są atrakcyjne, czy zbyt powtarzalne
- **SessionEnd**: ekran końcowy — czy wystarczająco "świętuje", czy jest za suchy
- **Settings ⚙ + Raport 📊**: dla rodzica, ale 2 emoji w prawym dolnym rogu — może czytelniejsze ikony
- **Math gate**: bardzo formalny "6+5-7=?" w prostokątnym pop-upie — może bardziej zabawowy?
- **Mascot wall Liter**: opanowane litery w `colors.accentOrange` (pomarańczowe płytki) — może dodać lekki glow/pulse dla podświetlenia
- **Drzewko mistrzostwa**: stages path działa, ale brakuje animacji "przejścia" między etapami (gdy dziecko opanuje 5. koncept → płynne przeskoczenie 🌱→🪴)

**Dziedziny do rozważenia**:
- Mikrocelebracje per akcja (1-2 sekundy) zamiast 8-sekundowych wild celebrations rzadziej
- Soft sound effects (ding/pop) na hover/tap (nie tylko correct/wrong) — opcjonalne
- Konsystencja koloru: każdy moduł ma kolor (Litery żółty/pomarańczowy, Czytanie niebieski, Cyferki zielony) — czy konsystentnie używany?
- Ekrany "puste" / "pierwszy raz" — zachęta wizualna do startu

Plan na sesję: brainstorm → review listy ekranów + screenshot per ekran → ranking impact × effort → wykonać top 3-5.

### Maskotka Iskra — dalsze ulepszenia (po round 2 v2 kawaii)

Po commit `1e3615b` (anime oczy + brwi + rumieńce + szerszy uśmiech, size 96→140 na home) user zaakceptował kierunek ale chce więcej. Wybrane konkrety do następnej sesji:

- **(c) Mocniejszy gradient płomienia** — 2 warstwy płomienia, jaśniejszy rdzeń, animowany subtelny ruch (jak prawdziwy ogień, nie tylko skala 1↔1.05). Zachowuje obecny `radialGradient` ale dodaje delikatne `path` z animowanym `d` lub overlay z opacity flicker.
- **(e) Mała "grzywka" iskier** — kępka 3-4 iskierek na czubku płomienia (cy~10-15) jak fryzura, statyczna lub z mikro-animacją. Dziecko widzi "włosy" — bardziej character.
- **(i) Hero-version Iskry z rączkami i nóżkami** — drugi wariant komponenta (np. `<IskraHero size={...} />`) używany na home + intros: dodane małe rączki (kreseczki z kropkami na końcach), baza/podstawa (mały płomień-cień pod spodem). NumberBlocks-style charakter. Standard `<IskraMascot>` zostaje dla małych instancji (status bar, feedback).

Implementacja: `src/shared/ui/IskraMascot.tsx` rozbudowa + nowy `IskraHero.tsx` (eksportowany z tego samego modułu). Zachować backward compatibility — istniejące use'y `<IskraMascot size=N>` bez zmian.

---

## Aktualny stan (2026-04-29 — moduł 3 v3.1 polish round 2 ukończony)

### v3.1 polish round 2 — 10 ulepszeń UX

Po pierwszym review (`v3.1`) drugi pass z perspektywy 7-latka:
- **Pochodnia ikona** (`ed2db37`): emoji 🪔 nie pasowało jako pochodnia — custom inline SVG (kij brązowy + 3-warstwowy płomień)
- **Spójne ikony poziomów we wszystkich 3 modułach** (`b0d2d41`): Letters/Reading dotąd używały IskraMascot per intensity, Numbers używał emoji — wyciągnięto do shared `levelIcons.tsx` (✨/🔆/🔥/torch SVG)
- **Maskotka na home + favicon SVG** (`eba73d1`): IskraMascot obok tytułu "Iskierki" + custom SVG favicon (uproszczona maskotka)
- **Polish round 1** (`5dabf57`): 1×3 grid Home, gwiazdki ⭐ trudności zamiast tekstu, pastelowe tła per poziom (żółty→pomarańczowy→czerwony→róż), mastery wall Liter pokazuje tylko aktywną pulę (6 nie 32), Reading kafelki kompaktowe, scrollbar-gutter stable
- **Drzewko polish** (`0b74ec4`): visible stages path (5 emoji obok siebie, aktywny 64px), 20 mini-ikon per koncept (🖐️🎲🍎🔗🔢👯🦘…)

**Testy**: 559/559 zielone. **Build**: 525 kB. **Live**: https://kamilmat.github.io/kid-learn/

---

## Stan wcześniejszy (2026-04-29 — moduł 3 v3.1 polish ukończony)

### 🎯 Moduł 3 v3.1 polish — wszystkie 3 obszary wdrożone ✅

3 obszary z TODO przed v3 zamknięte w jednej sesji (brainstorm + spec + plan + parallel agents):

- **Raport rodzica**: nowa sekcja `NumbersStats` (Koncepty X/20 + lista mastered + W nauce + Nietknięte; Najtrudniejsze fakty top 10 z `formatFactId` helper dla 9 typów; Heatmapa 8 grup typów konceptów z kolorami trudności). Mountowany w `ReportScreen` po `ReadingStats`. Eksporter MD rozszerzony o sekcję `## Matematyka`.
- **SettingsScreen**: sekcja "Matematyka (moduł 3)" przed Reset z 5 kontrolkami — `iskraThinkingAloud`, `conceptIntros`, `treeCelebrationsOn` (toggles), `questionCount` 6/8/10 (radio), `skipCountStep` 2/5/10/mixed (select). Każda zmiana persistuje przez `updateSetting('numbers', ...)`.
- **ConceptIntro**: refaktor placeholder (💡 emoji) → router `INTRO_ANIMATIONS[conceptId]` w nowym `IntroFrame`. 20 dedykowanych worked-example animacji (Renkl/Sweller fading + CPA dla bonds/factfamily) reusing `representations/` (TenFrame, DotPattern, ConcreteIcons, NumberBondShape). Audio sync przez `setTimeout` od `audioBus.play()` (bez nowego API). Cleanup timeoutów na unmount.
- **Bonus refaktor**: `CONCEPT_LABELS` wyciągnięte z `MasteryTree.tsx` do `numbers/data/conceptLabels.ts` (single source of truth, używane teraz przez MasteryTree i NumbersStats).

**Testy**: 559/559 zielone (551 baseline + 7 NumbersStats + 1 animations registry).
**Build**: 524.94 kB JS (gzip 148.17 kB), 362 PWA entries.
**Audio**: bez nowych nagrań — animacje sync z istniejącym `intro-<conceptId>.mp3` (121 mp3 z fazy 3 modułu 3 v3.0).

**Spec**: `docs/superpowers/specs/2026-04-29-iskierki-math-v3.1-polish-design.md` (commit `40abc67`)
**Plan**: `docs/superpowers/plans/2026-04-29-iskierki-math-v3.1-polish.md` (commit `fcda021`)
**Implementation**: 6 commits (`84a4c92` → `dd7bac1`) — refactor + 4 features + integration.

### Out of scope v3.1 (do v3.2)

- Trendy aktywności matematyki dziennej (jak ActivitySection liter)
- Tekstowe sugestie nauczania (jak SuggestionsSection liter)
- iPad performance audit (test fizycznym iPadzie)
- Lazy import animacji jeśli build size > 600 kB

---

## Poprzedni stan (2026-04-28 — moduł 3 cyferki ukończony)

### 🎯 Moduł 3 (Matematyka) — **wszystkie 11 faz wdrożone** ✅

3 passy researchu + spec + plan + implementacja w jednej sesji. Live po push:
- 4 poziomy (Iskierka/Płomyk/Ognik/Pochodnia) × 4 typy ćwiczeń = **15 unikalnych komponentów** (FactFamilyTriangle reuse Płomyk+Ognik)
- Polska podstawa programowa MEiN: zerówka 1-10, kl.1 +/− do 20 z przekraczaniem progu, propedeutyka mnożenia (skip count, equal groups, arrays)
- **Bez wkuwania tabliczki, bez timera** (research: math anxiety u 1/3 dzieci, Boaler Stanford 2013)
- 3 reprezentacje wizualne CPA: TenFrame (Singapore Math), DotPattern dice 1-6, ConcreteIcons (10 zestawów emoji), DigitTile drag/tap
- **Drzewko Mistrzostwa** (20 konceptów) zamiast albumu (Lepper overjustification effect)
- 121 nowych mp3 (TTS Zofia + Marek), 340 plików total
- ConceptIntro: worked examples per koncept (Renkl/Sweller fading)
- Hypercorrection feedback: krótka korekta + correct-show-N po 900ms (Butterfield/Metcalfe)
- Pochodnia: 18% interleaving sub- maintenance (Bjork & Bjork 1994)
- 7 nowych testów (numbersStore 6, facts 8, useNumbersSession 5, TenFrame 4) — total 551/551 ✓

**Spec**: `docs/superpowers/specs/2026-04-28-iskierki-math-module-design.md` (commit `ab11a48`)
**Plan**: `docs/superpowers/plans/2026-04-28-iskierki-math-module.md` (commit `8af4084`)

**Sources** w speckach:
- Polska: Gruszczyk-Kolczyńska "Dziecięca matematyka", Klus-Stańska, Filipiak (Wygotski)
- INT: Singapore MOE, Common Core, NCETM Mastering Number, Eureka Math, White Rose Y1
- Research: Bruner CPA 1966, Hannula-Sormunen 2015 (subitizing predictor), Roediger/Karpicke retrieval, Rohrer 2019 interleaving, Renkl/Sweller worked examples, Kirschner/Sweller/Clark 2006 (direct > discovery), Boaler "Fluency Without Fear", Dweck growth mindset, Cowan 2017 working memory, Lepper 1973 overjustification, Butterfield/Metcalfe hypercorrection, Mayer multimedia, Jansen 2024 (drag > tap), APA 2025 finger counting

### Moduł 3 — pliki

```
src/modules/numbers/
├── types.ts (Question, AnswerOutcome, ConceptId×20, ExerciseType×15)
├── store/numbersStore.ts (Zustand persist iskierki-numbers-v1)
├── data/concepts.ts (20 ConceptDef + mastery thresholds)
├── data/facts.ts (generator faktów per koncept)
├── data/concreteSets.ts (10 emoji ikon)
├── hooks/useNumbersSession.ts (orchestrator + interleaving 18%)
├── hooks/exerciseRouter.ts (fact → ExerciseType switch)
├── components/representations/ (TenFrame, DotPattern, ConcreteIcons, DigitTile, NumberBondShape)
├── components/exercises/ (15 unikatów ćwiczeń)
├── components/intros/ConceptIntro.tsx (worked examples)
├── components/SessionView.tsx (orchestrator + StatusBar + FeedbackOverlay)
├── components/SessionEnd.tsx, PauseOverlay.tsx, MasteryTree.tsx
└── index.tsx (routing /numbers/* — index, session/:level, tree)
```

### Settings rozszerzone

`src/shared/settings/types.ts` + `defaults.ts` + `settingsStore.ts` (merge v4→v5):
- `numbers.iskraThinkingAloud: boolean` (default true)
- `numbers.questionCount: 6 | 8 | 10` (default 8 — microlearning < 10 min)
- `numbers.treeCelebrationsOn: boolean` (default true)
- `numbers.skipCountStep: 2 | 5 | 10 | 'mixed'` (default 'mixed')
- `numbers.conceptIntros: boolean` (default true)

### QA pass (2026-04-28, post-implementacja)

**Manualne chrome-devtools-mcp**: Home (3 kafelki), `/numbers` LevelSelect (4 poziomy + drzewko), Iskierka (ConcreteAdd: "1 gwiazdka + 1 gwiazdka = ?" + drag DigitTiles 9/2/5/8), Płomyk (ConcreteAddSubtract z `−` `=` `?` + drag), Drzewko (0/20, 🌱 sadzonka, wszystkie 20 konceptów z labels). Console: 2 promise rejections (audio bez user interaction — typowe iOS Safari, nie bug).

**Bug naprawiony**: useNumbersSession race condition — pierwszy start() rzucał `pickNextItem: no states for active pool` bo useEffect-init nie zdążył przed pickAndSetQuestion. Fix: inline ensureFactInitialized w pickAndSetQuestion + `useNumbers.getState().facts` zamiast subscribed closure (commit `1ddae4f`).

### TODO przed v3 (poza scope tej sesji)

- **Raport rodzica** rozszerzony o sekcję matematyki (per koncept mastery, heatmapa faktów). Drzewko już dostępne przez `/numbers/tree` — widoczne dla dziecka.
- **SettingsScreen UI** dla numbers.* (typ jest, defaults, merge — brakuje toggles/selects w komponencie). Można edytować przez DevTools localStorage.
- **NumberBlocks-style intros** — ConceptIntro pokazuje tylko 💡 emoji + button. Dedicated animacje per koncept (TenFrame fillujący się, NumberBondShape budujący się) w v3.1.
- **iPad user-test**: drag-drop palcem + Apple Pencil w Płomyk/Pochodnia — chrome-devtools-mcp nie symuluje pełnych pointermove'ów (drag startuje, but `over` może być null). User test po deploy.
- **Build size**: 504 kB JS warning. Dla v3.1 rozważyć code-splitting moduł-per-route (lazy import `LettersModule`/`ReadingModule`/`NumbersModule`).

---

## Poprzedni stan (2026-04-28 — sesja UX polish)

### Następna sesja: ~~moduł 3 cyferki~~ ✅ ZROBIONE

### Sesja podsumowanie (commits dziś, w kolejności):

| Commit | Krótko |
|---|---|
| `5e04130` | fix audio case-sensitivity (8 słów module 2 → 404 na GH Pages) |
| `abdaa39` | docs STATUS audio fix |
| `e692f3d` | feat kolorowanie sylab (Ognik / Pochodnia / Płomyk DropSlot) |
| `91d2244` | fix drag-drop sylab + kolory w album/SessionEnd |
| `26b6d29` | PWA meta + STATUS QA log |
| `f8fb6b4` | fix Anuluj na bramie + ikony modułów Home + bez "klik" |

### Ostatnia zmiana — UX polish (commit `f8fb6b4`)

**Anuluj na MathGate:**
- `SettingsScreen` → nowy prop `onExit` (opcjonalny). MathGate.onCancel woła `onExit()` jeśli podany.
- `App.tsx SettingsPage` przekazuje `() => navigate('/')`. Bez tego Anuluj robił tylko rerender (komentarz "konsument zarządza nawigacją" + nikt nie zarządzał = bug).
- `ReportScreen` już miał poprawny `onExit` flow.

**Home — ikony modułów dla nieczytających:**
- Wcześniej: oba kafelki miały identyczny `IskraMascot` + label "Litery"/"Czytanie" → dziecko nieczytające nie odróżniało.
- Teraz: **Litery** = duże kolorowe `A B C` (niebieski/czerwony/zielony, var(--font-block)). **Czytanie** = `📖` + przykład `MAMA` z kolorowanymi sylabami. Mascot usunięty z kafelków (nie pomagał).
- Symetria: oba kafelki bez mascota, każdy z dystynktywną ikoną + krótkim labelem.

**Bez "klik" przy Litery/Czytanie:**
- Usunięte `audioBus.play('nav-tap')` z `handleLetters` / `handleReading` w `Home.tsx`. User: "klik" jest bez sensu na poziomie nav. Moduł sam zagra własne intro audio przy pierwszym wejściu.

### QA pass module 2 (2026-04-28, post-deploy)

**Manualne chrome-devtools-mcp** — Home, ReadingLevelSelect, Iskierka (poprawna odpowiedź → "Brawo!"), Płomyk (drag programowy działa, slot przyjmuje correct syl), Ognik (kafelki kolorowane: SZA-FA, PA-RA-SOL, CHŁO-PIEC, LI-ZAK), Pochodnia (KSIĘ-?-ŻYC z gap, kolory pozycji), Album (5/67 unlocked, MAMA i MASZYNA pokazują kolorowe sylaby), Settings (po math gate 9+2-9=2), Raport rodzica (sylaby 0/23, słowa 5/67, heatmapa). Console: 0 errors, 1 warn (meta tag deprecation — fixed).

**Drag-drop test:** ✅ **POTWIERDZONE OK na iPadzie** (user-test 2026-04-28) — palec działa, Apple Pencil działa. Programowy drag z chrome devtools nie symulował pełnych pointermove (over=null), więc tylko architektura była potwierdzona — fizyczny test ostatecznie potwierdził fix (commit `91d2244`: DIV+touch-action:none).

### Feature: kolorowanie sylab (commits `e692f3d`, `91d2244`)

Sylaby kolorowane wg pozycji (paleta polskich elementarzy: niebieski → czerwony → zielony → fioletowy):
- **Ognik** (WordTile): MA-SZY-NA, TE-LE-FON, SA-MO-CHÓD każda sylaba w innym kolorze
- **Pochodnia** (SyllableFillExercise): widoczne sylaby kolorowane wg pozycji, gap szary (nie zdradzaj)
- **Płomyk** (DropSlot): filled slot pokazuje kolor pozycji po poprawnym ułożeniu
- **Album** (AlbumCard): label słowa pod emoji koloruje sylaby
- **SessionEnd** (Nowe słowa pille): koloruje sylaby
- Shared `SyllableText` component, util `getSyllableColor(index)`

### Drag-drop fix: SyllableTile na DIV (commit `91d2244`)

**Problem:** native `<button>` w `DraggableSyllable` capturował pointer events przed @dnd-kit's PointerSensor — drag nie startował na iPad/Pencil.

**Fix:**
- `DraggableSyllable` renderuje plain `<div>` zamiast wrappować `<SyllableTile>` button
- `touch-action: none` (krytyczne dla iPad — bez tego touch scroll wygrywa z drag)
- `cursor: grab/grabbing` wg `isDragging`, `zIndex` podczas drag
- `SyllableTile` (button + useTapHandler) zostaje dla SyllableFill / SyllableMatch (tap-only)

### Critical fix: lowercase audio keys w module 2 (commit `5e04130`)

**Problem:** Module 2 używał uppercase audio keys (`word-MAMA`, `word-ARBUZ`). Na macOS APFS (case-insensitive) działało lokalnie, ale na **GitHub Pages (Linux, case-sensitive) → 404 dla 8 słów** kolidujących z module 1 (arbuz/cebula/gęś/koń/lampa/miś/śliwka/żaba — fizycznie 1 plik widziany jako 2 nazwy). `audio:check` nie złapał — widział lookup po dowolnym case'u.

**Fix:**
- `getWordAudioKey(text)` lowercase'uje (1 funkcja, 6 wywołań w `useReadingSession.ts` + `WordAlbum.tsx`)
- 25 unikatowych `'word-X'` w `scenes.ts` → lowercase (~50 wystąpień)
- `audio-source/words.json`: 67 uppercase → 59 lowercase (8 deduped z module 1 — TTS audio identyczne dla "arbuz" niezależnie od case)
- 59 mp3 zregenerowanych (TTS Zofia) + 59 git renames uppercase→lowercase (2-step przez tmp, bo `core.ignorecase=true`)
- Manifest oczyszczony (294→227 wpisów; orphany usunięte)

**Live verify (po deploy):**
- `https://kamilmat.github.io/kid-learn/audio/word-mama.mp3` → 200 ✓
- `https://kamilmat.github.io/kid-learn/audio/word-arbuz.mp3` → 200 ✓
- `https://kamilmat.github.io/kid-learn/audio/word-ARBUZ.mp3` → 404 (oczekiwane — uppercase już nie istnieje)

**Build / testy po fixie:**
- `pnpm tsc -b` ✓
- `pnpm test --run` — **528/528 zielone**
- `pnpm build` ✓ (242 precache entries, 3.42 MB)
- `pnpm audio:check` ✓ (219 plików — był 227, -8 duplikatów)

---

## Stan z 2026-04-27 — moduł 2 czytania ukończony

### Module 2 (Czytanie) — wszystkie 13 faz wdrożone

**Live:** https://kamilmat.github.io/kid-learn/ (PWA, instalowalna). Home pokazuje 2 kafelki — Litery (moduł 1) + Czytanie (moduł 2).

**Co działa:**
- 4 typy ćwiczeń per poziom: Iskierka (audio→sylaba), Płomyk (drag-drop sylab w słowo), Ognik (audio→słowo), Pochodnia (uzupełnij sylabę)
- 23 sylaby + 67 słów (3 poziomy: Płomyk 20 / Ognik 25 / Pochodnia 22) z polskim kanonem elementarzowym
- Mini-scenki słów: 56 scenek dla 25 słów (premiera tier — Płomyk + 5 Ognik favourites), CSS keyframes + emoji + audio. Pozostałe słowa fallback do standard celebration.
- Iskra ożywiona: 8 easter eggs (apsik, czkawka, beknięcie, salto, gibberish + 2 silly z humorMode), komiczny fail przy błędach
- 5 wild celebrations (rakieta, spadające frukty, ekran-salto, tańczący awokado, tęcza) co `wildCelebrationFreq ± 2 jitter` (default 8)
- Album słów (67 kart): kolekcjonerstwo, scenka po tap, ceremony co 10. odblokowane
- Status bar: licznik iskierek 💎 + 8 kropek postępu + pauza
- Onboarding głosowy intros (1× per `seenIntros`) na home + 4 poziomy + album
- Anti-cheat: idle 20s + page visibility → auto-pauza (reuse z modułu 1)
- Settings: humorMode (silly easter eggs toggle), reading.wordAnimations, reading.wildCelebrationFreq slider
- Raport rodzica: sylaby (opanowane/trudne) + słowa per-level + heatmapa polskich fonemów (SZ/CZ/RZ/CH/Ś/Ć/Ź/Ń/Ó/Ż)

**Audio:**
- 219 plików MP3 w `public/audio/` (po fix 2026-04-28 — wszystkie `word-*` keys lowercase, 8 słów modułu 2 reużywa pliki modułu 1)
- TTS Zofia (lektor: sylaby, słowa, intros, prefiksy, pochwały) + TTS Marek (Iskra: reakcje, easter eggs werbalne)
- SFX biblioteka: placeholder (manual download from mixkit/freesound — nie blokuje funkcjonalności, używamy istniejących module-1 SFX gdzie potrzeba)

**Dependencies:** @dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0 (drag-drop dla Płomyk), Lexend (Google Fonts OFL, early-reader font dla kafelków).

**Persistence:**
- `iskierki-state-v4` — settings (rozszerzone o humorMode + reading.* — backward-compat merge, brak version bump)
- `iskierki-letters-v1` — moduł 1 progres (bez zmian)
- `iskierki-reading-v1` — moduł 2 progres (sylaby/słowa SRS + albumUnlocked + seenIntros + seenSceneVariants + wildCelebrationCounter + pendingCeremonyMilestone)

### Build / testy

- `pnpm tsc -b` ✓
- `pnpm test --run` — **528/528 zielone** (po QA bugfixach)
- `pnpm build` ✓ (242 precache entries, 3.42 MB — JS + CSS + HTML + 227 audio MP3 + manifest + icons)
- `pnpm audio:check` ✓ (227 plików, idempotentny)

### QA pass (2026-04-27, post-Phase 13)

**Manualne testowanie przez chrome-devtools-mcp** — Home, ReadingLevelSelect, wszystkie 4 sesje (Iskierka/Płomyk/Ognik/Pochodnia), Album, Settings (po math gate 2+9-5=6), Raport rodzica z heatmapą fonemów. Console: 0 errors.

**3 bugi znalezione i naprawione (commits `1814527`, `65a19bf`, `ce05732`):**
1. **Pochodnia distractors length-matching** — gdy target sylaba długa (np. `DŹWIEDŹ`), distractors były krótkie 2-letterowe (`DU`/`RU`/`WA`); dziecko zgadywało po długości. Fix: pool distraktorów z `ALL_WORDS[*].syllables`, preferowanie ±1/±2 długości.
2. **Settings copy "słonie"** — opis "Animacje słów" miał typo (elephants); zmienione na opisowy tekst.
3. **Raport sylaby total 0/0** — mianownik teraz `ALL_SYLLABLES.length` (23) zamiast rozmiaru store.

**Wymaga weryfikacji na iPadzie (chrome-devtools-mcp nie obsługuje natural drag/touch):**
- Drag-and-drop palcem + Apple Pencil w Płomyk
- Audio playback po pierwszej user interakcji
- Pełen flow 8 pytań → SessionEnd → Album navigation
- Wild celebration trigger (~8 correct → rakieta/owoce/salto)
- Iskra easter eggs (tap mascot)
- Animacja mini-scenek runtime
- `usePageVisibility` agresywność na iOS Safari

---

## Poprzedni stan (2026-04-27)

### iPad audio + tap fixy + cleanup `assoc-*`

**Co zrobione (uncommitted):**
- **AudioBus** zrefaktorowany na pojedynczy persistent `HTMLAudioElement` zamiast `new Audio()` per `play()` — iOS Safari unlock'uje audio per-element, więc raz unlocked = działa do końca tab session
- **`onPlayAudio` w SessionView**: `audioBus.stop()` przed `play()` — wielokrotne kliknięcia 🔊 nie nakładają się już sekwencyjnie (FIFO queue robiło "powtórz × 5")
- **LevelSelect.handleTileClick**: synchroniczny `audioBus.play('nav-tap')` w gesture-context — primuje persistent element zanim `session.start()` wywoła pierwsze `letter-X`. To naprawia "literka czasem nie gra na iPad / trzeba klikać 🔊"
- **`useTapHandler` hook** (`src/shared/ui/useTapHandler.ts`) — pointer-events z tolerancją 12px naprawia rysik (Apple Pencil/stylus mikroruchy gubiły natywny `click`). Podpięty w: LetterTile, QuizCard (audio/dontKnow/pause), LevelSelect (LevelTile + MasteryCell wyciągnięte do osobnych komponentów żeby hooki nie były w pętli), PauseOverlay, KidNav, Home, Button (shared)
- **CSS na tap-targetach**: `touch-action: manipulation` + `user-select: none` + `WebkitTapHighlightColor: transparent`
- **Cleanup `assoc-*`**: usunięte 32 wpisy `assoc-${letter}` z `audio-source/words.json`, 32 `assoc-*.mp3` z `public/audio/`, 32 entries z `.manifest.json`, `phraseAudioKey` z typu `Association` i `buildAssociation`. Pozostaje grane `audioKey` = `word-${seed.word}` (sam wyraz "arbuz") — konsensus: "X jak Y" myli przy literach typu Ę (gęś — w środku)

**Wynik:** `pnpm tsc -b` ✓, `pnpm test --run` 389/389 ✓ (poprzednio 384, +5 z poprawionych testów AudioBus / associations).

**Co dalej:**
- User testuje na iPadzie (palec + Apple Pencil) czy:
  - pierwsza literka w sesji gra automatycznie
  - powtarzanie 🔊 wieloma klikami nie nakłada audio
  - rysik niezawodnie wybiera kafelki
- Jeśli OK → commit + push (GH Pages auto-deploy)

### Audio Recorder zaimplementowany

**Co zrobione:**
- Standalone narzędzie `tools/recorder/` — vanilla HTML+JS+CSS, MediaRecorder + File System Access API, czyta `audio-source/*.json` i pozwala nagrać per-klucz z VU meterem, klawiaturą (Spacja/Enter/R/strzałki) i auto-skokiem na następny nieskończony
- Skrypt `scripts/convert-overrides.ts` (`pnpm audio:convert-overrides`) — batch WebM→MP3 przez ffmpeg, idempotentny po mtime, 4/4 testy zielone
- Skrypty: `pnpm dev:recorder` (HTTP server) + `pnpm audio:convert-overrides`
- `.gitignore`: `audio-source/manual-overrides/*.webm`
- README z instrukcją użycia + skrótami klawiaturowymi
- Memory zaktualizowane: cały audio-stack będzie jednolicie nagrany przez user'a; TTS Zofia tylko fallback dla nowych kluczy

**Co dalej:**
- User nagrywa wszystkie ~145 kluczy używając recordera (iteracyjnie — najpierw litery, potem reszta)
- Po pierwszej fali nagrań: `pnpm audio:convert-overrides && pnpm audio:build && pnpm dev` → testowanie jakości w przeglądarce
- Ewentualne re-nagrania problemowych kluczy
- Po komplecie: commit MP3 do repo, push, GH Pages PWA gra nowymi nagraniami

---

**Moduł 1 (rozpoznawanie liter)** — działa w produkcji jako PWA. v1.1 → v1.1.1 → polish → CR sweep → audio rebalance → UI control → Kalam font → counters → bug fixes → GH Pages → PWA → 8 kafelków. **Wszystko na main, auto-deploy przez GH Actions.**

### Build / testy
- `pnpm tsc -b` ✓
- `pnpm build` ✓ (~322 KB JS / 100 KB gzip + 2 MB precache PWA)
- `pnpm audio:check` ✓ (137 plików mp3)
- `pnpm test --run` — **384/384 zielone** (zero failing)

### URL produkcyjny + instalacja
- Web: https://kamilmat.github.io/kid-learn/
- PWA install: Safari iPad → Share → "Add to Home Screen"; Chrome Android/Desktop → install banner lub ⋮ menu → Install
- Offline: po pierwszym otwarciu service worker cache'uje wszystko (HTML/CSS/JS + 137 audio MP3 + ikony + fonty) — działa bez wifi
- Auto-update: każdy push do main → GH Actions buduje (~40s) → SW pobiera w tle → aktywuje przy następnym otwarciu (bez prompt'u)

## Co zrobione — zwięzłe per epoch

### Foundation (2026-04-26)
Vite + React 19 + TS strict + Tailwind 4 + Zustand + react-router. SRS Leitner 5-box + scoring + distractors. Math gate. Audio pipeline (Edge TTS Zofia, 137 plików). Quiz core (QuizCard, LetterTile, FeedbackOverlay). Letters store + level select + mastery wall. Settings UI + parent report. Persist v1.

### v1.1 UX iteration (2026-04-27)
Mascot in session + SFX (CC0 mixkit ding+fanfara) + 12 praises + microcelebrations (streak 3/5/7+). Per-level `showCountdownBar` (migracja v2→v3). Łagodniejsza paleta countdown. 500ms wdech. CSS variable `--font-handwritten`.

### v1.1.1 follow-up
Per-level `timeLimit` (migracja v3→v4 z drop legacy primitive). Headline timeout = "Posłuchaj jeszcze raz". LevelSelect `IskraMascot` per intensity zamiast emoji 🔥.

### Polish + CR sweep
ALL_LEVELS export. Aria-describedby. exporter cleanup. Niezależny code-reviewer agent + UX exploration w Chrome wykryły 5 bugów + 5 UX + 6 refactor — wszystko naprawione.

### Audio rebalance + UI control + font + counters (krytyczne user-reported)
1. Pair "Ll/Aa" zlepiało się → `letterSpacing: 0.18em` w trybie `para`
2. Audio sequence "X jak Y" ucinało → `FEEDBACK_DURATION_BASE_MS` z rzeczywistych pomiarów `afinfo`
3. Re-tap w 500ms breath → status pozostaje `'feedback'` przez wdech
4. Pause-during-feedback rozbijał sesję → `pausedDuringFeedbackRef` + `scheduleFeedbackDismissRef` rekonstruuje pipeline
5. AudioBus.stop() race → defensywne `playing=false`
6. defaultLevel ghost feature → `LettersIndex` auto-navigate (z module-level flag chroniącym przed re-trigger)
7. nav-tap "klik" mieszało się z dont-know audio → usunięte
8. dontKnow + correction-prefix dublowało komunikat → tylko dont-know + letter
9. **Guzik "→ Dalej"** w FeedbackOverlay → `useSession.skipFeedback()`
10. correct: usunięte assoc audio (dziecko zna literę). dontKnow/timeout: dodane assoc (mnemonika)
11. Czcionka pisana → **Kalam** (najbliższa polskiemu pismu szkolnemu z OFL Google Fonts)
12. Liczniki ✅/❌/🤷 w status barze + sekcja `outcome-breakdown` w SessionEnd
13. Pre-existing `activeLettersValidation` bug fix (waliduje pulę poziomu, nie cały alfabet) → 384/384

### Deploy + PWA + Pochodnia 8 kafelków
- Vite `base` z VITE_BASE env, BrowserRouter basename z BASE_URL, 404.html SPA fallback
- GH Actions workflow `.github/workflows/deploy.yml` (pnpm build + deploy-pages)
- `vite-plugin-pwa` + workbox: 160 entries precached, `autoUpdate`, navigationFallback
- manifest.webmanifest + ikony 192/512/180 (generowane z `/tmp/iskra-icon.svg` przez `@resvg/resvg-js-cli`)
- Audio basePath fix dla GH Pages — `import.meta.env.BASE_URL + 'audio'`
- TilesPerQuestion: `3|4|5|6|8`. Pochodnia default 8 (4×2 grid)

## Co do zrobienia (decyzje user'a)

### Krótkie / czyste

- **`opacity: 0.5` magic number** w SettingsScreen → token. Czeka aż w `@/app/theme` powstanie `disabledOpacity` (na razie 1 użycie — premature abstraction)
- **CR finding #6**: idle 20s przy `tempo=long` + `timeLimit=off` może dawać fałszywą auto-pauzę gdy dziecko ogląda overlay. Niski priorytet
- **Auto-navigate UX edge case**: gdy rodzic ustawia `defaultLevel='ognik'` a dziecko nigdy nie było w sesji, wpada od razu w Ognik bez zobaczenia LevelSelect/Iskry. Obecne zachowanie świadome — czy chcesz "pierwszy raz pokaż wybór"?
- **Audio assoc dla `wrong`?** Aktualnie wrong gra `correction-prefix-X` + `letter-X`. Bez "X jak Y". Czy dodać assoc też tam (analogicznie do dontKnow)?

### v2 backlog (większe scope, osobne sesje)

- **Czcionka pisana wg polskiego standardu MEN** (płatna ~150 zł, np. "Mazowiecka") — wystarczy `@font-face` z `.woff2` w `src/index.css`, CSS variable już przygotowana
- **Tracing palcem** (canvas drawing) — czterolinia + śledzenie czy dziecko poprawnie obrysowuje literę
- **Drugi typ ćwiczenia w module liter**: "widzisz literę → wybierz obrazek słowa"
- **Drugi moduł — sylaby + wyrazy** (architektura gotowa: `src/modules/syllables/` z reuse `shared/`)
- **Manual recordings audio** — jeśli decyzja na nagrania własne dla problematycznych liter, drop do `audio-source/manual-overrides/letter-X.mp3`. UWAGA: pamiętaj `memory/project_audio_voice_consistency.md` — nie miksować głosów
- **Kolejne moduły**: cyfry, kolory, kształty
- **Ściana osiągnięć rozszerzona** — nie tylko box=5, też streak'i, pierwszy raz, opanowanie poziomu
- **Pokazywać tylko aktywną pulę poziomu** w mastery wall (np. 6 dla Iskierki) zamiast 32 wszystkich

### Architektoniczne (do rozważenia)
- `shared/` zależy od `modules/letters/data/alphabet` (validation, stats) — formalnie łamie regułę "shared niezależne". Przenieść `alphabet.ts` + `toUpper` do `shared/`
- `Level` typ scalony do `@/shared/settings/types` (CR sweep zrobił), ale można jeszcze przenieść do `shared/types/`

## Adaptive learning — jak działa (potwierdzone w sesji)

`pickNextLetter` (`src/shared/srs/select.ts`) waży `score = boxWeight × recency × recentWrongBoost`:
- `boxWeight`: box 1 = **5.0**, box 5 = **0.4** (12.5× różnica)
- `recentWrongBoost`: `1 + recentWrong × 2.0` (po 1 wrong = 3×, po 2 wrong = 5×)
- `recency`: rośnie z czasem od `lastSeen`, capped 3.0

Po pomyłce (`update.ts`):
- `wrong`: box **−2**, `recentWrong +1`
- `dontKnow`: box −1, `recentWrong +1`
- `correct`: box +1, `recentWrong −0.33` (wolny zanik)

15% szans na **jitter** (wybór z box 4-5 do utrwalenia mastered).

**Litera z 1 błędem ~37× częściej w następnym pytaniu** niż mastered. Persistance między sesjami przez `lettersStore` w localStorage (`iskierki-letters-v1`).

Jeśli user czuje że dziecko "za rzadko" wraca do błędów, parametry do podkręcenia: `JITTER_PROBABILITY` 0.15→0.05, `BOX_WEIGHTS[1]` 5.0→8.0, `recentWrong × 2.0` → `× 3.0`, `RECENT_WRONG_DECAY` 0.33→0.2.

## Wskazówki na następną sesję

1. **CLAUDE.md + ten STATUS** = pełen kontekst
2. **Branch**: powinieneś być na `main`. Wszystko mergowane FF, nie ma żadnych otwartych branch'y
3. **Dev server**: `pnpm dev` (port 5173 lub kolejny wolny)
4. **GH Actions**: `gh run list --repo kamilmat/kid-learn --limit 3` po push, `gh run view <id>` dla logów
5. **Pierwszy odruch po push**: poczekać ~40s, sprawdzić https://kamilmat.github.io/kid-learn/ z hard reload (Cmd+Shift+R)
6. **localStorage** klucze: `iskierki-state-v1` (settings + math gate, migracje v2-v4), `iskierki-letters-v1` (progres + sesje). Reset przez DevTools → Application → Local Storage
7. **Audio status**: `pnpm audio:check` (137 plików), `pnpm audio:build` regeneruje tylko zmienione. Pamiętaj: nigdy nie miksować głosów (memory `project_audio_voice_consistency.md`)
8. **Memories**:
   - `project_audio_voice_consistency.md` — nie miksować głosów audio
   - `feedback_autonomous_execution.md` — po akceptacji działać autonomicznie

## Known issues — brak

Wszystkie znane bugi naprawione. **384/384 testy zielone**.

## Strony testowe

- `/font-test.html` — porównawcza 15 czcionek pisanych na czterolinii (pełny polski alfabet UPPER+LOWER + 10 par). User wybrał Kalam, ale strona zostawiona dla przyszłych eksperymentów
