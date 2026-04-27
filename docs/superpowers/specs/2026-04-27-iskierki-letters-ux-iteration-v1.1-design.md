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

- Dorzucam **2 pliki SFX** do `public/audio/` z licencją CC0 z mixkit.co lub freesound.org:
  - `sfx-correct-ding.mp3` (~0.3s) — krótki kid-friendly chime, leci PRZED głosem pochwały dla `correct`
  - `sfx-mastery-fanfara.mp3` (~1s) — krótka fanfara, leci PRZED głosem `mastery-celebration`
- **Reużywamy** `sfx-mastery-fanfara` dla streak'a 7+ (B4) — żeby nie utrzymywać 3 plików.
- **Dla `wrong`/`dontKnow`/`timeout` — żaden dźwięk negatywny.** Tylko głos + mascotka.
- **Brak sparkle dla iskierek counter** — mascotka i tak macha (stan `idle` z animacją).

**Pliki do zmiany:**
- `audio-source/manual-overrides/` — wrzucenie 2 plików (omijają TTS pipeline, idą prosto do public/audio/)
- `scripts/generate-audio.ts` — sprawdzić czy obsługuje "raw" pliki bez wpisu w letters.json/ui-strings.json/words.json (jeśli nie, dorzucić sekcję `sfx-*` w jednym z plików lub osobny `sfx.json`)
- `src/modules/letters/hooks/useSession.ts` — w `handleOutcome` dla `correct` dorzucić `void cfg.audioBus.play('sfx-correct-ding')` PRZED `praise`, dla `mastery` dorzucić `sfx-mastery-fanfara` PRZED `mastery-celebration`

**Decyzja źródła plików:** mixkit.co (CC0, brak konieczności atrybucji). Konkretne pliki do wybrania w fazie implementacji — kryteria: krótkie, jasne, dziecięce, brak wokalu (żeby nie kolidowało z głosem).

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
- Audio streak leci PO głosie pochwały + assoc, PRZED kolejnym pytaniem (kolejka AudioBus). **Wymaga rozszerzenia `FEEDBACK_DURATION_BASE_MS.correct`** o czas streak audio gdy próg osiągnięty — inaczej overlay zamknie się przed końcem "trzy z rzędu!". Implementacja: w `handleOutcome` dla `correct` po wyliczeniu streak'a, jeśli próg osiągnięty → dorzucamy do `durationMs` 1500ms (czas audio streak). Stała `STREAK_AUDIO_DURATION_MS = 1500`.

**Perfekcyjna sesja** — w `finishSession` jeśli wszystkie `events.filter(e => e.type === 'answer').every(e => e.outcome === 'correct')` → zamiast zwykłego `session-end` gra `session-end-perfect` "perfekcyjna sesja! wszystkie literki!" + Iskra `dance/torch` w SessionEnd + sparkle wizualne.

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

2. **Złagodzenie palety paska** (gdy widoczny): zielony >40%, ciepły żółty >15%, miękki pomarańczowy <15%. Usuwamy intensywną czerwień (`#e26a4f` → `#e89270` lub podobny). Zmiana w `QuizCard.tsx::countdownColor`.

3. **Cue dźwiękowy `cue-warning-3s`** — przesuwam próg z 5s na **3s** pozostałego. Stała `COUNTDOWN_3S_WARNING_MS = 3000` (nazwa zgodna z wartością). Cue wciąż leci tylko przy `showCountdownBar === true` (cue + brak paska byłoby dziwne — bez paska dziecko nie ma kontekstu wizualnego).

4. **500ms wdech** między feedback overlay a kolejnym pytaniem. W `useSession.ts.handleOutcome`, w `setTimeout(durationMs)` po feedbacku — dorzucam 500ms wewnątrz timera (`durationMs + 500`). Albo lepiej: rozdzielam na dwa setTimeout'y — najpierw zamykamy overlay (`setLastFeedback(null)`, `setStatus('playing')` ale bez `generateNextQuestion`), potem po 500ms `generateNextQuestion`. To daje krótką "czarną" scenę między feedback a pytaniem — wdech.

5. **Rozszerzenie opcji `timeLimit`** o **25s** dla rodziców którzy chcą jeszcze więcej spokoju. Aktualizacja `TimeLimit` typu i SettingsScreen UI.

6. **Feedback durations zostają** — w połączeniu z B1/B2 (mascotka + ding/fanfara) obecne czasy są dobrze skalibrowane.

**Pliki do zmiany:**
- `src/shared/settings/types.ts` — `TimeLimit` rozszerzony o `25`, `Settings` rozszerzony o `showCountdownBar?: Partial<Record<Level, boolean>>` (oraz pozostawiamy obecny globalny boolean — patrz uwaga niżej)
- `src/shared/settings/defaults.ts` — `levelDefaults` rozszerzone o `showCountdownBar`, helper `getEffectiveShowCountdownBar`
- `src/shared/settings/components/SettingsScreen.tsx` — UI dla 25s opcji + per-level `showCountdownBar` (analogicznie do tilesPerQuestion override)
- `src/shared/settings/settingsStore.ts` — merge callback dorzuca default dla nowego pola
- `src/modules/letters/components/SessionView.tsx` — przekazanie efektywnego `showCountdownBar` do useSession
- `src/modules/letters/components/QuizCard.tsx` — `countdownColor` z nową paletą + nowe progi
- `src/modules/letters/hooks/useSession.ts` — `COUNTDOWN_3S_WARNING_MS = 3000`, cue tylko gdy `showCountdownBar`, 500ms wdech między feedback a pytaniem

**Uwaga implementacyjna:** Aktualne `Settings.showCountdownBar: boolean` jest globalne. Po zmianie na per-level zastępujemy w pełni: `showCountdownBar?: Partial<Record<Level, boolean>>` — analogicznie do `caseMode`/`styleMode`/`tilesPerQuestion`. **Migracja w `settingsStore` merge callback:** stary boolean (jeśli był `true`) propagujemy do override dla **wszystkich poziomów** (zachowanie dla user'ów którzy świadomie włączyli pasek); jeśli był `false`, też propagujemy do wszystkich (świadome wyłączenie). Brak starego klucza → pusty `{}`, biorą się per-level defaults. Test merge'a w `settingsStore.test.ts` musi pokrywać oba przypadki.

## D — odłożone do v2

**Decyzja:** czcionka pisana **nie jest zmieniana w v1.1**.

**Powód:** brak darmowego (OFL/CC0) fontu który byłby polskim elementarzem 1:1 (research z 2026-04-27). Caligraf-E krąży bez LICENSE → ryzyko prawne. Kalam/Caveat/Patrick Hand mają polskie diakrytyki ale anglosaskie kształty — robienie "trochę lepiej anglosasko" gdy cel to "polski standard" mija się z celem.

**Plan v2:** SVG path per litera (29 small + 29 caps = 58 ścieżek) na bazie skanu wzornika WSiP/Nowa Era. Robione **razem z tracingiem palcem** — dwie funkcje za jednym kosztem (elementarzowy kształt + animacja `stroke-dasharray` "rysowania" do ćwiczenia tracingu).

**TODO w settings UI (poza scope v1.1):** krótka informacja dla rodzica obok podglądu trybu pisanego: "Krój 'Pismo ręczne' jest stylizowany — wzorzec elementarza zaplanowany w v2". Dorzucone gdy dochodzimy do v2.

## Audio — odłożone do v2

Z research'u 2026-04-27 wynikło że jakiekolwiek nagrania zewnętrzne (np. Olaf z Lingua Libre, CC0) są w **innym głosie** niż obecny TTS (Zofia). User odrzucił miks głosów — patrz `memory/project_audio_voice_consistency.md`. Pełna podmiana audio (nagranie własne / Fiverr / inny lektor) to osobna inwestycja na v2.

**v1.1 zostaje przy Edge TTS Zofia** dla wszystkich liter, tylko teksty się zmieniają (B3) i ich Edge TTS regeneruje.

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

**Tests:**
- testy useSession trzeba zaktualizować (część obecnych testów już odwołuje się do starych tekstów / kluczy — patrz STATUS.md)
- nowe testy dla: streak counter, perfect session detection, picker no-repeat, picker contrastive

**Dokumentacja:**
- `docs/STATUS.md` — update po implementacji

## Następne kroki

1. **User review** tego specu.
2. Po akceptacji → invoke **writing-plans** skill dla podzielenia na konkretne zadania implementacyjne (kolejność: B3 jako najtańsze pierwsze; B2 i B1 razem bo się przeplatają wizualnie z dźwiękiem; B4 wymaga B1 i B2; A osobno na końcu).
3. Implementacja wg planu, każdy etap = osobny commit.
