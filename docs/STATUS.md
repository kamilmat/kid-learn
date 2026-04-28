# Iskierki — Status

**Live**: https://kamilmat.github.io/kid-learn/ (PWA, instalowalna)
**Repo**: https://github.com/kamilmat/kid-learn (public)

## Aktualny stan (2026-04-28 — sesja UX polish)

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

**Drag-drop test:** programowy drag z chrome devtools nie symuluje pełnych pointermove (over=null). Architektura poprawna (DIV+touch-action:none), wymaga real iPad test.

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
