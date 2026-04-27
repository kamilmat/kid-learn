# Iskierki — moduł rozpoznawania liter (MVP)

**Data:** 2026-04-26
**Status:** zatwierdzony do implementacji po review
**Autor:** brainstorming session

## 1. Wizja

**Iskierki** — webowa platforma edukacyjna dla dzieci, modułowa, oparta o badania nad uczeniem się. Każdy moduł = osobny obszar wiedzy. Pierwszy moduł: **rozpoznawanie liter polskiego alfabetu**.

Marka: "Iskierki — nauka, która zapala". Maskotka: **Iskra** (mała iskra, kompan dziecka). Progresja poziomów spina się z metaforą ognia: Iskierka → Płomyk → Ognik → Pochodnia.

Drugi moduł (poza scope tego speca): nauka sylab i wyrazów.

## 2. Target user i kontekst

- **Główny użytkownik:** dziecko 7 lat, zerówka, zna część liter, uczy się rozpoznawania pozostałych
- **Drugi użytkownik:** rodzic (kontrola ustawień, wgląd w postępy, weryfikacja zaangażowania)
- **Urządzenie podstawowe:** iPad 10" (tablet first), RWD obowiązkowe na desktop i smartfon
- **Bez backendu, bez logowania.** Postęp w `localStorage`. Reset dostępny w ustawieniach (z bramą math).
- **Bez profili w MVP** — apka pamięta postęp jednego dziecka per urządzenie/przeglądarka.

## 3. Stack technologiczny

- **React 19** + **Vite** + **TypeScript** + **Tailwind 4**
- **Zustand** — stan globalny (settings, progres, sesja)
- **Vitest** + **React Testing Library** — testy unit/integration
- **Edge TTS** (Python) wywoływane z Node script — generowanie audio przy buildzie
- **`react-router-dom`** — minimalny routing (wymagany przez wielomodułową architekturę: home, moduł liter, ustawienia, raport)

## 4. Struktura projektu

```
iskierki/
├── src/
│   ├── modules/
│   │   └── letters/
│   │       ├── components/      # QuizCard, LetterTile, FeedbackOverlay, ...
│   │       ├── hooks/           # useSession, useTimer
│   │       ├── data/            # alfabet, kontrastywne pary, asocjacje litera→obrazek→słowo
│   │       └── index.tsx        # entry modułu (level select + sesja)
│   ├── shared/
│   │   ├── srs/                 # Leitner 5-box, generator dystraktorów
│   │   ├── audio/               # AudioBus, useNarrator, preloader
│   │   ├── stats/               # tracking, raport rodzica, eksport
│   │   ├── settings/            # store + math gate + UI ustawień
│   │   ├── engagement/          # idle detect, page visibility, anti-cheat flags
│   │   └── ui/                  # KidNav, Button, Card, Mascot (Iskra), HandwrittenLetter
│   ├── app/                     # routing/router, home, layouts, theme
│   └── main.tsx
├── audio-source/
│   ├── letters.json             # litera → tekst do TTS (fonem)
│   ├── words.json               # litera → słowo asocjacji (np. b → "balon")
│   ├── ui-strings.json          # wszystkie komunikaty głosowe UI
│   └── manual-overrides/        # ręczne nagrania mp3 (nadpisują TTS dla danego klucza)
├── public/
│   ├── audio/                   # build artifact: wygenerowane mp3
│   └── images/letters/          # ilustracje słów-asocjacji (svg/png)
├── scripts/
│   └── generate-audio.ts        # idempotentny generator audio (edge-tts + override)
├── docs/superpowers/specs/      # ten dokument
└── docs/superpowers/plans/      # plan implementacji (po brainstormie)
```

## 5. Tryb wizualny i nawigacja

### 5.1 Theme

- **Jeden tryb dla dziecka — warm light.** Apka wymusza swój theme i ignoruje `prefers-color-scheme` systemu.
- Tło: `#fef9f2` (kremowe), nigdy czysta biel
- Tekst: `#2d2d33` (ciemnoszary), nigdy czysta czerń
- Akcenty: pastelowy niebieski `#5b8def`, zielony sukcesu `#7cc36a`, pomarańczowy korekty `#e89a4f`
- Brak dark mode w MVP (dodamy jeśli okaże się potrzebne — niski priorytet)
- Kontrast spełnia WCAG AA dla wszystkich tekstów

### 5.2 Nawigacja kid-first

- **KidNav** — stała górna belka na każdym ekranie z dwoma elementami:
  - Lewy: ⬅ (powrót, ≥60×60px tap-target)
  - Prawy: 🏠 (home)
- Bez tekstu, tylko ikony. Tap na ikonę → krótkie audio-cue lektora ("wracam" / "do menu")
- **Brak gestów** (swipe, long-press) — tylko tap
- **Wszystkie tap-targety ≥ 60×60px**, marginesy ≥ 16px między klikalnymi
- **Ikona ⚙ ustawień** w prawym dolnym rogu home, mała (28px), bez podpowiedzi (brama math i tak filtruje)
- **Onboarding głosowy** — przy pierwszym wejściu na każdy ekran lektor opisuje co widać (zapisane w localStorage `seenIntros`); przy kolejnych wizytach cisza

## 6. Pętla nauki — pojedyncza sesja

### 6.1 Wejście

1. Home → kafelek "Litery" (z ilustracją Iskry) → ekran wyboru poziomu (Iskierka / Płomyk / Ognik / Pochodnia)
2. Po wyborze poziomu → ekran startu z dużym przyciskiem; lektor: "Naciśnij start, kiedy chcesz zacząć"
3. Preload audio sesji w tle podczas powitania — pliki potrzebne dla aktualnej puli liter + UI cues sesyjne (pochwały, korekty, nawigacja)

### 6.2 Pojedyncze pytanie

1. **Wybór litery docelowej** — algorytm SRS (sekcja 7) wybiera literę z aktywnej puli (zgodnej z poziomem + ustawieniami)
2. **Wybór dystraktorów** — 3 inne litery (sekcja 8): kontrastywne pary preferowane, dla nowych liter "errorless" — wizualnie odlegle
3. **Losowanie pozycji** w siatce 2×2 — od zera przy każdym pytaniu (anti-memorize)
4. **Audio prompt** — lektor wymawia fonem docelowej litery
5. **Timer** startuje (jeśli włączony w ustawieniach)
6. **UI:** siatka 2×2 z 4 kafelkami liter + przycisk "Nie wiem" 🤷 pod siatką, pasek odliczania pod przyciskiem audio (jeśli włączony limit czasu)

### 6.3 Layout sesji (zatwierdzone)

- **Siatka 2×2** kafelków liter (większe tap-targety, bezpieczniejsze dla palców 7-latka, działa portrait i landscape na iPad)
- **Pasek statusu sesji** (pod KidNav): licznik zdobytych iskierek (lewa) | kropki postępu sesji (środek, jedna kropka per pytanie — zielona=poprawnie, pomarańczowa=z błędem/dontKnow/timeout, szara=jeszcze przed) | przycisk pauzy ⏸ (prawa)
- Wielki przycisk audio 🔊 nad siatką (klika dziecko aby usłyszeć fonem; można klikać wielokrotnie)
- **Pasek odliczania** (gdy włączony limit) — cienki poziomy pasek pod przyciskiem audio, full-width, kolor zmienia się: zielony (cały) → żółty (50%) → czerwony (20%); łagodny dźwięk ostrzeżenia gdy zostaje 3s

### 6.4 Rozstrzygnięcie odpowiedzi

| Akcja dziecka | Reakcja UI | Audio | Wpływ na SRS |
|---|---|---|---|
| ✅ **Poprawna** | zielona poświata na wybranym kafelku (~1.5s), licznik iskierek +1, kropka zielona | "ding" + losowo z 5-6 pochwał ("świetnie!", "brawo!", ...); co 5-7 odpowiedzi szansa na "specjalkę" Iskry | `box+1` (max 5) |
| ❌ **Błędna** | pomarańczowa poświata na wybranym + zielona pulsacja na poprawnej (~2s), kropka pomarańczowa, poprawna litera staje się chwilowo dominująca wizualnie (skala +20%) | "blop" (łagodne) + lektor: "Posłuchaj jeszcze raz... to była B" + odtworzenie /b/. **NIE wymawiamy w żadnym kontekście "kliknąłeś D, ale to była B"** (nie wzmacniamy skojarzenia złego kafelka z fonemem) | `box-2`, `recentWrong+1` |
| 🤷 **"Nie wiem"** | tryb nauki: poprawna litera duża na środku, zielona pulsacja, ewentualnie obrazek-asocjacja (~3s) | lektor: "Nie szkodzi! To była literka B. /b/. Następnym razem już będziesz wiedzieć!" | `box-1`, `recentWrong+1` (mniejsza kara — uczciwie się przyznał) |
| ⏱ **Timeout** (tylko gdy `timeLimit ≠ 'off'`) | jak "nie wiem" + flag w raporcie | "Spróbuj się nie spieszyć. To była B." | `box-2`, `recentWrong+1`, **flag "brak odpowiedzi" w log sesji** |

### 6.5 Mastery celebration

Gdy litera trafia do **box 5** po raz pierwszy (`LetterState.masteredAt === null` w momencie aktualizacji do box 5 → ustawiamy `masteredAt = Date.now()` i triggerujemy celebration; przy kolejnych powrotach do box 5 — bez celebracji): specjalna animacja Iskry, lektor "Iskra! Umiesz literkę B!", animacja "dodania litery do ściany osiągnięć".

**Ściana osiągnięć (home screen):** mały komponent na ekranie home pokazujący alfabet (32 litery jako siatka 4×8). Litery opanowane (box 5) świecą jak rozżarzony węgielek 🔥, pozostałe są przytłumione. Dziecko widzi swój postęp w czasie. Po wejściu na home pierwszy raz po opanowaniu nowej litery — krótka animacja zapalenia.

### 6.6 Koniec sesji

- Animacja Iskry, lektor: "Skończyłeś! Zebraliśmy razem X iskierek!" (X = łączna liczba poprawnych odpowiedzi w sesji = liczba zdobytych iskierek)
- Mini-podsumowanie głosowe: "świetnie szło Ci: B, M, K. Poćwiczysz jeszcze: G, Ł, Ó."
- W raporcie wyniki rozdzielone: poprawne / błędne / "nie wiem" / timeouty
- Przyciski: "jeszcze raz" + "wyjdź"

### 6.7 Pauza i przerwy

- **Przycisk ⏸** w pasku statusu sesji (pod KidNav) po prawej stronie — manual pauza. KidNav nadal trzyma ⬅ + 🏠. Pauza jest częścią pasku sesji (sekcja 6.3), nie KidNav.
- **Auto-pauza** po 20s bez interakcji (`pointerdown`) — pauza + dźwięk "jesteś tam? wracaj!"
- **Page Visibility API** — przełączenie taba/aplikacji = auto-pauza + log w sesji ("dziecko opuściło ekran")
- **Wznowienie** — pełnoekranowy duży przycisk START, lektor "wracamy do nauki!"

## 7. SRS — algorytm wyboru litery

Leitner 5-box, ważony losowo.

### 7.1 Score per litera

```
score = box_weight × recency × recent_wrong_boost

box_weight:
  box 1 → 5.0
  box 2 → 3.0
  box 3 → 1.5
  box 4 → 1.0
  box 5 → 0.4

recent_wrong_boost = 1 + (recentWrong × 2.0)
recency = min(1 + ((now - lastSeen) / 3600s × 0.3), 3.0)   # boost po czasie z capem
# dla świeżego state (lastSeen=0 / brand-new): recency = 1.0
```

### 7.2 Wybór litery

1. Filtruj litery z aktywnej puli (zgodnej z poziomem + ustawieniami "Aktywne litery")
2. Oblicz score dla każdej
3. **Sample** ważony — losuj proporcjonalnie do score (nie zawsze najwyższy — zachowanie losowości)
4. **Jitter interleaving** — z prawdopodobieństwem 15% bierz literę z box 4-5 (utrwalanie znanych, redukuje "gradient ucieczki")
5. **Anti-repeat** — ta sama litera nie pojawia się dwa razy pod rząd jako target

### 7.3 Update po odpowiedzi

| Wynik | Box | recentWrong |
|---|---|---|
| Correct | `min(box + 1, 5)` | `max(recentWrong - 0.33, 0)` (1 błąd ubywa po 3 dobrych) |
| Wrong | `max(box - 2, 1)` | `+1` |
| DontKnow | `max(box - 1, 1)` | `+1` |
| Timeout | `max(box - 2, 1)` | `+1` |

## 8. Generator dystraktorów

3 inne litery wybierane do każdego pytania.

### 8.1 Reguły (kolejność stosowania)

1. **Errorless start** — jeśli docelowa litera jest w **box 1** i `totalSeen ≤ 2` (świeża), wszystkie 3 dystraktory wizualnie odlegle (np. dla `B` → `A`, `M`, `T`; nie `D`, `P`, `G`). Dystraktory pochodzą z **aktywnej puli**; jeśli pula jest mała (np. Iskierka, 6 liter) i nie ma w niej liter "wizualnie odległych", fallback do reguły 3 dla tego konkretnego dystraktora.
2. **Kontrastywne pary** — w pozostałych przypadkach z prawdopodobieństwem 70% jeden dystraktor pochodzi z mapy par mylących **pod warunkiem że obie litery pary są w aktywnej puli**; jeśli partner pary nieaktywny — fallback do reguły 3:
   - `b/d`, `b/p`, `d/p`, `q/p` (q nie w polskim — pomijamy q)
   - `ł/L`, `ł/t` (graficznie podobne)
   - `ó/o`, `u/y`
   - `ę/e`, `ą/a`
   - `n/ń`, `s/ś`, `c/ć`, `z/ż`, `z/ź`
   - `m/n`, `m/w`
   - reszta dobierana algorytmicznie po podobieństwie wizualnym (heurystyka oparta na cechach: laska wysoka, ogonek dolny, diakryt, krągłość)
3. **Pozostałe dystraktory** — losowane z aktywnej puli, **żadne się nie powtarza** w jednym pytaniu, **żaden nie jest literą docelową**

### 8.2 Mapa par kontrastywnych

Twardo zaszyte w `src/modules/letters/data/contrastive-pairs.ts`. Łatwe do edycji/dodawania.

## 9. Audio pipeline

### 9.1 Treści do wygenerowania

| Kategoria | Liczba plików | Przykład klucza |
|---|---|---|
| Litery (fonemy) | 32 | `letter-b.mp3` |
| Słowa asocjacji (dla litera→obrazek) | 32 | `word-balon.mp3` |
| Pochwały | 6 | `praise-1.mp3`..`praise-6.mp3` ("świetnie!", "brawo!", "tak jest!", "umiesz!", "super!", "ekstra!") |
| Korekty (per litera) | 32 | `correction-b.mp3` "to była literka B" |
| Timeout / "nie wiem" / cues | 10 | `timeout-1.mp3`, `timeout-2.mp3`, `dont-know-1.mp3`, `dont-know-2.mp3`, `dont-know-3.mp3`, `still-there.mp3`, `try-again.mp3`, `feedback-wrong-prefix.mp3` ("Posłuchaj jeszcze raz..."), `feedback-correct-suffix.mp3` ("...to była"), `cue-warning-3s.mp3` |
| Nawigacja | 5 | `nav-back.mp3`, `nav-home.mp3`, `nav-pause.mp3`, `nav-resume.mp3`, `nav-tap.mp3` |
| Onboarding | 7 | `welcome.mp3`, `home-intro.mp3`, `letters-intro.mp3`, `level-select-intro.mp3`, `quiz-intro.mp3`, `dont-know-intro.mp3`, `start-prompt.mp3` |
| Koniec sesji | 4 | `session-end.mp3`, `mastery-celebration.mp3`, `level-up-suggest.mp3`, `summary-intro.mp3` |

**Razem: 128 plików mp3** (32 + 32 + 6 + 32 + 10 + 5 + 7 + 4), ~3-4 MB całość.

### 9.2 Generator

`scripts/generate-audio.ts`:

1. Czyta `audio-source/*.json` (mapa klucz → tekst)
2. Dla każdego klucza:
   - Sprawdza czy istnieje override w `audio-source/manual-overrides/<klucz>.mp3` → kopiuje do `public/audio/`
   - Jeśli nie — sprawdza hash `SHA-256` tekstu vs zapisany w `public/audio/.manifest.json`
   - Jeśli hash zgodny → pomija (idempotentny)
   - Jeśli różny lub plik nie istnieje → wywołuje `edge-tts` (przez `child_process`) z głosem `pl-PL-ZofiaNeural` (domyślny), zapisuje mp3 + aktualizuje manifest
3. Po pełnym przebiegu zapisuje manifest JSON

**Polecenia npm:**
- `pnpm run audio:build` — pełna generacja
- `pnpm run audio:check` — tylko walidacja (czy wszystkie klucze mają plik)

### 9.3 Frontend audio bus

- **Singleton `AudioBus`** zarządza odtwarzaniem — kolejka, jedno na raz, możliwość anulowania
- **`useNarrator()`** hook — wygodne API:
  - `narrator.sayLetter('b')` — odtwarza `letter-b.mp3`
  - `narrator.praise()` — losowa pochwała
  - `narrator.correction('b')` — `correction-b.mp3` + `letter-b.mp3` w sekwencji
  - `narrator.ui('back')` — `nav-back.mp3`
- **Preloader** — w momencie startu sesji preloaduje pliki potrzebne (litery aktywne + UI cues sesyjne)

## 10. UI — formy liter

### 10.1 Dwa wymiary konfiguracji

**Wielkość liter:**
- `tylko-duze` — wszystkie tile pokazują dużą formę
- `tylko-male` — wszystkie tile pokazują małą formę
- `para` — każdy tile pokazuje parę "Bb" (drukowaną — duża obok małej)
- `mieszane` — losowo per **pytanie** (każde pytanie niezależnie wybiera duże LUB małe; spójność wewnątrz pytania — wszystkie 4 kafelki w tej samej wielkości)

**Styl pisma:**
- `tylko-drukowane` — render fontem drukowanym (Andika / Lexend)
- `tylko-pisane` — render w czterolinii fontem pisanym (proponowany start: open-source pisany; podmiana w razie potrzeby)
- `mieszane-per-pytanie` — pyt.1 wszystkie kafelki drukowane → pyt.2 wszystkie pisane → naprzemiennie. **Spójność wewnątrz pytania** (wszystkie 4 kafelki w tym samym stylu).
- `oba-na-kafelku` — każdy kafelek pokazuje literę w obu formach: drukowana na górze, pisana w czterolinii pod spodem (pełne rozpoznanie tożsamości litery). **Uwaga:** w połączeniu z `Wielkość = para` daje 4 formy w kafelku (Bb drukowane + Bb pisane) — dopuszczalne ale wizualnie gęste; rekomendowane raczej z `Wielkość = mieszane` lub jednolitą wielkością.

### 10.2 Defaulty per poziom

| Poziom | Wielkość | Styl pisma |
|---|---|---|
| Iskierka | para "Aa" | tylko drukowane |
| Płomyk | para "Aa" | tylko drukowane |
| Ognik | mieszane | mieszane per pytanie |
| Pochodnia | mieszane | oba na kafelku |

Rodzic może override'ować w ustawieniach.

### 10.3 HandwrittenLetter — render w czterolinii

Komponent `<HandwrittenLetter letter="b" size="..." />`:

- SVG z 4 poziomymi liniami pomocniczymi:
  - Linia górna: szara/niebieska, cienka — wysokość liter wysokich (`b`, `d`, `h`, `k`, `l`, `ł`, `t`)
  - Linia pomocnicza górna: czerwona kreskowana — górna granica x-height (`a`, `c`, `e`, `m`, ...)
  - Linia podstawowa (baseline): czerwona ciągła — większość liter na niej "siedzi"
  - Linia dolna: szara/niebieska — dół ogonków (`g`, `j`, `p`, `y`, `ż`)
- Litera w fontu pisanym, wyrównana proporcjami do linii (font-size mapowane na (top→baseline) dla liter wysokich)
- Linie skalują się proporcjonalnie z rozmiarem litery
- **Tylko w trybie pisanym** — drukowana renderowana normalnie bez linii

## 11. Poziomy trudności

| Poziom | Liczba liter | Pula liter | Default settings |
|---|---|---|---|
| 🔥 **Iskierka** | 6 | a, m, l, e, o, t | para Aa, drukowane |
| 🔥 **Płomyk** | 14 | + s, k, b, d, n, p, r, i | para Aa, drukowane |
| 🔥 **Ognik** | 24 | + c, g, j, w, z, h, f, u, y, ł | mieszane case, mieszane styl per pytanie |
| 🔥 **Pochodnia** | 32 | + ą, ć, ę, ń, ó, ś, ź, ż | mieszane case, oba style razem |

**Mechanika wyboru poziomu:**

- Ekran wyboru po wejściu w moduł — 4 duże kafelki, każdy z ikoną Iskry o różnej intensywności i głosowym opisem ("Iskierka — zaczynamy od kilku łatwych literek")
- Litery z niższych poziomów zawsze obecne w wyższych (kumulacja — dziecko nie traci tego co umie)
- Postęp SRS jest **per litera**, nie per poziom — przejście na wyższy poziom nie resetuje boxów
- Domyślny poziom przy pierwszym wejściu: **Iskierka**. Później: ostatnio użyty.
- **Sugestia awansu** — po sesji z wynikiem ≥80% poprawnych lektor sugeruje: "Spróbuj Płomyka!" — wybór zostaje przy dziecku/rodzicu

## 12. Asocjacje litera → obrazek → słowo

Każda litera ma swoje słowo-kotwicę i ilustrację (semantyczne wzmocnienie + dual coding theory):

| Litera | Słowo | Litera | Słowo | Litera | Słowo |
|---|---|---|---|---|---|
| a | arbuz | i | iskra | r | ryba |
| ą | dąb (środek) | j | jabłko | s | słońce |
| b | balon | k | kot | ś | śliwka |
| c | cebula | l | lampa | t | tort |
| ć | ćma | ł | łyżwa | u | ucho |
| d | dom | m | miś | w | woda |
| e | ekran | n | nos | y | dym (środek) |
| ę | gęś (środek) | ń | koń (koniec) | z | zegar |
| f | foka | o | osa | ź | źrebak |
| g | góra | ó | ósemka | ż | żaba |
| h | hak | p | piłka | | |

**Uwaga:** dla `ą`, `ę`, `y`, `ń` używamy słów gdzie litera jest w środku/końcu (te litery nie zaczynają polskich słów). Lektor mówi formą "Ę jak gęś", "Y jak dym", "Ń jak koń", "Ą jak dąb" — naturalne fonetycznie.

**Wykorzystanie:**
- Po poprawnej odpowiedzi: krótkie wzmocnienie (~1s) — słowo-kotwica na ekranie + audio "B jak balon!" + obrazek balonu
- W trybie nauki ("nie wiem" / błąd / mastery celebration): pełna ekspozycja — duża litera + obrazek + słowo + dźwięk

**Obrazki:** SVG (lekkie, skalowalne). Open-source pack lub custom (proste flat-design). W MVP — start z open-source, podmiana w razie potrzeby.

## 13. Settings i parent gate

### 13.1 Math gate

- Wzór: `a + b - c` gdzie `a, b, c ∈ [1, 9]`, generator **biasuje** żeby `a + b > 10` (przekroczenie dziesiątki — dla rodzica trywialne, 7-latek z zerówki ma trudność)
- Przykłady: `7 + 8 - 5 = 10`, `9 + 6 - 4 = 11`, `8 + 7 - 9 = 6`
- Wpisanie liczby przez klawiaturę (na tablecie systemowy numpad, na desktopie standardowa)
- **3 błędne próby** = 60s cooldown (zapobiega bruteforce, nie blokuje rodzica który się pomylił)
- **Sesja "zalogowana"** trzymana 5 min od ostatniego sukcesu math gate — kolejne wejście w ustawienia bez bramy. **Idle/visibility detection wyłączone podczas ekranów ustawień/raportu** (rodzic czyta, nie powinien być pauzowany).
- **Reset postępów** wymaga **drugiej, świeżej** bramy + potwierdzenia ("na pewno wszystko skasować?")

### 13.2 Lista ustawień (MVP)

| Ustawienie | Opcje | Default |
|---|---|---|
| Aktywne litery | per poziom override puli liter — checkbox-list dla aktualnie wybranego poziomu (zaznaczenie zastępuje domyślną pulę poziomu). **Walidacja: minimum 4 zaznaczone litery** (siatka 2×2 wymaga 1 docelowej + 3 dystraktorów). UI nie pozwala zapisać <4. | wg domyślnej puli poziomu |
| Wielkość liter | duże / małe / para Aa / mieszane | wg poziomu |
| Styl pisma | drukowane / pisane / mieszane-per-pytanie / oba-na-kafelku | wg poziomu |
| Długość sesji | 5 / 10 / 15 pytań | 10 |
| Limit czasu na odpowiedź | wyłączony / 10s / 15s / 20s | 15s |
| Pasek odliczania | on / off (gdy limit włączony) | on |
| Tempo celebracji | krótka / średnia / długa | średnia |
| Domyślny poziom | Iskierka / Płomyk / Ognik / Pochodnia / "ostatnio użyty" | "ostatnio użyty" |
| Głos lektora | tylko Zofia w MVP (Marek/Agnieszka w v2) | Zofia |
| Reset postępów | przycisk + 2× math gate | — |

### 13.3 Co poza scope MVP

- Tryb ciemny (jeden warm light w MVP)
- Wybór głosu (Zofia tylko w MVP)
- Profile dla wielu dzieci (jeden urządzenie/przeglądarka = jedno dziecko)

## 14. Raport rodzica

Dostępny po przejściu math gate. **Real-time** — wszystko zapisywane do `localStorage` natychmiast po akcji dziecka, raport zawsze pokazuje aktualny stan.

### 14.1 Sekcja "Litery"

- Lista wszystkich aktywnych liter, posortowana od najsłabszej do najmocniejszej
- Pozycja: `B  ✅ 12  ❌ 1  🤷 0  ⏱ 0   ████░  bardzo dobrze` (mini pasek mastery 0-100%)
- Kolory tła wiersza wg box Leitnera: czerwony (1), pomarańczowy (2), żółty (3), zielony (4), granat (5)
- Tap na literę → szczegół:
  - Trend w czasie (sparkline ostatnich 30 ekspozycji)
  - Średni czas odpowiedzi
  - Kontekst błędów ("B mylone z D 3 razy")
  - Per-display split: `print: 8/2`, `handwritten: 4/0` — czy dziecko gorzej radzi sobie w jednym stylu

### 14.2 Sekcja "Aktywność"

- Bar chart ostatnich 14 dni: liczba sesji, łączny czas, liczba pytań, % poprawnych
- "Dziś / wczoraj / suma w tygodniu / streak (dni z rzędu)"

### 14.3 Sekcja "Na żywo / ostatnia sesja"

Tabela zdarzeń z timestampami:

```
18:42:15  Sesja zaczęta (Płomyk, 10 pytań)
18:42:22  Pytanie 1: prompt B → ✅ B (3.2s)
18:42:28  Pytanie 2: prompt D → ❌ B (1.8s)
18:42:36  Pytanie 3: prompt Ł → 🤷 (5.1s)
18:42:38  Pauza (utrata focus tabu)
18:43:05  Wznowienie
...
```

### 14.4 Sekcja "Sugestie"

Heurystyki generowane lokalnie:

- "Najsłabsze litery: Ł, Ó, Ę — warto je włączyć / poćwiczyć więcej"
- "Świetnie poszło: B, M, K"
- "Średni czas odpowiedzi rośnie — może dziecko zmęczone, krótsza sesja?"
- "Krótka sesja przed snem pomaga utrwalić — sen konsoliduje pamięć"
- "Czasem siądź obok — dzieci uczą się szybciej z mentorem niż samodzielnie"
- "Optymalna częstość: 2× dziennie po 6-8 min > 1× 15 min"

### 14.5 Anti-cheat flagi

Widoczne jako żółte/czerwone ⚠ przy odpowiednich pytaniach/sesjach:

| Flag | Warunek |
|---|---|
| ⚠ Szybkie klikanie | 3+ odpowiedzi pod rząd <1s |
| ⚠ Identyczne pozycje | 5+ tap w ten sam slot z rzędu |
| ⚠ Brak odpowiedzi | 2+ timeouty pod rząd |
| ⚠ Wiele "nie wiem" | 3+ "nie wiem" pod rząd |
| ⚠ Opuszczenie ekranu | Page Visibility = hidden podczas sesji |
| ⚠ Bardzo długa nieaktywność | łączny czas pauz w sesji >2 min (kilka krótkich auto-pauz to normalne — flag tylko gdy znacząco długo) |

### 14.6 Eksport

Przycisk "Skopiuj raport" → cały raport jako tekst Markdown do schowka. Rodzic może wkleić w notatki, pokazać nauczycielowi.

## 15. Engagement i anti-cheat — pełna lista

| Mechanizm | Implementacja |
|---|---|
| Audio na każdej akcji | `AudioBus.play()` na każdy tap |
| Page Visibility API | `document.visibilityState` → auto-pauza + log |
| Idle detection | Brak `pointerdown` >20s → auto-pauza + dźwięk "jesteś tam?" |
| Auto-pauza | Manual ⏸ + idle + visibility hidden |
| Limit czasu | Configurable (off/10/15/20s); timeout = "nie wiem" educational mode |
| Pasek odliczania | Progresywny, zmiana koloru (zielony→żółty→czerwony) + dźwięk gdy 3s zostają |
| Detekcja szybkich klików | Sliding window: 3+ odpowiedzi <1s = flag |
| Iskra mascot | Reaktywna SVG (uśmiech/zdziwienie/taniec) — nie blokuje UI |
| Streak dzienny | Licznik dni z sesją, widoczny tylko w raporcie |
| Onboarding głosowy | Lektor prowadzi przez ekrany, tylko 1 raz (`localStorage.seenIntros`) |

## 16. Wzmacniacze edukacyjne (research-backed)

Wszystkie zaimplementowane w MVP:

| Mechanizm | Research | Implementacja |
|---|---|---|
| Phonics-first (fonem zamiast nazwy) | Awramiuk 2006, NELP 2008 | Lektor mówi /b/, nie "be" |
| Dual coding (litera + obrazek + słowo) | Paivio | Asocjacje litera-słowo (sekcja 12) |
| Errorless learning dla nowych liter | Terrace 1963 | Sekcja 8.1, reguła 1 |
| Kontrastywne pary | Ehri 2014 | Sekcja 8.1, reguła 2 |
| Spaced repetition + interleaving | Vlach, Rohrer & Taylor | SRS (sekcja 7) |
| Variable rewards | Skinner (etyczna wersja) | 5-6 pochwał + 1/5-7 specjalka |
| 4:1 praise:correction ratio | Becker 1971 | Ton audio i UX |
| Mastery celebration | Bandura (self-efficacy) | Sekcja 6.5 |
| Goal-gradient | Hull 1934 | Lektor "jeszcze 3!" przy ostatnich 3 pytaniach |
| Świadome formułowanie feedback | research nad reinforcement | Sekcja 6.4 — nie wymawiamy złej kombinacji |
| Sugestie sleep-consolidation, shared learning | Diekelmann & Born 2010, Vygotsky ZPD | Sekcja 14.4 |
| Czterolinia | polska metodyka edukacji wczesnoszkolnej | Sekcja 10.3 |

## 17. Maskotka Iskra

- Mała iskra/płomień, prosta SVG, kilka stanów animacji:
  - Idle (lekkie pulsowanie)
  - Happy (skacze, błyszczy)
  - Surprise (drgnie, znaki zapytania)
  - Dance (specjalka — taniec + deszcz iskier)
- Pojawia się w 3 miejscach:
  - Home — kompan, wita
  - Sesja — w rogu po feedbacku (mała), pełnoekranowa po skończeniu sesji + mastery
  - Wybór poziomu — różna intensywność na każdym kafelku (Iskierka = jedna iskra, Pochodnia = duża pochodnia)
- Buduje emocjonalne związanie i rytuał ("zbieramy iskierki razem")

## 18. Data model (skrót)

```ts
type LetterState = {
  letter: string                  // 'a', 'b', 'ą', ...
  box: 1 | 2 | 3 | 4 | 5          // Leitner box
  lastSeen: number                // timestamp ms (0 = nigdy)
  totalSeen: number
  totalCorrect: number            // ✅ plusiki
  totalWrong: number              // ❌ minusiki
  totalDontKnow: number           // 🤷 świadome
  totalTimeout: number            // ⏱ brak odpowiedzi
  recentWrong: number             // float accumulator (decay 0.33/correct)
  avgResponseMs: number
  masteredAt: number | null       // timestamp pierwszego wejścia do box 5 (dla one-time celebration)
  confusedWith: Record<string, number>   // litera → ile razy dziecko ją wybrało zamiast tej (dla raportu)
  perStyle: {
    print: { correct: number; wrong: number }
    handwritten: { correct: number; wrong: number }
  }
  perCase: {
    upper: { correct: number; wrong: number }
    lower: { correct: number; wrong: number }
  }
}

type SessionLog = {
  id: string                      // uuid
  startedAt: number
  endedAt: number | null
  level: 'iskierka' | 'plomyk' | 'ognik' | 'pochodnia'
  events: SessionEvent[]
}

type SessionEvent =
  | { type: 'question-start'; ts: number; targetLetter: string; distractors: string[]; positions: number[]; style: 'print' | 'handwritten'; case: 'upper' | 'lower' | 'pair' }
  | { type: 'answer'; ts: number; outcome: 'correct' | 'wrong' | 'dontKnow' | 'timeout'; chosenLetter?: string; chosenPosition?: 0 | 1 | 2 | 3; responseMs: number }
  | { type: 'pause'; ts: number; reason: 'manual' | 'idle' | 'visibility' }
  | { type: 'resume'; ts: number }

type Level = 'iskierka' | 'plomyk' | 'ognik' | 'pochodnia'

type CaseMode = 'tylko-duze' | 'tylko-male' | 'para' | 'mieszane'
type StyleMode = 'tylko-drukowane' | 'tylko-pisane' | 'mieszane-per-pytanie' | 'oba-na-kafelku'

type Settings = {
  // override per poziom; brak klucza = używaj domyślnej puli poziomu
  activeLettersOverride: Partial<Record<Level, string[]>>
  caseMode: Partial<Record<Level, CaseMode>>
  styleMode: Partial<Record<Level, StyleMode>>
  sessionLength: 5 | 10 | 15
  timeLimit: 'off' | 10 | 15 | 20
  showCountdownBar: boolean
  celebrationTempo: 'short' | 'medium' | 'long'
  defaultLevel: Level | 'last-used'
  voice: 'zofia'  // tylko Zofia w MVP
}

type AppState = {
  letters: Record<string, LetterState>
  settings: Settings
  sessions: SessionLog[]          // historia, ostatnie ~50 sesji
  seenIntros: string[]            // które onboardingi już widział
  currentLevel: Level
  lastUsedLevel: Level
  parentGateUnlockedUntil: number | null
}
```

Persistowane w `localStorage` pod kluczem `iskierki-state-v1`.

## 19. Testowanie

| Warstwa | Co testujemy | Narzędzie |
|---|---|---|
| Unit | SRS (box transitions, score, weighted random), generator dystraktorów (errorless start, kontrastywne), math gate (generator + walidacja), idle detector | Vitest, ~80% coverage logiki |
| Integration | Sesja end-to-end, edge cases (timeout, "nie wiem", quit mid-session, page visibility), parent gate flow | RTL + fake timers |
| Audio | Manifest spójny z audio-source, brakujące pliki | snapshot test |
| Visual / a11y | Tap-targety ≥60×60, kontrast WCAG AA, brak tekstu w UI dziecka, focus order | Playwright lub manualne |
| Real-world | **Test z 7-latkiem** (dzieckiem autora) na iPadzie po każdej fazie | Notatki + raport rodzica |

## 20. Timeline (orientacyjny)

| Faza | Co dowozimy | Czas |
|---|---|---|
| **0. Foundation** | Vite+React+TS+Tailwind, theme, KidNav, AudioBus singleton, routing | 1 dzień |
| **1. Audio pipeline** | `audio-source/` JSON, `generate-audio.ts`, generacja liter + UI strings, manual override | 1 dzień |
| **2. Quiz core** | QuizCard 2×2, LetterTile, prompt audio, losowanie pozycji, "nie wiem", timer + pasek | 2 dni |
| **3. SRS + dane** | Leitner, generator dystraktorów (errorless + kontrastywne), persistence | 1.5 dnia |
| **4. Engagement** | Feedback overlay, Iskra (SVG + animacje), variable rewards, mastery celebration, dźwięki, page visibility, idle | 2 dni |
| **5. Litery + obrazki** | Asocjacje litera-obrazek-słowo, integracja w trybie nauki + feedback, czterolinia (HandwrittenLetter) | 1.5 dnia |
| **6. Wybór poziomu + home** | Home, level select (4 poziomy z Iskrą), onboarding głosowy | 1 dzień |
| **7. Ustawienia + brama + raport** | Math gate, settings UI, raport rodzica z timeline + flagami anti-cheat, eksport | 2 dni |
| **8. Polish + test z dzieckiem** | RWD na iPadzie, finalne dźwięki, bugfixy, sesja z dzieckiem, iteracje | 1.5 dnia |

**Razem: ~13.5 dni roboczych.**

## 21. Out of scope (v2 i dalej)

- Drugi typ ćwiczenia: "widzisz literę → wybierz obrazek słowa"
- Trzeci typ: "słyszysz słowo → wybierz pierwszą literę"
- Tracing palcem (haptyka — Bara et al. +15-25% retencji)
- Piosenka alfabetu (kanoniczna mnemonic)
- Dark mode
- Wybór głosu lektora (Marek, Agnieszka)
- Profile dla wielu dzieci
- Sync między urządzeniami (chmura)
- Moduł sylab + wyrazów (osobny spec)
- Statystyki dłużej niż 14 dni / agregacje miesięczne / roczne

## 22. Referencje naukowe

- Awramiuk, E. (2006). *Lingwistyczne podstawy początkowej nauki czytania i pisania.*
- Bandura, A. (1997). *Self-efficacy: The Exercise of Control.*
- Bara, F., Gentaz, E., Colé, P., & Sprenger-Charolles, L. (2004). The visuo-haptic and haptic exploration of letters increases the kindergarten-children's understanding of the alphabetic principle.
- Becker, W. C. (1971). *Parents are Teachers: A Child Management Program.*
- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings.
- Carroll, J. M. (2004). Letter knowledge precipitates phoneme segmentation, but not phoneme invariance.
- Diekelmann, S., & Born, J. (2010). The memory function of sleep.
- Ehri, L. C. (2014). Orthographic mapping in the acquisition of sight word reading, spelling memory, and vocabulary learning.
- Hull, C. L. (1934). The rat's speed-of-locomotion gradient in the approach to food.
- Krasowicz-Kupis, G. (2008). *Psychologia dysleksji.*
- National Early Literacy Panel (NELP, 2008). *Developing Early Literacy.*
- Paivio, A. (1986). *Mental Representations: A Dual Coding Approach.*
- Piasta, S. B., & Wagner, R. K. (2010). Developing early literacy skills: A meta-analysis of alphabet learning and instruction.
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning.
- Skinner, B. F. (1953). *Science and Human Behavior.*
- Terrace, H. S. (1963). Discrimination learning with and without "errors."
- Vygotsky, L. S. (1978). *Mind in Society.* (zone of proximal development)
- Vlach, H. A., Sandhofer, C. M., & Kornell, N. (2008). The spacing effect in children's memory and category induction.
