# Iskierki — context for Claude

Webowa platforma edukacyjna dla dzieci. **Cztery moduły:**
- **Moduł 1:** rozpoznawanie liter polskiego alfabetu dla 7-latka (zerówka)
- **Moduł 2:** nauka czytania słów (sylaby + wyrazy, drag-drop, SRS)
- **Moduł 3:** matematyka (liczenie, rozkłady, dodawanie/odejmowanie, mnożenie — drzewko konceptów)
- **Moduł 4:** czytanki — 60 krótkich zdań (4 grupy trudności), tap sylaby → audio, długi tap → całe słowo, ▶ czyta całość

Tablet-first (iPad 10"), RWD wszędzie. Bez backendu, postęp w `localStorage`.

## Quick orientation

- **Live (PWA):** https://kamilmat.github.io/kid-learn/ — instalowalne (Add to Home Screen na iPad Safari), działa offline po pierwszym otwarciu
- **Repo:** https://github.com/kamilmat/kid-learn (public, GH Actions auto-deploy z push do main)
- **Spec moduł 1:** `docs/superpowers/specs/2026-04-26-iskierki-letters-module-design.md`
- **Status / co dalej:** `docs/STATUS.md` — czytaj na początku sesji
- **Stack:** React 19 + Vite + TS strict + Tailwind 4 + Zustand + Vitest + vite-plugin-pwa + @dnd-kit/core + @dnd-kit/sortable
- **Dev server:** `pnpm dev` (port 5173 lub kolejny wolny)
- **Audio:** lektor (moduły 1-3) = Zofia via Edge TTS; Iskra = Marek via Edge TTS; czytanki (moduł 4) = Agnieszka via Azure (`azure` plain SSML dla słów/UI, `azure-ipa` dla sylab). Generowane do `public/audio/` przy `pnpm audio:build`. Czcionki: **Kalam** (pisana, Google Fonts OFL) + **Lexend** (early-reader, kafelki sylabowe)

## Struktura

```
src/
├── modules/letters/       # moduł 1 — kompletny, działa
│   ├── components/        # QuizCard, LetterTile, FeedbackOverlay, PauseOverlay, SessionEnd, SessionView, LevelSelect
│   ├── data/              # alphabet, levelPools, contrastivePairs, associations, visualGroups
│   ├── hooks/             # useSession (orkiestrator)
│   ├── store/             # lettersStore (Zustand + persist)
│   └── index.tsx          # entry: routes letters/ + letters/session/:level
├── modules/reading/       # moduł 2 — kompletny, działa
│   ├── components/        # ReadingLevelSelect, ReadingSessionView, DragDropExercise, WordAlbum
│   │                      # MiniScene, WildCelebration, IskraAnimated, StatusBar
│   ├── data/              # syllables (23), words (67), levelPools, miniScenes (55), phonemeHeatmap
│   ├── hooks/             # useReadingSession (orkiestrator), useDragSyllable
│   ├── store/             # readingStore (Zustand + persist) — persist key `iskierki-reading-v1`
│   └── index.tsx          # entry: routes reading/ + reading/session/:level + reading/album
├── modules/numbers/       # moduł 3 — kompletny, działa (drzewko konceptów matematycznych)
├── modules/czytanki/      # moduł 4 — czytanki: tap sylaby → audio, long-press → słowo, ▶ czyta całość; 60 czytanek, 4 grupy
│   ├── components/        # CzytankaList, CzytankaTile, CzytankaView, CzytankaScene, SyllableButton
│   ├── data/               # czytanki (60), types, audioKeys (slugPl → cz-syl-*/cz-word-*)
│   ├── hooks/              # useReadAloud, useSyllablePress (tap/long-press)
│   ├── audio/               # pendingCue — cue odtwarzane po zamontowaniu docelowego ekranu
│   ├── store/              # czytankiStore (Zustand + persist) — persist key `iskierki-czytanki-v1`
│   └── index.tsx           # entry: routes czytanki/ + czytanki/:id
├── shared/
│   ├── audio/             # AudioBus singleton — kolejka FIFO HTMLAudioElement
│   ├── srs/               # Leitner 5-box, scoring, distractors (generalized BaseItemState)
│   ├── settings/          # store + math gate + UI; persist key `iskierki-state-v1` (persist version: 4)
│   │                      # settings: humorMode + reading.wordAnimations + reading.wildCelebrationFreq
│   ├── stats/             # SessionLog/SessionEvent types + raport rodzica UI
│   │                      # moduł 2: sylaby opanowane/trudne + heatmapa fonemów PL
│   ├── engagement/        # idle, page-visibility, fast-click, anti-cheat flags
│   └── ui/                # KidNav, Button, IskraMascot, HandwrittenLetter
├── app/                   # App.tsx (routes), Home (4 kafelki), theme tokens
└── main.tsx

audio-source/              # source teksty dla TTS
├── letters.json           # litera → tekst (moduł 1)
├── words.json             # słowa-asocjacje + frazy "X jak Y" (moduł 1)
├── ui-strings.json        # pochwały, korekty, nawigacja, onboarding, koniec (moduł 1)
├── syllables.json         # 23 sylaby + intros poziomów (moduł 2)
├── reading-ui-strings.json # pochwały czytania, scenki, wild celebrations (moduł 2)
├── iskra-reactions.json   # reakcje Iskry: easter eggs, silly, fail (moduł 2; głos Marek)
├── numbers.json / math-ui-strings.json # koncepty, fakty, UI (moduł 3)
├── czytanki-syllables.json # generowany (`pnpm audio:czytanki`); głos Agnieszka, `_engine: azure-ipa` — sylaby cz-syl-*
├── czytanki-words.json     # generowany (`pnpm audio:czytanki`); głos Agnieszka, `_engine: azure` (plain SSML) — słowa cz-word-*
├── czytanki-ui-strings.json # intro, nawigacja, cue (moduł 4); głos Agnieszka, `_engine: azure`
└── manual-overrides/*.mp3 # wygrywa nad TTS (jeśli istnieje plik)

scripts/generate-audio.ts  # idempotentny: hash text vs manifest, trzy silniki (edge | azure | azure-ipa)
scripts/polishG2p.ts       # ortografia PL → IPA (toIpa) dla `_engine: azure-ipa`
scripts/azureTts.ts        # REST Azure Speech: buildSsml (phoneme IPA) + buildPlainSsml (plain), backoff 429/5xx, loader .env.local
scripts/czytanki-audio-source.ts # generuje czytanki-syllables.json (agnieszka/azure-ipa) + czytanki-words.json (agnieszka/azure)
public/audio/              # build artifact: 1135 plików mp3 + .manifest.json
```

## Kluczowe decyzje (już zaakceptowane)

- **Modułowa architektura** — kolejne moduły (sylaby, cyfry, kolory) doklejają się jako `src/modules/<nazwa>/`. Reużywają shared/ (SRS, audio, settings, stats, engagement, ui).
- **Audio — Edge TTS przez Python wrapper** (`scripts/tts.py` + CLI) dla modułów 1-3 i Iskry. User edytuje `audio-source/*.json`, woła `pnpm audio:build`. Manual override przez `audio-source/manual-overrides/<klucz>.mp3` wygrywa nad TTS.
- **Trzy silniki TTS** — plik `audio-source/*.json` deklaruje `_engine`: `edge` (domyślny, darmowy CLI, bez SSML), `azure` (Azure Speech REST, zwykłe SSML bez phoneme — plain text) albo `azure-ipa` (Azure Speech REST + SSML `<phoneme alphabet="ipa" ph="…">`, gdzie IPA liczy `scripts/polishG2p.ts` z ortografii). WHY osobny `azure-ipa`: Edge/Azure zgadują wymowę **izolowanych sylab** i mylą się ("lo" → "elo", "ka" → "ka a", "ry" → "ri"), a IPA omija ten zgadywacz. Głos `agnieszka` (pl-PL-AgnieszkaNeural, lektor czytanek — moduł 4) jest Azure-only: `_voice: agnieszka` + `_engine: edge` rzuca błąd przy wczytywaniu źródeł. `azure-ipa` używane przez `czytanki-syllables.json`; całe słowa i UI czytanek (`czytanki-words.json`, `czytanki-ui-strings.json`) idą przez `azure` (plain SSML). `synthesizeAzure` throttluje requesty (min. odstęp ~3.1s, tier F0 ≈20 req/min) i robi retry z exponential backoff na 429/5xx (do 6 prób: 2s/4s/8s/16s/32s/60s, honoruje `Retry-After`). Wymaga `.env.local` (gitignore) z `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=westeurope` — darmowy tier F0 wystarcza; wzór w `.env.example`. Podgląd planu bez klucza: `pnpm audio:dry` (wypisuje engine, tekst, IPA i akcję dla każdego klucza).
- **`audio-source/pronunciation-overrides.json`** — ręczne wyjątki wymowy wybrane przez odsłuch, per klucz `{ "ipa": "…" }` (wymuś `<phoneme>` tym IPA) albo `{ "text": "…" }` (wymuś zwykłe SSML tym tekstem); ma pierwszeństwo przed G2P/tekstem źródłowym dla wpisów `azure`/`azure-ipa` (nie `edge`). Klucze zaczynające się od `_` to komentarze. Nie jest to plik-źródło audio (wykluczony z `discoverSourceFiles`), tylko nakładka wczytywana osobno w `generate-audio.ts`.
- **Brak fonemów IPA w Edge** — publiczny endpoint Edge TTS nie obsługuje SSML phoneme tags. Dla liter zostały polskie nazwy ("be", "pe", "em") albo manual recordings.
- **Theme: jeden tryb** — warm light (`#fef9f2` tło, `#2d2d33` tekst), ignoruje `prefers-color-scheme`. Brak dark mode.
- **No-text UI dla dziecka** — tylko ikony + audio cues. Wszystkie tap-targety ≥60×60. Brak gestów (tylko tap); moduł 2 używa drag-drop (@dnd-kit) dla ćwiczenia Płomyk.
- **Persist kilka storage**: `iskierki-state-v1` (settings + math gate + humorMode + reading.*; klucz `name` to `iskierki-state-v1`, `version: 4` — nie mylić jednego z drugim), `iskierki-letters-v1` (moduł 1 progres), `iskierki-reading-v1` (moduł 2 progres), `iskierki-numbers-v1` (moduł 3 progres) i `iskierki-czytanki-v1` (moduł 4 progres — openedIds, seenIntros). Reset jednego nie kasuje pozostałych.
- **Ciągłość uczenia**: `BaseItemState` (generalized SRS) persistowany — w **kolejnej sesji** litery/sylaby/słowa z `recentWrong>0` lub niskim `box` mają wyższy score → częściej w pytaniach.

## Workflow rozwoju

1. **Zmiana w spec** — najpierw edytuj spec, potem kod
2. **Audio cleanup** — gdy zmienia się tekst w `audio-source/*.json`, woła się `pnpm audio:build` (idempotentne, regeneruje tylko zmienione)
3. **Per-level config** — `caseMode`, `styleMode`, `tilesPerQuestion` mają per-level defaulty + override w settings (Partial<Record<Level, …>>)
4. **Test w przeglądarce > testów jednostkowych** — user wyraził preferencję. Pisz testy tylko dla nietrywialnej logiki (SRS, math gate, generator dystraktorów).

## Komendy

```bash
pnpm dev              # dev server z HMR
pnpm build            # production build (lokalnie base='/'; CI ustawia VITE_BASE=/kid-learn/)
pnpm tsc -b           # type check
pnpm test --run       # testy (586/586 zielone)
pnpm audio:czytanki   # generuj czytanki-syllables.json + czytanki-words.json z data/czytanki.ts (moduł 4)
pnpm audio:build      # audio:czytanki + generuj/aktualizuj mp3 (azure-ipa wymaga .env.local)
pnpm audio:dry        # plan buildu bez TTS: engine + tekst + IPA + akcja (nie wymaga klucza)
pnpm audio:check      # sprawdź czy wszystkie klucze mają plik (1128 plików)

# GitHub
gh run list --repo kamilmat/kid-learn --limit 3      # status ostatnich deploy
gh run watch                                          # śledź workflow w toku
git push                                              # auto-deploy ~40s przez GH Actions
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
- **Feedback duration vs audio length** — duration musi pokrywać CAŁĄ kolejkę audio dla wariantu, inaczej audio gra po pojawieniu się następnego pytania. Moduł 1: `FEEDBACK_DURATION_BASE_MS` w `useSession.ts`. Moduł 3: `FEEDBACK_DURATION_MS` w `numbers/components/SessionView.tsx`. Moduł 2: feedback auto-advance po zakończeniu audio (`await audioBus.play()` + `MIN_FEEDBACK_MS`), tap = skip. Moduł 3 od CR 2026-08-28: advance po zakończeniu audio feedbacku, nie po sztywnym timerze.
- **`tilesPerQuestion` per-level (moduł 1)** — `Partial<Record<Level, TilesPerQuestion>>` z fallback do `levelDefaults`. Domyślnie: Iskierka/Płomyk = 4, Ognik = 5, Pochodnia = 6.
- **persist `merge` + `migrate`** — wszystkie pięć store'ów (`settingsStore`, `lettersStore`, `readingStore`, `numbersStore`, `czytankiStore`). Gdy dodajesz nowe pole, dopisz default w `merge`, inaczej stary localStorage da `undefined`. Każdy store ma też `migrate: (persisted) => persisted` — bez niego zustand ODRZUCA persist przy bumpie `version` (merge dostaje `undefined` → skasowany postęp).
- **`level` może być nieprawidłowy z URL** — sesje obu modułów filtrują przez `VALID_LEVELS`, redirectują na `index` jeśli zły.
- **`.test.ts` excludowany z `tsconfig.app.json`** — testy mogą mieć type errors bez zatrzymywania `pnpm build`. Test errors trzeba sprawdzać przez `pnpm test --run`.
- **@dnd-kit w moduł 2 (Płomyk)** — drag-drop z `useDraggable`/`useDroppable`. DndContext musi opakowywać cały ekran ćwiczenia; `over?.id` to null gdy upuścimy poza target. Nie używać `onDragEnd` do mutacji store — tylko do lokalnego state syllableSlots.
- **wildCelebrationCounter i jitter** — licznik i ostatni stan w `readingStore`. Reset na nową sesję, nie per-pytanie. Jitter ±2 zapobiega przewidywalności.
- **Zmiana reguł w `polishG2p.ts` = regeneracja 375 sylab** — hash `azure-ipa` zawiera IPA, więc każda poprawka G2P wymusza ponowny build tych kluczy (i zużycie limitu F0). Najpierw `pnpm audio:dry`, potem build.

## Konwencje kodu

- Function components, named exports
- TS strict, brak `any` / `@ts-ignore`
- Komentarze tylko gdy WHY niejasne. Nie opisuj WHAT.
- Polskie napisy w UI dla dziecka i rodzica
- Inline styles + Tailwind utilities OK (mieszanka jest spójna)
- Tokeny z `@/app/theme` — `colors`, `radii`, `tapTargets`

## Co JESZCZE nie działa / jest ograniczone

- **Czyste fonemy IPA** — niemożliwe z darmowym Edge TTS. Workaround: nazwy liter lub manual recording.
- **Tracing palcem** (haptyka) — w v3
- **Piosenka alfabetu** — w v3
- **Multi-profile** — jeden profil per urządzenie/przeglądarka (LocalStorage)
- **Sync między urządzeniami** — brak (no backend)
- **SFX biblioteka (moduł 2)** — placeholder; używa SFX z modułu 1 gdzie potrzeba. Dedykowane SFX dla drag-drop i wild celebrations do nagrania/pobrania.
- **Moduł 5+** — kolory, kształty — architektura gotowa (`src/modules/<nazwa>/`)
- **Zdania / krótkie teksty w module 2** — moduł czytania (sylaby+słowa) nadal do poziomu słów; zdania obsługuje osobny moduł 4 (Czytanki)

## Przy starcie nowej sesji

1. Przeczytaj `docs/STATUS.md` — co skończone, co w trakcie, znane problemy
2. Sprawdź `pnpm tsc -b` i `pnpm test --run` — baseline
3. Zapytaj user'a co chce dalej (nie zakładaj, że pamiętam stan z poprzedniej sesji)
4. Po sesji: zaktualizuj `docs/STATUS.md`
