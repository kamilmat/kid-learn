# Iskierki — Fala 1 ulepszeń dydaktycznych (design)

**Data:** 2026-08-29
**Status:** do akceptacji
**Źródło:** `docs/superpowers/research/2026-08-29-ux-dydaktyka-research.md`, tabela §2, pozycje #1–#11

## Cel

Domknąć główną lukę z researchu: **uczymy rozpoznawania, za mało produkcji i strategii**. Same zmiany S/M: czysty fonem + nazwa litery, jawny krok syntezy sylab, druga próba po błędzie, wypowiadane liczby i strategie w matematyce, echo w czytankach, wyraźny koniec sesji, dane diagnostyczne z czytanek, pochwały procesowe, paleta bezpieczna dla daltonistów.

**Nie-cele (Fala 2/3):** liczenie 1:1, pytania o rozumienie, tracing, „plan na dziś", jedna ekonomia nagród, multi-profil, kontrastywne dystraktory sylab, ten frame/mastery, poziom CVC. Żadnych timerów, punktów, streaków dla dziecka.

---

## 1. Czyste fonemy liter + tryb promptu

**Dziś:** `useSession.generateNextQuestion` (`src/modules/letters/hooks/useSession.ts:505`) gra `letter-${target}`; ten sam klucz w `playFeedbackAudio` (`wrong`, `dontKnow`/`timeout`, linie 565-590) i pod 🔊 w `QuizCard`. Teksty w `audio-source/letters.json` to spółgłoska z doklejoną samogłoską: `"b": "by"`, `"k": "kyyy"`, `"z": "Z yy"` (engine `edge`, zofia). Nazw liter nie ma w ogóle.

**Nowo:**
- Dwa nowe pliki źródłowe (jeden plik = jeden `_engine`):
  - `audio-source/letters-phonemes.json` — `_voice: zofia`, `_engine: azure-ipa`, klucze `phon-<litera>` (32 wpisy, litera jako tekst, np. `"phon-b": "b"`). IPA z `polishG2p.toIpa` tylko dla samogłosek; dla spółgłosek podajemy je ręcznie w `pronunciation-overrides.json` (istniejący mechanizm, pierwszeństwo dla `azure`/`azure-ipa`) — `toIpa` jest pisane pod sylaby, nie pod izolowaną głoskę.
  - `audio-source/letters-names.json` — `_voice: zofia`, `_engine: azure` (plain SSML; `edge` zgaduje „be"/„es" tak samo źle jak izolowane sylaby), klucze `letter-name-<litera>`.
- **Ciągłe wydłużamy, zwarte ucinamy** (override IPA): `f fː`, `h xː`, `j jː`, `l lː`, `ł wː`, `m mː`, `n nː`, `ń ɲː`, `r rː`, `s sː`, `ś ɕː`, `w vː`, `z zː`, `ź ʑː`, `ż ʐː`. Zwarte i afrykaty bez przedłużenia i bez samogłoski: `b b`, `c t͡s`, `ć t͡ɕ`, `d d`, `g ɡ`, `k k`, `p p`, `t t`. Samogłoski (`a e i o u y ó ą ę`) — G2P bez override.
- Nazwy liter (tekst dla TTS, konwencja szkolna): b „be", c „ce", ć „cie", d „de", f „ef", g „gie", h „ha", j „jot", k „ka", l „el", ł „eł", m „em", n „en", ń „eń", ó „u otwarte", p „pe", r „er", s „es", ś „eś", t „te", w „wu", y „igrek", z „zet", ź „ziet", ż „żet"; samogłoski (a ą e ę i o u) = same siebie.
- `settings.letters.promptMode: 'phoneme' | 'name' | 'both'` — **default `both`** (Piasta & Wagner 2010: nazwa + dźwięk łącznie daje lepsze przyswajanie *dźwięków* niż sam dźwięk, zał. A-2). Opcjonalny override `letters.promptModeByLevel: Partial<Record<Level, PromptMode>>` w „zaawansowanych".
- Helper `src/modules/letters/audio/promptKeys.ts`: `promptAudioKeys(letter, mode): string[]`, `both` = `[letter-name-x, phon-x]` (nazwa identyfikuje, fonem zostaje ostatni — to on jest potrzebny do scalania). Wpięty w `generateNextQuestion`, `playFeedbackAudio` (`wrong`, `dontKnow`/`timeout`) i `onPlayAudio`.
- `letter-<x>` przestaje być odtwarzane, ale **plików nie kasujemy** (rollback bez rebuildu); usunięcie w Fali 2.

**Edge case:** brak `phon-*` (404) → `play()` zwraca `false`, kolejka idzie dalej; przy `both` dziecko usłyszy przynajmniej nazwę. Feedback `wrong` w trybie `both` wydłuża kolejkę — `FEEDBACK_DURATION_BASE_MS.wrong` +800 ms. Ryzyko: Azure może wyrenderować izolowaną zwartą jako ciszę → obowiązkowy odsłuch, plan B `manual-overrides/phon-<x>.mp3`.

**Testy:** `promptKeys.test.ts` — 3 tryby × litera z polskim znakiem; każda litera z `levelLetterPools.pochodnia` ma wpis w obu plikach źródłowych.

## 2. Krok syntezy „MA + MA = MAMA" (Czytanie)

**Dziś:** `useReadingSession.handleOutcome` (`src/modules/reading/hooks/useReadingSession.ts:578`) przy `correct` gra `sfx-correct-ding` + pochwałę; przy `wrong`/`dontKnow` — `playCorrectionAudio` (prefiks + całe słowo). Pojedyncze sylaby słowa **nigdy nie są wypowiadane**. `getWordAudioKey` → `word-<lowercase>`, `getSyllableAudioKey` → `syl-<UPPERCASE>`.

**Nowo:** po każdym rozstrzygnięciu pytania **słownego** (`word-assembly`, `word-choice`, `syllable-fill`) — correct i wrong/dontKnow — sekwencja: sylaby po kolei (`syl-*`, pauza 350 ms), potem całe słowo (`word-*`). Asynchronicznie z `runId` (wzorzec `useReadAloud`), nie samą kolejką FIFO — pauzy trzeba wstawić jawnie. Hook wystawia `blend: { syllables: string[]; activeIndex: number | null }`; `FeedbackOverlay` (nowy prop `blend?`) podświetla aktualną sylabę kolorem z `getSyllableCue` (§11). Pauza przerywa sekwencję (`runId++`), wznowienie gra ją od początku — jak dziś korekta.

**Audio:** `syl-*` istnieją tylko dla 24 sylab z `data/syllables.ts`, a 67 słów z `data/words.ts` używa **89 unikalnych sylab** — brakuje 65. Nowy skrypt `scripts/reading-audio-source.ts` (`pnpm audio:reading`, wpięty przed `audio:build`, jak `audio:czytanki`) generuje `audio-source/syllables.json` (dalej `_voice: zofia`, `_engine: azure-ipa`) z sumy `SYLLABLE_TEXTS` ∪ sylab `ALL_WORDS`; konwencja klucza bez zmian (`syl-MA`, wielkie litery — 24 pliki zostają). Nowe: `syl-CHŁO`, `syl-DŹWIEDŹ`, `syl-GĘŚ`, `syl-KSIĘ`, `syl-NIĄDZ`, `syl-ŚLIW`, `syl-ŻYC`, … Plus klucz UI `reading-blend-prefix` = „Składamy: " w `reading-ui-strings.json`.

**Edge case:** trudne zbitki (`DŹWIEDŹ`, `ŚLIW`, `NIĄDZ`) — po odsłuchu do `pronunciation-overrides.json`. Blending nie gra w wariancie `wild` ani w `syllable-match` (nie ma tam słowa).

**Testy:** każda sylaba każdego słowa ma klucz w wygenerowanym pliku; po `correct` w `word-choice` kolejka zawiera sylaby w kolejności, potem `word-*`.

## 3. Druga próba po błędzie (Litery, Czytanie, Cyferki)

**Dziś:** błąd → korekta z podaniem odpowiedzi → następne pytanie. Zero drugiej próby (`useSession.handleOutcome`, `useReadingSession.handleOutcome`, `useNumbersSession.answer`).

**Nowo — wspólny kontrakt:**
1. `wrong` → SRS aktualizowany **od razu i bez zmian** (box −2, `recentWrong`+1) — pierwsza pomyłka to pomyłka.
2. Audio korekty (jak dziś) + cue `try-again` — klucz **już istnieje** w `math-ui-strings.json` (zofia), a przestrzeń kluczy jest globalna: zero nowego audio.
3. Status `retry`: to samo pytanie, **2 opcje** — poprawna + wybrana przez dziecko, w losowej kolejności.
4. Wynik idzie do logu jako `attempt: 2` i **nie dotyka SRS**: retry-correct nie podnosi boxa (pochwała `retry-correct`, bez iskierki), retry-wrong → hiperkorekcja i dalej. Dokładnie jedna dodatkowa próba.

**Zmiany stanu per moduł:**

| Moduł | Plik | Zmiana |
|---|---|---|
| Litery | `useSession.ts` | nowy `Status = 'retry'`; `retryQuestionRef` z `tiles=[target, chosen]`, `targetSlot` przeliczony; `handleOutcome(outcome, …, attempt)`; `scheduleFeedbackDismiss` przy `wrong && attempt===1 && secondAttempt` idzie do `retry` zamiast `scheduleBreathThenNext`. `QuizCard` już obsługuje 4 kafelki — dla 2 dodajemy gałąź w `gridTemplate` (`1fr 1fr` × 1 rząd) |
| Czytanie | `useReadingSession.ts` | `FeedbackVariant` + faza `retry` dla `syllable-match`, `word-choice`, `syllable-fill` (`choices` przycięte do 2). **`word-assembly` wyłączone** — drag-drop nie ma „dwóch opcji" |
| Cyferki | `useNumbersSession.ts` + `SessionView` | `answer(outcome, attempt)`; `status='retry'` odtwarza to samo `currentQuestion` z `restrictChoicesTo: [correct, chosen]` przekazanym do wspólnego `buildChoices`. Wyłączone dla `number-bond-builder` i `fact-family-triangle` (odpowiedź nie jest wyborem z listy) |

**Ustawienie:** `settings.secondAttempt: boolean`, default `true`, jedna kontrolka globalna.
**Log:** `SessionEventAnswer.attempt?: 1 | 2` (brak pola = `1`), analogicznie w `ReadingSessionEvent`/`NumbersSessionEvent`. `shared/stats/aggregate.ts` liczy `attempt===2` osobno („poprawki: N"), poza correct/wrong.
**Nowe audio:** `retry-correct` (zofia, edge) = „O, teraz dobrze! Poprawiłeś się."
**Edge case:** 🤷 w fazie retry = retry-wrong (hiperkorekcja, bez kary SRS). Pauza → wznowienie powtarza `try-again`.
**Testy:** po jednym na hook — „wrong → retry z 2 opcjami, box zmieniony raz; retry-correct nie zmienia boxa".

## 4. Wypowiadanie liczb zadania (Cyferki)

**Dziś:** `numbers/data/promptAudio.ts` mapuje typ ćwiczenia na jeden generyczny klucz (`ask-howmany-total` itd.). 29 kluczy `number-0..20` i `op-*` w `audio-source/numbers.json` jest **martwych**.

**Nowo:** `promptAudioKey` → `promptAudioKeys(question): string[]`; konsumenci (prompt w `useEffect` każdego ćwiczenia + 🔊 w `SessionView`) kolejkują listę.

| Typ ćwiczenia | Sekwencja |
|---|---|
| `concrete-add`, `doubles`, `near-doubles`, `make-10` | `number-a`, `op-plus`, `number-b`, `ask-howmany-total` |
| `concrete-add-subtract` (op `-`) | `number-a`, `op-minus`, `number-b`, `ask-howmany-left` |
| `equal-groups`, `array-match` | `number-a`, `op-times`, `number-b`, `ask-howmany-total` |
| `ten-frame-fill` | `number-a`, `ask-howmany-missing` |
| `number-bond-builder` | `number-whole`, `ask-build-bond` |
| `subtract-maintenance` | `number-a`, `op-minus`, `number-b`, `ask-howmany-left` |
| `subitize-flash`, `match-digit-dots`, `number-rhythm`, `skip-count-chase`, `fact-family-triangle` | bez zmian (liczby są celem pytania albo jest ich za dużo) |

**Edge case:** argument poza 0–20 → fallback do samego klucza generycznego. Prompt rośnie o ~1,5 s (FIFO serializuje po `session-start`/`intro-*`).
**Testy:** `promptAudio.test.ts` — sekwencje dla 6 reprezentatywnych faktów + guard zakresu.

## 5. Wagi konceptów + `prerequisites` (Cyferki)

**Dziś:** `pickAndSetQuestion` (`useNumbersSession.ts:87`) woła `pickNextItem` na **płaskiej puli faktów poziomu** — Płomyk: `addsub-10` = 90/128 faktów (70% losowań), Ognik: `doubles` 16% mimo „doubles first".

**Nowo — dwa kroki:**
1. **Koncept** — waga: `0` zablokowany, `2` `learning` z faktem `recentWrong>0`, `1` `learning`, `0.4` `mastered` (utrzymanie). Losowanie ważone z anti-repeat wobec poprzedniego konceptu.
2. **Fakt** — `pickNextItem` na faktach *tego* konceptu (bez zmian w `shared/srs/select.ts`).

`ConceptDef` (`numbers/data/concepts.ts`) dostaje `prerequisites?: ConceptId[]`. Odblokowany = wszystkie prerekwizyty `state==='mastered'`. Łańcuchy: Płomyk `bonds-5 → bonds-10 → {tenframe, addsub-10} → factfamily`; Ognik `doubles → neardoubles → make10`, `factfamily-20 ← make10`; Pochodnia `skipcount-2 → {skipcount-5, skipcount-10, equalgroups} → arrays → commutativity`. Iskierka bez prerekwizytów.
**Bezpiecznik:** gdy po filtrze zostaje 0 konceptów — wpuszczamy wszystkie bez prerekwizytów. Maintenance odejmowania w Pochodni (18%) działa jak dziś, przed doborem konceptu. Persist bez zmian (`numbersStore.concepts` już trzyma `state`).
**Testy:** przy zamrożonym rng rozkład 200 losowań w Płomyku nie przekracza 45% dla jednego konceptu; koncept z niespełnionym prerekwizytem nie wychodzi ani razu.

## 6. Audio strategii po błędzie (Cyferki)

**Dziś:** overlay błędu (`numbers/components/SessionView.tsx:476`) gra `try-again-soft` + `correct-show-N`; strategii nikt nie nazywa.

**Nowo:** nowe klucze w `audio-source/math-ui-strings.json` (zofia, edge):

| Klucz | Tekst |
|---|---|
| `strategy-count-on` | Policz od większej liczby: siedem… osiem, dziewięć. |
| `strategy-make10` | Najpierw zrób dziesięć, potem dodaj resztę. |
| `strategy-doubles` | To podwójna liczba — tyle samo i tyle samo. |
| `strategy-near-doubles` | To prawie podwójka: podwójna i jeszcze jeden. |
| `strategy-count-back` | Licz do tyłu od większej liczby. |

Mapa `strategyAudioKey(conceptId, op)` obok `promptAudio.ts`: `adding-concrete`/`addsub-10`(+) → `count-on`; `addsub-10`(−)/`subtract-maintenance` → `count-back`; `ognik-doubles` → `doubles`; `neardoubles` → `near-doubles`; `make10`/`tenframe` → `make10`; reszta `null`. Gra po `correct-show-N`, po drugiej próbie (§3), **max 2× na sesję** — inaczej robi się zrzędzenie.
**Testy:** mapa — 4 przypadki + `null` dla `number-rhythm`.

## 7. Czytanki: tryb echo + tempo

**Dziś:** `useReadAloud` czyta słowo po słowie (`await audioBus.play(cz-word-*)`), 450 ms pauzy między zdaniami, ponowny tap = stop. Brak echa, tempo sztywne.

**Nowo:**
- **Echo**: po każdym **zdaniu** hook wchodzi w `echoing: { s }` na `ECHO_PAUSE_MS = 2500`; `CzytankaView` pokazuje pulsującą ikonę 🗣 (64 px nad tekstem; `prefers-reduced-motion` → statyczna). Tap gdziekolwiek = skip pauzy. Cue `czytanki-echo-intro` raz na uruchomienie ▶.
- **Tempo**: `AudioBus.setPlaybackRate(rate)` — pole klasy przypisywane w `playOne` przy każdym klipie (inaczej gubi się po zmianie `src`). Żółw `0.75`, normalnie `1.0`; przy żółwiu pauza między zdaniami rośnie do 700 ms.
- **UI**: dwie ikony 60×60 obok ▶ — 🗣 (echo) i 🐢 (tempo). Nowe cue w `czytanki-ui-strings.json` (Agnieszka, `_engine: azure`): `czytanki-ui-echo-on`/`-echo-off`/`-slow`/`-normal` oraz `czytanki-echo-intro` = „Posłuchaj, a potem powtórz."
- **Ustawienia**: `settings.czytanki: { echoMode: boolean; tempo: 'turtle' | 'normal' }`, defaulty `false` / `'normal'` — echo włącza dziecko ikoną, ustawienie tylko pamięta wybór.

**Edge case:** `playbackRate` <0.5 zniekształca głos w iOS Safari — 0.75 jest bezpieczne. Wyjście w trakcie pauzy echa: `runId++` w cleanupie (już jest) + czyszczenie timera.
**Testy:** sekwencja z echo ma pauzę po ostatnim słowie zdania; `stop()` w pauzie nie odpala kolejnego zdania.

## 8. Stopping cue + jedna kontrolka długości sesji

**Dziś:** trzy niezależne ustawienia — `sessionLength` 5/10/15 (Litery, default **10**), `reading.questionsPerSession` per poziom (8), `numbers.questionCount` 6/8/10 (8). Koniec: `session-end`/`-perfect`/`session-end-good`, „jeszcze raz" równorzędne z 🏠.

**Nowo:**
- `settings.questionsPerSession: 5 | 8 | 12` (globalne, default **8**) — jedna kontrolka „Ile pytań". Per-moduł/per-poziom zostaje jako „zaawansowane": `reading.questionsPerSession[level]` bez zmian, `numbers.questionCount` staje się overridem, `sessionLength` **usunięte** (Litery czytają globalne).
- **Stopping cue**: `session-stop-enough` (zofia, edge) = „Na dziś wystarczy. Wrócimy jutro!" — gra na `SessionEnd` **każdego modułu**, po jego własnym audio końca, gdy `shared/stats/aggregate.ts` zwróci ≥2 ukończone sesje z dzisiaj (dowolny moduł). Wtedy 🏠 jest głównym przyciskiem, „jeszcze raz" schodzi na mniejszy, boczny.
- **Nudge dla rodzica**: `SuggestionsSection` — „Dziś była jedna sesja; druga wieczorem działa lepiej niż jedna długa", gdy dzisiejszych sesji == 1.

**Testy:** migracja v4→v5 zachowuje resztę ustawień i mapuje `sessionLength` 10→8.

## 9. Czytanki: licznik tapów i czas → raport

**Dziś:** `czytankiStore` (`iskierki-czytanki-v1`, v1) trzyma `openedIds`, `lastOpenedId`, `seenIntros`; `CzytankiStats` (`ReportScreen.tsx:169`) pokazuje „Otwarte X/60".

**Nowo:** store v2 (+ `migrate`, defaulty w `mergeCzytankiState`):
```ts
wordTaps: Record<string, Record<string, number>>  // czytankaId → slug słowa → tapy
timeMs: Record<string, number>                    // czytankaId → skumulowany czas
```
Tap w sylabę i long-press liczą się do **słowa** (`wordAudioKey` bez prefiksu). Czas: `CzytankaView` mierzy od mountu, dolicza przy unmount i `visibilitychange`, cap 10 min na wizytę (zapomniana karta). Zapis batchowany na wyjściu z ekranu, nie per tap.

**Raport:** `CzytankiStats` + „Najczęściej dotykane" (top 5 słów, `WIE-WIÓR-KA — 7×`) i „Łączny czas czytania: X min". `CzytankiSnapshot` w `exporter.ts` o `wordTaps`/`timeMs`; sekcja `## Czytanki` w eksporcie MD dostaje te same dwie linie.
**Edge case:** brak danych → sekcja jak dziś. Reset postępu czyści też tapy i czas.
**Testy:** merge v1→v2 daje puste mapy i nie gubi `openedIds`; top-5 sortuje malejąco.

## 10. Pochwały procesowe

**Dziś:** wszystkie pochwały oceniają osobę/wynik (`praise-1..12`, `reading-praise-1..6`, `NUMBERS_PRAISE_KEYS`); pickery `pickPraiseKey` (`useSession.pickers.ts`) i `pickNoRepeat`.

**Nowo:** nowe klucze (wszędzie głos zofia) i **losowanie 50/50** — rzut monetą między listą procesową a wynikową, potem `pickNoRepeat` **wewnątrz** wybranej listy (`lastPraiseRef` pamięta klucz niezależnie od listy).

- `ui-strings.json` — `praise-proc-1..10`: „uważnie słuchałeś", „nie poddałeś się", „poprawiłeś się", „dobrze pomyślałeś", „słuchałeś do końca", „próbowałeś i wyszło", „szukałeś spokojnie", „nie spieszyłeś się", „skupiłeś się", „sam to znalazłeś".
- `reading-ui-strings.json` — `reading-praise-proc-1..6`: „ładnie poskładałeś sylaby", „słuchałeś uważnie", „czytałeś powoli i dobrze", „sam to rozłożyłeś", „nie poddałeś się", „dobrze wybrałeś".
- `math-ui-strings.json` — `praise-proc-num-1..6`: „policzyłeś po kolei", „sprawdziłeś zanim wybrałeś", „użyłeś dobrej strategii", „nie zgadywałeś", „pomyślałeś o dziesiątce", „liczyłeś od większej".

**Testy:** przy `rng` <0.5 klucz pochodzi z listy procesowej; brak powtórzenia z poprzednim.

## 11. Paleta sylab bezpieczna dla daltonistów

**Dziś:** `src/shared/ui/syllableColors.ts` = `['#1d4ed8', '#dc2626', '#16a34a', '#9333ea']` — czerwień sąsiaduje z zielenią (deuteranopia: sylaba 2 i 3 nieodróżnialne), a kolor jest jedynym nośnikiem granicy sylaby. Konsumenci: `SyllableText.tsx:18`, `DropSlot.tsx:72`, `SyllableFillExercise.tsx:160`, `CzytankaView.tsx:220` + **cztery zestawy hardkodowanych spanów** w `src/app/Home.tsx` (171-173, 222-223, 273-275, 327-333).

**Nowo:** paleta Okabe–Ito z jedną korektą kontrastu: `#0072B2`, `#B35900` (pomarańcz **przyciemniony** — oryginalne `#E69F00` daje ~2,1:1 na `#fef9f2`, poniżej progu nawet dla dużego tekstu), `#009E73`, `#CC79A7`. Wszystkie ≥3:1, a sylaby mają 40–64 px = duży tekst (WCAG 1.4.3).

Nowe API: `getSyllableCue(index): { color: string; underline: 'solid' | 'dotted' | 'dashed' | 'double' }`. Kod niekolorowy = `borderBottom: 3px <style>` (nie `text-decoration` — w Lexend wchodzi w wydłużenia dolne). `getSyllableColor` zostaje jako wrapper, żeby nie łamać importów. `Home.tsx` przechodzi na helper.
**Edge case:** `DropSlot` w stanie `filled` dostaje też `underline`. Obwolutka słowa w czytankach zostaje (inna granica: słowo, nie sylaba).
**Testy:** 4 kolory, 4 style, cykliczność dla index ≥ 4.

---

## Migracje i persist — podsumowanie

| Store | Klucz | Było → jest | Uwaga |
|---|---|---|---|
| `settingsStore` | `iskierki-state-v1` | v4 → **v5** | `migrate` mapuje `sessionLength`→`questionsPerSession`; `merge` dopisuje `letters.promptMode`, `czytanki.*`, `secondAttempt`. Bez `migrate` zustand skasuje stan |
| `czytankiStore` | `iskierki-czytanki-v1` | v1 → **v2** | `merge` dodaje `wordTaps: {}`, `timeMs: {}` |
| `lettersStore`, `readingStore`, `numbersStore` | — | bez zmian | logi sesji zyskują opcjonalne `attempt` — stare wpisy czytane jako `1` |

## Kolejność implementacji

1. **Audio-source w jednej paczce** (§1, §2, §6, §7, §10 + `retry-correct`, `session-stop-enough`, `reading-blend-prefix`) → `audio:dry` → `audio:build` → **odsłuch** → override'y → rebuild. Jedyny krok z zewnętrzną zależnością (limit F0) i najdłuższym ogonem.
2. **§11 paleta** i **§10 pochwały** — izolowane, natychmiast widoczne, zero ryzyka.
3. **§4 liczby** → **§6 strategie** → **§5 wagi/prerequisites** (jeden moduł, rosnące ryzyko).
4. **§3 druga próba** — trzy hooki, największa zmiana maszyny stanów; po §4–5, żeby nie mieszać zmian w `useNumbersSession`.
5. **§1 tryb promptu** i **§2 synteza** — dopiero gdy audio jest odsłuchane.
6. **§7 echo/tempo** i **§9 tapy/czas** (Czytanki), **§8 długość sesji + stopping cue** na końcu (dotyka SettingsScreen i wszystkich `SessionEnd`).

Po każdym kroku: `pnpm tsc -b`, `pnpm test --run`, `pnpm audio:check`. Test w przeglądarce (iPad viewport) > testy jednostkowe — testy tylko tam, gdzie wypisane powyżej.

## Ryzyka

- **Izolowane zwarte w Azure** (§1) mogą wyjść jako cisza lub trzask — plan B: `manual-overrides/phon-<x>.mp3`. To jedyne ryzyko, które może wywrócić pozycję #1.
- **Limit F0** — ~130 nowych kluczy Azure (32 fonemy + 32 nazwy + 65 sylab) przy throttlingu ~20 req/min ≈ 7 min buildu. Klucz w `.env.local` jest **do zregenerowania** (STATUS.md).
- **Wydłużenie feedbacku** (§1 `both`, §2 synteza, §3 retry, §6 strategia) — sesja może urosnąć o 1–2 min; dlatego §8 obniża Litery z 10 na 8 pytań. Zmierzyć realny czas na iPadzie.
- **§3 w Cyferkach** dotyka `buildChoices` (~13 ćwiczeń) — tu regresja dystraktorów jest najbardziej prawdopodobna.
- **Diakrytyki w nazwach plików** (`syl-GĘŚ.mp3`) — precedens `letter-ą.mp3` działa, ale po deployu sprawdzić 404 w Network (APFS maskuje to lokalnie).

## Decyzje (2026-08-29, po review speca)

- Tryb `both`: kolejność **nazwa → fonem** („be… b"), fonem jako ostatni bodziec przed wyborem.
- Klucze sylab modułu 2 migrujemy na lowercase `slugPl` (`syl-ma`, `syl-ge_s_`) — spójnie z czytankami i zasadą lowercase; 24 pliki + manifest + `getSyllableAudioKey`.
- Klucz Azure w `.env.local` działa (sprawdzone 200 na `voices/list`).
