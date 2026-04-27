# Iskierki — Status (2026-04-27)

## Aktualny stan

**Moduł 1 (rozpoznawanie liter)** — działa, przetestowane w przeglądarce. v1.1 UX iteration ukończona (B + A wpięte, D odłożone do v2) — 2026-04-27.

### Build / testy
- `pnpm tsc -b` ✓
- `pnpm build` ✓ (318 KB JS / 99 KB gzip)
- `pnpm audio:check` ✓ (137 plików mp3 zgodnie z manifestem)
- `pnpm test --run` — 402 testy zielone; 1 failure (pre-existing bug — patrz sekcja "Known pre-existing bugs")

### Co zrobione w sesji (2026-04-27) — v1.1 UX iteration

**Branch:** `feat/ux-iteration-v1.1` (20 commitów, NIEMERGED do main — czeka na decyzję user'a). Spec: `docs/superpowers/specs/2026-04-27-iskierki-letters-ux-iteration-v1.1-design.md`. Plan: `docs/superpowers/plans/2026-04-27-iskierki-letters-ux-iteration-v1.1.md`.

**Obszar B (cieplejszy odzew dla dziecka):**
- **B1 — Mascotka w sesji**: `IskraMascot` wpięta w `QuizCard` (mała 50px w status barze, intensywność rośnie z streak'iem `spark→flame→fire→torch`) + mini-mascotka surprise nad błędnym kafelkiem dla `wrong`. `FeedbackOverlay` używa pełnej mascotki per-wariant (happy/dance/idle/spark) zamiast emoji 🔥. `SessionEnd` ma wariant **perfect** (Iskra dance/torch + sparkle ✨🎉✨) gdy `detectPerfectSession` (length===sessionLength + all correct).
- **B2 — SFX**: 2 pliki CC0 z mixkit w `audio-source/manual-overrides/`: `sfx-correct-ding.mp3` (1.8s, mixkit #2018) leci PRZED pochwałą, `sfx-mastery-fanfara.mp3` (2.09s, mixkit #2022) PRZED `mastery-celebration`. Pipeline `generate-audio.ts` iteruje tylko po SOURCE_FILES — dlatego klucze SFX są w `ui-strings.json` z pseudo-hash `"_sfx_"` (manual override wygrywa, hash nie jest TTS-owany).
- **B3 — Treści odzywek**: `praise-1..12` (12 pochwał, no-repeat-with-last picker). `correction-prefix-1/-2/-3` (random) + `correction-prefix-contrastive` (gdy `chosenLetter ∈ CONTRASTIVE_PAIRS[target]`). Stare `correction-prefix`/`timeout-1/-2`/`feedback-wrong-prefix` itp. usunięte z JSON (audit dead keys). Timeout audio scalone z dontKnow (gra `dont-know-N` + `correction-prefix-N` + `letter-X`).
- **B4 — Mikrocelebracje**: streak counter w `useState` + `useRef`. Progi 3/5/7+ → audio `streak-3`/`streak-5`/`streak-7-plus` + intensywność mascotki. Reset po dowolnej nie-correct. Mastery dziedziczy streak audio gdy próg osiągnięty. Perfect session = osobne audio `session-end-perfect`.

**Obszar A (tempo i oddech):**
- **Per-level `showCountdownBar`**: `Settings.showCountdownBar` zmienione z `boolean` na `Partial<Record<Level, boolean>>` (migracja v2→v3 drop'uje legacy boolean). Per-level defaults: `iskierka`/`płomyk`=`false`, `ognik`/`pochodnia`=`true`. Helper `getEffectiveShowCountdownBar(settings, level)` w `defaults.ts`. UI: 4 checkboxy per-level w `SettingsScreen`.
- **Łagodniejsza paleta countdown**: zielony >40%, ciepły żółty >15%, miękki pomarańczowy <15% (`#e89270`, usuwa intensywną czerwień).
- **Cue dźwiękowy**: `COUNTDOWN_3S_WARNING_MS` z 5000 → 3000ms. Guard `cfgRef.current.showCountdownBar` (cue tylko gdy pasek widoczny).
- **500ms wdech**: dwa zagnieżdżone `setTimeout` po feedback overlay. Pierwszy zamyka overlay (`setLastFeedback(null)`+`setStatus('playing')`), drugi po 500ms wywołuje `audioBus.stop()` (urywa ogon streak audio) + `generateNextQuestion()`.
- **Opcja `25s`** dorzucona do `TimeLimit` (`'off' | 10 | 15 | 20 | 25`).

**Mikrotask v1.1 ułatwiający v2:**
- **CSS variable `--font-handwritten`** w `src/index.css` + podmiana 5 hard-coded miejsc (`HandwrittenLetter.tsx`, `LetterTile.tsx`, `FeedbackOverlay.tsx`, `Home.tsx` ×2). W v2 zmiana fontu na elementarzowy = 1-line edit.

**Pickery wyodrębnione do `useSession.pickers.ts`** (testowalność): `pickPraiseKey`, `pickCorrectionPrefix`, `streakIntensity`, `streakAudioKey`, `detectPerfectSession`. 24 testy unit + integracja w `useSession.ts`.

**T18 cleanup**: 9 stale assertions naprawione (timer arithmetic z 500ms wdech, podmienione klucze audio `feedback-correct`→`sfx-correct-ding` itp., zaktualizowany tekst headline timeout).

### Co zrobione w ostatniej sesji (2026-04-26)
- Spec napisany i wycyzelowany (22 sekcje, research-backed, w docs/superpowers/specs/)
- Foundation: Vite + React 19 + TS strict + Tailwind 4 + Zustand + react-router
- SRS Leitner 5-box + scoring + distractors + tests
- Math gate (a+b-c) + settings store + per-level UI
- Audio pipeline: Edge TTS + idempotentny generator + manual override + 129 plików
- Quiz core: QuizCard adaptacyjna siatka (3/4/5/6 kafelków), LetterTile (4×4 trybów case×style)
- Feedback overlay (correct/wrong/dontKnow/timeout/mastery) z emoji asocjacjami
- HandwrittenLetter w czterolinii
- Engagement: idle detect, page visibility, fast-click, anti-cheat flags — **WPIĘTE w SessionView (idle 20s + visibility)**
- Letters store + module entry + level select + mastery wall
- Settings UI z math gate + active letters editor (32 litery, nie tylko z poziomu)
- Parent report z 5 sekcji + eksport markdown
- Home + Iskra mascot + onboarding głosowy (1× per ekran)
- Per-level: caseMode / styleMode / tilesPerQuestion (default Iskierka=4, Płomyk=4, Ognik=5, Pochodnia=6)
- Persist merge dla lettersStore i settingsStore (defensywna rehydracja)
- PauseOverlay przerobiony na no-text (⏸ + ▶ + 🏠)

### Aktywne wymiary do iteracji z userem (audio)
User ma `audio-source/letters.json` otwarty w IDE, eksperymentuje z fonetycznymi spellingami żeby uzyskać dźwięk bliższy fonemu zamiast nazwy litery. Aktualnie:
- Niektóre litery: "by" → TTS czyta jako "be-igrek" (źle)
- Niektóre OK: "a", "e", "o" — naturalnie wymawiane jak fonem

**Workflow:** user edytuje JSON → mówi "regeneruj" → odpalam `pnpm audio:build` (regeneruje tylko zmienione) → user odświeża stronę i sprawdza.

Strona testowa do odsłuchu: była w `public/audio-test.html` ale **została usunięta przy cleanup** w tej sesji. Trzeba ewentualnie przywrócić jeśli user będzie chciał kontynuować iterację audio. Można szybko odtworzyć z fetcha `/audio-source/letters.json`.

## Najbliższe rzeczy do zrobienia (jeśli user wróci)

### Decyzja przed innymi rzeczami: merge `feat/ux-iteration-v1.1` do main?

Branch ma 20 commitów, build/testy przechodzą, ale UX review w przeglądarce wykrył 2 issues — patrz "v1.1.1 follow-up" niżej. Opcje:
- **(a)** Merge teraz, follow-up issues w osobnym branchu v1.1.1
- **(b)** Najpierw fix follow-up issues na tym samym branchu, potem merge
- **(c)** Zapytać user'a co preferuje

### v1.1.1 follow-up (z UX review w przeglądarce, 2026-04-27)

**Wykryte podczas testowania flow Iskierka → sesja w Chrome DevTools:**

1. **KRYTYCZNY: Timer 15s leci dla Iskierki MIMO schowanego paska.** Per-level `showCountdownBar=false` ukrywa pasek wizualny, ale timer odlicza dalej w tle. Dziecko nie widzi, że tyka odliczanie — nagle pojawia się kolejne pytanie (cichy timeout). Zaobserwowane w przeglądarce: progress dots skoczyły 1→4 bez kliknięcia, network pokazał `dont-know-X` audio (timeout audio scalony z dontKnow).
   - **Fix:** Per-level `timeLimit` analogicznie do `showCountdownBar`. `Settings.timeLimit` rozszerzyć z `TimeLimit` na `Partial<Record<Level, TimeLimit>>` z helperem `getEffectiveTimeLimit(settings, level)`. Per-level defaults: `iskierka`/`płomyk`=`'off'` (młodsi: bez presji czasu), `ognik`/`pochodnia`=`15`. Migracja w `settingsStore` (drop legacy single value, podobnie jak showCountdownBar v2→v3).
   - Plus UI w SettingsScreen — analogicznie do per-level showCountdownBar checkboxów.
   - **Acceptance:** Iskierka session bez kliknięć przez 30s nie powinna przejść do następnego pytania (chyba że math gate timeout = `'off'`).

2. **Headline "Następnym razem szybciej" niespójny z audio scalonym z dontKnow.** Audio mówi ciepłe "nie szkodzi" / "spokojnie posłuchaj jeszcze raz", ale wizualny headline w `FeedbackOverlay` strofuje dziecko. Visual-audio mismatch.
   - **Fix:** W `FeedbackOverlay.tsx::headlineFor('timeout')` zmienić `'Następnym razem szybciej'` na neutralne wspierające: `'Posłuchaj jeszcze raz'` lub `'Spokojnie, słuchamy'` (spójne tonalnie z dontKnow który ma `'Nie szkodzi!'`).
   - Pomyśleć też czy timeout headline w ogóle ma sens skoro audio scalone z dontKnow — może użyć tego samego headlinu co dontKnow.
   - **Acceptance:** Test `FeedbackOverlay.test.tsx::renders timeout variant headline` zaktualizować na nowy tekst.

3. **(Niski priorytet) Level select używa gołych emoji 🔥 1-4 zamiast IskraMascot.** Wizualna niespójność z home (mascotka). Może na v1.2 lub przy okazji innych zmian level select.

### Średnioterminowe (v2)
1. **Audio iteracja** — user może chcieć dalej testować różne tekstu w letters.json. Jeśli tak — odtworzyć stronę testową `public/audio-test.html` i symlink `public/audio-source` → `audio-source` (była, usunęliśmy w cleanup).
2. **Manual recordings** — jeśli user się zdecyduje na nagrania własne dla wybranych problematycznych liter (m, p, ś, ź, ć), wystarczy drop do `audio-source/manual-overrides/letter-X.mp3`, build automatycznie podmieni TTS. UWAGA: pamiętaj o pamięci `audio: jeden głos` — nie miksować TTS Zofia z męskim głosem.

### Średnioterminowe (v2 — odłożone świadomie z v1.1)
- **D — Czcionka pisana wg polskiego standardu** (z research'u 2026-04-27): brak OFL fontu = polski elementarz. Plan: SVG path per litera (29 small + 29 caps = 58 paths) razem z **tracingiem palcem** w v2. Kontroler ma już CSS variable `--font-handwritten` w v1.1 — w v2 podmiana to 1-line edit.
- **Audio (głos lektora)** — wszystko TTS Zofia teraz. Decyzja `memory/project_audio_voice_consistency.md`: jeśli kiedyś podmieniamy, podmieniamy WSZYSTKIE 137 plików w jednym głosie (nie miksować). Opcje: nagranie własne (~30-60 min), Fiverr polski lektor (~150-300 zł), lub Lingua Libre Olaf z Wikimedia (CC0, ale męski — wymagałoby przegrania całego ui-strings też).
- **Drugi moduł — sylaby + wyrazy** — user wspomniał. Architektura gotowa: `src/modules/syllables/` z reuse shared/.
- **Kolejne moduły** — cyfry, kolory, kształty
- **Drugi typ ćwiczenia w module liter** — "widzisz literę → wybierz obrazek słowa"
- **Tracing palcem** — czterolinia + canvas drawing, śledzić czy dziecko poprawnie obrysowuje literę
- **Ścianna osiągnięć rozszerzona** — nie tylko box=5, ale streak'i, pierwszy raz, opanowanie poziomu

### Architektoniczne (do przemyślenia później)
- `shared/` zależy od `modules/letters/data/alphabet` w paru miejscach (validation, stats components) — nie blocker, ale formalnie łamie regułę "shared niezależne". Ewentualnie przenieść `alphabet.ts` + `toUpper` do `shared/`.
- `Level` typ jest re-eksportowany z `shared/settings/types.ts` w paru miejscach. OK ale może uprościć do `shared/types/`.
- Tester zewnętrzny może chcieć dodać `merge` migration version 2→3 jeśli kiedyś zmienia się shape `LetterState`.

### Znane subtelności / debt
- Komponent `LetterTile` używa lokalnej namiastki HandwrittenLetter (cursive font), nie pełnego komponentu z czterolinii. Czterolinia jest TYLKO w `<HandwrittenLetter>` osobno, nieużywany w trybie `tylko-pisane` w kafelkach quiz. Do rozważenia: czy w kafelkach też używać pełnej czterolinii czy zachować prostotę.
- `QuizCard` adaptive grid dla 5 kafelków używa col-span (3+2 układ) — działa ale wizualnie nieuporządkowany. Może warto inną strategię (np. "4+1" z mniejszym 5tym).
- Mastery wall w LevelSelect pokazuje tylko 32 polskie litery niezależnie od poziomu. Mogłoby pokazywać tylko aktywną pulę (np. 6 dla Iskierki) z wyraźniejszym progresem.
- Anti-cheat flagi w raporcie patrzą tylko na ostatnich 5 sesji — może lepiej okno czasowe (24h, tydzień)?

## Known pre-existing bugs

- **`activeLettersValidation > rejects letters outside the level pool`** — `validateAndApplyOverride` waliduje litery przeciwko `POLISH_ALPHABET` (wszystkie 32) zamiast puli konkretnego poziomu. Test słusznie oczekuje błędu gdy litera jest spoza puli poziomowej, ale implementacja przepuszcza każdą literę będącą w polskim alfabecie. Pre-existing od przed branchem feat/ux-iteration-v1.1. Nie blokuje działania aplikacji (użytkownik nie może dodać litery spoza alfabetu — UI tego nie pozwala). Do naprawy w osobnym tasku.

## Wskazówki na następną sesję

1. **Przeczytaj CLAUDE.md** najpierw — to jest globalny context.
2. **Sprawdź na jakim branchu jesteś** — `git branch --show-current`. Aktualnie powinieneś być na `feat/ux-iteration-v1.1` (NIE main). Jeśli chcesz zacząć v1.1.1 fix, rozważ czy:
   - kontynuujesz na tym branchu (nadbudowa) — ale wtedy historia rośnie i trudniej rollback
   - mergujesz v1.1 do main najpierw, potem nowy branch v1.1.1 — czystsze
3. **Zapytaj user'a co chce robić** — najprawdopodobniej v1.1.1 follow-up albo merge v1.1 do main. Patrz sekcja "Decyzja przed innymi rzeczami" wyżej.
4. **Stan dev-server** — może już nie chodzi. Sprawdź `lsof -i :5178` lub po prostu odpal `pnpm dev` (Vite szuka kolejnego wolnego portu, prawdopodobnie 5178+).
5. **localStorage** — user może mieć zapisany progres z testowania. Jeśli coś dziwnie się zachowuje, dev tools → Application → Local Storage → wyczyść `iskierki-state-v1` i `iskierki-letters-v1`. UWAGA: dla v1.1 dorzuciliśmy migrację `showCountdownBar` boolean→per-level (v2→v3). Jeśli user miał stare ustawienia, automatycznie się zresetują (drop'ujemy stary boolean).
6. **Audio status** — `pnpm audio:check` powie czy wszystko na miejscu (137 plików). Jeśli user zmienił JSON od ostatniego buildu, woła `pnpm audio:build` (regeneruje tylko zmienione).
7. **Memories** — sprawdź `~/.claude/projects/-Users-kamilmat87-kid-learn/memory/MEMORY.md`. Aktywne:
   - `project_audio_voice_consistency.md` — nie miksować głosów audio
   - `feedback_autonomous_execution.md` — po akceptacji designu działać autonomicznie (parallel agents, krótki raport, bez pytania o każdy krok)

## Last code-reviewer pass — zostawione do user'a decyzji

Z review (2026-04-26) zostały te tematy nie-blocker:
- `pickContrastivePairs` przelicza per-pytanie zamiast użyć stałej (kosmetyka)
- `Level` definiowany w 2 miejscach (cleanup)
- Mastery wall layout w iPad portrait może urwać z setting tilesPerQuestion=6 + handwriting (wizualne, do sprawdzenia)
- `findEdgeTts` mógłby szukać też pipx venv path
- Math gate generator: edge case przy `rng()=0` — bezpieczne ale nieelegancki rekursywny retry
