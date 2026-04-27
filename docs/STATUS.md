# Iskierki — Status (2026-04-27)

## Aktualny stan

**Moduł 1 (rozpoznawanie liter)** — działa, przetestowane w przeglądarce. v1.1 UX iteration ukończona (B + A wpięte, D odłożone do v2) — 2026-04-27.

### Build / testy
- `pnpm tsc -b` ✓
- `pnpm build` ✓ (318 KB JS / 99 KB gzip)
- `pnpm audio:check` ✓ (137 plików mp3 zgodnie z manifestem)
- `pnpm test --run` — 402 testy zielone; 1 failure (pre-existing bug — patrz sekcja "Known pre-existing bugs")

### Co zrobione w sesji (2026-04-27) — v1.1 UX iteration T18

- **B1**: QuizCard — mascotka Iskra w status barze (streak intensity), pauza mascot reset
- **B2**: FeedbackOverlay — per-wariant mascotka (happy/dance/idle), correct pokazuje mascot
- **B3**: SessionEnd — "perfect session" konfetti + fanfara (`session-end-perfect` audio klucz)
- **B4**: useSession — audio pipeline refaktor: `sfx-correct-ding`, `praise-1..12`, `correction-prefix-1..3`, `correction-prefix-contrastive`; dontKnow/timeout scalone audio; `POST_FEEDBACK_BREATH_MS`=500ms wdech; `STREAK_AUDIO_DURATION_MS` dorzucane do extraDuration
- **A**: Settings — CSS var theme tokens + grupowanie sekcji + per-level pickery (caseMode/styleMode/tilesPerQuestion)
- **T18 fix**: Naprawiono 9 stale assertions (timer arithmetic + zmienione klucze audio + stary tekst headline)

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

### Krótkoterminowe
1. **Naprawić test stale assertions** — kilka testów oczekuje starych tekstów/kluczy audio. Cienka warstwa, niewiele do roboty.
2. **Audio iteracja** — user może chcieć dalej testować różne tekstu w letters.json. Jeśli tak — odtworzyć stronę testową `public/audio-test.html` i symlink `public/audio-source` → `audio-source` (była, usunęliśmy w cleanup).
3. **Manual recordings** — jeśli user się zdecyduje na nagrania własne dla wybranych problematycznych liter (m, p, ś, ź, ć), wystarczy drop do `audio-source/manual-overrides/letter-X.mp3`, build automatycznie podmieni TTS.

### Średnioterminowe (v2)
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
2. **Zapytaj user'a co chce robić** — nie zakładaj że pamiętam dokładnie.
3. **Stan dev-server** — może już nie chodzi. Sprawdź `lsof -i :5178` lub po prostu odpal `pnpm dev`.
4. **localStorage** — user może mieć zapisany progres z testowania. Jeśli coś dziwnie się zachowuje, dev tools → Application → Local Storage → wyczyść `iskierki-state-v1` i `iskierki-letters-v1`.
5. **Audio status** — `pnpm audio:check` powie czy wszystko na miejscu. Jeśli user zmienił JSON od ostatniego buildu, woła `pnpm audio:build` (regeneruje tylko zmienione).

## Last code-reviewer pass — zostawione do user'a decyzji

Z review (2026-04-26) zostały te tematy nie-blocker:
- `pickContrastivePairs` przelicza per-pytanie zamiast użyć stałej (kosmetyka)
- `Level` definiowany w 2 miejscach (cleanup)
- Mastery wall layout w iPad portrait może urwać z setting tilesPerQuestion=6 + handwriting (wizualne, do sprawdzenia)
- `findEdgeTts` mógłby szukać też pipx venv path
- Math gate generator: edge case przy `rng()=0` — bezpieczne ale nieelegancki rekursywny retry
