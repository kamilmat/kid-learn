# Iskierki — context for Claude

Webowa platforma edukacyjna dla dzieci. Pierwszy moduł: **rozpoznawanie liter polskiego alfabetu** dla 7-latka (zerówka). Tablet-first (iPad 10"), RWD wszędzie. Bez backendu, postęp w `localStorage`.

## Quick orientation

- **Spec (źródło prawdy):** `docs/superpowers/specs/2026-04-26-iskierki-letters-module-design.md`
- **Status / co dalej:** `docs/STATUS.md` — czytaj na początku sesji
- **Stack:** React 19 + Vite + TS strict + Tailwind 4 + Zustand + Vitest
- **Dev server:** `pnpm dev` (port 5173 lub kolejny wolny). Aktualnie chodzi w tle na 5178.
- **Audio:** Edge TTS (Python pkg `edge-tts`), generowane do `public/audio/` przy `pnpm audio:build`

## Struktura

```
src/
├── modules/letters/       # moduł 1 — kompletny, działa
│   ├── components/        # QuizCard, LetterTile, FeedbackOverlay, PauseOverlay, SessionEnd, SessionView, LevelSelect
│   ├── data/              # alphabet, levelPools, contrastivePairs, associations, visualGroups
│   ├── hooks/             # useSession (orkiestrator)
│   ├── store/             # lettersStore (Zustand + persist)
│   └── index.tsx          # entry: routes letters/ + letters/session/:level
├── shared/
│   ├── audio/             # AudioBus singleton — kolejka FIFO HTMLAudioElement
│   ├── srs/               # Leitner 5-box, scoring, distractors
│   ├── settings/          # store + math gate + UI; persist key `iskierki-state-v1`
│   ├── stats/             # SessionLog/SessionEvent types + raport rodzica UI
│   ├── engagement/        # idle, page-visibility, fast-click, anti-cheat flags
│   └── ui/                # KidNav, Button, IskraMascot, HandwrittenLetter
├── app/                   # App.tsx (routes), Home, theme tokens
└── main.tsx

audio-source/              # source teksty dla TTS
├── letters.json           # litera → tekst (USER EDYTUJE — np. "by", "śśśii")
├── words.json             # słowa-asocjacje + frazy "X jak Y"
├── ui-strings.json        # pochwały, korekty, nawigacja, onboarding, koniec
└── manual-overrides/*.mp3 # wygrywa nad TTS (jeśli istnieje plik)

scripts/generate-audio.ts  # idempotentny: hash text vs manifest, wykrywa edge-tts w wielu lokacjach
public/audio/              # build artifact: 129 plików mp3 + .manifest.json
```

## Kluczowe decyzje (już zaakceptowane)

- **Modułowa architektura** — kolejne moduły (sylaby, cyfry, kolory) doklejają się jako `src/modules/<nazwa>/`. Reużywają shared/ (SRS, audio, settings, stats, engagement, ui).
- **Audio — Edge TTS przez Python wrapper** (`scripts/tts.py` + CLI). User edytuje `audio-source/*.json`, woła `pnpm audio:build`. Manual override przez `audio-source/manual-overrides/<klucz>.mp3` wygrywa nad TTS.
- **Brak fonemów IPA** — Edge TTS publiczny endpoint nie obsługuje SSML phoneme tags. Zostały polskie nazwy liter ("be", "pe", "em") albo manual recordings dla pełnej kontroli.
- **Theme: jeden tryb** — warm light (`#fef9f2` tło, `#2d2d33` tekst), ignoruje `prefers-color-scheme`. Brak dark mode.
- **No-text UI dla dziecka** — tylko ikony + audio cues. Wszystkie tap-targety ≥60×60. Brak gestów (tylko tap).
- **Persist dwa storage**: `iskierki-state-v1` (settings + math gate) i `iskierki-letters-v1` (progres + sesje + intro state). Reset jednego nie kasuje drugiego.
- **Ciągłość uczenia**: `LetterState` persistowany — w **kolejnej sesji** litery z `recentWrong>0` lub niskim `box` mają wyższy score → częściej w pytaniach.

## Workflow rozwoju

1. **Zmiana w spec** — najpierw edytuj spec, potem kod
2. **Audio cleanup** — gdy zmienia się tekst w `audio-source/*.json`, woła się `pnpm audio:build` (idempotentne, regeneruje tylko zmienione)
3. **Per-level config** — `caseMode`, `styleMode`, `tilesPerQuestion` mają per-level defaulty + override w settings (Partial<Record<Level, …>>)
4. **Test w przeglądarce > testów jednostkowych** — user wyraził preferencję. Pisz testy tylko dla nietrywialnej logiki (SRS, math gate, generator dystraktorów).

## Komendy

```bash
pnpm dev              # dev server z HMR
pnpm build            # production build
pnpm tsc -b           # type check
pnpm test --run       # testy
pnpm audio:build      # generuj/aktualizuj mp3
pnpm audio:check      # sprawdź czy wszystkie klucze mają plik
```

## Istotne wymagania od user'a (nie tracić)

- "Wszystko mówione, nic do czytania" — UI dziecka tylko ikony + audio
- "Każdy klik mówi co zrobił" — audio cue dla nawigacji (back/home/pause/resume)
- "Aplikacja musi rozmawiać z dzieckiem" — onboarding głosowy (1× per ekran)
- "Layout: bez scrolla, wszystko w viewport iPada"
- "Dziecko czasem oszukuje" — anti-cheat: idle 20s → auto-pauza, page visibility → auto-pauza
- "Real-time raport" — rodzic w każdej chwili widzi aktualne statystyki
- "Adaptive learning" — litery z błędami częściej w przyszłych sesjach
- "Math gate w ustawieniach" — `a+b-c` z warunkiem `a+b>10`, 3 błędy = 60s cooldown
- "Per-level konfiguracja" — case/style/tilesPerQuestion settable per Iskierka/Płomyk/Ognik/Pochodnia
- "Nie nadmiarowe testy" — user prosił o ograniczenie pisania testów

## Gdzie ŁATWO się pomylić

- **AudioBus to singleton** — `import { audioBus }` wszędzie gra przez tę samą kolejkę. Stan `playing/queue` przeżywa zmianę route'a. `audioBus.stop()` jest wywoływany w `useSession.start()` żeby wyczyścić leftover z home/intro.
- **Feedback duration vs audio length** — duration musi pokrywać CAŁĄ kolejkę audio dla wariantu, inaczej audio gra po pojawieniu się następnego pytania. Aktualne wartości w `useSession.ts` `FEEDBACK_DURATION_BASE_MS`.
- **`tilesPerQuestion` per-level** — `Partial<Record<Level, TilesPerQuestion>>` z fallback do `levelDefaults`. Domyślnie: Iskierka/Płomyk = 4, Ognik = 5, Pochodnia = 6.
- **persist `merge` callbacki** — w `settingsStore` i `lettersStore`. Gdy dodajesz nowe pole, dopisz default w merge inaczej stary localStorage da `undefined`.
- **`level` może być nieprawidłowy z URL** — `LettersSession` filtruje przez `VALID_LEVELS`, redirectuje na `index` jeśli zły.
- **`.test.ts` excludowany z `tsconfig.app.json`** — testy mogą mieć type errors bez zatrzymywania `pnpm build`. Test errors trzeba sprawdzać przez `pnpm test --run`.

## Konwencje kodu

- Function components, named exports
- TS strict, brak `any` / `@ts-ignore`
- Komentarze tylko gdy WHY niejasne. Nie opisuj WHAT.
- Polskie napisy w UI dla dziecka i rodzica
- Inline styles + Tailwind utilities OK (mieszanka jest spójna)
- Tokeny z `@/app/theme` — `colors`, `radii`, `tapTargets`

## Co JESZCZE nie działa / jest ograniczone

- **Czyste fonemy IPA** — niemożliwe z darmowym Edge TTS. Workaround: nazwy liter lub manual recording.
- **Tracing palcem** (haptyka) — w v2
- **Drugi/trzeci typ ćwiczenia** ("widzisz literę → wybierz obrazek") — w v2
- **Piosenka alfabetu** — w v2
- **Multi-profile** — jeden profil per urządzenie/przeglądarka (LocalStorage)
- **Sync między urządzeniami** — brak (no backend)

## Przy starcie nowej sesji

1. Przeczytaj `docs/STATUS.md` — co skończone, co w trakcie, znane problemy
2. Sprawdź `pnpm tsc -b` i `pnpm test --run` — baseline
3. Zapytaj user'a co chce dalej (nie zakładaj, że pamiętam stan z poprzedniej sesji)
4. Po sesji: zaktualizuj `docs/STATUS.md`
