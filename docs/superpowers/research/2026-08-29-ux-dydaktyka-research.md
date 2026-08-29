# Iskierki — research UX i dydaktyki (2026-08-29)

Pięć niezależnych audytów (Litery, Czytanie, Cyferki, Czytanki, warstwa przekrojowa), każdy: stan kodu → literatura (science of reading, metoda sylabowa/Cieszyńska, Rocławski, Clements & Sarama, NCETM, NN/g, Sesame Workshop, SDT, AAP) → propozycje z oceną wpływu (1–5) i nakładu (S/M/L). Pełne raporty w załącznikach A–E; tu synteza i kolejność.

## 1. Diagnoza w trzech zdaniach

1. **Fundamenty są zgodne z best practice**: SRS z przeplotem i spacingiem, hiperkorekcja z podaniem odpowiedzi, audio‑first bez tekstu, brak timerów i walut, anti‑cheat jako pauza, CPA w matematyce, sylaba jako jednostka dla polszczyzny, decodable progresja w czytankach. Tego nie ruszamy.
2. **Największa luka jest wspólna dla wszystkich modułów: uczymy rozpoznawania, a za mało produkcji i strategii** — brak kroku syntezy „MA+MA=MAMA", brak aktu liczenia 1:1, brak drugiej próby po błędzie, brak wypowiadania liczb w zadaniu, brak echa „powtórz" w czytankach, fonemy liter z doklejoną samogłoską („byy"). To są zmiany S/M o wpływie 5.
3. **Motywacja i pętla rodzica są rozproszone**: 4 osobne ekonomie nagród, brak „planu na dziś" i sygnału końca, raport bez „następnego kroku", sugestie liczone tylko z liter, paleta sylab niebezpieczna dla daltonistów (czerwony obok zielonego).

## 2. Priorytety przekrojowe (wpływ ≥4, nakład S/M) — proponowana kolejność

| # | Co | Moduł | Wpływ | Nakład | Źródło (zał.) |
|---|---|---|---|---|---|
| 1 | Czyste fonemy liter (spółgłoski ciągłe wydłużone, zwarte ucięte) przez `azure-ipa` + tryb prompt „fonem / nazwa / oba" | Litery | 5 | M | A‑1, A‑2 |
| 2 | Krok syntezy „MA + MA = MAMA" (sylaby wolno → słowo szybko) po ułożeniu/wyborze słowa | Czytanie | 5 | M | B‑1 |
| 3 | Druga próba po błędzie (2 kafelki: cel + wybrany) zamiast „posłuchaj i dalej" — we wszystkich quizach | Litery, Czytanie, Cyferki | 5 | S/M | A‑3, B‑3, C‑10 |
| 4 | Wypowiadać liczby zadania („osiem plus pięć — ile razem?") — audio `numbers.json` już istnieje | Cyferki | 5 | S | C‑2 |
| 5 | Wagi konceptów w losowaniu (najpierw koncept, potem fakt) + gating `prerequisites` w poziomie | Cyferki | 5 | S/M | C‑1, C‑5 |
| 6 | Audio strategii po błędzie („policz od większej", „zrób dziesiątkę", „to podwójne") | Cyferki | 5 | S/M | C‑4 |
| 7 | Tryb echo „posłuchaj → powtórz → teraz ty" w 🔊 czytanek + tempo (żółw/normalnie) | Czytanki | 5 | S | D‑1, D‑2 |
| 8 | Stopping cue „na dziś wystarczy" + spójne 6–8 pytań na sesję, nudge „druga sesja wieczorem" | wszystkie | 5 | S | E‑2, A‑11, E‑14 |
| 9 | Licznik tapów/słowo i czas w czytankach → raport („najczęściej dotykane: WIE‑WIÓR‑KA") | Czytanki | 5 | S | D‑3 |
| 10 | Pochwały procesowe (~10 fraz: „uważnie słuchałeś", „poprawiłeś się") 50/50 z obecnymi | wszystkie | 4 | S | A‑8, E‑3 |
| 11 | Paleta sylab bezpieczna dla daltonistów (Okabe–Ito) + kod niekolorowy (kropka/podkreślenie) | Czytanie, Czytanki, Home | 4 | S | E‑4 |
| 12 | Raport: karta „następny krok" (1 akcja na tydzień), sugestie ze wszystkich modułów | rodzic | 4 | M | E‑5 |
| 13 | Liczenie 1:1 z dotykiem (stukasz obiekty, lektor liczy, pytanie o kardynalność) | Cyferki | 5 | M | C‑3 |
| 14 | Dystraktory kontrastywne dla sylab (MA/NA, KO/KU, PA/BA) | Czytanie | 4 | S | B‑4 |
| 15 | Struktura 5 w ten frame, nie zasłaniać reprezentacji w feedbacku, złagodzić próg mastery (8 z 10) | Cyferki | 4 | S | C‑6, C‑7, C‑8 |
| 16 | Tryb „trudne literki" + „literka dnia" (mikrosesja z Home) | Litery | 4 | S/M | A‑4, A‑5 |
| 17 | Mini‑pytanie o rozumienie po czytance (3 obrazki, audio, tap) | Czytanki | 5 | M | D‑7 |
| 18 | Sprawdzian rozumienia obrazek → słowo w Ogniku/Pochodni | Czytanie | 4 | M | B‑6 |
| 19 | Przełącznik „scal sylaby" + licznik „przeczytana 2×" (powtórzone czytanie) | Czytanki | 4 | S | D‑4, D‑5 |
| 20 | `prefers-reduced-motion` w celebracjach modułu 2 i WordScene | Czytanie | 3 | S | E‑8 |

Większe inwestycje (L), warte osobnego designu: **plan na dziś** z SRS między modułami (E‑1), **jedna ekonomia nagród** (E‑6), **tracing/air‑writing** liter (A‑6), **poziom pośredni CV→CVC** i most do zdań (B‑8, B‑9), **porównywanie zbiorów `<`,`>`,`=`** i **oś liczbowa** (C‑11, C‑13), **serie czytanek z bohaterami** + **nagraj siebie** (D‑8, D‑9), **multi‑profil** (E‑12).

## 3. Czego NIE robić (zgodne we wszystkich pięciu raportach)

- Timerów, odliczania, rekordów szybkości, streaków dla dziecka, punktów wymienialnych/sklepu — overjustification (Lepper 1973), lęk (Ramirez & Beilock), Duolingo ABC celowo bez streaka poniżej 8 lat.
- Głoskowania/nazywania liter w module czytania; mieszania nazw i fonemów bez jawnego trybu (Piasta & Wagner: łącznie i jawnie, nie zamiennie).
- ASR/oceny wymowy w czytankach (fałszywe „źle" dla 7‑latka; koszt w PWA offline) i sceny jako podpowiedzi treści (three‑cueing).
- Usuwania par mylących b/d/p z dystraktorów i karania ich mocniej — norma rozwojowa do 7–8 r.ż.
- Rozbudowy SettingsScreen o kolejne per‑level suwaki; „uatrakcyjniania" math gate.

## 4. Proponowany plan w trzech falach

**Fala 1 (tydzień, same S/M, największy zwrot):** #1–#11 z tabeli — fonemy i tryb promptu, synteza sylab, druga próba, liczby w zadaniu, wagi konceptów, audio strategii, echo w czytankach, stopping cue, tapy w raporcie, pochwały procesowe, paleta.

**Fala 2 (design + implementacja, M):** #12–#19 — raport „następny krok", liczenie 1:1, kontrastywne sylaby, ten frame/mastery, trudne literki/literka dnia, rozumienie (czytanki + obrazek→słowo), scalanie sylab i powtórzone czytanie.

**Fala 3 (L, osobne specy):** plan na dziś + jedna ekonomia nagród, tracing liter, poziom CVC + most do zdań, porównywanie i oś liczbowa, serie czytanek + nagrywanie, multi‑profil.

Każda fala: spec → plan → implementacja → CR, jak dotychczas. Audio: nowe klucze przez `audio:build` (Edge dla lektora, Azure‑IPA dla fonemów/sylab).

---

# Załącznik A — Litery (moduł 1)


## 1. Jak uczymy dziś

1. **Jeden typ zadania**: słychać literę → dziecko wybiera kafelek. Prompt to zawsze `letter-<x>` (`src/modules/letters/hooks/useSession.ts:503`), powtarzalny guzikiem 🔊 (`components/QuizCard.tsx:228`).
2. **Co słychać**: nie nazwa i nie czysty fonem, lecz spółgłoska z doklejoną samogłoską — `"b": "by"`, `"d": "dyy"`, `"k": "kyyy"`, `"z": "Z yy"` (`audio-source/letters.json`).
3. **Dystraktory**: 3–9 sztuk; errorless dla świeżych liter (`totalSeen ≤ 2`), inaczej 70% szans na parę myloną (`src/shared/srs/distractors.ts`, `data/contrastivePairs.ts`, `data/visualGroups.ts`).
4. **Poprawnie**: `sfx-correct-ding` + 1 z 12 pochwał no-repeat + audio streaka 3/5/7+ (`hooks/useSession.pickers.ts`, `useSession.ts:552-560`). Wszystkie pochwały są typu osoba/wynik („umiesz!", „świetnie!") — `audio-source/ui-strings.json`.
5. **Błąd**: prefiks (osobny wariant „te dwie są podobne" dla par kontrastywnych) + ponowne `letter-<x>`; nigdy nie nazywamy wybranej złej litery (`useSession.ts:565-573`). Brak drugiego podejścia.
6. **„Nie wiem"/timeout**: wsparcie + litera + słowo-kotwica (bez frazy „X jak Y") (`useSession.ts:575-590`, `data/associations.ts`).
7. **Feedback trwa sztywno** 4500–7000 ms + 1200 ms oddechu (`FEEDBACK_DURATION_BASE_MS`), z guzikiem „→ Dalej" (`components/FeedbackOverlay.tsx`).
8. **SRS**: Leitner 1–5, `score = boxWeight × recency × (1+2·min(recentWrong,3))` (`shared/srs/scoring.ts`); correct +1, wrong −2, dontKnow −1 (`update.ts`); 15% jitter na box 4–5, anti-repeat (`select.ts`). Mastery = box 5 → fanfara + „ściana" liter na `components/LevelSelect.tsx:285`.
9. **Sesja**: domyślnie 10 pytań; limit czasu off (Iskierka/Płomyk) i 15 s (Ognik/Pochodnia); kafelków 4/6/8/10 (`shared/settings/defaults.ts:90-110`). Koniec: iskierki + breakdown + sugestia awansu ≥80% (`SessionEnd.tsx:139`).
10. **Formy liter**: para „Aa" drukowana → mieszane → oba style; pismo = font Kalam **bez czterolinii** — gotowy `src/shared/ui/HandwrittenLetter.tsx` nie jest podpięty, `LetterTile.tsx:78` renderuje własny wariant bez liniatury.

## 2. Co mówi badanie / praktyka

- **Nazwa + dźwięk łącznie bije sam dźwięk.** Meta-analiza Piasty i Wagnera (2010): instrukcja łącząca nazwę litery i jej dźwięk daje lepsze przyswajanie *dźwięków* niż sama nauka dźwięków ([ResearchGate](https://www.researchgate.net/publication/45424522_Developing_Early_Literacy_Skills_A_Meta-Analysis_of_Alphabet_Learning_and_Instruction), [Reading League](https://www.thereadingleague.org/wp-content/uploads/2025/01/Brick-by-Brick-Insights-on-Alphabet-Instruction-From-Research.pdf)).
- **Fonem musi być „czysty"** — doklejanie samogłoski („byy", „kyyy") uczy dwóch dźwięków zamiast jednego i psuje późniejsze scalanie sylab; spółgłoski ciągłe wydłużamy, zwarte „ucinamy" ([Monster Phonics](https://monsterphonics.com/the-importance-of-pure-sounds-in-phonics/), [Informed Literacy](https://informedliteracy.com/the-importance-of-clipping-sounds/)).
- **Wiedza alfabetyczna jest przyczynowo powiązana z późniejszym czytaniem**, a systematyczna fonika ma solidny efekt w zerówce/kl.1 (NRP 2000: d≈0,41 ogółem, 0,58 dla dzieci ryzyka) ([Reading Rockets](https://www.readingrockets.org/topics/curriculum-and-instruction/articles/findings-national-reading-panel), [Ehri, NRP phonics](https://dera.ioe.ac.uk/id/eprint/4938/6/nls_phonics0303lehri.pdf)); EEF daje fonice najwyższą pewność dowodową (+5 miesięcy) ([EEF](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/phonics)).
- **Ehri**: przejście z fazy pre-alfabetycznej do częściowo-alfabetycznej to właśnie wiązanie liter z dźwiękami w słowach — rozpoznanie kształtu bez dźwięku nie napędza mapowania ortograficznego ([AFT/Ehri](https://www.aft.org/ae/fall2023/ehri), [ERIC](https://eric.ed.gov/?id=EJ1027413)).
- **PL — podstawa programowa przedszkolna (2017)**: dziecko *rozpoznaje litery drukowane*, „przygotowuje się" do czytania i pisania; ćwiczenia mają obejmować m.in. czytanie liniatury i kreślenie znaków — pismo odręczne jest w programie ([ISAP, D2017/356](https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20170000356/O/D20170356.pdf)).
- **PL — metoda sylabowa (Cieszyńska, symultaniczno-sekwencyjna)**: kolejność od samogłosek → sylab otwartych, dobór liter wg trudności artykulacyjnej i różnicowalności graficznej, nie wg alfabetu ([Centrum Metody Krakowskiej](https://centrummetodykrakowskiej.pl/blog/symultaniczno-sekwencyjna-nauka-czytaniar-teoria/), [UŚ PDF](https://www.sjikp.us.edu.pl/wp-content/uploads/2022/01/Metoda-symultaniczno-sekwencyjna-Jagody-Cieszynskiej-metoda-krakowska-1.pdf)). Glottodydaktyka Rocławskiego (klocki, „głoskowanie" bez schwa) — *z pamięci*, spójna z punktem o czystych fonemach.
- **Mylenie b/d/p w wieku 6–7 lat jest normą rozwojową** (utrwala się ok. 7–8 r.ż.); u typowych 6-latków to nie „odwrócenie lustrzane", tylko niedokończone kodowanie kierunku ([Reading and Writing 2022](https://link.springer.com/article/10.1007/s11145-022-10290-6), [Understood](https://www.understood.org/en/articles/faqs-about-reversing-letters-writing-letters-backwards-and-dyslexia)).
- **Multisensoryka działa**: trening haptyczno-wzrokowy liter (Bara/Gentaz) podniósł rozpoznawanie liter i dekodowanie pseudosłów vs trening tylko wzrokowo-słuchowy ([Semantic Scholar](https://www.semanticscholar.org/paper/8eae1677c12e6d1e7ac83dbecd955df5ad1284c5), [BJDP 2007](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1348/026151007X186643)); pisanie ręką > pisanie na klawiaturze dla rozpoznawania liter (Longcamp) ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.892913/full)).
- **Rozłożone przypominanie działa u przedszkolaków**, także w wariancie „expanding retrieval"; efekt odstępu potwierdzony u dzieci 4–9 lat ([Learning Scientists](https://www.learningscientists.org/blog/2022/2/3-1), [Memory & Cognition](https://link.springer.com/article/10.3758/BF03197733)).
- **Feedback po błędzie**: efekt hiperkorekty — błędy popełnione z wysoką pewnością dzieci poprawiają *łatwiej*, gdy dostaną wyraźną korektę; opóźniony feedback bywa lepszy dla retencji długoterminowej niż natychmiastowy ([Metcalfe & Finn, dzieci](http://www.columbia.edu/cu/psychology/metcalfe/PDFs/Metcalfe&Finn_final%20Learning%20&%20Instruction2011.pdf), [Memory & Cognition](https://link.springer.com/article/10.3758/MC.37.8.1077)).
- **Pochwała procesowa > osobowa**: „dobrze słuchałeś / spróbowałeś jeszcze raz" buduje wytrwałość i growth mindset, „jesteś zdolny / umiesz" osłabia ([Haimovitz & Corpus](https://www.reed.edu/psychology/motivation/assets/downloads/Haimovitz_Corpus_2011.pdf), [Harvard Health](https://content.health.harvard.edu/blog/study-praising-effort-motivates-kids-best)).
- **UX i nagrody**: NN/g dzieli dzieci na 3–5 / 6–8 / 9–12 lat i wymaga niskich wymagań motorycznych oraz braku złożonych gestów u <8 lat ([NN/g](https://www.nngroup.com/reports/children-on-the-web/), [NN/g cognition](https://www.nngroup.com/articles/kids-cognition/)); nagrody namacalne/odznaki potrafią wypierać motywację wewnętrzną po zaniku efektu nowości ([meta-analiza ETR&D](https://link.springer.com/article/10.1007/s11423-023-10337-7)). Khan Academy Kids ma RCT (+13 pc w TOPEL po 10 tyg. × 20 min/dz.) ([Khan blog](https://blog.khanacademy.org/khan-academy-kids-improves-pre-literacy-skills-in-preschoolers-research-confirms/)); Teach Your Monster uczy najpierw 31 relacji litera–dźwięk ([TYM](https://www.teachyourmonster.org/teach-your-monster-to-read/)). Sesame Workshop: „ekran + dorosły obok" — *z pamięci*.

## 3. Propozycje ulepszeń (ranking)

| # | Propozycja | Uzasadnienie (źródło) | Wpływ | Nakład | Dotyka |
|---|---|---|---|---|---|
| 1 | **Czyste fonemy zamiast „by/dyy/kyyy"** — nagrać/wygenerować spółgłoski ciągłe wydłużone (mmm, sss, żżż) i zwarte ucięte (b, k, t) przez Azure `azure-ipa` (jak w module 4) | pure sounds / schwa ([Monster Phonics](https://monsterphonics.com/the-importance-of-pure-sounds-in-phonics/)) | 5 | M | `audio-source/letters.json`, `scripts/polishG2p.ts`, override'y |
| 2 | **Tryb promptu: fonem / nazwa / oba** (ustawienie + per poziom; „oba" gra `letter-name-b` + `letter-b`) | name+sound > sound only (Piasta & Wagner) | 5 | M | settings, `useSession.ts:503`, nowe klucze audio |
| 3 | **Drugie podejście po błędzie** — po korekcie to samo pytanie z 2 kafelkami (cel + wybrany), zaliczone jako „poprawka", box +0 | hiperkorekta ([Metcalfe & Finn](http://www.columbia.edu/cu/psychology/metcalfe/PDFs/Metcalfe&Finn_final%20Learning%20&%20Instruction2011.pdf)) | 5 | S/M | `useSession.ts` (handleOutcome), `QuizCard` |
| 4 | **Tryb „trudne literki"** — osobne wejście generujące sesję tylko z `recentWrong>0` / box ≤2 (dane już są w store) | expanding retrieval u przedszkolaków ([Learning Scientists](https://www.learningscientists.org/blog/2022/2/3-1)) | 4 | S/M | `LevelSelect`, `lettersStore`, `select.ts` |
| 5 | **Literka dnia** — 60–90 s mikro-sesja z home: 1 litera × 4 ekspozycje + jej słowo; buduje rytuał i odstępy | efekt odstępu 4–9 lat ([M&C](https://link.springer.com/article/10.3758/BF03197733)) | 4 | M | `app/Home.tsx`, nowy tryb w `useSession` |
| 6 | **Tracing / air-writing palcem** — dziecko obrysowuje literę po ścieżce SVG (bez oceny „ładności"), po poprawnej odpowiedzi lub w trybie nauki | haptyka Bara/Gentaz, Longcamp ([BJDP](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1348/026151007X186643)) | 5 | L | nowy komponent, `FeedbackOverlay`, ścieżki liter |
| 7 | **Celowane pary dyskryminacyjne** — gdy `confusedWith[x] ≥ 2`, generuj pytanie 2-kafelkowe wyłącznie b vs d, z wyraźnym kontrastem kierunku | b/d normatywne 6–7 l. i wymaga celowanej praktyki ([R&W 2022](https://link.springer.com/article/10.1007/s11145-022-10290-6)) | 4 | M | `distractors.ts`, `useSession` |
| 8 | **Pochwały procesowe** — dopisać 6 fraz („uważnie słuchałeś", „poprawiłeś się", „nie poddałeś się") i mieszać 50/50 z obecnymi | process vs person praise ([Haimovitz & Corpus](https://www.reed.edu/psychology/motivation/assets/downloads/Haimovitz_Corpus_2011.pdf)) | 3 | S | `ui-strings.json`, `useSession.pickers.ts` |
| 9 | **Czterolinia w kafelkach pisanych** — podpiąć istniejący `shared/ui/HandwrittenLetter` zamiast lokalnego wariantu | liniatura w podstawie programowej ([ISAP](https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20170000356/O/D20170356.pdf)) | 3 | S | `LetterTile.tsx:78` |
| 10 | **Krótszy feedback po `correct`** (ding + pochwała ≤ 2,5 s zamiast 4,5 s) → +30–40% prób w tej samej sesji | uwaga 6-latka, więcej retrieval ([NN/g](https://www.nngroup.com/articles/kids-cognition/)) | 3 | S | `FEEDBACK_DURATION_BASE_MS` |
| 11 | **Domyślna sesja 6–8 pytań + podpowiedź „druga sesja wieczorem"** zamiast 10 | rozłożenie > masowanie | 3 | S | `defaults.ts`, raport rodzica |
| 12 | **Cap kafelków na 6** (Ognik/Pochodnia: 8/10 → 6) i podnoszenie trudności *dystraktorami*, nie liczbą | ograniczone wymagania wzrokowo-motoryczne <8 lat ([NN/g](https://www.nngroup.com/reports/children-on-the-web/)) | 3 | S | `defaults.ts` |
| 13 | **Odwrotny typ zadania** — „widzisz literę → wybierz z 3 dźwięków" (co ~5. pytanie) | dwukierunkowe wiązanie liter i dźwięków (Ehri) | 4 | M | nowy wariant pytania w `useSession` |
| 14 | **Kolejność wprowadzania wg artykulacji, nie alfabetu** — przejrzeć pulę Iskierki pod kątem samogłosek + sylab otwartych | metoda symultaniczno-sekwencyjna ([CMK](https://centrummetodykrakowskiej.pl/blog/symultaniczno-sekwencyjna-nauka-czytaniar-teoria/)) | 3 | S | `shared/settings/defaults.ts` (pule) |
| 15 | **Ekran „usiądź obok" dla rodzica** raz na kilka sesji + 1 zabawa offline z literą tygodnia | mediacja dorosłego (Sesame Workshop — *z pamięci*; ZPD) | 2 | S | raport rodzica |

## 4. Czego NIE robić

1. **Nie zastępować dźwięku samą nazwą litery** („be", „er") ani nie mieszać nazw z fonemami losowo bez jawnego trybu — dziecko nie odróżni, którego użyć przy scalaniu (Piasta & Wagner: *łącznie i jawnie*, nie *zamiennie*).
2. **Nie dodawać rankingów, punktów wymienialnych, presji streaka ani „utraty" iskierek** — nagrody namacalne i leaderboardy wypierają motywację wewnętrzną po zaniku nowości ([ETR&D meta](https://link.springer.com/article/10.1007/s11423-023-10337-7)); obecny model „iskierki jako ślad wysiłku" jest bezpieczniejszy.
3. **Nie traktować b/d/p jako sygnału problemu ani nie karać ich mocniej w SRS, i nie usuwać par mylących z dystraktorów** — mylenie do 7–8 r.ż. jest normą, a unikanie kontrastów opóźnia różnicowanie ([R&W 2022](https://link.springer.com/article/10.1007/s11145-022-10290-6)).

## 5. Co już jest zgodne z best practice

Errorless start dla świeżych liter i kontrastywne dystraktory dla znanych; SRS z wagą błędów, jitterem na box 4–5 i anti-repeat (odstępy + przeplot); korekta, która **nigdy nie nazywa błędnie wybranej litery** (nie wzmacnia złego skojarzenia); „nie wiem" tańsze w karze niż błąd (uczciwość opłacalna); dual coding przez słowo-kotwicę tylko wtedy, gdy dziecko go potrzebuje; audio-first UI bez tekstu i gestów, tap-targety ≥60 px i brak limitu czasu na dwóch pierwszych poziomach (zgodne z NN/g dla 6–8 lat); mastery wall + świętowanie box 5 (self-efficacy); pełny raport rodzica z parami pomyłek i podziałem print/handwritten — gotowa podstawa pod punkty 4 i 7 tabeli.
# Załącznik B — Czytanie (moduł 2)


## 1. Jak uczymy dziś (stan kodu)

1. **4 poziomy = 4 typy zadań**, mapowanie sztywne: `LEVEL_TO_EXERCISE` w `src/modules/reading/types.ts` (iskierka→syllable-match, plomyk→word-assembly, ognik→word-choice, pochodnia→syllable-fill).
2. **Iskierka**: lektor mówi sylabę CV (24 sylaby, `data/syllables.ts`, audio `azure-ipa`, głos Zofia), dziecko wybiera 1 z 4 kafelków; **dystraktory losowe** (`generateSyllableMatch`, `useReadingSession.ts:145`) — nie kontrastywne, mimo spec §6.3.
3. **Płomyk**: 20 słów 2-sylabowych CV-CV (`data/words.ts`), drag-drop @dnd-kit (`WordAssemblyExercise.tsx`, `useDragSyllable.ts`), prompt = intro poziomu + całe słowo; **pojedyncze sylaby nigdy nie są wypowiadane**, brak kroku syntezy („MA + MA = MAMA").
4. **Ognik**: 25 słów (dwuznaki SZ/CZ/RZ/CH), audio→wybór 1 z 4 słów pisanych; dystraktory losowe z poziomu (`generateWordChoice:196`), **bez obrazka w zadaniu** — scenka pojawia się dopiero po poprawnej odpowiedzi (`SessionView.tsx:147`), więc znaczenie nie jest testowane.
5. **Pochodnia**: 22 słowa, luka w sylabie; pozycja luki sterowana boxem (low box→`last`, box≥4→`first`/`middle`, `generateSyllableFill:258`); dystraktory dobierane po **długości** sylaby z puli wszystkich słów.
6. **Feedback** (`handleOutcome:575`, `FeedbackOverlay.tsx`): correct = `sfx-correct-ding` + 1 z 6 pochwał bez powtórzenia celu; wrong = „Posłuchaj jeszcze raz" + cel; dontKnow = „Nie szkodzi, idziemy dalej" + cel. **Zero drugiej próby**, brak hiperkorekty; klucze `reading-correct-prefix`/`reading-dontknow-prefix` w `audio-source/reading-ui-strings.json` są martwe.
7. **SRS** (`shared/srs/*`): Leitner 1-5, correct +1 / dontKnow -1 / wrong -2; score = `boxWeight × recency(cap 3) × (1+min(recentWrong,3)×2)`, 15% jitter na box 4-5, brak powtórki tego samego itemu pod rząd. Stan persistowany (`iskierki-reading-v1`).
8. **Sesja**: 8 pytań (`constants.ts`), override per poziom w ustawieniach; brak adaptacji długości i brak sugestii poziomu.
9. **Album**: karta odblokowuje się przy pierwszym dojściu do box 5 (= 4 poprawne z rzędu), cue `reading-album-unlock`, ceremonie co 10 kart; w albumie tap→scenka + audio (`WordAlbum.tsx`).
10. **Scenki**: ~50 wariantów emoji+CSS (`data/scenes.ts`), wybór niepowtarzającego się wariantu, wyłączalne (`settings.reading.wordAnimations`). `pickedScene` w hooku to martwy kod.
11. **Wild celebration**: co `wildCelebrationFreq` (domyślnie 8) ± jitter 2 poprawnych, licznik **resetowany na starcie sesji** — przy 8 pytaniach odpala się rzadko/nigdy.
12. **Kolorowanie sylab**: naprzemienne #1d4ed8/#dc2626/#16a34a/#9333ea wg pozycji (`shared/ui/syllableColors.ts`), tylko w stanie `idle` kafelka; pojedyncze sylaby (SyllableTile) bez koloru.

## 2. Co mówi badanie/praktyka

- **Sylaba jest trafną jednostką dla polszczyzny**: teoria psycholingwistycznego ziarna (Ziegler & Goswami) wiąże ortografie transparentne z małymi, regularnymi jednostkami, ale sylaba pozostaje najłatwiej słyszalną jednostką dla przedszkolaka — na tym stoi cała metoda Cieszyńskiej (nie nazywać liter, nie głoskować; fonem wyłania się na końcu).
- **Trening sylabowy poprawia tempo czytania słów, ale nie automatycznie rozumienie tekstu** (Frontiers 2017, słabo czytający 4-klasiści). Wniosek: moduł 2 realnie buduje dekodowanie; rozumienia trzeba uczyć osobno.
- **Kolorowanie sylab: efekt niepewny.** Krytyczne badania nad „czerwono-niebieskim" drukiem elementarzowym nie potwierdzają przewagi nad tekstem czarnym; kolor pomaga jako *chwilowe rusztowanie*, nie jako stały format — warto go wygaszać wraz z boxem.
- **Blending (synteza) to osobna, wyuczalna umiejętność** — samo rozpoznanie sylab nie daje słowa. Cieszyńska i Rocławski (glottodydaktyka: „ślizganie" głosek, klocki LOGO) budują jawny krok łączenia; u nas go nie ma.
- **Ehri — orthographic mapping**: trwałe rozpoznawanie słowa powstaje przez świadome powiązanie liter z dźwiękami w konkretnym słowie, nie przez zapamiętywanie kształtu. Wybór słowa z 4 kafelków bez wypowiedzenia sylab łatwo rozwiązać strategią „pierwsza litera + długość".
- **Share — self-teaching**: każde samodzielne zdekodowanie nowego słowa buduje reprezentację ortograficzną. Zadania *rozpoznawcze* (4 opcje) dają mniej niż zadania *produkcyjne* (ułóż / przeczytaj).
- **Retrieval + spacing działa u małych dzieci** (badania na 4-5-latkach; powtarzane, rozłożone przypominanie > masowane), a **feedback po próbie dodatkowo poprawia zapamiętanie** — nasz SRS jest zgodny z tym, ale wszystkie powtórki mieszczą się w jednej sesji.
- **Feedback korekcyjny** jest najskuteczniejszy, gdy daje szansę na poprawną próbę (try-again), a nie tylko podaje odpowiedź — obecny wariant „powiedz i idź dalej" traci połowę wartości.
- **CV→CVC→zbitki**: naturalna progresja to sylaby otwarte, potem zamknięte, potem grupy spółgłoskowe. U nas Płomyk to czyste CV-CV, a Ognik od razu wrzuca CZAP-KA, MUSZ-KA, CHŁO-PIEC — skok jest duży.
- **Decodable text > sight words** na wczesnym etapie: dziecko powinno czytać materiał złożony z opanowanych jednostek. Mamy taki materiał w module 4 (czytanki), ale moduł 2 kończy się na słowie i nie prowadzi do zdania.
- **Rozumienie trzeba sprawdzać, nie tylko ilustrować**: dopasowanie obrazek→słowo (picture-word matching) to standardowy, tani test rozumienia; u nas obrazek pojawia się dopiero jako nagroda.
- **Motywacja/kolekcje**: kolekcje i losowe „wild" nagrody podtrzymują zaangażowanie (Duolingo ABC, Teach Your Monster — zgodne z Letters and Sounds, Reading Eggs), ale nagrody nie powinny wypierać samego czytania; NN/g i Sesame Workshop: dla 6-7-latków instrukcja głosowa + ikony, duże targety, jednoznaczne afordancje — to już mamy.

## 3. Propozycje ulepszeń (ranking)

| # | Propozycja | Uzasadnienie | Wpływ | Nakład | Dotyka |
|---|---|---|---|---|---|
| 1 | **Krok syntezy „MA + MA = MAMA"** po ułożeniu/wyborze słowa: sylaby wolno, potem raz szybko (audio + podświetlanie sylab) | Blending to osobna umiejętność; Cieszyńska/Rocławski, Ehri | 5 | M | `useReadingSession.playPromptAudio/handleOutcome`, `WordScene`, nowe klucze audio |
| 2 | **Powtórz cel także po poprawnej odpowiedzi** (użyj martwego `reading-correct-prefix` + słowo) | Feedback po udanym przypomnieniu wzmacnia ślad; dziś correct nie utrwala formy | 4 | S | `handleOutcome`, `reading-ui-strings.json` |
| 3 | **Druga próba przy błędzie** (podpowiedź: zostają 2 opcje, potem podanie odpowiedzi) | Feedback korekcyjny z ponowną próbą > samo podanie; box aktualizowany dopiero po 2. próbie | 5 | M | `useReadingSession`, wszystkie 4 ćwiczenia |
| 4 | **Dystraktory kontrastywne dla sylab** (MA/NA, KO/KU, PA/BA) — reużyj `pickDistractors` + tabela par sylab | Ćwiczy dyskryminację fonemową; dziś losowe opcje pozwalają zgadywać po pierwszej literze | 4 | S | `generateSyllableMatch`, nowy `contrastiveSyllables.ts`, `shared/srs/distractors` |
| 5 | **Naprawa progu wild celebration** (freq liczony względem długości sesji lub licznik nieresetowany) | Nagroda praktycznie nie odpala się przy 8 pytaniach — zaprojektowana motywacja nie działa | 3 | S | `useReadingSession.start/handleOutcome`, `settings.reading` |
| 6 | **Sprawdzian rozumienia: obrazek → słowo** (2-3 pytania na sesję w Ogniku/Pochodni) | Picture-word matching to standardowy test rozumienia; dziś obrazek jest tylko nagrodą | 4 | M | nowy `WordMeaningExercise`, `words.albumEmoji`, `types.ReadingQuestion` |
| 7 | **Wygaszanie koloru sylab wraz z boxem** (box 1-2 kolor, 3-4 cieńszy, 5 czarny) | Kolor jako rusztowanie, nie stały format; dowody na trwały efekt koloru słabe | 3 | S | `SyllableText`, `WordTile`, `SyllableFillExercise` |
| 8 | **Poziom pośredni CV→CVC** (sylaby zamknięte: KOT, DOM, LAS, MAK) między Płomykiem a Ognikiem | Dziś skok CV-CV → CZAP-KA/CHŁO-PIEC jest za duży | 4 | M | `data/words.ts`, `levelPools`, audio, ew. 5. poziom |
| 9 | **Most do modułu 4: 1-2 decodable zdania na koniec sesji** z opanowanych słów („MAMA MA KOTA") | Decodable text; przenosi dekodowanie na poziom zdania i spina moduły 2↔4 | 4 | M | `SessionEnd`, `modules/czytanki` (reużycie `SyllableButton`), audio |
| 10 | **Sugestia poziomu** („idź dalej / wróć") na podstawie odsetka correct i średniego boxa puli | Adaptacja jest dziś ręczna; rodzic/dziecko nie wie kiedy zmienić poziom | 3 | S | `ReadingLevelSelect`, `readingStore` (agregat), `SessionEnd` |
| 11 | **Śledzenie sylab wewnątrz słów** (SRS na sylabach także w Płomyku/Ogniku) | Dziś stan sylab żyje tylko w Iskierce; trudna sylaba w słowie nie wraca | 4 | M | `useReadingSession.updateWordState`, `types.WordState`, raport rodzica |
| 12 | **Powtórka międzysesyjna (spacing)**: 2 pierwsze pytania sesji z itemów box 3-4 z poprzedniej sesji | Rozłożone przypominanie > masowane; dziś `recency` cap 3 spłaszcza odstępy | 3 | S | `shared/srs/select.ts`, `generateQuestion` |
| 13 | **Wariant produkcyjny w Ogniku**: co 3. pytanie ułóż słowo z sylab zamiast wyboru z 4 | Self-teaching — produkcja daje więcej niż rozpoznanie | 3 | M | `SessionView`, `WordAssemblyExercise` reuse |
| 14 | **Przegląd listy słów** (DUDA, BABA, KAPUSTA=KA-PU-STA zamiast KA-PUS-TA) | Poprawność podziału sylabowego i frekwencja słów; błędny podział uczy złego wzorca | 2 | S | `data/words.ts`, audio kluczy |
| 15 | **Usuń martwy kod** `pickedScene` z hooka i nieużywane klucze audio | Higiena; mylące przy dalszej pracy | 1 | S | `useReadingSession.ts` |

## 4. Czego NIE robić

1. **Nie głoskować (F-O-K-A) ani nie nazywać liter w module 2.** Metoda symultaniczno-sekwencyjna wprost tego zabrania na tym etapie — nazwy liter są domeną modułu 1, a mieszanie jednostek dezorientuje.
2. **Nie dodawać timera/odliczania ani rankingu prędkości.** Presja czasu u 7-latka obniża dokładność dekodowania i koliduje z anty-cheatem (idle 20 s → pauza), a wolne czytanie sylabowe jest tu pożądane.
3. **Nie zwiększać częstotliwości wild celebration ani nie wprowadzać walut/streaków.** Nagroda ma pozostać rzadka i zaskakująca; gęste bodźce zewnętrzne przesuwają uwagę z czytania na zbieranie i psują efekt kolekcji (album już pełni tę rolę).

## 5. Co już jest zgodne z dobrą praktyką

Sylaba jako jednostka i kanon elementarzowy (MAMA, TATA, KOT) — trafny wybór dla polskiej ortografii transparentnej. SRS Leitnera z asymetrycznym karaniem błędu (-2) i boostem `recentWrong` realizuje retrieval practice z priorytetem dla trudnych itemów; jitter na box 4-5 zapobiega przewidywalności. Feedback czeka na wybrzmienie audio (`MIN_FEEDBACK_MS` + auto-advance), a korekta jest powtarzana po wznowieniu z pauzy — dziecko zawsze usłyszy poprawną formę. Przycisk 🔊 (nielimitowane powtórzenie promptu) i 🤷 „nie wiem" jako pełnoprawna, nagradzana ścieżka to wzorcowe rozwiązania dla nieczytającego użytkownika. Album z odblokowaniem przy box 5 wiąże nagrodę z realnym opanowaniem, a nie z liczbą kliknięć. Lexend na kafelkach, brak tekstu w UI dziecka, targety ≥60 px i audio cue do każdej akcji są zgodne z wytycznymi NN/g i Sesame Workshop dla 6-7-latków.

---

**Źródła:** [Ziegler & Goswami, psycholinguistic grain size](https://www.researchgate.net/publication/8098564_Reading_Acquisition_Developmental_Dyslexia_and_Skilled_Reading_Across_Languages_A_Psycholinguistic_Grain_Size_Theory) · [Orthographic transparency & syllabic complexity — przegląd](https://pmc.ncbi.nlm.nih.gov/articles/PMC5574968/) · [Cieszyńska — metoda symultaniczno-sekwencyjna (teoria)](https://centrummetodykrakowskiej.pl/blog/symultaniczno-sekwencyjna-nauka-czytania%C2%AE-teoria/) · [Cieszyńska — opracowanie UŚ (PDF)](https://www.sjikp.us.edu.pl/wp-content/uploads/2022/01/Metoda-symultaniczno-sekwencyjna-Jagody-Cieszynskiej-metoda-krakowska-1.pdf) · [Syllable-based intervention, Frontiers 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5611416/) · [„Red-blue is my reading book" — kolorowanie sylab](https://www.academia.edu/145380862/Red_blue_is_my_reading_book_Is_it_really_helpful_to_mark_syllables_by_color_in_beginner_reading_books) · [Repeated spaced retrieval w uczeniu słów u dzieci](https://pmc.ncbi.nlm.nih.gov/articles/PMC8126157/) · [Retrieval + spaced practice, LSHSS](https://pubs.asha.org/doi/abs/10.1044/2020_LSHSS-19i-00001) · [Teach Your Monster to Read — zgodność z Letters and Sounds](https://smarterlearningguide.com/teach-your-monster-to-read-review/) · [Reading Eggs — podstawy](https://readingeggs.com/articles/science-behind-reading-eggs/). **Z pamięci** (brak potwierdzenia w wyszukiwaniu): Ehri (orthographic mapping), Share (self-teaching hypothesis), Rocławski (glottodydaktyka, klocki LOGO), Falski (elementarz analityczno-syntetyczny), polskie aplikacje „Czytam z sylabami"/Sylabek/MiMowa/Moje Sylabki, Duolingo ABC, wytyczne NN/g i Sesame Workshop dla dzieci 6-8 lat.
# Załącznik C — Cyferki (moduł 3)


## 1. Jak uczymy dziś

1. **20 konceptów / 4 poziomy** (`numbers/data/concepts.ts`): Iskierka 5, Płomyk 5, Ognik 4, Pochodnia 6. Wszystkie koncepty poziomu wchodzą do jednej puli **od 1. pytania** — brak sekwencjonowania wewnątrz poziomu (`hooks/useNumbersSession.ts` → `shared/srs/select.ts`).
2. **Fakty generowane** (`data/facts.ts`, `data/levelFacts.ts`): Iskierka 34, **Płomyk 128**, Ognik 62, Pochodnia 29 + 6 maintenance. Pula niezbalansowana: `plomyk-addsub-10` = 90/128 (70%), `ognik-make10` = 36/62 (58%), `ognik-doubles` tylko 16%.
3. **15 typów ćwiczeń**, 1 koncept → 1 typ (`hooks/exerciseRouter.ts`). Schemat prawie zawsze ten sam: obraz → **przeciągnij cyfrę** z 4 kafelków na `DropTarget`. Wyjątki: `NumberBondBuilder` (2 sloty, akceptuje dowolny rozkład — dobrze) i `FactFamilyTriangle` (tapanie prawdziwych równań; 1 zły tap = koniec).
4. **CPA**: `TenFrame` (2×5, kropki jednolitego koloru — **brak struktury 5**), `DotPattern` (tylko układy kostki; tryb `scattered` napisany, nieużyty), `ConcreteIcons` (emoji), `NumberBondShape`. **Brak**: osi liczbowej, rekenreka, maty part-part-whole, porównywania zbiorów (`<`, `>`, `=`).
5. **Mowa**: `session-start-<level>`, `intro-<conceptId>` (raz), generyczny prompt per typ ćwiczenia („Ile razem?", „Ile brakuje?"). **Liczby zadania nigdy nie są wypowiadane.** 8 rotujących pochwał growth-mindset, 3 kwestie Iskry „myślę na głos".
6. **Feedback**: pełnoekranowy, ≥2,2 s, czeka na koniec audio. Błąd → „Prawie! Patrz jeszcze raz." + hiperkorekcja `correct-show-N` + duża cyfra. **Bez drugiej próby, bez powtórzenia strategii; overlay zasłania reprezentację.**
7. **„Nie wiem" (🤷)** = ten sam feedback co błąd, box −1; błąd: box −2.
8. **Mastery**: streak ≥8 poprawnych z rzędu w koncepcie (**zerowany każdym błędem**) + ≥`minFacts` dotkniętych + ≥2 dni od `firstSeenAt`.
9. **Sesja**: 8 pytań (6/8/10); Pochodnia 18% maintenance odejmowania. SRS Leitner 5-box, jitter 15%.
10. **Martwe audio**: `audio-source/numbers.json` (29 kluczy: `number-0..20`, `op-*`, `count-2by2/5by5/10by10`), 20× `mastery-*`, `iskra-bond-discovery`, `iskra-tenframe-fill`, `iskra-skipcount-singing` — nigdy nieodtwarzane.
11. **TODO w kodzie**: `ArrayMatchExercise.tsx:45` komutatywność; `EqualGroups` nie mostkuje `2+2+2` → `3×2` (spec §6.4).
12. Rodzic: 5 ustawień `numbers.*`, `MasteryTree`, `NumbersStats`.

## 2. Co mówi badanie / praktyka

- **Subitizing w wieku 7 lat = conceptual subitizer to 10/20** (7 jako 5+2, 16 jako 7+9, w strukturach ten frame) — [Clements & Sarama, learningtrajectories.org](https://www.learningtrajectories.org/math/subitizing/conceptual-subitizer-to-10). Nasz `subitize-flash` operuje na układach kostki 1–6 → dziecko zapamiętuje obrazek.
- **Rekenrek > statyczny ten frame**: podział 5/5 „zamienia rekenrek z narzędzia do liczenia w narzędzie do subitizingu" — rdzeń NCETM *Mastering Number* ([NCETM](https://www.ncetm.org.uk/features/mastering-number-building-strong-foundations-in-early-maths/); Fosnot & Dolk 2001).
- **Zasady liczenia Gelmana & Gallistela** (1978) i **„dziecięce liczenie" Gruszczyk-Kolczyńskiej** — pomijanie etapów = późniejsze porażki. U nas `counting-5/10` **nie zawierają aktu liczenia** — to rozpoznawanie liczebności.
- **Min-strategy / „licz od większej"** (Groen & Parkman 1972; Siegler SCADS) — kluczowy marker rozwoju ok. 7 r.ż. Aplikacja nigdy o niej nie mówi.
- **Strategie pochodne > drill**: Thornton (1978) — jawne uczenie near-doubles i przejścia przez 10 dało wzrost **i transfer**; Baroody: retrieval jest produktem rozumowania.
- **Fluency ≠ prędkość**: NCTM ([2023](https://www.nctm.org/Standards-and-Positions/Position-Statements/Procedural-Fluency-in-Mathematics/)); testy na czas → lęk matematyczny (Boaler; Ramirez & Beilock 2013).
- **Podanie poprawnej odpowiedzi ma duży efekt** (Pashler 2005), hiperkorekcja u dzieci (Metcalfe & Finn 2012) — nasz `correct-show-N` + SRS trafiają w to dobrze.
- **Worked example → completion → samodzielnie** (Renkl & Atkinson 2003) z adaptacyjnym wygaszaniem. Nasz `Make10Exercise` gra pełną animację za każdym razem — scaffold nigdy nie znika.
- **Self-explanation działa już u 4-latków** (Rittle-Johnson 2008; Bisra i in.).
- **Interleaving i retrieval**: Rohrer 2020 RCT — 61% vs 38% po ≥1 miesiącu, d = 0,83. Nasz SRS + przeplot to mocna strona.
- **Liniowa oś liczbowa**: ~1 h gry liniowej dała trwałe zyski (Siegler & Ramani 2008); 6–7 lat = przejście log→liniowe.
- **UX 6–8 lat** (NN/g): drag bywa frustrujący, „tap-and-tap" pewniejszy; cele ≥2 cm ([NN/g](https://www.nngroup.com/articles/children-ux-physical-development/)). Moduł w ~95% oparty na drag.
- **Podstawa programowa**: zerówka — przeliczanie, cyfry 0–10, +/− w sytuacji użytkowej, rytmy; kl. I–III — liczenie w przód i **wstecz**, **porównywanie `<`, `=`, `>`** ([ISAP](https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=wdu20170000356)). Porównywania i liczenia wstecz **brak**.
- **Overjustification** (Lepper 1973): Drzewko Mistrzostwa (kompetencja, nie waluta) to trafny wybór.

## 3. Propozycje ulepszeń (ranking)

| # | Propozycja | Uzasadnienie | Wpływ | Nakład | Dotyka |
|---|---|---|---|---|---|
| 1 | **Wagi konceptów w losowaniu** — najpierw koncept, potem fakt | Płomyk: 70% to `addsub-10`; Ognik: `doubles` 16% mimo „doubles first" | 5 | S | `useNumbersSession.pickAndSetQuestion`, `levelFacts.ts` |
| 2 | **Wypowiadać liczby zadania** („osiem plus pięć — ile razem?") | Dual coding; `numbers.json` (29 mp3) już istnieje i jest martwe | 5 | S | `promptAudio.ts`, `SessionView`, ćwiczenia |
| 3 | **Liczenie 1:1 z dotykiem** — stukasz obiekty, lektor liczy, pytanie o kardynalność | Gelman & Gallistel; Gruszczyk-Kolczyńska | 5 | M | nowy `CountObjectsExercise`, `exerciseRouter.ts` |
| 4 | **Audio strategii po błędzie** (`strategy-count-on`, `-make10`, `-doubles`) | Thornton, Baroody: strategia transferuje | 5 | S/M | `math-ui-strings.json`, `FeedbackOverlay` |
| 5 | **Gating kolejności w poziomie** (`prerequisites` w `ConceptDef`) — doubles → near-doubles → make-10 | Spec: „kolejność ważna!", kod jej nie realizuje | 5 | M | `concepts.ts`, `useNumbersSession` |
| 6 | **Nie zasłaniać reprezentacji w feedbacku** — pas + ten frame z poprawną liczbą kropek | Hiperkorekcja osadzona w modelu | 4 | S | `SessionView.FeedbackOverlay` |
| 7 | **Struktura 5 w `TenFrame`** (pierwsze 5 kropek innym odcieniem) | Fosnot/NCETM: 7 = 5+2 | 4 | S | `representations/TenFrame.tsx` |
| 8 | **Złagodzić mastery**: streak jako okno „8 z 10", `factsTouched` → `factsCorrect` | Jeden błąd zeruje serię ⇒ drzewko stoi miesiącami | 4 | S | `computeMasteryProgress` |
| 9 | **Tap-to-place obok drag** | NN/g: motoryka 6–8 | 4 | M | `DigitTile`, `DropTarget`, 15 ćwiczeń |
| 10 | **`dontKnow` → podpowiedź + druga próba** | Shute: scaffold, nie werdykt | 4 | S/M | `SessionView`, `answer` |
| 11 | **Porównywanie zbiorów `<`, `>`, `=`** — nowy koncept | Wymóg podstawy — całkowicie brak | 4 | M | `concepts.ts`, `facts.ts`, nowe ćwiczenie |
| 12 | **Fading worked example w Make 10** | Renkl & Atkinson | 4 | M | `Make10Exercise`, `numbersStore` |
| 13 | **Oś liczbowa / liniowa gra-ścigałka** | Siegler & Ramani 2008 | 4 | M/L | nowa `NumberLine`, `SkipCountChase` |
| 14 | **Odpalić martwe audio**: `mastery-*`, `iskra-bond-discovery`, `-tenframe-fill`, `-skipcount-singing` | 23 pliki nigdy nie grają | 3 | S | `persistResults`, `SessionEnd` |
| 15 | **Komutatywność side-by-side** (3×4 ↔ 4×3) | TODO w kodzie | 3 | S/M | `ArrayMatchExercise` |
| 16 | **`scattered` w subitizingu + zakres do 10 na ten frame** | Clements & Sarama | 3 | S | `SubitizeFlashExercise` |
| 17 | **Mata part-part-whole przed „wisienką"** | Singapore CPA; wirtualne manipulatywy d≈0,35 | 3 | M | nowa reprezentacja |
| 18 | **Self-explanation przez wybór ikony** („Jak policzyłeś?" 🖐️/🔟/👯) | Rittle-Johnson | 3 | M | `SessionView`, log, raport |
| 19 | **Zadania z treścią** („Były trzy jabłka, doszły dwa") | Podstawa kl. I | 3 | M | `math-ui-strings.json`, `ConcreteAddExercise` |
| 20 | **`NEAR_MISS_OFFSETS` we wszystkich ćwiczeniach** | Dystraktory z całego zakresu ⇒ eliminacja zamiast liczenia | 2 | S | 6 ćwiczeń |

## 4. Czego NIE robić

1. **Żadnych timerów, odliczania, rekordów szybkości** — presja czasu blokuje pamięć roboczą (Boaler; Ramirez & Beilock). `responseMs` tylko jako sygnał dla rodzica.
2. **Żadnych punktów, monet, odznak z góry** — overjustification (Lepper 1973). Drzewko jako wizualizacja kompetencji zostaje.
3. **Żadnego „productive failure" bez wsparcia** dla nowicjusza (Kirschner, Sweller & Clark 2006). **Nie zabraniać liczenia na palcach** (Gruszczyk-Kolczyńska).

*Zgodne z najlepszą praktyką i warte ochrony:* SRS z przeplotem, hiperkorekcja z podaniem odpowiedzi, CPA z ten frame i number bonds, pochwały za wysiłek, brak timera, 2-dniowy sleep guard w mastery, worked-example intro raz per koncept, `NumberBondBuilder` akceptujący dowolny rozkład.

# Załącznik D — Czytanki (moduł 4)


### 1. Jak działa dziś

1. **Dane**: `src/modules/czytanki/data/czytanki.ts` (789 l.) — 60 czytanek jako `Word = { syllables: string[]; punct? }`; helper `w('KO','TA','.')`. Wielkie litery, brak tekstu ciągłego.
2. **Grupy** (15 każda): G1 = 1 zdanie × 3 słowa, tylko CV otwarte; G2 = 2 zdania, sylaby zamknięte (DOM, PIES, JEST); G3 = 3–4 zdania, dwuznaki SZ/CZ/RZ/CH + ą/ę/ó; G4 = 5–6 zdań, zbitki (KRO-WA, DRZE-WO, PLE-CA-KU) i słowa 3–4-sylabowe. Progresja realna i konsekwentna.
3. **Ekran**: `components/CzytankaView.tsx` — scena 34–40% wysokości, tekst poniżej; font Lexend 64/54/46/40 px per grupa, auto-fit (`FIT_SAFETY`, `MIN_FONT=26`, oddawanie miejsca scenie do `SCENE_BASIS_MIN=18`) — zero scrolla, iPad landscape/portrait.
4. **Sylaba** = `SyllableButton.tsx` (div `role=button`, tap-target 56–60 px, `WebkitTouchCallout:none`), kolorowana `getSyllableColor(i)`; każde słowo w białej „obwolutce" z ramką — dziecko widzi granice wyrazu.
5. **Interakcja**: `hooks/useSyllablePress.ts` — pointerdown → timer 500 ms; ruch >10 px anuluje; dedupe click 300 ms (VoiceOver). Tap → `cz-syl-*`; long-press → `cz-word-*` + żółty highlight 600 ms.
6. **Czytanie całości**: `hooks/useReadAloud.ts` — sekwencyjne `await audioBus.play(cz-word-*)` słowo po słowie, highlight aktywnego słowa, pauza 450 ms między zdaniami, `runId` chroni przed wyścigami; ponowny tap = stop.
7. **Nawigacja**: `index.tsx` — ◀▶ prev/next z `replace: true` + `audio/pendingCue.ts` (cue odtwarza ekran docelowy po zamontowaniu). `usePageVisibility` → stop audio.
8. **Lista**: `CzytankaList.tsx` — 4 sekcje wg grup z ikoną poziomu + gwiazdkami, grid `auto-fill minmax(140px)`, kafelek = samo emoji + ⭐ gdy otwarte, licznik „X / 60", scroll do `lastOpenedId`.
9. **Sceny**: `CzytankaScene.tsx` + `backgrounds.tsx` (8 tł SVG) + `scene.css` (6 keyframes, `prefers-reduced-motion` wyłącza); tap w aktora → `.poke`, bez audio.
10. **Store**: `store/czytankiStore.ts` — persist `iskierki-czytanki-v1`: **tylko** `openedIds`, `lastOpenedId`, `seenIntros`. Brak czasu, tapów, powtórek.
11. **Audio**: `scripts/czytanki-audio-source.ts` → `czytanki-syllables.json` (Agnieszka, `azure-ipa` + `scripts/polishG2p.ts`: nosówki, ubezdźwięcznienie wygłosowe, asymilacja, akcent) i `czytanki-words.json` (`azure`, plain SSML); `audio-source/pronunciation-overrides.json` — ~25 ręcznych wyjątków (`cz-syl-drze`, `cz-syl-be_`, część z `voice: zofia/marek`).
12. **Raport rodzica**: `src/shared/stats/exporter.ts` — wyłącznie „Otwarte X/60" per grupa. Zero sygnału o trudności.

### 2. Co mówi badanie/praktyka

- **Powtórzone czytanie z modelem i feedbackiem** ma istotny wpływ na dekodowanie, płynność i rozumienie — NRP (16 badań w meta-analizie); „repeated reading z feedbackiem > repeated reading samo" ([NICHD/NRP](https://www.nichd.nih.gov/publications/pubs/nrp/findings), [Reading Rockets](https://www.readingrockets.org/topics/curriculum-and-instruction/articles/findings-national-reading-panel)).
- **Echo/paired reading** (model → echo → chóralne → samodzielne): Topping, 155 projektów/71 szkół, ES ≈ 0.87 dokładność, 0.77 rozumienie ([IEJEE PDF](https://files.eric.ed.gov/fulltext/EJ1053797.pdf), [Irish Ed. Studies](https://www.tandfonline.com/doi/full/10.1080/03323315.2021.1927797)).
- **TTS read-along** poprawia rozumienie vs. czytanie ciche — ale **podświetlanie słów nie dodaje istotnej przewagi** ponad samo TTS; różnice indywidualne dziecka ważą więcej niż highlight ([Annals of Dyslexia 2023](https://link.springer.com/article/10.1007/s11881-023-00281-9), [meta-analiza Wood i in.](https://cisl.cast.org/research/read-aloud)).
- **Teksty dekodowalne**: celowo ograniczają wsparcie obrazkowe, żeby dziecko dekodowało zamiast zgadywać z ilustracji ([Reading Rockets](https://www.readingrockets.org/topics/curriculum-and-instruction/articles/what-are-decodable-books-and-why-are-they-important), [Shanahan](https://www.shanahanonliteracy.com/blog/should-we-teach-with-decodable-text-1)).
- **Three-cueing / picture cues**: kierowanie uwagi na obrazek zamiast na literowy ciąg blokuje mapowanie ortograficzne ([EdWeek](https://www.edweek.org/teaching-learning/is-this-the-end-of-three-cueing/2020/12), [Storyshares „Illustrations on Mute"](https://www.storyshares.org/blog/illustrations-on-mute-the-power-of-text-in-decodable-books)).
- **Seductive details / coherence principle** (Mayer; meta-analiza Rey 2012): atrakcyjne, ale nieistotne animacje obniżają retencję (mały–średni ES) i transfer (średni ES) ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10176302/), [Rey/meta](https://theeconomyofmeaning.com/2020/03/02/how-a-cartoon-in-a-textbook-can-hurt-learning-a-new-meta-analysis-of-the-seductive-details-effect/)).
- **Wybór i autonomia** to udokumentowany driver motywacji czytelniczej (Guthrie/Wigfield, CORI; Bains i in. 2026 — sam wybór podnosi motywację) ([QJEP 2026](https://doi.org/10.1177/17470218251370916), [Reading Rockets](https://www.readingrockets.org/reading-motivation)).
- **Metoda sylabowa PL** (Cieszyńska, symultaniczno-sekwencyjna): sekwencja *powtarzanie → rozumienie → nazywanie*; sylaba otwarta przed zamkniętą, samogłoski → CV → zamknięte → zbitki; do każdej partii materiału dołączone zadanie rozumienia ([Centrum Metody Krakowskiej](https://centrummetodykrakowskiej.pl/blog/symultaniczno-sekwencyjna-nauka-czytaniar-teoria/), [UŚ PDF](https://www.sjikp.us.edu.pl/wp-content/uploads/2022/01/Metoda-symultaniczno-sekwencyjna-Jagody-Cieszynskiej-metoda-krakowska-1.pdf)).
- **Krok „powtórz" jest w metodzie obowiązkowy** — u nas intro o nim mówi, ale nic go nie egzekwuje ani nie mierzy (z pamięci + źródło wyżej).
- **ASR do oceny czytania dzieci**: Faster-Whisper osiąga ~.89 zgodności, ale bez forced alignment/confidence maskuje właśnie te błędy, które mają znaczenie; wersje edge/on-device istnieją, ale to duży model w PWA offline ([arXiv 2306.03444](https://arxiv.org/abs/2306.03444), [arXiv 2507.14451](https://arxiv.org/pdf/2507.14451)).
- **Lexend**: istotnie wyższe WCPM vs. Times New Roman u 2-klasistów (p=.014), efekt prawdopodobnie od *spacingu*, nie kroju — dowody słabsze niż marketing, ale kierunek dobry ([Google Design](https://design.google/library/lexend-readability), [Creative Review](https://www.creativereview.co.uk/dyslexia-friendly-fonts-lexend/)).
- **Rozumienie u początkujących**: dopasowanie zdanie↔obrazek i proste opowiedzenie treści to standardowe, tanie miary — bez nich czytanie sylabami zsuwa się w bezmyślne dekodowanie (z pamięci; spójne ze źródłem UŚ wyżej).

### 3. Propozycje ulepszeń

| # | Propozycja | Uzasadnienie | Wpływ | Nakład | Dotyka |
|---|---|---|---|---|---|
| 1 | **Tryb echo „posłuchaj → powtórz → teraz ty"**: 🔊 czyta zdanie, pauza 2–3 s z pulsującą ikoną 🗣, potem następne zdanie | Rdzeń echo/paired reading (ES 0.77–0.87); dziś krok „powtórz" jest tylko w intro | 5 | S | `useReadAloud`, `CzytankaView` |
| 2 | **Tempo czytania całości** (żółw/normalnie/szybko) — mnożnik `playbackRate` + dłuższa pauza między słowami | Powtórzone czytanie działa, gdy tempo pasuje do dziecka; dziś sztywne 450 ms | 4 | S | `useReadAloud`, `AudioBus`, settings |
| 3 | **Licznik tapów/słowo + czas na czytance → raport rodzica** („najczęściej dotykane: WIE-WIÓR-KA") | Zero danych diagnostycznych dziś; tap = naturalny proxy trudności, bez oceniania dziecka | 5 | S | `czytankiStore`, `exporter.ts`, `ReportScreen` |
| 4 | **Przełącznik „scal sylaby"** — te same dane, ale bez wizualnych granic (odstęp 0.12em → 0, jeden kolor) | Cel metody sylabowej to wyjście *poza* sylabę; dziś nie ma ścieżki do słowa jako całości | 4 | S | `CzytankaView`, `SyllableButton` |
| 5 | **Ponowne otwarcie = ta sama czytanka drugi raz**: subtelny licznik „przeczytana 2×" zamiast tylko ⭐ | NRP: powtórzenie *tego samego* tekstu daje płynność; dziś ⭐ nagradza przelecenie 60 nowych | 4 | S | `czytankiStore`, `CzytankaTile` |
| 6 | **Cichsza scena podczas 🔊** — zatrzymanie animacji aktorów, gdy czytamy całość | Coherence principle: animacja rywalizuje o uwagę dokładnie wtedy, gdy tekst jest celem | 3 | S | `CzytankaScene`, `scene.css` |
| 7 | **Mini-pytanie o rozumienie**: po czytance 3 emoji/obrazki, „Kto jadł trawę?" (audio) → tap; bez punktów, tylko 👏 | Krok „rozumienie" u Cieszyńskiej; chroni przed dekodowaniem bez sensu | 5 | M | nowy komponent + dane w `czytanki.ts` |
| 8 | **Nagraj siebie i posłuchaj** (MediaRecorder, lokalnie, bez ASR) — dziecko czyta, odsłuchuje, porównuje z lektorem | Samo-ocena zamiast oceniania; działa offline, brak ryzyka fałszywych werdyktów ASR | 4 | M | nowy hook + `CzytankaView`, uprawnienia mikrofonu |
| 9 | **Serie z powracającymi bohaterami** — Ola/Tata/Burek jako stały skład, 4–5 mini-serii z ikoną serii na liście | Motywacja: znajome postaci + wybór serii; dziś imiona rotują przypadkowo (Ola, Ula, Ela, Tola, Lola) | 4 | M | `czytanki.ts`, `CzytankaList` |
| 10 | **Sugestia „następna dla Ciebie"** — jedna wyróżniona czytanka wg tapów i ukończeń, ale bez blokowania reszty | Adaptacja przy zachowaniu autonomii (Guthrie: wybór > przydział) | 3 | M | `czytankiStore`, `CzytankaList` |
| 11 | **Most z modułu 2 — ułóż zdanie z rozsypanki sylabowej** dla ukończonej czytanki (@dnd-kit, gotowy) | Reużycie sprawdzonej mechaniki, produkcja po recepcji | 3 | L | nowy ekran, `modules/reading` |
| 12 | **Karaoke-highlight sylab podczas 🔊** (aktualna sylaba, nie tylko słowo) | Kuszące, ale badania: highlight nie dodaje przewagi ponad TTS → nisko | 1 | M | `useReadAloud`, timing per sylaba |

### 4. Trzy rzeczy, których NIE robić

1. **Nie dodawać ASR/oceny wymowy** — Whisper bez forced alignment maskuje właśnie błędy, które chcemy złapać, a 7-latek dostałby „źle" za poprawne czytanie; koszt (model w PWA offline) nieproporcjonalny.
2. **Nie robić ze sceny podpowiedzi treści** (np. animacja odgrywająca zdanie na żądanie). To wprost picture cue / three-cueing — obniża dekodowanie. Scena ma być tłem klimatycznym, nie ilustracją-ściągą.
3. **Nie wprowadzać punktów, gwiazdek za szybkość, streaków ani rankingu czasu.** Motywacja czytelnicza karmi się autonomią i ciekawością; ocenianie tempa u dziecka na etapie sylabowania produkuje unikanie. `openedIds` bez ocen to była dobra decyzja — utrzymać.

### 5. Co już jest zgodne z dobrą praktyką

- **Progresja fonologiczna G1→G4** (samogłoski/CV → sylaby zamknięte → dwuznaki i nosówki → zbitki i wyrazy 3-sylabowe) pokrywa się z sekwencją elementarza sylabowego i zasadą tekstów dekodowalnych.
- **Dziecko steruje ziarnistością**: sylaba (tap) / słowo (long-press) / całość (🔊) — dokładnie skala assisted reading od segmentu do modelu tekstu.
- **Brak ocen, tylko „otwarte"** + swobodny wybór 60 kafelków = autonomia (CORI/Guthrie).
- **Typografia**: Lexend, 40–64 px, auto-fit bez scrolla, tap-target 56–60 px, jedno zdanie na wiersz — zgodne z tym, co wiadomo o crowdingu i o czytaniu na ekranie.
- **Sceny są dekoracyjne, nie informacyjne**, tap w aktora nie daje audio, `prefers-reduced-motion` wyłącza ruch — to świadome ograniczenie seductive details.
- **Audio wysokiej jakości dla izolowanych sylab**: `azure-ipa` + własne G2P + ręczne override'y rozwiązują problem, na którym większość apek się wykłada (TTS zgadujący „drze", „bę").
- **Higiena techniczna**: `runId` w read-aloud, `pendingCue`, `replace: true` w nawigacji, stop audio na `visibilitychange` — brak „zombie audio" i śmieci w historii.
# Załącznik E — Warstwa przekrojowa


## 1. Jak działa dziś

1. **Home** (`src/app/Home.tsx`): 4 kafelki 2×2 (196 px, kolor+ikona+przykład), `IskraHero` machająca, strefa rodzica ⚙📊 56×56 w rogu; intro głosowe 1× per moduł w stałej kolejności, każdy tap gra `nav-tap`.
2. **Nawigacja** (`src/shared/ui/KidNav.tsx`, `src/app/App.tsx`): ⬅️/🏠 60 px z cue `nav-back`/`nav-home`, guard na `history.state.idx`; moduły renderują KidNav same.
3. **Sesja**: długość liczona w pytaniach, w każdym module inaczej — `sessionLength` 5/10/15 (tylko Litery), `reading.questionsPerSession` (8), `numbers.questionCount` 6/8/10 (`shared/settings/defaults.ts`). Brak limitu czasu sesji i brak sygnału „na dziś wystarczy".
4. **Pauza**: wspólny ikonowy `PauseOverlay` (z-index 2000, ▶/🏠), audio zatrzymywane przez hook sesji.
5. **Anti-cheat** (`shared/engagement/`): idle 20 s → auto-pauza, `visibilitychange` → auto-pauza; `analyzeSession` daje 6 flag (fast-click, same-position, no-answer, many-dont-know, visibility, long-inactivity).
6. **Nagrody — cztery osobne ekonomie**: „iskierki" = licznik poprawnych, pokazywany tylko na `SessionEnd` i nietrwały; Litery — mastery wall w `LevelSelect.tsx`; Czytanie — album 67 kart + ceremonia co 10 + wild celebration co ~8 pytań; Cyferki — `MasteryTree` (5 etapów 🌱→🌳); Czytanki — „X / 60 otwartych".
7. **Pochwały** (`audio-source/ui-strings.json`, `reading-ui-strings.json`): 12 + 6 fraz, losowane `pickNoRepeat`; wszystkie oceniają wynik („świetnie!", „umiesz!"), zero pochwał procesowych; `streak-3/5/7` dotyczy tylko serii w jednej sesji.
8. **Iskra**: `IskraMascot`/`IskraHero` (Home, Litery, Cyferki) vs osobny `IskraMascotAnimated` (Czytanie); w Czytankach maskotki nie ma. Trzy głosy (Zofia = lektor, Marek = Iskra, Agnieszka = czytanki) — Iskra mówi tylko w modułach 2–3.
9. **Rodzic**: `/settings` (912 linii, ~15 grup kontrolek, dużo per-level) i `/report` za `MathGate` (`a+b−c`, a+b>10, 3 błędy → 60 s cooldown); raport = Litery, Aktywność (14 dni + streak dni), Live, Sugestie (liczone **tylko z liter**), Flagi, Cyferki, Czytanki + eksport MD (`stats/exporter.ts`).
10. **PWA** (`src/main.tsx`): nowa wersja instaluje się cicho, reload dopiero na Home (poller 10 s) — bez komunikatu; brak informacji „działasz offline".
11. **Kolory sylab** (`shared/ui/syllableColors.ts`): #1d4ed8 / #dc2626 / #16a34a / #9333ea — czerwony i zielony sąsiadują, brak dodatkowego kodu poza barwą.
12. **Ruch**: `prefers-reduced-motion` uwzględniony tylko w `IskraMascot`, `IskraHero`, `czytanki/scene.css`; celebracje modułu 2 (RocketBlast, ScreenFlip, RainbowRun…) i `WordScene` animują zawsze.
13. **Profil**: jeden na przeglądarkę, 5 kluczy `localStorage`, reset zbiorczy w SettingsScreen.

## 2. Co mówi badanie/praktyka

- **NN/g** traktuje 6–8 lat („beginner readers") jako osobną grupę: instrukcje z przykładem, duże ikony odwzorowujące realne obiekty, natychmiastowy feedback, brak ozdobników ([NN/g, UX Design for Children 3–12](https://www.nngroup.com/reports/children-on-the-web/), [Kids' Cognition](https://www.nngroup.com/articles/kids-cognition/)).
- **SDT (Deci/Ryan)**: autonomia + kompetencja + relacja; nagrody oczekiwane i materialne podkopują ciekawość (overjustification, Lepper 1973), nagrody nieoczekiwane i słowne szkodzą znacznie mniej ([Deci, Koestner & Ryan 2001](https://journals.sagepub.com/doi/10.3102/00346543071001001), [Wikipedia: overjustification](https://en.wikipedia.org/wiki/Overjustification_effect)).
- **Duolingo ABC świadomie nie daje streaka dzieciom 4–7** — „nie potrzebują presji streaka"; celem jest flow, nie zobowiązanie ([Duolingo blog](https://blog.duolingo.com/a-good-read-building-duolingo-abc-for-android/), [przegląd](https://screenwiseapp.com/guides/duolingo-and-language-learning-apps)).
- **Khan Academy Kids**: audio + ikony zamiast tekstu obniża obciążenie poznawcze pre-readera ([Khan Academy Blog](https://blog.khanacademy.org/supporting-english-language-acquisition-with-khan-academy-kids/)).
- **Sesame Workshop** (76 testów na tabletach): kontrola po stronie dziecka i natychmiastowy feedback okazały się krytyczne; edukacja ma być wpleciona w zabawę ([Best Practices: Touch Tablet, 2012](https://joanganzcooneycenter.org/wp-content/uploads/2020/02/SesameWorkshop-2012.pdf), [Digital Promise](https://digitalpromise.org/2022/05/23/lessons-from-sesame-workshop-leveraging-research-and-learner-testing-for-powerful-edtech/)).
- **Agenci pedagogiczni**: efekt mały, ale istotny i **większy u dzieci K-12**; ryzykiem jest podział uwagi i dodatkowy cognitive load, gdy agent nie niesie treści ([Schroeder, Adesope & Gilbert 2013](https://journals.sagepub.com/doi/10.2190/EC.49.1.a), [meta-analiza cognitive load](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12328452/)).
- **Pochwała procesowa** (Gunderson/Dweck) wiąże się z growth mindsetem, ale efekty są mniejsze i słabiej replikowalne niż w popularnych ujęciach; „dobra robota" bez strategii to „false growth mindset" ([What Can Be Learned from Growth Mindset Controversies](https://pmc.ncbi.nlm.nih.gov/articles/PMC8299535/)).
- **AAP** dla 6+ odchodzi od sztywnego limitu minut na rzecz stałych rodzinnych zasad chroniących sen i ruch, i wprost wskazuje autoplay/nieskończone przewijanie jako wzorce przedłużające sesję ([CHOC/AAP](https://health.choc.org/updated-aap-recommendations-for-screen-time/), [AACAP](https://www.aacap.org/AACAP/Families_and_Youth/Facts_for_Families/FFF-Guide/Children-And-Watching-TV-054.aspx)).
- **Dashboardy/nudge dla rodzica działają, gdy są krótkie i podają jedną akcję**: READY4K! (SMS „jedna rzecz w tym tygodniu") dał +0,11 SD w PALS i +0,31 SD u słabszych dzieci ([Doss i in.](https://cepa.stanford.edu/sites/default/files/One%20Step%20At%20A%20Time%203_1_17_0.pdf), [Evidence for ESSA](https://evidenceforessa.org/program/parentpowered-ready4k/)).
- **Daltonizm czerwono-zielony ~8% mężczyzn**; WCAG 1.4.1 wymaga, by kolor nie był jedynym nośnikiem znaczenia — dokładać kształt/etykietę; palety typu Okabe–Ito są bezpieczne ([AudioEye](https://www.audioeye.com/post/colorblind-friendly-palettes/), [Okabe–Ito](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference)).
- **Rozproszona praktyka** (spacing) bije masowanie także u dzieci; sesje 2× dziennie po 6–8 min > 1× 15 min — to zresztą już jest w Waszych sugestiach dla rodzica (*z pamięci*: Cepeda i in. 2006; Sobel, Cepeda & Kapler 2011).
- **Uwaga 6–7-latka**: heurystyka „2–5 min na rok życia" daje realistycznie 10–20 min skupionej pracy; stąd microlearning i wyraźny koniec zamiast otwartej pętli (*z pamięci*).
- **Polska zerówka** (podstawa programowa wychowania przedszkolnego): celem jest **gotowość** do czytania i pisania — rozpoznawanie liter, synteza sylabowa, nie płynne czytanie; Wasza czwórka modułów mieści się w tym zakresie, a Pochodnia jest już „ponad" (*z pamięci*).
- **PWA offline UX**: użytkownik musi wiedzieć, że wersja się zmieniła i że aplikacja działa bez sieci; cicha aktualizacja bywa mylona z awarią (*z pamięci*, Google Web Fundamentals / workbox „refresh to update").

## 3. Propozycje ulepszeń (ranking)

| # | Propozycja | Uzasadnienie | Wpływ | Nakład | Dotyka |
|---|---|---|---|---|---|
| 1 | **„Plan na dziś"** na Home: 3 kropki (np. Litery 8 pytań → Czytanki 1 → Cyferki 6), generowane z SRS due-dates; tap = start miksu | spacing między dniami + jasny koniec; likwiduje decyzję „co teraz" u nieczytającego | 5 | L | `app/Home.tsx`, nowy `shared/plan/`, store'y modułów |
| 2 | **Stopping cue**: po ukończeniu planu Iskra mówi „na dziś wystarczy", ekran zamyka pętlę, „Jeszcze raz" schodzi na drugi plan | AAP: projektowanie przeciw nieskończonej pętli; ochrona uwagi 6-latka | 5 | S | `*/components/SessionEnd.tsx`, `ui-strings.json` |
| 3 | **Audyt pochwał**: dołożyć ~10 fraz procesowych („słuchałeś do końca", „poprawiłeś się po pomyłce") i mieszać 50/50 z obecnymi | Dweck z zastrzeżeniami: chwal strategię, nie cechę; obecne 18 fraz to sam wynik | 4 | S | `audio-source/ui-strings.json`, `reading-ui-strings.json`, `audio:build` |
| 4 | **Spójna paleta sylab + kod nie-kolorowy**: zamienić #dc2626/#16a34a na parę bezpieczną (np. Okabe–Ito niebieski/pomarańczowy) i dodać podkreślenie/kropkę pod sylabą | 8% chłopców; WCAG 1.4.1 — dziś sylaba 2 i 3 mogą być nieodróżnialne | 4 | S | `shared/ui/syllableColors.ts`, Czytanki, Home |
| 5 | **Raport: „następny krok"** — jedna karta u góry z 1 konkretną akcją na tydzień (jak READY4K!), reszta zwinięta | dashboard zmienia zachowanie tylko gdy jest krótki i akcyjny; dziś 7 sekcji i sugestie liczone wyłącznie z liter | 4 | M | `stats/components/ReportScreen.tsx`, `SuggestionsSection.tsx` (rozszerzyć na wszystkie moduły) |
| 6 | **Jedna ekonomia nagród**: iskierki jako wspólna waluta persistowana; album/drzewko/ściana to jej *widoki*, nie osobne systemy | dziś dziecko zbiera 4 niepowiązane rzeczy; spójny postęp buduje kompetencję (SDT) | 4 | L | 4 store'y, `SessionEnd` ×4, `Home` |
| 7 | **Momenty autonomii**: przed sesją ekran „co dziś?" z 2–3 obrazkowymi wyborami (poziom / typ ćwiczenia / głos Iskry) | autonomia to najtańszy składnik SDT; dziś dziecko wybiera tylko moduł i poziom | 4 | M | level-selecty, `useSession*` |
| 8 | **Ograniczyć `prefers-reduced-motion`**: wspólny hook + guard w celebracjach modułu 2 i `WordScene` | WCAG 2.3.3 / wrażliwość sensoryczna; dziś 14 plików animuje bezwarunkowo | 3 | S | `reading/components/celebrations/*`, `WordScene.tsx` |
| 9 | **Iskra spójna wszędzie**: jeden komponent (`IskraHero`) + obecność w Czytankach; usunąć `IskraMascotAnimated` jako duplikat | persona effect działa, gdy postać jest ta sama i coś wnosi; dziś dwie implementacje i moduł bez maskotki | 3 | M | `shared/ui/`, `reading/components/IskraMascotAnimated.tsx`, Czytanki |
| 10 | **Onboarding rodzica przy 1. uruchomieniu**: 3 ekrany — po co math gate, gdzie raport, „2× 8 min dziennie" | rodzic dziś nie wie, że ⚙📊 istnieją ani co robią; nudge o częstotliwości siedzi tylko w raporcie | 3 | M | nowy `shared/settings/FirstRun.tsx`, `settingsStore` |
| 11 | **Komunikat PWA**: toast „Nowa wersja gotowa — dotknij, by odświeżyć" na Home + ikonka „działa offline" | cicha aktualizacja i cichy offline są nieodróżnialne od awarii | 3 | S | `src/main.tsx`, `app/Home.tsx` |
| 12 | **Multi-profil (2–3 dzieci)**: prefiks kluczy `localStorage` + wybór avatara na Home | rodzeństwo dziś nadpisuje SRS i psuje raport; SRS jest bezużyteczny przy wspólnym profilu | 3 | L | wszystkie store'y (`persist` `name`), `Home`, reset |
| 13 | **Biblioteka SFX**: jeden zestaw pop/ding/whoosh dla tap, correct, wrong, unlock we wszystkich modułach | dziś moduł 2 pożycza SFX modułu 1, część akcji milczy — niespójna „sygnatura dźwiękowa" | 2 | M | `audio-source/`, `AudioBus` konsumenci |
| 14 | **Ujednolicić długość sesji**: jedna kontrolka „ile pytań" (5/8/12) mapowana na wszystkie moduły, per-level tylko jako zaawansowane | 3 różne ustawienia w 3 miejscach SettingsScreen; rodzic nie złoży z tego 10-minutowej sesji | 2 | M | `settings/types.ts`, `defaults.ts`, `SettingsScreen.tsx` |
| 15 | **Flagi anti-cheat po ludzku**: zamienić `fast-click`/`same-position` na zdania („klika bez patrzenia — może zmęczenie?") + próg czasu sesji | rodzic dostaje żargon; flaga bez interpretacji nie zmienia zachowania | 2 | S | `stats/components/AntiCheatSection.tsx`, `exporter.ts` |

## 4. Trzy rzeczy, których NIE robić

1. **Nie dodawać dziennego streaka dla dziecka** (płomienie, „nie strać serii"). Duolingo świadomie wyłącza to poniżej 8 lat; to presja strat, nie motywacja, i wprost uderza w autonomię z SDT. Streak dni zostawić w raporcie rodzica — tam już jest i tam jest na miejscu.
2. **Nie zamieniać iskierek na sklep/skórki kupowane za punkty.** Oczekiwana, materialna nagroda za czynność, którą dziecko robi z ciekawości, to podręcznikowy overjustification. Nagroda ma być nieoczekiwana i związana z treścią (nowa karta w albumie, gałąź drzewka).
3. **Nie rozbudowywać SettingsScreen (już 912 linii) o kolejne per-level suwaki** ani nie „uatrakcyjniać" math gate zabawową formą. Gate ma być nudny i skuteczny; ustawienia potrzebują cięcia, nie dokładania.

## 5. Co już jest zgodne z best practice

- **No-text UI + audio-first**, tap-targety 60 px, „każdy klik mówi co zrobił" — dokładnie linia Khan Kids / NN/g dla pre-readerów.
- **Natychmiastowy feedback i kontrola po stronie dziecka** (tap = skip feedbacku, 🤷 „nie wiem" bez kary) — zasada Sesame Workshop.
- **SRS między sesjami** (`BaseItemState`, `recentWrong`, box) realnie implementuje spacing, a nie tylko losowanie.
- **Anti-cheat jako opieka, nie kara**: idle 20 s i visibility → *pauza*, nie zerowanie wyniku.
- **Math gate** z cooldownem i anty-zapamiętywaniem — prosty, zgodny z praktyką parent-gate.
- **Sugestie dla rodzica** cytują sen, wspólną naukę i „2× dziennie po 6–8 min" — trafnie oparte o literaturę; brakuje im tylko zasięgu poza moduł 1.
- **Reduced motion w maskotce**, self-hosted fonty, offline-first PWA i rozdzielone klucze persist (reset jednego modułu nie kasuje reszty).