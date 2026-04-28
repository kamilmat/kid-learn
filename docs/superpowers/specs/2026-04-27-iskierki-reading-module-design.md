# Iskierki — moduł 2: nauka czytania słów

**Data:** 2026-04-27
**Status:** zatwierdzony do implementacji po review
**Autor:** brainstorming session
**Poprzedni moduł:** [`2026-04-26-iskierki-letters-module-design.md`](./2026-04-26-iskierki-letters-module-design.md)

## 1. Wizja

Drugi moduł platformy Iskierki — **nauka czytania sylab i słów**, kontynuacja po module rozpoznawania liter. Skupia się **wyłącznie na czytaniu** (rozumianym jako: rozpoznawanie zapisanej formy + synteza sylab w słowo + rozumienie znaczenia). **Moduł nie uczy pisania** — tracing, dyktando, speech recognition są poza zakresem (pisanie to odrębny moduł v3+).

Filozofia dydaktyczna: **polska metoda analityczno-syntetyczna sylabowa** (Falski / Cieszyńska). Sylaba CV jako podstawowa jednostka, "ślizganie" głosek, kanon elementarzowy słów (MAMA, TATA, KOT, DOM…). Dwuznaki (SZ, CZ, RZ, CH) i zmiękczenia (ŚCI, CI, SI) wprowadzane późno (Ognik / Pochodnia).

**Wyróżnik na polskim rynku:** mini-scenki słów (animowane reakcje pokazujące znaczenie) + warstwa humoru (Iskra easter eggs, wariacje scenek, wild celebrations) — kombinacja, której polskie aplikacje edukacyjne nie mają. Wzorce: Endless Reader (DnD liter z magnetyzmem), Khan Kids (audio-to-word matching), Toca Boca (humorystyczny replay-driver).

## 2. Target user i kontekst

- **Główne dziecko:** 7 lat, zerówka, zna polski alfabet (z modułu 1) lub uczy się równolegle
- **Wiek dolny:** 5-6 lat (wcześniejsze sylaby CV jeśli umie)
- **Rodzic:** kontrola ustawień (przez bramę math z modułu 1), wgląd w postępy
- **Urządzenie podstawowe:** iPad 10" (tablet first), RWD desktop/smartfon
- **Bez backendu, bez logowania.** Postęp w `localStorage` (osobny key od modułu 1)
- **Bez gating'u na moduł 1** — dziecko wybiera czego się uczy. Home pokazuje 2 kafelki obok siebie

## 3. Stack technologiczny

Bez zmian względem modułu 1:

- **React 19** + **Vite** + **TypeScript strict** + **Tailwind 4**
- **Zustand** — nowy store `readingStore` (równoległy do `lettersStore`)
- **Vitest** — testy logiki nietrywialnej (SRS dla słów, generator dystraktorów dla sylab, weryfikacja drag-and-drop)
- **Edge TTS** (Python wrapper) — generowanie audio przy buildzie
- **`react-router-dom`** — routing rozszerzony o `/reading/*`
- **`@dnd-kit/core`** lub własny minimalny drag-and-drop hook — dla układania sylab. Decyzja w plan'ie implementacji (dnd-kit jest standardem React i ma magnetism out-of-the-box, ale dodaje ~30KB).

## 4. Struktura projektu

```
src/
├── modules/
│   ├── letters/                # moduł 1 — bez zmian
│   └── reading/                # moduł 2 — NOWY
│       ├── components/
│       │   ├── ReadingLevelSelect.tsx
│       │   ├── SessionView.tsx
│       │   ├── exercises/
│       │   │   ├── SyllableMatchExercise.tsx       # Iskierka: audio→sylaba
│       │   │   ├── WordAssemblyExercise.tsx        # Płomyk: drag sylab w słowo
│       │   │   ├── WordChoiceExercise.tsx          # Ognik: audio→słowo
│       │   │   └── SyllableFillExercise.tsx        # Pochodnia: uzupełnij sylabę
│       │   ├── WordScene.tsx                        # mini-scenka słowa (CSS+emoji)
│       │   ├── IskraMascotAnimated.tsx              # Iskra z reakcjami
│       │   ├── WordAlbum.tsx                        # ekran kolekcji
│       │   ├── WildCelebration.tsx                  # absurdalne over-reaction
│       │   ├── SyllableTile.tsx
│       │   ├── WordTile.tsx
│       │   ├── DropSlot.tsx
│       │   └── FeedbackOverlay.tsx                  # reading-specific
│       ├── data/
│       │   ├── syllables.ts          # baza sylab per poziom
│       │   ├── words.ts              # baza słów per poziom (text + scenes + audio key)
│       │   ├── scenes.ts             # definicje mini-scenek (keyframes + emoji + sfx)
│       │   ├── easterEggs.ts         # lista easter eggs Iskry (apsik, hik, beknięcie...)
│       │   └── wildCelebrations.ts   # lista wild celebrations
│       ├── hooks/
│       │   ├── useReadingSession.ts  # orkiestrator (analog useSession)
│       │   ├── useDragSyllable.ts    # logika drag-and-drop z magnetyzmem
│       │   └── useIskraReactions.ts  # losowanie reakcji + easter eggs
│       ├── store/
│       │   └── readingStore.ts       # Zustand + persist (key: iskierki-reading-v1)
│       ├── types.ts
│       └── index.tsx                 # entry: /reading/* + /reading/album + /reading/session/:level
├── shared/
│   ├── audio/                  # bez zmian (AudioBus singleton)
│   ├── srs/                    # generalizacja na ItemState (sylaby/słowa, nie tylko litery)
│   ├── settings/               # rozszerzenie typu Settings
│   ├── stats/                  # rozszerzenie typu SessionLog
│   └── ui/                     # IskraMascot rozszerzona (reakcje + easter eggs)
└── app/
    ├── App.tsx                 # Routes rozszerzone o /reading/*
    └── Home.tsx                # 2 kafelki: Litery + Czytanie

audio-source/
├── letters.json                # bez zmian
├── words.json                  # rozszerzone o słowa modułu 2 (~80 wpisów)
├── syllables.json              # NOWY — sylaby (~30 wpisów: MA, TA, LA, ...)
├── reading-ui-strings.json     # NOWY — UI cues specyficzne dla modułu 2
├── iskra-reactions.json        # NOWY — reakcje Iskry (TTS Marek)
└── manual-overrides/           # bez zmian (tylko gdy TTS źle brzmi)

public/audio/                   # build artifact: ~250-300 plików (ze startem ~150 z modułu 1)
```

## 5. Routing i punkt wejścia

### 5.1 Home

`/` — dwa duże kafelki (1×2 lub 2×1 zależnie od orientacji):

- **Litery** (moduł 1, istniejący) → `/letters`
- **Czytanie** (moduł 2, nowy) → `/reading`

Bez gating'u. Dziecko wybiera. Każdy kafelek ma:

- Animowaną Iskrę z motywem modułu (litera A vs. książeczka)
- Krótki onboardingowy audio-cue (1× per `seenIntros`)
- Tap-target 200×200px minimum (8-10x większy niż minimum 60×60)

### 5.2 Routes modułu

- `/reading` → `ReadingLevelSelect` (analog do `LevelSelect` z modułu 1)
- `/reading/session/:level` → `SessionView`
- `/reading/album` → `WordAlbum` (dziecko może wejść z home modułu 2 lub z SessionEnd)
- `*` → redirect na `/reading`

### 5.3 Walidacja level

Identycznie jak moduł 1: filtr przez `VALID_LEVELS` set, redirect na `..` jeśli zły.

## 6. Pętla nauki — pojedyncza sesja

### 6.1 Wejście

1. Home → kafelek "Czytanie" → ReadingLevelSelect (4 poziomy)
2. Po wyborze poziomu → ekran startu z dużym przyciskiem; lektor (Zofia): "Naciśnij start, kiedy chcesz zacząć czytać"
3. Preload audio sesji w tle (sylaby/słowa puli + UI cues + Iskra reakcje)
4. **Onboarding głosowy** per poziom (1× per `seenIntros`) — Iskra (Marek) wita: "Cześć! Dzisiaj nauczymy się czytać sylaby" / "...składać słowa" / "...rozpoznawać słowa" / "...uzupełniać sylaby"

### 6.2 Pojedyncze pytanie — różne per poziom

Każdy poziom ma **inny typ ćwiczenia**, ale wspólne elementy: pasek statusu sesji (kropki postępu, licznik iskierek, pauza), przycisk audio "🔊 powtórz", feedback overlay.

Liczba pytań per sesja: **8** (jak w module 1, konfigurowalne per poziom przez settings).

### 6.3 Iskierka — Audio→Sylaba

- Lektor wymawia sylabę (np. "MA"), dziecko widzi 4 sylaby pisane (Kalam) w siatce 2×2
- Tap na poprawną → zielona poświata + "ding" + ewentualnie krótka reakcja Iskry
- Błąd → pomarańczowa poświata na wybranym + pulsacja na poprawnej, lektor: "Posłuchaj jeszcze raz… to była MA"
- "Nie wiem" 🤷 → poprawna sylaba duża na środku + lektor wymawia wolno
- Dystraktory: kontrastywne (różniące się jedną głoską: MA vs. NA, MA vs. ME), preferowane fonemicznie podobne aby dziecko ćwiczyło dyskryminację
- **Brak mini-scenki** dla sylab samych w sobie — sylaba nie ma znaczenia. Mini-scenki uruchamiane tylko dla słów.

### 6.4 Płomyk — Drag-and-drop sylab w słowo

- Na górze ekranu: 2 puste sloty oznaczające sylaby docelowego słowa
- Pod slotami: 4-5 rozsypanych sylab (2 poprawne + 2-3 dystraktory)
- Lektor (Zofia): "Ułóż słowo MAMA" + sygnał audio o starcie
- Dziecko **przeciąga** sylabę w slot. **Magnetyzm**: gdy puści w odległości <40px od slotu, sylaba "wskoczy" w slot. W innym miejscu — wraca z animacją bumpu.
- Slot prawidłowo wypełniony → drobny "tap"
- Cały complete → "ding" + Iskra "łał!" + **mini-scenka słowa** (sekcja 11)
- Błąd: zła sylaba w slocie → pomarańczowa poświata, sylaba wraca, krótkie "blip" (NIE buzzer)
- "Nie wiem" 🤷 → poprawne sylaby same wskakują w sloty z animacją, lektor wymawia każdą + całe słowo

### 6.5 Ognik — Audio→słowo z obrazkiem

- Lektor (Zofia) wymawia słowo (np. "SZAFA"), dziecko widzi 4 słowa pisane w siatce 2×2
- Tap na poprawne → zielona poświata + "ding" + **mini-scenka słowa** + lektor wymawia wolno + "to była SZAFA"
- Dystraktory: słowa o zbliżonej długości i podobnych fonemach (SZAFA vs. SZAŁA / SZALIK / SZALA)
- Po sukcesie: **karta dodawana do Albumu** (pierwsze opanowanie tego słowa = box przesuwany w SRS)

### 6.6 Pochodnia — Uzupełnij sylabę

- Pokazane słowo z brakującą sylabą: `KA-PE-___` (np. KAPELUSZ → uzupełnij LUSZ)
- 3-4 dystraktory pod słowem
- Tap na poprawną sylabę → wskakuje w lukę z animacją
- Lektor wymawia całe słowo poprawnie + mini-scenka (jeśli dla słowa zdefiniowana — sekcja 9.5)
- **Wariant pozycji luki:** w danym pytaniu losowana jest pozycja brakującej sylaby (pierwsza / środkowa / ostatnia). Per-słowo data zawiera flagę `allowMissingPositions: ('first' | 'middle' | 'last')[]` — niektóre słowa nie nadają się na "first missing" (np. krótsze 2-sylabowe)
- W startowej sesji Pochodnia preferuje "ostatnią" (najłatwiejsza), z czasem pojawia się "środkowa", potem "pierwsza" (najtrudniejsza). Sterowane przez średni box słowa

### 6.7 Status bar i sterowanie

Wspólne dla wszystkich 4 typów (jak w module 1):

- **Pasek statusu** (pod KidNav): licznik iskierek, kropki postępu sesji (8 kropek), przycisk pauzy ⏸
- **Pauza** → overlay "Zatrzymane" + duży przycisk "Wznów"; idle 20s i page-visibility wymuszają pauzę (anti-cheat z modułu 1)
- **Przycisk audio 🔊** — powtarza prompt aktualnego pytania, wielokrotnie

### 6.8 Koniec sesji

`SessionEnd` (analog do modułu 1):

- Liczniki ✅ poprawne / ❌ błędne / 🤷 "nie wiem"
- Lista słów dodanych do albumu w tej sesji (z miniaturkami scenek)
- Iskra triumfująca + duży CTA "Zobacz album" → `/reading/album`
- "Wróć do menu" → `..`

## 7. SRS i adaptive learning

Reuse z modułu 1 (Leitner 5-box, scoring, distractors), z generalizacją:

### 7.1 ItemState

`shared/srs/types.ts` ma już `LetterState`. Generalizujemy:

```typescript
export type ItemState = {
  id: string                // np. "syl-MA", "word-MAMA", "letter-A"
  box: number               // 1-5
  lastSeen: number | null   // timestamp
  recentWrong: number       // 0+
}

export type LetterState = ItemState   // alias dla kompatybilności wstecznej
export type SyllableState = ItemState
export type WordState = ItemState
```

Funkcje `select.ts`, `update.ts`, `scoring.ts`, `distractors.ts` operują na `ItemState` zamiast `LetterState`. Moduł 1 dostaje minimalny refactor (alias `LetterState = ItemState`).

### 7.2 Wagi i parametry

Bez zmian: `BOX_WEIGHTS [5.0, 3.0, 1.5, 0.8, 0.4]`, `recentWrong × 2.0`, jitter 15%. Te wartości empirycznie sprawdzone w module 1.

### 7.3 Persist między sesjami

`readingStore` przechowuje `Record<string, SyllableState>` + `Record<string, WordState>` + log sesji + `albumUnlocked: string[]` + `seenIntros`.

Dwie pule pozycji (sylaby + słowa) ważone osobno — w jednej sesji puli sylab dotyczy SyllableMatchExercise (Iskierka) i SyllableFillExercise (Pochodnia, uzupełnianie sylab); puli słów dotyczy WordAssemblyExercise (Płomyk) i WordChoiceExercise (Ognik).

## 8. Słownik — kanon polski elementarzowy

### 8.1 Kryteria doboru

- **Polski kanon**: Falski / Cieszyńska / Nowa Era — słowa znane 7-latkowi z zerówki
- **Fonemicznie kontrolowane**: w Iskierka/Płomyk bez dwuznaków (sz/cz/rz/ch) i bez zmiękczeń (ści/ci/si/ń); w Ognik wchodzą dwuznaki, w Pochodnia zmiękczenia. Ó/U/RZ/Ż wprowadzane stopniowo (ortograficzne pułapki nie są celem modułu — dziecko ma czytać brzmieniowo, nie pisać poprawnie)
- **Animowalne**: każde słowo *może* mieć mini-scenkę. Słowa bez scenki mają fallback (sekcja 9.5)
- **Zerówka-friendly**: nazwy zwierząt, członków rodziny, otoczenia, pojazdów

### 8.2 Pula per poziom (propozycja, finalna lista po review)

**Iskierka — sylaby (16-20):** MA, TA, LA, KO, MO, TO, LO, RA, RO, RU, ME, TE, LE, BO, DO, SO, NO, BA, KU, PA

**Płomyk — 2-sylabowe CV+CV (20-25):** MAMA, TATA, LALA, KURA, RYBA, SOWA, RUDA, DUDA, NUDA, ŁAPA, KOSA, NORA, RANA, DOM, KOT, NOS, MAK, RAK, OKO, OSA, ULA, ALA, OLA, EMA, IGO

**Ognik — 2-3 sylabowe + dwuznaki (25-30):** SZAFA, CZAPKA, MASZYNA, RZEKA, ŻABA, CHŁOPIEC, PARASOL, BUTELKA, BANAN, JABŁKO, RYBKA, KOSZULA, LISEK, GĘŚ, HUŚTAWKA, SAMOCHÓD, KOMPUTER, TELEFON, ZABAWKA, KRZESŁO, OBRAZ, LAMPA, KSIĄŻKA, ROWER, AUTO, DROGA

**Pochodnia — 3+ sylab + zmiękczenia (25-30):** KAPELUSZ, ZIELONY, ŚLIWKA, SIANO, KOŃ, MIŚ, CIASTKO, NIEDŹWIEDŹ, KSIĘŻYC, PIENIĄDZ, MIESZKANIE, DZIECKO, CZWARTEK, DWORZEC, LOKOMOTYWA, POMIDOR, OGÓREK, MARCHEW, ZIEMNIAK, CEBULA, SAŁATA, KAPUSTA, ARBUZ, MELON

**Total:** ~85-100 słów + ~16-20 sylab = **~110 audio kluczy** (plus reakcje Iskry, easter eggs, UI cues, scenes audio).

User finalizuje listę przed nagrywaniem audio (selekcja kanonu może się zmienić).

### 8.3 Audio kluczy

Pliki w `audio-source/words.json` rozszerzone o słowa modułu 2 (każde jako `"word-MAMA": "mama"` itd.). Sylaby w nowym `audio-source/syllables.json` (`"syl-MA": "ma"`).

**Strategia voice:** TTS Zofia (lektor) + manual override jeśli TTS źle wymawia konkretny klip.

## 9. Mini-scenki słów — sygnaturowy element modułu

### 9.1 Koncept

Każde słowo ma 2-3 alternatywne **mini-scenki** (~2-3s) pokazujące znaczenie. Po correct (Płomyk/Ognik/Pochodnia) — losowo wybrana scenka odgrywa się z animacją CSS + emoji/SVG + dźwiękiem.

**Wariacje (replay-driver):** dziecko trafia to samo słowo ponownie → inna scenka. Odkrywanie wszystkich wariantów to motywacja do powtórek.

### 9.2 Definicja sceny — `data/scenes.ts`

```typescript
export type Scene = {
  id: string                    // np. "kot-v1", "kot-v2"
  emoji: string                 // główny emoji "🐱"
  durationMs: number            // długość animacji
  keyframes: Keyframe[]         // CSS keyframes inline
  audio: string[]               // klucze audio do zagrania (np. ["sfx-meow", "sfx-purr"])
  effects?: Effect[]            // dodatkowe emoji-particles ("hearts", "stars", "smoke")
}

export const SCENES: Record<string, Scene[]> = {
  kot: [
    { id: 'kot-v1', emoji: '🐱', durationMs: 2500, keyframes: [...], audio: ['sfx-meow'] },
    { id: 'kot-v2', emoji: '🐱', durationMs: 3000, keyframes: [...rotate-tumble], audio: ['sfx-meow-angry', 'sfx-purr'] },
    { id: 'kot-v3', emoji: '🐱', durationMs: 2800, keyframes: [...lazy-yawn], audio: ['sfx-yawn', 'sfx-snore'] },
  ],
  mama: [
    { id: 'mama-v1', emoji: '👩‍👧', durationMs: 2000, keyframes: [...hug-bounce], audio: ['word-MAMA'], effects: ['hearts'] },
    { id: 'mama-v2', emoji: '👩', durationMs: 2500, keyframes: [...waving], audio: ['word-MAMA', 'sfx-cheek-kiss'] },
  ],
  // ...
}
```

Komponent `WordScene` renderuje scenę: tworzy `<div>` z emoji + odpalą `style.animation` z keyframes + odpala audio queue. Po `durationMs` — fadeout + callback "scene complete".

### 9.3 Implementacja taniа

- **Bez ilustratora** — emoji + CSS animations + SFX (CC0 z mixkit/freesound)
- ~10 minut roboty per scenkę
- Scenki definiowane jako data, nie komponenty — łatwo dodać/edytować
- Możliwość późniejszej podmiany emoji na ilustrowane SVG bez zmiany logiki (tylko zmiana w `data/scenes.ts`)

### 9.4 Settings — `wordAnimations`

Default ON. Ustawienie w panelu rodzica (po bramie math) pozwala wyłączyć dla dzieci nadwrażliwych na bodźce. Gdy OFF: po correct gra tylko audio słowa + zielona poświata, bez animacji.

### 9.5 Fallback — słowa bez scenki

Nie każde słowo w `data/words.ts` musi mieć wpis w `data/scenes.ts`. Gdy dla danego słowa brak scenki:

- **Sukces (Płomyk/Ognik/Pochodnia)** → standardowe celebration (zielona poświata + "ding" + audio słowa) bez sceny
- **Album** → karta pokazuje tylko emoji domyślny ("⭐") albo fallback emoji wybrany w `data/words.ts` jako pole `albumEmoji`
- **Sukces na słowie bez scenki to wciąż OK** — dziecko nie traci doświadczenia, tylko nie dostaje "magii". Daje to space na stopniowe dodawanie scenek bez blokowania słów.

Cel: na premierę modułu **30 najczęstszych słów Iskierka+Płomyk** ma scenki (≥2 warianty każde). Pozostałe ~60-70 słów dochodzi stopniowo.

## 10. Iskra ożywiona

### 10.1 Reakcje w sesji

- **Sukces**: taniec (CSS keyframes wiggle), confetti emoji
- **Streak 3+**: fanfara warstwa 1, "uuu super!" (TTS Marek)
- **Streak 5+**: fanfara warstwa 2, "ŁAAŁ!" + większe confetti
- **Streak 7+**: special — łączy z **wild celebration** (sekcja 11)
- **Błąd**: smutna mina (CSS), brak negatywnego dźwięku, lektor (Zofia) komentuje neutralnie
- **Idle 5s**: blink, oddech, czasem ziewa (CSS animations)

### 10.2 Easter eggs (humor layer)

W ekranach gdzie Iskra jest dostępna do tap (LevelSelect, Album, Pauza):

- Tap → losowo wybrane easter egg z listy `data/easterEggs.ts`
- Po pierwszym tap pojawia się subtelny sygnał wizualny "puknij ją jeszcze" (np. Iskra dla 3s ma rotujące błyszczyki)

```typescript
export type EasterEgg = {
  id: string
  audio: string             // klucz audio (TTS Marek lub manual SFX)
  animation: string         // CSS keyframes name
  durationMs: number
  category: 'mild' | 'silly' // 'silly' to beknięcie/pierdnięcie iskier; tylko gdy humorMode=='on'
}

export const EASTER_EGGS: EasterEgg[] = [
  { id: 'apsik', audio: 'iskra-apsik', animation: 'sneezeShake', durationMs: 1200, category: 'mild' },
  { id: 'hiccup', audio: 'iskra-hik', animation: 'hiccupBounce', durationMs: 2000, category: 'mild' },
  { id: 'mlask', audio: 'iskra-mlask', animation: 'chewing', durationMs: 1500, category: 'mild' },
  { id: 'brrr', audio: 'iskra-brrr', animation: 'shiverShake', durationMs: 1500, category: 'mild' },
  { id: 'salto', audio: 'iskra-ojej', animation: 'backflipLand', durationMs: 1800, category: 'mild' },
  { id: 'gibberish', audio: 'iskra-plamplam', animation: 'wiggleWalk', durationMs: 1600, category: 'mild' },
  { id: 'burp', audio: 'iskra-burp', animation: 'bellySwell', durationMs: 1200, category: 'silly' },
  { id: 'sparkle-fart', audio: 'iskra-sparkle-fart', animation: 'sparkleFartCloud', durationMs: 1400, category: 'silly' },
]
```

Filtrowanie wg `humorMode` — jeśli `'off'`, wybiera się tylko `'mild'`.

### 10.3 Komiczny fail (humor layer)

Zamiast smutnej miny przy błędzie, Iskra robi jedną z losowych komicznych akcji:

- Drapie się po głowie ("hmm?" + emoji ❓)
- Wyciąga banana, je
- Mini-taniec konfuzji
- Wzdycha "nudzi mi się…"
- Robi śmieszną minę

**Czas trwania:** 1s (KRÓTSZY niż correct celebration ~2.5s) — żeby dziecko nie błądziło specjalnie. Po fail: standardowa pętla feedbacku (audio podpowiedź, retry).

### 10.4 Voice Iskry

**TTS pl-PL-MarekNeural** dla wypowiedzi Iskry (reakcje, easter eggs werbalne, onboarding). Manual override gdy TTS brzmi sztucznie (np. emocjonalne "ŁAAŁ!" które TTS może spłaszczyć).

**SFX z bibliotek CC0** dla non-verbal: apsik, hik, beknięcie, pierdnięcie iskier, mlask, brrr, czkawka. Pliki w `public/audio/sfx/` (poza Edge TTS pipeline'm — ~15-20 plików).

## 11. Wild celebration — rzadka magia

### 11.1 Koncept

Co `wildCelebrationFreq` correct (default 8) — zamiast standardowego celebration uruchamiamy losową absurdalną akcję.

### 11.2 Lista — `data/wildCelebrations.ts`

- **Rakieta**: Iskra wystrzeliwuje w górę ekranu z dźwiękiem "PIUUU!", smuga ognia
- **Spadające frukty**: 🍌🥑🦄⭐ spadają z górnego brzegu, fanfara
- **Ekran-salto**: cały viewport rotuje 360° (CSS transform), fanfara orkiestrowa
- **Tańczący awokado**: pojawia się 🥑, robi taniec na 2s, znika ze "ślubem"
- **Tęcza**: ekran zmienia kolor tła na tęczowy gradient na 1.5s, Iskra biegnie po niej

```typescript
export type WildCelebration = {
  id: string
  durationMs: number
  component: () => JSX.Element  // dedykowany komponent renderujący efekt
  audio: string[]
}
```

### 11.3 Częstotliwość

Setting `wildCelebrationFreq`: **default 8** (co 8. correct). Zakres: **3-15** (suwak w panelu rodzica). Wartości:

- 3 → bardzo często, dużo dopaminy, mała wartość per zdarzenie
- 8 → rzadko-niespodziewanie, optymalne wg testów apek (Toca Boca pattern)
- 15 → bardzo rzadko, magiczne, ale dziecko może zacząć zapominać o istnieniu

Setting per-moduł (moduł 1 nie ma wild celebrations — tylko fanfary). Może w v3 dodamy.

### 11.4 Logika triggera

`readingStore.wildCelebrationCounter`:

- Inkrementowany przy **każdym correct** (Iskierka/Płomyk/Ognik/Pochodnia, każdy typ ćwiczenia)
- Gdy osiągnie `settings.reading.wildCelebrationFreq` → triger wild celebration zamiast standardowego correct celebration → counter reset do 0
- Counter persistuje między sesjami (żeby dziecko nie tracił "progresu" do wild gdy zamknie tab)
- Counter NIE inkrementuje przy błędach / dontKnow / timeout — żeby błędne kliknięcia nie sztucznie przybliżały magii
- Niewielki random jitter (±2) na faktyczny próg w runtime — żeby dziecko nie nauczyło się odliczać

## 12. Album słów — kolekcjonerstwo

### 12.1 Koncept

Każde słowo opanowane (SRS box przeszedł >= 5) → karta trafia do "Albumu Iskry". Dziecko może:

- Wejść do `/reading/album` z home modułu lub z SessionEnd
- Zobaczyć wszystkie zdobyte karty (grid 4×N albo 5×N na iPad)
- Kliknąć kartę → odgrywa się scenka + audio słowa
- Karty niezdobyte: ?-placeholder (motywacja do gry)

### 12.2 Layout

- Grid kart, responsive (4 kolumny na iPad portrait, 5-6 na landscape, 2-3 na phone)
- Każda karta: emoji słowa + napis pisany (Kalam) na dole + status (zdobyta/?)
- Filter na górze: "wszystkie / Iskierka / Płomyk / Ognik / Pochodnia"
- Liczniki: "Masz 23 z 100 słów. Zostało 77!"
- Co 10. zdobyta karta → ceremonia odblokowania (dynamicznie animowana, jednorazowa)
- HUD na home modułu: plecak Iskry coraz bardziej napełniony (wizualizacja ile %)

### 12.3 Persistence

`readingStore.albumUnlocked: string[]` (lista id słów w albumie). Niezależne od `box` — raz zdobyte karty zostają nawet gdy dziecko zrobi błąd później (porządek psychologii: nie zabieramy osiągnięć).

## 13. Audio — bogaty feedback

### 13.1 SFX warstwy

Wszystkie z CC0 (mixkit/freesound). 15-20 plików w `public/audio/sfx/`:

- `tap.mp3` — sylaba w slot (cichy klick)
- `ding.mp3` — słowo całe poprawne (jasny dzwonek)
- `blip.mp3` — błąd (krótki neutralny, NIE buzzer)
- `pickup.mp3` — drag start (zassanie)
- `drop.mp3` — drag stop (lekki tłum)
- `fanfara-1.mp3` — streak 3+
- `fanfara-2.mp3` — streak 5+
- `fanfara-special.mp3` — streak 7+ / wild celebration
- `confetti.mp3` — wild celebration
- `whoosh.mp3` — Iskra w przejściu
- `pop.mp3` — easter egg pojawia się
- `meow.mp3`, `purr.mp3`, `bark.mp3`, `moo.mp3`, `oink.mp3` — animal sounds dla scenek

### 13.2 AudioBus reuse

Bez zmian — singleton z modułu 1. Klucze SFX dodane do manifestu. Kolejka FIFO obsługuje sekwencje (np. "drop tap → ding → mini-scenka audio").

### 13.3 Audio dla scenek

Każda scena ma `audio: string[]` — sekwencja kluczy (np. dla `mama-v1`: `['word-MAMA', 'sfx-heart-beat']`). AudioBus odtwarza sekwencyjnie.

## 14. Settings — rozszerzenia

`shared/settings/types.ts` rozszerzone:

```typescript
export type Settings = {
  // ... istniejące pola modułu 1 (caseMode, styleMode, tilesPerQuestion, ...)

  // Globalne (wpływają na obu modułach)
  humorMode: 'on' | 'off'                      // default 'on' — kontrowersyjny humor (beknięcie, pierdnięcie iskier)

  // Per-moduł 2 (reading)
  reading: {
    wordAnimations: 'on' | 'off'                // default 'on' — mini-scenki słów
    wildCelebrationFreq: number                  // default 8, zakres 3-15
    questionsPerSession: Partial<Record<Level, number>>  // default 8 dla wszystkich
    timeLimit: Partial<Record<Level, TimeLimit>> // analog modułu 1, default 'off' dla wszystkich poziomów (czytanie nie powinno mieć timera w MVP)
  }
}
```

### 14.1 Migracja persist

`shared/settings/settingsStore.ts` `merge` callback — dla starych localStorage bez pola `humorMode`/`reading`, zwraca defaults. Wersjonowanie: persist key `iskierki-state-v1` przechodzi w `iskierki-state-v5` (nowa migracja).

### 14.2 Panel rodzica

Sekcja "Czytanie" w `SettingsScreen` (po bramie math). Toggles + slider. Wszystko opisane słownie dla rodzica (nie tylko dla dziecka — settings nigdy nie są widoczne dziecku).

## 15. Persistence

### 15.1 Storage keys

- `iskierki-state-v5` — settings (wszystkie moduły) + math gate stan
- `iskierki-letters-v1` — postęp modułu 1 (bez zmian)
- `iskierki-reading-v1` — postęp modułu 2 (NOWY)

### 15.2 `readingStore` shape

```typescript
type ReadingState = {
  syllables: Record<string, SyllableState>     // SRS dla sylab
  words: Record<string, WordState>             // SRS dla słów
  sessions: SessionLog[]                       // log historyczny
  albumUnlocked: string[]                      // id słów w albumie
  seenIntros: string[]                         // ['reading-iskierka-intro', 'reading-album-intro', ...]
  lastUsedLevel: Level | null
  // metryki
  wildCelebrationCounter: number               // ile correct od ostatniego wild celebration
}
```

### 15.3 Reset

Panel rodzica → "Resetuj postęp" → opcje:

- "Tylko Litery" → reset `iskierki-letters-v1`
- "Tylko Czytanie" → reset `iskierki-reading-v1`
- "Wszystko" → reset obu

Settings (`iskierki-state-v5`) NIE są resetowane przez te przyciski (osobny "Resetuj ustawienia" jeśli dodamy w v3).

## 16. Raport rodzica

`shared/stats/ParentReport.tsx` rozszerzony o sekcję "Czytanie":

### 16.1 Sekcje raportu

- **Sylaby opanowane** — lista z box >= 5, kolorowane
- **Sylaby trudne** — `recentWrong > 0` lub box <= 2
- **Słowa opanowane** — Album z liczbą per poziom
- **Słowa trudne** — analogiczne, z najczęstszymi błędami (np. "MAMA mylone z TATA")
- **Heatmapa fonemów polskich** — które trudne (SZ, CZ, RZ, ŚCI, CI, SI, Ó, U, RZ/Ż confusions). Macierz "fonem × poziom" z kolorami trudności
- **Log sesji** — chronologicznie, click → szczegóły
- **Średnie wskaźniki** — czas/sesję, sukces rate, rosnące/spadające trendy

### 16.2 Eksport

JSON i CSV (analog modułu 1). Format zawiera obie populacje (litery + sylaby + słowa).

## 17. Implementacja — wytyczne

Szczegółowy plan w `docs/superpowers/plans/` (po review tego speca + invokacji writing-plans). High-level:

### 17.1 Fazy

1. **Foundations** — generalizacja SRS (`ItemState`), refactor modułu 1 do nowych typów (1-2 dni)
2. **Routing + home** — 2 kafelki na home, routing `/reading/*`, ReadingLevelSelect, scaffolding (1 dzień)
3. **Mechanika 1: Iskierka (Audio→Sylaba)** — pełna z testami (2 dni)
4. **Mechanika 2: Płomyk (drag-and-drop)** — drag library, magnetism, sloty, animacje (3-4 dni)
5. **Mechanika 3: Ognik (Audio→słowo)** — analog mechaniki 1 + obrazki + scenki (2 dni)
6. **Mechanika 4: Pochodnia (uzupełnij sylabę)** — wariant Mechaniki 1 z lukami (2 dni)
7. **Mini-scenki słów** — komponent + dane scenek dla pierwszych 30 słów (2-3 dni; pozostałe scenki dorzucane stopniowo)
8. **Iskra ożywiona** — reakcje, easter eggs, komiczny fail (2 dni)
9. **Album słów** — UI + persist + ceremonia odblokowania (1-2 dni)
10. **Wild celebrations** — 5 wariantów (1-2 dni)
11. **Audio strategy** — TTS dla wszystkich nowych kluczy, SFX biblioteka (1-2 dni)
12. **Settings rozszerzenie + raport rodzica** — UI + persist migration (2 dni)
13. **Testowanie + polish** — w przeglądarce, na iPadzie, fixy regresji (3-4 dni)

**Estymata całości:** 6-8 tygodni intensywnej pracy. Przy parallel agents (zgodnie z `feedback_autonomous_execution.md`) — może 4-5 tygodni.

### 17.2 Reuse z modułu 1

- AudioBus — bez zmian
- Settings store — rozszerzenie typu
- IskraMascot — rozszerzenie o reakcje
- KidNav — bez zmian
- Math gate — bez zmian
- SRS — generalizacja typu (bez zmiany logiki)
- SessionEnd, FeedbackOverlay, PauseOverlay — wzorce reused

### 17.3 Co JEST nowe

- 4 komponenty ćwiczeń (SyllableMatch, WordAssembly, WordChoice, SyllableFill)
- WordScene, WildCelebration, WordAlbum
- IskraMascotAnimated (rozszerzenie + easter eggs)
- `readingStore`, dane sylab/słów/scenek/easter eggs/wild celebrations
- Routing rozszerzony
- Drag-and-drop hook
- Audio assets (~150 nowych kluczy + SFX biblioteka)

## 18. Otwarte decyzje (do plan'a / implementacji)

- **Drag-and-drop biblioteka:** `@dnd-kit/core` (~30KB) vs własny minimalny hook. Decyzja w plan'ie po próbie własnego prototypu — własny hook preferowany jeśli wystarcza (mniejszy bundle), `@dnd-kit` gdy potrzebujemy keyboard a11y / multi-touch
- **Finalna lista słów per poziom** (sekcja 8.2 to propozycja — user akceptuje / modyfikuje przed nagrywaniem audio)
- **Lista scenek** (sekcja 9.2 ma przykłady — finalne keyframes + wybór emoji + wybór SFX dorzucane przy implementacji fazy 7)
- **Lista easter eggs Iskry** (sekcja 10.2 — finalne SFX i animacje przy fazie 8)
- **Lista wild celebrations** (sekcja 11.2 — finalne komponenty przy fazie 10)
- **Czcionka czytania (sylaby/słowa):** Kalam (jak w module 1) vs druga, czytelniejsza dla bloków sylab — finalna decyzja po teście wizualnym w fazie 1-2

## 19. Out of scope (potwierdzone)

- Pisanie liter (tracing, dyktando)
- Speech recognition (czytanie na głos z weryfikacją)
- Multi-profile (jedna pamięć per device)
- Backend / sync między urządzeniami
- Kolejne moduły (cyfry, kolory, kształty)
- Czcionka MEN płatna (zostaje Kalam)

## 20. Sukces — kryteria akceptacji

Moduł uznany za gotowy do produkcji gdy:

- ✓ 4 typy ćwiczeń działają na iPadzie + desktop + smartfon
- ✓ ~85-100 słów + ~16-20 sylab dostępnych z audio
- ✓ ~30 słów ma mini-scenki (pozostałe dodawane stopniowo)
- ✓ Album działa, karty dodają się, scenki odgrywają na klik
- ✓ Iskra reaguje, easter eggs działają, wild celebration losuje się co `wildCelebrationFreq`
- ✓ Settings migrowane (humorMode, reading.*), panel rodzica działa
- ✓ Raport rodzica pokazuje sylaby + słowa + heatmapę polskich fonemów
- ✓ Tests: SRS dla ItemState, magnetism dla drag, dystraktory dla sylab — zielone (~50 nowych testów)
- ✓ `pnpm tsc -b` ✓, `pnpm build` ✓, `pnpm audio:check` ✓
- ✓ PWA precache uwzględnia nowe audio assets
- ✓ Performance: czas startu sesji ≤ 1s na iPad 10" (preload działa)
- ✓ User testuje z 7-letnim dzieckiem, zgłasza zielone światło
