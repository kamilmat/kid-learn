# Iskierki — moduł liter, iteracja UX v1.1

**Data:** 2026-04-27
**Bazowy spec:** [`2026-04-26-iskierki-letters-module-design.md`](./2026-04-26-iskierki-letters-module-design.md)
**Status:** zaakceptowany w brainstormie, czeka na writing-plans

## Cel

Po pierwszej iteracji modułu liter (działającej end-to-end) user wskazał trzy obszary do poprawy:
1. Odzew dla dziecka jest sterylny — pochwały statyczne, brak mascotki w sesji, brak dźwiękowych nagród, sucha korekta po błędzie.
2. Tempo sesji jest "gonione" — pasek countdown + cue dźwiękowy + czerwień + zero pauzy między pytaniami daje cztery bodźce stresu naraz.
3. Czcionka pisana (`Caveat` + `Itim`) nie jest zgodna z polskim standardem szkolnym.

Iteracja v1.1 obejmuje obszary **B (cieplejszy odzew)** i **A (tempo)**. Obszar **D (czcionka)** jest świadomie odłożony do v2 (uzasadnienie w sekcji "D — odłożone"). Audio (głosy lektorów / nagrania zewnętrzne) zostaje na v2 — patrz `memory/project_audio_voice_consistency.md`.

## B — Cieplejszy odzew

### B1 — Mascotka Iskra w sesji

**Stan obecny:** `IskraMascot.tsx` (4 stany × 4 intensywności, CSS animations) jest gotowy ale nie używany w sesji. `FeedbackOverlay` w wariancie `mastery` pokazuje gołe emoji 🔥.

**Zmiany:**

- **W `FeedbackOverlay`** podmieniam emoji 🔥 i wszystkie warianty na pełną `IskraMascot`:
  - `correct` → `state="happy"`, intensywność `flame`
  - `mastery` → `state="dance"`, intensywność `torch` (najwyższa)
  - `dontKnow` → `state="idle"`, intensywność `spark` (neutralna)
  - `timeout` → `state="idle"`, intensywność `spark` (neutralna)
- **Dla wariantu `wrong`** (który nie renderuje pełnego overlay'a) — dorzucam **mini-mascotkę** w QuizCard, pokazaną na czas trwania feedback (5s × tempo). Lokalizacja: nad lub obok kafelka który dziecko kliknęło, w stanie `surprise`, intensywność `spark`. Kafelki dalej widoczne (overlay nie blokuje QuizCard).
- **W `QuizCard` status barze** — dorzucam **małą Iskrę** (~50px) obok licznika 🔥 iskierek, w stanie `idle`. Stała obecność jako "kompan" przez sesję, bez dystrakcji. Intensywność rośnie z streak'iem (patrz B4).

**Pliki do zmiany:**
- `src/modules/letters/components/FeedbackOverlay.tsx` — podmiana emoji na komponent + mapowanie wariantów na stan/intensywność
- `src/modules/letters/components/QuizCard.tsx` — dorzucenie mascotki w status barze + obsługa mini-mascotki dla `wrong`
- `src/modules/letters/components/SessionView.tsx` — przekazanie obecnego streak'a / intensywności do QuizCard

### B2 — Dźwiękowe efekty (SFX)

**Stan obecny:** zero efektów dźwiękowych — sesja gra wyłącznie głosem (TTS Zofia). Komentarz w `useSession.ts` wspomina ding (~0.3s) dla correct ale w kodzie go nie ma.

**Zmiany:**

- Dorzucam **2 pliki SFX** z licencją CC0 z mixkit.co lub freesound.org:
  - `sfx-correct-ding.mp3` (~0.3s) — krótki kid-friendly chime, leci PRZED głosem pochwały dla `correct`
  - `sfx-mastery-fanfara.mp3` (~1s) — krótka fanfara, leci PRZED głosem `mastery-celebration`. **Zarezerwowana dla mastery** (rzadkie, jednorazowe per-litera) — NIE reużywamy dla streak'a, żeby nie zdewaluować "Iskra! Umiesz!" emocjonalnie.
- Streak 7+ (B4) **bez SFX** — wystarczy audio "ognisty streak!" + zmiana intensywności mascotki.
- **Dla `wrong`/`dontKnow`/`timeout` — żaden dźwięk negatywny.** Tylko głos + mascotka.
- **Brak sparkle dla iskierek counter** — mascotka i tak macha (stan `idle` z animacją).

**Pipeline integracja (KRYTYCZNE — manual-only nie zostanie skopiowany):**

`scripts/generate-audio.ts` iteruje wyłącznie po kluczach z SOURCE_FILES (`letters.json`/`ui-strings.json`/`words.json`). Plik wrzucony tylko do `manual-overrides/` bez wpisu w którymś JSON-ie zostanie zignorowany.

**Rozwiązanie:** dorzucamy klucze `sfx-correct-ding` i `sfx-mastery-fanfara` do `audio-source/ui-strings.json` z wartością tekstową `"_sfx_"` (pseudo-hash, NIE używana przez TTS bo manual override wygrywa). `decideAction` zobaczy `hasOverride: true` → kopiuje plik z `manual-overrides/` do `public/audio/` + zapisuje manifest entry. Hash `_sfx_` zapewnia że nawet jeśli ktoś przypadkiem usunie override, `decideAction` zwróci `tts` z absurdalnym tekstem `"_sfx_"` (graceful degradation — wygeneruje "podkreślenie es ef iks podkreślenie" zamiast crashu, łatwo zauważalne).

**Pliki do zmiany:**
- `audio-source/ui-strings.json` — klucze `sfx-correct-ding` i `sfx-mastery-fanfara` z wartością `"_sfx_"`
- `audio-source/manual-overrides/sfx-correct-ding.mp3` — pobrane CC0
- `audio-source/manual-overrides/sfx-mastery-fanfara.mp3` — pobrane CC0
- `src/modules/letters/hooks/useSession.ts` — w `handleOutcome` dla `correct` dorzucić `void cfg.audioBus.play('sfx-correct-ding')` PRZED `praise`, dla `mastery` dorzucić `sfx-mastery-fanfara` PRZED `mastery-celebration`

**Konkretny wybór plików** (kryteria, decyzja PRZED writing-plans nieprzewidziana — ale lista wybranych URLi w plan implementacyjnym):
- krótkie (ding ≤400ms, fanfara ≤1.2s)
- bright/cheerful (kid-friendly), brak wokalu, brak długiego wybrzmiewania
- 44.1kHz mp3, mono OK
- sprawdzone licencje CC0 z mixkit.co (kategoria "Game" / "Children" / "Notification") — np. mixkit "correct-answer-tone" (ding) + mixkit "achievement-bell" / "fairy-arcade" (fanfara). Final wybór w fazie implementacji, ale nie blokuje speca.

### B3 — Treści odzywek

**Stan obecny:** `audio-source/ui-strings.json` ma 6 statycznych pochwał, 2 strofujące teksty timeout, 1 sucho-neutralny correction-prefix.

**Zmiany — `audio-source/ui-strings.json`:**

**Pochwały: 6 → 12.** Pełna pula:
- `praise-1` "świetnie!" (zostaje)
- `praise-2` "brawo!" (zostaje)
- `praise-3` "tak jest!" (zostaje)
- `praise-4` "umiesz!" (zostaje)
- `praise-5` "super!" (zostaje)
- `praise-6` "ekstra!" (zostaje)
- `praise-7` "wow!" *(nowe)*
- `praise-8` "umiesz to!" *(nowe)*
- `praise-9` "super ci poszło!" *(nowe)*
- `praise-10` "świetna robota!" *(nowe)*
- `praise-11` "pięknie!" *(nowe)*
- `praise-12` "tak, tak!" *(nowe)*

Logika wyboru w `useSession.ts`: prosta funkcja "no-repeat with last" — losuje, ale nie tę co poprzednio. Trzymamy `lastPraiseKeyRef`, przy losowaniu filtrujemy.

**Timeout — usuwamy strofujące, scalamy z dontKnow audio:**

- Usuwamy `timeout-1` ("spróbuj szybciej") i `timeout-2` ("następnym razem szybciej") — sugerują presję czasu, której w module rozpoznawania nie chcemy.
- Dla wariantu `timeout` w `useSession.ts.handleOutcome` używamy tej samej puli co `dontKnow`: `dont-know-1` / `dont-know-2` / `dont-know-3` ("nie szkodzi", "nic się nie stało, uczymy się", "spokojnie, posłuchaj jeszcze raz").
- **SRS dalej rozróżnia** `outcome === 'timeout'` vs `'dontKnow'` — różnica tylko w warstwie audio. Statystyki rodzica i adaptive learning bez zmian.

**Wrong — cieplejszy correction-prefix z wariantem kontekstowym:**

- `correction-prefix-1` "ojej, posłuchaj!" *(nowe — zastępuje obecne `correction-prefix`)*
- `correction-prefix-2` "to była literka..." *(nowe — neutralne, bezpośrednie)*
- `correction-prefix-3` "spokojnie, słuchamy" *(nowe)*
- `correction-prefix-contrastive` "ach, te dwie są podobne — to literka..." *(nowe — używane TYLKO gdy `chosenLetter ∈ CONTRASTIVE_PAIRS[targetLetter]`)*

W `useSession.ts.handleOutcome` dla `wrong`: jeśli `chosenLetter` jest w parze contrastive z target → użyj `correction-prefix-contrastive`. W przeciwnym razie losuj jednego z 1/2/3.

**Wszystkie 4 prefixy to JEDEN plik audio każdy** (nie per-litera). Po prefiksie kolejka AudioBus dograje istniejące `letter-${target}` (jak teraz dla `correction-prefix` w `useSession.ts:568-569`). Kolejność audio dla wrong: `correction-prefix-X` → `letter-${target}`.

**Stary klucz `correction-prefix`** — usuwamy z `ui-strings.json` w tej iteracji (kod przestaje go wołać po implementacji B3). Wygenerowany plik `public/audio/correction-prefix.mp3` zostaje na dysku do najbliższego cleanu (`pnpm audio:build` regeneruje tylko zmienione, nie usuwa osieroconych — to OK).

**Pliki do zmiany:**
- `audio-source/ui-strings.json` — pochwały 7-12, correction-prefix-1/2/3/contrastive, usunięcie timeout-1/2
- `src/modules/letters/hooks/useSession.ts` — picker pochwał z no-repeat-with-last, picker correction-prefix z kontekstem contrastive, scalenie timeout audio z dontKnow
- po edycji JSON-ów: `pnpm audio:build` (regeneruje tylko zmienione)

### B4 — Mikrocelebracje

**Stan obecny:** zero streak'ów / mikroosiągnięć. Mastery jest jedyną celebracją powyżej zwykłej pochwały.

**Zmiany:**

**Streak counter w sesji** — licznik kolejnych `correct` w sesji (resetowany po dowolnej nie-correct).

- Próg **3** → po feedback overlay leci audio `streak-3` "trzy z rzędu!" + Iskra w status bar zmienia intensywność `spark → flame`
- Próg **5** → audio `streak-5` "pięć z rzędu!" + intensywność `flame → fire`
- Próg **7+** → audio `streak-7-plus` "ognisty streak!" + intensywność `fire → torch` + reużycie pliku `sfx-mastery-fanfara` (B2) jako tła
- Reset streak'a (np. po wrong) → intensywność wraca do `spark`. **W v1.1 skok jest OK** (bez animowanej zmiany — to v2 polish, nie MVP).
- Audio streak leci PO głosie pochwały + assoc, PRZED kolejnym pytaniem (kolejka AudioBus). **Wymaga rozszerzenia `FEEDBACK_DURATION_BASE_MS.correct`** o czas streak audio gdy próg osiągnięty — inaczej overlay zamknie się przed końcem "trzy z rzędu!". Implementacja: w `handleOutcome` dla `correct` po wyliczeniu streak'a, jeśli próg osiągnięty → dorzucamy do `durationMs` **2000ms** (zmierzony górny bound dla 3-sylabowych fraz Edge TTS PL Zofia, np. "ognisty streak!" ~1.6-1.9s + bufor). Stała `STREAK_AUDIO_DURATION_MS = 2000`. Jeśli przy pomiarze realnego audio okaże się że plik jest dłuższy/krótszy, korygujemy w fazie implementacji (jeden punkt zmiany).

**Stan streak'a:** `currentStreakRef: useRef<number>` (logika) + `currentStreak: useState<number>` (rerender). Eksponujemy w `UseSessionApi` jako `currentStreak: number`. Bez tego `QuizCard` nie zobaczy zmiany intensywności mascotki. Aktualizacja state'u synchroniczna w `handleOutcome` (incremental dla correct, reset do 0 dla pozostałych).

**Perfekcyjna sesja** — w `finishSession` warunki **muszą być spełnione razem** (inaczej exploit "1 correct + quit → fanfara"):
1. `events.filter(e => e.type === 'answer').length === sessionLength` (sesja przeszła wszystkie pytania, nie była przerwana przez `quit`)
2. wszystkie answer events mają `outcome === 'correct'`

Wtedy gra `session-end-perfect` "perfekcyjna sesja! wszystkie literki!" + Iskra `dance/torch` w SessionEnd + sparkle wizualne. Inaczej zwykłe `session-end`.

**Skreślone (poza scope v1.1):**
- Milestones iskierek (10/25/50) cross-session — wymaga osobnej persistencji licznika, mała moc emocjonalna dla MVP
- Recovery po wrong ("wracasz!") — brzmi sztucznie
- Pierwsza correct w nowej literze — moduł i tak ma onboarding, redundantne

**Pliki do zmiany:**
- `audio-source/ui-strings.json` — `streak-3`, `streak-5`, `streak-7-plus`, `session-end-perfect`
- `src/modules/letters/hooks/useSession.ts` — streak counter w refie + emit po feedback + reset, sprawdzenie perfect w `finishSession`
- `src/modules/letters/components/QuizCard.tsx` — propagacja intensywności mascotki w status bar od streak'a
- `src/modules/letters/components/SessionEnd.tsx` (lub gdzie jest end screen) — wariant perfect

## A — Tempo i oddech

**Stan obecny:**
- Default `timeLimit: 15`, opcje `'off' | 10 | 15 | 20`
- `showCountdownBar: true` globalnie
- `COUNTDOWN_3S_WARNING_MS = 5000` (cue na 5s — niespójne z nazwą)
- Pasek: zielony >50%, żółty >20%, **czerwony <20%**
- Po feedback overlay → 0ms pauzy → kolejne pytanie

**Zmiany:**

1. **Per-level `showCountdownBar`** — settings rozszerzone o `Partial<Record<Level, boolean>>` (analogicznie do `caseMode`/`styleMode`/`tilesPerQuestion`). Per-level defaults:
   - `iskierka` → `false` (najmłodsi/nowi — bez tykającego paska)
   - `plomyk` → `false`
   - `ognik` → `true`
   - `pochodnia` → `true`
   Override z settings ma priorytet nad per-level default. Helper `getEffectiveShowCountdownBar(settings, level)` analogicznie do `getEffectiveTilesPerQuestion`.

2. **Złagodzenie palety paska** (gdy widoczny): zielony >40%, ciepły żółty >15%, miękki pomarańczowy <15%. Usuwamy intensywną czerwień (`#e26a4f` → `#e89270` lub podobny). Zmiana w `QuizCard.tsx::countdownColor`. **Pasek to fill na tle `#eeeef2`** — nowe kolory (zielony / żółty / pomarańczowy) muszą mieć kontrast ≥3.0 do tła (WCAG non-text). Walidacja w fazie implementacji.

3. **Cue dźwiękowy `cue-warning-3s`** — przesuwam próg z 5s na **3s** pozostałego. Stała `COUNTDOWN_3S_WARNING_MS = 3000` (nazwa zgodna z wartością). Cue wciąż leci tylko przy `showCountdownBar === true` (cue + brak paska byłoby dziwne — bez paska dziecko nie ma kontekstu wizualnego). **Tekst audio `cue-warning-3s` ("uwaga, mało czasu") się nie zmienia** — plik mp3 nie wymaga regeneracji, tylko logika.

4. **500ms wdech** między feedback overlay a kolejnym pytaniem. Implementacja: rozdzielam na dwa setTimeout'y — najpierw zamykamy overlay (`setLastFeedback(null)`, `setStatus('playing')` ale bez `generateNextQuestion`), potem po 500ms `generateNextQuestion`. To daje krótką "czarną" scenę między feedback a pytaniem — wdech.

   **Sync z AudioBus FIFO (krytyczne — bez tego race condition):** Wdech 500ms biegnie niezależnie od długości audio w kolejce. Gdy streak audio (B4) lub głos pochwały zaciął się o ~200ms, kolejka FIFO będzie kolejkować nowy `letter-${target}` ZA niedokończonym poprzednim audio — dziecko usłyszy "ognisty streak!" → "ka" zamiast wdechu i nowego pytania. **Polityka:** na granicy wdechu (przed `generateNextQuestion`) wywołujemy `audioBus.stop()`. Urywa to ewentualny ogon poprzedniego audio (dla 7-latka 100-200ms ucięcia "trzy z rzędu!" jest niedostrzegalne). Daje deterministyczne zachowanie: feedback overlay zniknie → 500ms wdech → `audioBus.stop()` → `audioBus.play(letter-X)` w czystej kolejce.

5. **Rozszerzenie opcji `timeLimit`** o **25s** dla rodziców którzy chcą jeszcze więcej spokoju. Aktualizacja `TimeLimit` typu i SettingsScreen UI.

6. **Feedback durations zostają** — w połączeniu z B1/B2 (mascotka + ding/fanfara) obecne czasy są dobrze skalibrowane.

7. **CSS variable `--font-handwritten`** (mikrotask ułatwiający v2 — patrz sekcja D). Wprowadzamy w `src/index.css`, podmieniamy 5 miejsc hard-codowanych. Zero zmian wizualnych.

**Pliki do zmiany:**
- `src/shared/settings/types.ts` — `TimeLimit` rozszerzony o `25`, `Settings` rozszerzony o `showCountdownBar?: Partial<Record<Level, boolean>>` (oraz pozostawiamy obecny globalny boolean — patrz uwaga niżej)
- `src/shared/settings/defaults.ts` — `levelDefaults` rozszerzone o `showCountdownBar`, helper `getEffectiveShowCountdownBar`
- `src/shared/settings/components/SettingsScreen.tsx` — UI dla 25s opcji + per-level `showCountdownBar` (analogicznie do tilesPerQuestion override)
- `src/shared/settings/settingsStore.ts` — merge callback dorzuca default dla nowego pola
- `src/modules/letters/components/SessionView.tsx` — przekazanie efektywnego `showCountdownBar` do useSession
- `src/modules/letters/components/QuizCard.tsx` — `countdownColor` z nową paletą + nowe progi
- `src/modules/letters/hooks/useSession.ts` — `COUNTDOWN_3S_WARNING_MS = 3000`, cue tylko gdy `showCountdownBar`, 500ms wdech między feedback a pytaniem

**Uwaga implementacyjna:** Aktualne `Settings.showCountdownBar: boolean` (default `true`) jest globalne. Po zmianie na per-level zastępujemy w pełni: `showCountdownBar?: Partial<Record<Level, boolean>>` — analogicznie do `caseMode`/`styleMode`/`tilesPerQuestion`. **Migracja w `settingsStore` merge callback:** **drop'ujemy stary boolean całkowicie** (`{}` jako wartość początkowa), wszystkie poziomy biorą nowe per-level defaults (iskierka/płomyk = `false`, ognik/pochodnia = `true`). Powód: nie umiemy odróżnić "user świadomie ustawił true" od "user nigdy nie dotykał, true to był domyślny". Propagacja starego boola do wszystkich poziomów dla user'ów z defaultem `true` zniweczyłaby cel zmiany (łagodniejszy default dla młodszych). Baza user'ów jest mała, ryzyko regresji minimalne. Test w `settingsStore.test.ts`: `{ showCountdownBar: true }` w localStorage → po rehydracji `settings.showCountdownBar === {}` (zignorowane).

**Kontrakt `useSession` API:** hook dalej przyjmuje **płaski boolean** `showCountdownBar: boolean`. Resolver `getEffectiveShowCountdownBar(settings, level)` żyje w `SessionView` (analogicznie do tilesPerQuestion). Sygnatura `UseSessionConfig` bez zmian dla tego pola.

## D — odłożone do v2

**Decyzja:** czcionka pisana **nie jest zmieniana w v1.1**.

**Powód:** brak darmowego (OFL/CC0) fontu który byłby polskim elementarzem 1:1 (research z 2026-04-27). Caligraf-E krąży bez LICENSE → ryzyko prawne. Kalam/Caveat/Patrick Hand mają polskie diakrytyki ale anglosaskie kształty — robienie "trochę lepiej anglosasko" gdy cel to "polski standard" mija się z celem.

**Plan v2:** SVG path per litera (29 small + 29 caps = 58 ścieżek) na bazie skanu wzornika WSiP/Nowa Era. Robione **razem z tracingiem palcem** — dwie funkcje za jednym kosztem (elementarzowy kształt + animacja `stroke-dasharray` "rysowania" do ćwiczenia tracingu).

**TODO w settings UI (poza scope v1.1):** krótka informacja dla rodzica obok podglądu trybu pisanego: "Krój 'Pismo ręczne' jest stylizowany — wzorzec elementarza zaplanowany w v2". Dorzucone gdy dochodzimy do v2.

**Mikrotask v1.1 ułatwiający v2:** wprowadzamy CSS variable `--font-handwritten: 'Caveat', 'Itim', cursive` w `src/index.css` i podmieniamy wszystkie hard-codowane fonty pisane (`HandwrittenLetter.tsx:28`, `LetterTile.tsx:77`, `FeedbackOverlay.tsx:201`, `Home.tsx:79,128`) na `var(--font-handwritten)`. Zero zmian wizualnych w v1.1, ale w v2 podmiana fontu = jeden line edit. ~10 minut roboty, dorzucone do A jako dodatkowy punkt.

## Audio — odłożone do v2

Z research'u 2026-04-27 wynikło że jakiekolwiek nagrania zewnętrzne (np. Olaf z Lingua Libre, CC0) są w **innym głosie** niż obecny TTS (Zofia). User odrzucił miks głosów — patrz `memory/project_audio_voice_consistency.md`. Pełna podmiana audio (nagranie własne / Fiverr / inny lektor) to osobna inwestycja na v2.

**v1.1 zostaje przy Edge TTS Zofia** dla wszystkich liter, tylko teksty się zmieniają (B3) i ich Edge TTS regeneruje.

## Audit nieużywanych kluczy audio

Przy okazji B3 robimy mały audit `audio-source/ui-strings.json`. Klucze do **usunięcia** (kod ich nigdzie nie woła; zweryfikowane grep'em w fazie implementacji):
- `feedback-wrong-prefix` — komentarz w `useSession.ts:16` o nim wspomina, ale kod używa `correction-prefix` (linia 568)
- `feedback-correct-suffix` — niewywoływany
- `still-there` — engagement layer wspomina ale w sesji niewpinany
- `try-again` — niewywoływany
- `summary-intro` — niewywoływany w SessionEnd

Klucze usuwane bo zastępujemy je w B3:
- `correction-prefix` → wymieniony przez `correction-prefix-1/2/3/contrastive`
- `timeout-1`, `timeout-2` → audio scalone z `dont-know-1/2/3` (B3)

Po usunięciu kluczy z JSON: `pnpm audio:check` przejdzie (sprawdza tylko obecność dla aktualnych kluczy). Stare pliki mp3 w `public/audio/` zostają jako sieroty — `audio:build` ich nie usuwa, ale nie bolą (kosz kilkadziesiąt KB). Można jednorazowo wyczyścić ręcznie w cleanup commit.

**Pliki do zmiany w audicie:** `audio-source/ui-strings.json` (delete), `public/audio/.manifest.json` (regen po build).

## Out of scope v1.1

- Imię dziecka w pochwałach (wymaga settings + UI + N×wariantów audio — duża praca, mały zysk)
- Milestones iskierek cross-session (10/25/50)
- Recovery po wrong / pierwsza correct w nowej literze
- Drugi typ ćwiczenia ("widzisz literę → wybierz obrazek")
- Tracing palcem
- Czcionka elementarzowa (D — patrz wyżej)
- Pełna podmiana audio (głos lektora — patrz wyżej)
- Drugi/trzeci moduł (sylaby, cyfry)

## Lista plików do zmiany (zbiorczo)

**Audio source:**
- `audio-source/ui-strings.json` — pochwały 7-12, correction-prefix-1/2/3/contrastive, streak-3/5/7-plus, session-end-perfect, usunięcie timeout-1/2
- `audio-source/manual-overrides/sfx-correct-ding.mp3` — nowy plik CC0
- `audio-source/manual-overrides/sfx-mastery-fanfara.mp3` — nowy plik CC0

**Build pipeline:**
- `scripts/generate-audio.ts` — weryfikacja obsługi raw SFX (jeśli nie obsługuje, dorzucenie sekcji `sfx.json` lub mechanizmu)

**Settings:**
- `src/shared/settings/types.ts`
- `src/shared/settings/defaults.ts`
- `src/shared/settings/settingsStore.ts` (merge callback)
- `src/shared/settings/components/SettingsScreen.tsx`

**Letters module:**
- `src/modules/letters/hooks/useSession.ts`
- `src/modules/letters/components/QuizCard.tsx`
- `src/modules/letters/components/FeedbackOverlay.tsx`
- `src/modules/letters/components/SessionView.tsx`
- `src/modules/letters/components/SessionEnd.tsx` (perfect variant)

**Tests** (zgodnie z user'ową kulturą "minimum testów" — tylko nietrywialna logika):
- **`pickPraiseKey` no-repeat-with-last** — dwa kolejne wywołania nie zwracają tego samego klucza (12 puli, prosty test deterministyczny z mock RNG)
- **`pickCorrectionPrefix(target, chosen, contrastivePairs)`** — wybór `contrastive` gdy chosen ∈ pair, losowy 1/2/3 inaczej (test edge case'ów: chosen === target nie powinno się zdarzyć ale pokrywamy)
- **`detectPerfectSession`** — pokrywa exploit "1 correct + quit ≠ perfect"; tylko `length === sessionLength && all correct` → true
- **Streak counter** — sekwencje `correct, correct, wrong, correct` → streak `1, 2, 0, 1`; mapping streak → intensywność (`<3 → spark, 3..4 → flame, 5..6 → fire, 7+ → torch`)
- **Migracja `showCountdownBar`** — `{ showCountdownBar: true }` w localStorage → po rehydracji `settings.showCountdownBar === {}` (drop'ujemy stary boolean)
- Aktualizacja istniejących testów useSession — część obecnych ma stale assertions z czasów gdy duration był inny (patrz STATUS.md). Naprawiamy przy okazji edycji `useSession.ts`.

**Pomijamy** (manualne / pokryte przez istniejące testy):
- testy SFX (manual-override copying jest pokryty przez `generate-audio.test.ts`)
- testy mascotki w sesji (wizualne, manualne w przeglądarce)
- testy palety countdown bar (wizualne)

**Dokumentacja:**
- `docs/STATUS.md` — update po implementacji

## Następne kroki

1. **User review** tego specu.
2. Po akceptacji → invoke **writing-plans** skill dla podzielenia na konkretne zadania implementacyjne (kolejność: B3 jako najtańsze pierwsze; B2 i B1 razem bo się przeplatają wizualnie z dźwiękiem; B4 wymaga B1 i B2; A osobno na końcu).
3. Implementacja wg planu, każdy etap = osobny commit.
