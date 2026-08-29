# Iskierki — context for Claude

Webowa platforma edukacyjna dla dzieci. **Cztery moduły:**
- **Moduł 1:** rozpoznawanie liter polskiego alfabetu dla 7-latka (zerówka)
- **Moduł 2:** nauka czytania słów (sylaby + wyrazy, drag-drop, SRS)
- **Moduł 3:** matematyka (liczenie, rozkłady, dodawanie/odejmowanie, mnożenie — drzewko konceptów)
- **Moduł 4:** czytanki — 60 krótkich zdań (4 grupy trudności), tap sylaby → audio, długi tap → całe słowo, ▶ czyta całość, ❓ mini-pytanie o rozumienie

Tablet-first (iPad 10"), RWD wszędzie. Bez backendu, postęp w `localStorage`.

## Quick orientation

- **Live (PWA):** https://kamilmat.github.io/kid-learn/ — instalowalne (Add to Home Screen na iPad Safari), działa offline po pierwszym otwarciu
- **Repo:** https://github.com/kamilmat/kid-learn (public, GH Actions auto-deploy z push do main)
- **Spec moduł 1:** `docs/superpowers/specs/2026-04-26-iskierki-letters-module-design.md`
- **Status / co dalej:** `docs/STATUS.md` — czytaj na początku sesji
- **Stack:** React 19 + Vite + TS strict + Tailwind 4 + Zustand + Vitest + vite-plugin-pwa + @dnd-kit/core + @dnd-kit/sortable
- **Dev server:** `pnpm dev` (port 5173 lub kolejny wolny)
- **Audio:** lektor (moduły 1-3) = Zofia via Edge TTS (część kluczy od Fali 1 przez Azure — patrz niżej); Iskra = Marek via Edge TTS; czytanki (moduł 4) = Agnieszka via Azure (`azure` plain SSML dla słów/UI, `azure-ipa` dla sylab). Generowane do `public/audio/` przy `pnpm audio:build`. Czcionki: **Kalam** (pisana, Google Fonts OFL) + **Lexend** (early-reader, kafelki sylabowe)

## Struktura

```
src/
├── modules/letters/       # moduł 1 — kompletny, działa
│   ├── components/        # QuizCard, LetterTile (czterolinia z shared/HandwrittenLetter), FeedbackOverlay, PauseOverlay, SessionEnd, SessionView, LevelSelect (+ kafelek 🔁)
│   │                      # ReverseQuizCard (wariant odwrotny: litera → 3× 🔊 + ✔), HardLettersSession, DailyLetterSession
│   ├── data/              # alphabet, levelPools, contrastivePairs, associations, visualGroups
│   │                      # hardLetters.ts (selectHardLetters, cap 8, min 3 + configLevelForHard), dailyLetter.ts (dayKey + pickDailyLetter)
│   ├── audio/              # promptKeys.ts — promptAudioKeys(letter, mode): letter-*/letter-name-* wg promptMode
│   ├── hooks/             # useSession (orkiestrator; `reverseEvery`, `forceReverseIndices`, `targetPool`)
│   ├── store/             # lettersStore (Zustand + persist) — version 2 (`dailyLetter`, `dailyDoneDayKey`)
│   └── index.tsx          # entry: routes letters/ + letters/session/:level + letters/hard + letters/daily
├── modules/reading/       # moduł 2 — kompletny, działa
│   ├── components/        # ReadingLevelSelect, ReadingSessionView, DragDropExercise, WordAlbum
│   │                      # MiniScene, WildCelebration (wariant statyczny przy reduced-motion), IskraAnimated, StatusBar
│   │                      # exercises/WordMeaningExercise (obrazek → słowo), SessionEnd (⬆/⬇ sugestia poziomu)
│   ├── data/              # syllables (24 zdefiniowane + generowane resztą z words), words (67, + `NO_MEANING_WORDS`), levelPools, miniScenes (55), phonemeHeatmap
│   │                      # contrastiveSyllables.ts (mapa symetryczna, dystraktory kontrastywne), levelSuggestion.ts (suggestLevel)
│   ├── hooks/             # useReadingSession (orkiestrator), useDragSyllable, blendSequence.ts (sekwencja „MA + MA = MAMA")
│   ├── store/             # readingStore (Zustand + persist) — persist key `iskierki-reading-v1`
│   └── index.tsx          # entry: routes reading/ + reading/session/:level + reading/album
├── modules/numbers/       # moduł 3 — kompletny, działa (drzewko konceptów matematycznych)
│   ├── components/         # SessionView (feedback błędu = PAS 28% w przepływie + scrim), exercises/CountObjectsExercise (liczenie 1:1)
│   │                       # representations/TenFrame (struktura 5: kropki 6-10 jaśniejsze, `fiveStructure`)
│   ├── data/               # concepts (z `prerequisites?`), facts, strategyAudio.ts (strategia po błędzie), masteryAudio.ts (mastery-* przy `mastered`)
│   ├── hooks/              # useNumbersSession (orkiestrator; `computeMasteryProgress` = okno 8/10), pickConcept.ts (ważone losowanie konceptu + prereq gate)
│   ├── store/              # numbersStore (Zustand + persist) — version 3 (`factsCorrect`, `recentOutcomes`)
├── modules/czytanki/      # moduł 4 — czytanki: tap sylaby → audio, long-press → słowo, ▶ czyta całość; 60 czytanek, 4 grupy
│   ├── components/        # CzytankaList, CzytankaTile (⭐ + kropki przeczytań), CzytankaView (▶ 🗣 🐢 KO|TA ❓), CzytankaScene, SyllableButton
│   │                      # ComprehensionQuestion (overlay ❓: 3 emoji, po błędzie zostają 2)
│   ├── data/               # czytanki (60, `comprehension` w 59 — cz-12 bez), types, audioKeys (slugPl → cz-syl-*/cz-word-*, questionAudioKey → cz-q-NN)
│   ├── hooks/              # useReadAloud (+ echo/tempo), useSyllablePress (tap/long-press, liczy tapy per słowo)
│   ├── audio/               # pendingCue — cue odtwarzane po zamontowaniu docelowego ekranu
│   ├── store/              # czytankiStore (Zustand + persist) — persist key `iskierki-czytanki-v1`, version 3 (`readCounts`, `lastCountedAt`, `answeredQuestionIds`, `comprehensionResults`)
│   └── index.tsx           # entry: routes czytanki/ + czytanki/:id
├── shared/
│   ├── audio/             # AudioBus singleton — kolejka FIFO HTMLAudioElement; slugPl.ts (ASCII slug PL znaków dla kluczy audio); pickPraiseMixed.ts (50/50 procesowe/wynikowe)
│   ├── srs/               # Leitner 5-box, scoring, distractors (generalized BaseItemState)
│   ├── settings/          # store + math gate + UI; persist key `iskierki-state-v1` (persist version: 6)
│   │                      # settings: humorMode + reading.wordAnimations + reading.wildCelebrationFreq + questionsPerSession + secondAttempt + letters.promptMode(+ByLevel) + czytanki.{echoMode,tempo,mergedSyllables}
│   ├── stats/             # SessionLog/SessionEvent types (+ `SessionMode = Level|'hard'|'daily'`) + raport rodzica UI; todaySessions.ts (stopping cue: ≥2 sesje dziś, `daily` się NIE liczy)
│   │                      # suggestions.ts (generateSuggestions) + NextStepCard + CollapsibleSection (wszystkie sekcje zwinięte domyślnie)
│   │                      # sekcje Aktywność/Live/Anti-cheat agregują wszystkie moduły (`shared/stats/aggregate.ts`)
│   │                      # moduł 2: sylaby opanowane/trudne + heatmapa fonemów PL
│   ├── engagement/        # idle, page-visibility, fast-click, anti-cheat flags (+ `antiCheatFlagText`: flagi po ludzku)
│   └── ui/                # KidNav, Button, IskraMascot, HandwrittenLetter (+ `pair`), useReducedMotion.ts
│                          # syllableColors.ts (getSyllableCue: paleta Okabe–Ito + underline; `syllableColorForBox`: kolor gaśnie z boxem)
├── app/                   # App.tsx (routes), Home (4 kafelki + pasek „Literka dnia"), theme tokens
└── main.tsx

audio-source/              # source teksty dla TTS
├── letters.json           # litera → tekst (moduł 1) — klucze `letter-<x>`, W UŻYCIU: to domyślny tryb promptu (`phoneme`), w praktyce nagrania rodzica z `manual-overrides/`
├── letters-phonemes.json  # 32 fonemy izolowane; głos Zofia, `_engine: azure-ipa` — klucze `phon-<slug>`; od 2026-08-29 NIE grają (user wybrał `letter-*`), zostają na rollback
├── letters-names.json     # 32 nazwy liter szkolne („be", „ce"…); głos Zofia, `_engine: azure` (plain) — klucze `letter-name-<slug>`
├── words.json             # słowa-asocjacje + frazy "X jak Y" (moduł 1)
├── ui-strings.json        # pochwały (w tym `praise-proc-1..10`), korekty, nawigacja, onboarding, koniec, `retry-correct`, `session-stop-enough`,
│                          # `letters-hard-intro/-empty`, `letters-daily-intro/-end/-done`, `home-daily-letter`, `letters-reverse-prompt` (moduł 1)
├── syllables.json         # generowany (`pnpm audio:reading`) z sumy sylab modułu 2 + `words.ts`; głos Zofia, `_engine: azure-ipa`; klucze lowercase `syl-ma`, `syl-ge_s_`… (SRS id zostaje `syl-MA` — patrz „Gdzie ŁATWO się pomylić")
├── reading-ui-strings.json # pochwały czytania (w tym `reading-praise-proc-1..6`), scenki, wild celebrations, `reading-blend-prefix`,
│                          # `reading-level-up/-down`, `reading-meaning-prompt` (moduł 2)
├── iskra-reactions.json   # reakcje Iskry: easter eggs, silly, fail (moduł 2; głos Marek)
├── numbers.json / math-ui-strings.json # koncepty, fakty, UI, strategie po błędzie (`strategy-*`), `praise-proc-num-1..6`,
│                          # `mastery-*` (19 kluczy na 20 konceptów), `count-objects-prompt/-howmany/-recount` (moduł 3)
├── czytanki-syllables.json # generowany (`pnpm audio:czytanki`); głos Agnieszka, `_engine: azure-ipa` — sylaby cz-syl-*
├── czytanki-words.json     # generowany (`pnpm audio:czytanki`); głos Agnieszka, `_engine: azure` (plain SSML) — słowa cz-word-*
├── czytanki-questions.json # generowany (`pnpm audio:czytanki`) z `comprehension.question`; głos Agnieszka, `_engine: azure` — klucze cz-q-01…cz-q-60 (59, bez cz-12)
├── czytanki-ui-strings.json # intro, nawigacja, cue, echo/tempo (`czytanki-ui-echo-on/-off/-slow/-normal`, `czytanki-echo-intro`), `czytanki-ui-merge-on/-off`, `czytanki-q-intro/-praise/-again`; głos Agnieszka, `_engine: azure`
└── manual-overrides/*.mp3 # wygrywa nad TTS (jeśli istnieje plik)

scripts/generate-audio.ts  # idempotentny: hash text vs manifest, trzy silniki (edge | azure | azure-ipa)
scripts/polishG2p.ts       # ortografia PL → IPA (toIpa) dla `_engine: azure-ipa`
scripts/azureTts.ts        # REST Azure Speech: buildSsml (phoneme IPA) + buildPlainSsml (plain), backoff 429/5xx, loader .env.local
scripts/czytanki-audio-source.ts # generuje czytanki-syllables.json (agnieszka/azure-ipa) + czytanki-words.json + czytanki-questions.json (agnieszka/azure)
scripts/reading-audio-source.ts  # generuje audio-source/syllables.json (moduł 2) z SYLLABLE_TEXTS ∪ sylab ALL_WORDS, klucze lowercase slugPl
public/audio/              # build artifact: mp3 (`ls public/audio/*.mp3 | wc -l`) + .manifest.json — liczba rośnie z każdym audio:build, sprawdzaj na bieżąco
```

## Kluczowe decyzje (już zaakceptowane)

- **Modułowa architektura** — kolejne moduły (sylaby, cyfry, kolory) doklejają się jako `src/modules/<nazwa>/`. Reużywają shared/ (SRS, audio, settings, stats, engagement, ui).
- **Audio — Edge TTS przez Python wrapper** (`scripts/tts.py` + CLI) dla modułów 1-3 i Iskry. User edytuje `audio-source/*.json`, woła `pnpm audio:build`. Manual override przez `audio-source/manual-overrides/<klucz>.mp3` wygrywa nad TTS.
- **Trzy silniki TTS** — plik `audio-source/*.json` deklaruje `_engine`: `edge` (domyślny, darmowy CLI, bez SSML), `azure` (Azure Speech REST, zwykłe SSML bez phoneme — plain text) albo `azure-ipa` (Azure Speech REST + SSML `<phoneme alphabet="ipa" ph="…">`, gdzie IPA liczy `scripts/polishG2p.ts` z ortografii). WHY osobny `azure-ipa`: Edge/Azure zgadują wymowę **izolowanych sylab** i mylą się ("lo" → "elo", "ka" → "ka a", "ry" → "ri"), a IPA omija ten zgadywacz. Głos `agnieszka` (pl-PL-AgnieszkaNeural, lektor czytanek — moduł 4) jest Azure-only: `_voice: agnieszka` + `_engine: edge` rzuca błąd przy wczytywaniu źródeł. `azure-ipa` używane przez `czytanki-syllables.json`; całe słowa i UI czytanek (`czytanki-words.json`, `czytanki-ui-strings.json`) idą przez `azure` (plain SSML). `synthesizeAzure` throttluje requesty (min. odstęp ~3.1s, tier F0 ≈20 req/min) i robi retry z exponential backoff na 429/5xx (do 6 prób: 2s/4s/8s/16s/32s/60s, honoruje `Retry-After`). Wymaga `.env.local` (gitignore) z `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=westeurope` — darmowy tier F0 wystarcza; wzór w `.env.example`. Podgląd planu bez klucza: `pnpm audio:dry` (wypisuje engine, tekst, IPA i akcję dla każdego klucza).
- **`audio-source/pronunciation-overrides.json`** — ręczne wyjątki wymowy wybrane przez odsłuch, per klucz `{ "ipa": "…" }` (wymuś `<phoneme>` tym IPA) albo `{ "text": "…" }` (wymuś zwykłe SSML tym tekstem); ma pierwszeństwo przed G2P/tekstem źródłowym dla wpisów `azure`/`azure-ipa` (nie `edge`). Klucze zaczynające się od `_` to komentarze. Nie jest to plik-źródło audio (wykluczony z `discoverSourceFiles`), tylko nakładka wczytywana osobno w `generate-audio.ts`.
- **Brak fonemów IPA w Edge** — publiczny endpoint Edge TTS nie obsługuje SSML phoneme tags. Fala 1 wygenerowała fonemy liter przez `azure-ipa` (`letters-phonemes.json`), ale od 2026-08-29 **nie grają** — domyślny tryb promptu to `phoneme` = nagrania rodzica `letter-*`. `azure-ipa` zostaje dla sylab (moduły 2 i 4); Edge jest default dla reszty modułów 1-3.
- **Theme: jeden tryb** — warm light (`#fef9f2` tło, `#2d2d33` tekst), ignoruje `prefers-color-scheme`. Brak dark mode.
- **No-text UI dla dziecka** — tylko ikony + audio cues. Wszystkie tap-targety ≥60×60 (wyjątek świadomy: sylaby czytanek 56 px, patrz „Znane odstępstwa" w STATUS). Brak gestów (tylko tap); moduł 2 używa drag-drop (@dnd-kit) dla ćwiczenia Płomyk.
- **Persist kilka storage** (stan po Fali 2): `iskierki-state-v1` (settings + math gate + humorMode + reading.* + `questionsPerSession` + `secondAttempt` + `letters.promptMode(+ByLevel)` + `czytanki.{echoMode,tempo,mergedSyllables}`; klucz `name` to `iskierki-state-v1`, **`version: 6`** — nie mylić jednego z drugim; `migrate` v4→v5 mapuje `sessionLength`→`questionsPerSession`, v5→v6 mapuje `promptMode: 'both'`→`'phoneme'`), `iskierki-letters-v1` (moduł 1, **`version: 2`**: `dailyLetter`, `dailyDoneDayKey`), `iskierki-reading-v1` (moduł 2 progres, `version: 1`), `iskierki-numbers-v1` (moduł 3, **`version: 3`**: `factsCorrect`, `recentOutcomes`) i `iskierki-czytanki-v1` (moduł 4 — openedIds, seenIntros, `wordTaps`, `timeMs`, **`version: 3`**: `readCounts`, `lastCountedAt`, `answeredQuestionIds`, `comprehensionResults` — bez bumpu, default w `merge`). Reset jednego nie kasuje pozostałych.
- **Tryb promptu liter = `phoneme` (default)** — „jak się czyta" (b → „by"), klucze `letter-<x>` = nagrania rodzica z `manual-overrides/`. `name` (nazwy szkolne `letter-name-*`) i `both` zostają jako opcje; fonemy Azure `phon-*` są w repo, ale nie grają. W trybie `both` samogłoski grają sam dźwięk (inaczej „a… a").
- **Mastery konceptu to OKNO, nie seria** (Cyferki, Fala 2) — `recentOutcomes` (cap 10) + `factsCorrect`; `mastered` przy ≥`min(10, minStreakForMastery)` poprawnych z ostatnich 10 **i** `factsCorrect.length ≥ minFacts` **i** `ageMs ≥ MIN_AGE_FOR_MASTERY_MS`. Mastery nigdy się nie cofa. Miękkie odblokowanie prerekwizytu honoruje ALBO `correctStreak`, ALBO liczbę poprawnych w oknie ≥ `ceil(minStreakForMastery/2)` (przy domyślnych 8 → 4/10 = 40%).
- **Tryby powtórki liter** — `/letters/hard` („Trudne literki": pula SRS `totalSeen>0 && (recentWrong>0 || box≤2)`, cap 8, kafelek wyszarzony przy puli <3) i `/letters/daily` („Literka dnia": 4 ekspozycje + jedna odwrotna + kotwica słowna, litera zamrożona na dobę). Obie logują `SessionLog` z `level: 'hard'`/`'daily'`, poza unią `Level`.
- **Ciągłość uczenia**: `BaseItemState` (generalized SRS) persistowany — w **kolejnej sesji** litery/sylaby/słowa z `recentWrong>0` lub niskim `box` mają wyższy score → częściej w pytaniach.
- **Druga próba po błędzie** (Litery/Czytanie/Cyferki, `settings.secondAttempt`, default `true`) — pierwsza pomyłka aktualizuje SRS od razu i bez zmian (box −2 itd.); status `retry` pokazuje to samo pytanie z 2 opcjami (poprawna + wybrana); wynik idzie do logu jako `attempt: 2` i **nie dotyka SRS** (retry-correct bez boxa/iskierki/dinga; retry-wrong = hiperkorekcja). `word-assembly` (drag-drop) i `number-bond-builder`/`fact-family-triangle` retry nie mają — odpowiedź tam nie jest wyborem z listy.
- **Koncepty ważone + `prerequisites`** (Cyferki) — `pickConcept.ts` losuje koncept ważony stanem (`0` zablokowany prerekwizytem, `2` learning+recentWrong, `1` learning, `0.4` mastered) przed `pickNextItem` na faktach tego konceptu; przy 0 dostępnych konceptów fallback na wszystkie bez prerekwizytów.

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
pnpm test --run       # testy (1062/1062 zielone: 943 src + 119 scripts, po Fali 2 + CR). `vitest.config.ts` wyklucza `**/.claude/**` — bez tego zbiera testy ze starych worktree'ów agentów
pnpm audio:czytanki   # generuj czytanki-syllables.json (375) + czytanki-words.json (407) + czytanki-questions.json (59) z data/czytanki.ts (moduł 4)
pnpm audio:reading    # generuj syllables.json (moduł 2) z SYLLABLE_TEXTS ∪ sylab ALL_WORDS (91 kluczy)
pnpm audio:build      # audio:czytanki + audio:reading + generuj/aktualizuj mp3 (azure-ipa wymaga .env.local)
pnpm audio:dry        # plan buildu bez TTS: engine + tekst + IPA + akcja (nie wymaga klucza)
pnpm audio:check      # audio:czytanki + audio:reading + sprawdź czy wszystkie klucze mają plik (1380 wymaganych po Fali 2 + CR; działa bez klucza Azure; `ls public/audio/*.mp3 | wc -l` = 1387 — 7 nadwyżka: `correction-prefix` jest używany w runtime bez wpisu w source (nie usuwać); osierocone: `feedback-correct-suffix`, `feedback-wrong-prefix`, `still-there`, `summary-intro`, `timeout-1`, `timeout-2`, nie w żadnym source, kandydaci do sprzątnięcia)

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
- **`audioBus.play()` resolves boolean, nigdy nie rzuca** — `true` = klip FAKTYCZNIE wystartował (choćby zaraz potem przerwany przez `stop()`), `false` = nigdy nie ruszył: zablokowany autoplay, brak/uszkodzony plik, albo `stop()` gdy klucz wciąż czekał w kolejce; `await` bez try/catch jest bezpieczny. `stop()` inkrementuje generation token — trwające `play()` z poprzedniej generacji settluje się cicho (wartością „czy zdążyło wystartować") zamiast dograć w tle ("zombie drain"). `playIntroOnce` (`src/shared/audio/playIntroOnce.ts`) oznacza intro jako widziane dopiero gdy `play()` rozstrzygnie się na `true` — inaczej zablokowany autoplay/brak pliku skasowałby onboarding na zawsze; intro przerwane tapem dziecka liczy się jako usłyszane. Od Fali 1: `AudioBus.setPlaybackRate(rate)` (czytanki żółw) musi być przypisywane w `playOne` przy KAŻDYM klipie — inaczej rate gubi się po zmianie `src`.
- **Zmiana reguł w `polishG2p.ts` = regeneracja setek sylab** — hash `azure-ipa` zawiera IPA, więc każda poprawka G2P wymusza ponowny build tych kluczy (i zużycie limitu F0). Najpierw `pnpm audio:dry`, potem build.
- **Klucz audio sylab modułu 2 ≠ id SRS** — `getSyllableAudioKey(syllable)` (lowercase `slugPl`, np. `syl-ge_s_`) dla audio, `getSyllableId(syllable)` (uppercase, np. `syl-GĘŚ`) dla SRS/persist (`syllables.ts`, moduł reading). Nie mylić przy dodawaniu nowej sylaby — brak migracji persist, bo id SRS się nie zmienił.
- **`FEEDBACK_DURATION_BASE_MS.wrong`** (Litery) musi uwzględniać tryb promptu `both` (nazwa + fonem = dłuższa kolejka niż sam fonem) — inaczej audio korekty gra po pojawieniu się ekranu retry/następnego pytania.
- **`promptAudioKeys`/`getSyllableAudioKey`/`slugPl`** — 404 na brakujący klucz nie wybucha (patrz kontrakt `play()` boolean wyżej). Uwaga: `soundKey` NIE używa `slugPl` — buduje `letter-<litera>` z diakrytykiem (`letter-ą.mp3`), `letter-name-*`/`phon-*` używają slugu. Nie ujednolicać bez migracji plików.
- **Wariant odwrotny (`kind: 'letter-to-sound'`) łamie dwa domyślne zachowania Liter** — (1) **nie ma countdownu**: `startCountdown()` jest pomijane w `generateNextQuestion` i w `resume()`, bo odsłuchanie trzech kandydatów zajmuje więcej niż limit czasu i timer generowałby fałszywe timeouty; (2) **korekta nie gra dźwięku celu, ale TYLKO przed drugą próbą**: `playFeedbackAudio(..., willRetry)` pomija `promptAudioKeys(target)` wyłącznie gdy zaraz będzie retry (`wrong` + `attempt 1` + `secondAttempt` + wybrany kafelek) — dźwięk litery JEST odpowiedzią i rozwiązywałby retry (2 kafelki). Bez retry (attempt 2, „nie wiem", timeout, `secondAttempt` off) dźwięk celu MUSI zagrać. `FEEDBACK_DURATION_BASE_MS` zostaje bez zmian (stała per wariant, nie suma kolejki).
- **„Literka dnia" NIE liczy się do `sessionsToday`** — `todaySessions.ts` filtruje `s.level !== 'daily'`, bo 60-90 s mikrosesja-przywitanie nie może zbliżać dziecka do „na dziś wystarczy". Dodając nowy tryb powtórki, zdecyduj świadomie, po której stronie tego filtra ma być.
- **`SessionLog.level` to `SessionMode` (`Level | 'hard' | 'daily'`)**, nie `Level` — każda mapa etykiet indeksowana tym polem musi mieć wpis dla `hard` i `daily`, inaczej raport pokaże `undefined`. `LEVEL_LABEL` w `settings/defaults.ts` celowo zostaje `Record<Level, string>` (indeksuje UI ustawień); rozszerzenie żyje jako `SESSION_MODE_LABEL` w `stats/components/LiveSessionSection.tsx`.
- **Mastery Cyferek liczy się z okna 8/10, nie ze streaka** — `factsTouched` to już wyłącznie pole migracyjne (`@deprecated`), kryterium jest `factsCorrect`. `computeMasteryProgress` jest eksportowane, bo przez hook nie da się deterministycznie wymusić 10 pytań na jednym koncepcie (`pickConcept` przeplata). Po migracji v2→v3 koncepty `learning` startują z pustym oknem — pierwsze mastery wymaga 10 nowych odpowiedzi.
- **Feedback błędu w Cyferkach to PAS w przepływie, nie overlay** — `position: relative; flex: 0 0 28%` pod StatusBarem (nie `absolute`), żeby nie zasłonić reprezentacji, którą właśnie odsłania `revealValue` („tu było N"). `zIndex: 900` (pod `PauseOverlay` z2000). Pod pasem leży przezroczysty **scrim** `zIndex: 899` z `pointerEvents: 'auto'` — bez niego dziecko dotyka zadania w trakcie feedbacku. `correct` zostaje pełnoekranowy (nagroda, nie korekta).
- **`CountObjectsExercise` blokuje kafelki cyfr, dopóki nie skończy się `count-objects-howmany`** — `unlockAfter(audioBus.play(...))` (`data-locked` na kontenerze). Bez tego dziecko klika liczbę zanim usłyszy pytanie o kardynalność, a do SRS idzie odpowiedź na pytanie, którego nie było. Tapy w obiekty NIE wołają `audioBus.stop()` — FIFO ma zachować kolejność „jeden, dwa, trzy".
- **Pytania o rozumienie (Czytanki) mają regułę anty-three-cueing** — `comprehension.test.ts` egzekwuje, że **co najmniej jeden dystraktor jest widoczny w scenie**; gdyby scena pokazywała wyłącznie poprawną odpowiedź, dziecko trafiałoby z obrazka bez czytania. Dopisując pytanie, sprawdź `sceneEmoji(id)` zanim dobierzesz opcje. `cz-12` („Pada i pada.") świadomie NIE ma pytania — brak rzeczownika w tekście, więc 59, nie 60.

## Konwencje kodu

- Function components, named exports
- TS strict, brak `any` / `@ts-ignore`
- Komentarze tylko gdy WHY niejasne. Nie opisuj WHAT.
- Polskie napisy w UI dla dziecka i rodzica
- Inline styles + Tailwind utilities OK (mieszanka jest spójna)
- Tokeny z `@/app/theme` — `colors`, `radii`, `tapTargets`

## Co JESZCZE nie działa / jest ograniczone

- **Tracing palcem** (haptyka) — w v3
- **Piosenka alfabetu** — w v3
- **Multi-profile** — jeden profil per urządzenie/przeglądarka (LocalStorage)
- **Sync między urządzeniami** — brak (no backend)
- **SFX biblioteka (moduł 2)** — placeholder; używa SFX z modułu 1 gdzie potrzeba. Dedykowane SFX dla drag-drop i wild celebrations do nagrania/pobrania.
- **Moduł 5+** — kolory, kształty — architektura gotowa (`src/modules/<nazwa>/`)
- **Zdania / krótkie teksty w module 2** — moduł czytania (sylaby+słowa) nadal do poziomu słów; zdania obsługuje osobny moduł 4 (Czytanki)
- **Fala 2 — świadome nie-cele** (Fala 3, patrz spec `docs/superpowers/specs/2026-08-29-fala-2-dydaktyka-design.md`): „plan na dziś", jedna wspólna ekonomia nagród, tracing, poziom CVC w czytankach, oś liczbowa, porównywanie zbiorów, multi-profil, nagrywanie dziecka, ASR. Żadnych timerów/punktów/streaków widocznych dla dziecka.
- **Fala 1+2 — odłożone drobiazgi** (patrz „Znane odstępstwa" i „Fala 2" w `docs/STATUS.md`): migracja `word-*` (moduł 2, ~12-16 kluczy z diakrytykami) na `slugPl`; dev-only podwójne cue w StrictMode (retry-flow, `level-up-suggest`, `reading-level-up/-down`, `session-stop-enough`); nazwa stałej `SESSION_LENGTH_OPTIONS` nieaktualna po przejściu na `questionsPerSession`; tap-target sylab czytanek 56 px (nie 60 — auto-fit najdłuższych czytanek w portrait); odsłuch nagrań Azure przez usera (`phon-*`, `syl-*`, `cz-q-*`) jeszcze nie zrobiony; brak dedykowanego `mastery-ognik-factfamily-20` (dzieli klucz z `plomyk-factfamily`).

## Przy starcie nowej sesji

1. Przeczytaj `docs/STATUS.md` — co skończone, co w trakcie, znane problemy
2. Sprawdź `pnpm tsc -b` i `pnpm test --run` — baseline
3. Zapytaj user'a co chce dalej (nie zakładaj, że pamiętam stan z poprzedniej sesji)
4. Po sesji: zaktualizuj `docs/STATUS.md`
