# Iskierki — Status

**Live**: https://kamilmat.github.io/kid-learn/ (PWA, instalowalna)
**Repo**: https://github.com/kamilmat/kid-learn (public)

## Aktualny stan (2026-04-27)

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
