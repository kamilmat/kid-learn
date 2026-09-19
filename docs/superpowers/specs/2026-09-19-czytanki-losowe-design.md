# Czytanki: duża pula + tryb „losowo” (2026-09-19)

## Problem

Dziecko zapamiętuje czytanki. Zwłaszcza te krótkie z grupy 1 rozpoznaje po kafelku i obrazku, a potem „czyta” z pamięci, nie próbując składać sylab. Na 100 czytankach, które dziecko przerabia wielokrotnie, pamiętanie jest łatwiejsze niż czytanie.

## Cel

1. **Pula ~2000 czytanek** (500 na grupę): obecne 100 plus ~1900 nowych, ułożonych zawczasu przez model. Wszystkie mają być poprawne po polsku i sensowne, a każdy poziom ma zachować dzisiejsze reguły trudności.
2. **Przełącznik 🎲 w module Czytanki** z dwoma trybami:
   - **„wszystkie”** (domyślny): lista wszystkich czytanek ze stronicowaniem.
   - **„losowo”**: dziecko wybiera poziom, a aplikacja podaje czytanki z potasowanej talii tego poziomu. Zdanie nie wraca, dopóki nie padną wszystkie inne z poziomu.
3. **Obecne 100 czytanek zostaje bez zmian.** Mają te same id, sceny, pytania i nagrane pytania `cz-q-*`.

## Nie-cele

- Generowanie zdań w runtime (gramatyka w przeglądarce).
- Osobny moduł na Home.
- Nowe nagrania pytań `cz-q-*` dla nowych czytanek. Pytanie składa się z nagrań słów, patrz niżej.
- Punkty, serie, liczniki widoczne dla dziecka (zasada z Fali 2).

## Treść

### Słownik (lexicon) jako budżet nagrań

Nowe czytanki powstają **wyłącznie ze słownika** około 1500 form wyrazowych: 407 już nagranych plus ~1100 nowych.

- Każda forma ma jeden, ustalony podział na sylaby.
- Test pilnuje, żeby to samo słowo miało ten sam podział we wszystkich 2000 czytankach.
- Świadomy kompromis: dziecko ma czytać **te same słowa w wielu różnych zdaniach**, więc powtarzalność słownictwa pomaga (rozpoznaje wyraz, a nie zdanie).
- Ograniczony słownik ogranicza też koszt audio: ~1100 słów × ~12 KB, czyli ~13 MB, plus nowe sylaby.

### Reguły grup (jak w obecnych czytankach, egzekwowane testem dla nowych)

| Grupa | Zdania | Słów w zdaniu | Sylaby |
|---|---|---|---|
| 1 | 1 | 3 | tylko otwarte CV (`/^[BCDFGHJKLŁMNPRSTWZ]?[AEIOUYÓ]$/`) |
| 2 | 2 | 3–4 | zamknięte dozwolone |
| 3 | 3–4 | 3–5 | dwuznaki, ę/ą/ó |
| 4 | 5–6 | 3–6 | słowa 3-sylabowe, zbitki |

### Zapis danych

Nowe czytanki trafiają do `data/generated/g1.ts` … `g4.ts` w zwartym formacie tekstowym. Parsuje go `data/compact.ts`:

```
['101', 'room', '🧔 🍦 👩', 'TA-TA MA LO-DY.', 'CO MA TA-TA?', '🍦 🍭 🍪', 0, '🍦']
// id-numer, tło, emoji sceny, tekst z podziałem na sylaby, pytanie (z podziałem), 3 opcje, indeks odpowiedzi, [emoji kafelka]
```

- Scenę (x, y, size, anim, delay) liczy deterministycznie `layoutScene(emoji[], seed)`. Nikt nie układa ręcznie tysięcy scen.
- `title` (dla rodzica, aria-label) to pierwsze zdanie zapisane zwykłą pisownią.
- Emoji kafelka: jawne albo pierwsze emoji sceny.
- Pytanie jest zapisane z podziałem na sylaby tylko po to, żeby jego słowa podlegały tym samym testom słownika i nagrań.

### Pytania ❓ nowych czytanek

Nowe czytanki odtwarzają pytanie jako sekwencję nagrań słów `cz-word-*` („Kto” + „je” + „maliny”). Nie dostają osobnego klucza `cz-q-NNNN`, bo 1900 osobnych nagrań to ~32 MB i ~1,7 h buildu Azure. Czytanki 1–100 zostają przy `cz-q-*`. Obowiązują te same reguły co dziś:
- 3 różne emoji;
- ≥1 dystraktor widoczny w scenie (anty-three-cueing);
- poprawna odpowiedź w scenie albo na kafelku;
- ≤5 słów, bez przeczeń;
- równy rozkład indeksu odpowiedzi.

## UI

### Lista, tryb „wszystkie”

- Nagłówek: Iskra, 📖, licznik `otwarte / wszystkie`, przełącznik 🎲 (64 px, `aria-pressed`).
- Pod nim 4 zakładki poziomów (`LevelIconView` + gwiazdki, ≥60 px), aktywna podświetlona.
- Siatka kafelków jednej strony. Rozmiar strony (kolumny × wiersze) wynika z pomiaru kontenera, bez przewijania.
- Strzałki ◀ ▶ (72 px) zmieniają stronę, każda z komunikatem głosowym. Wskaźnik strony to kropki, nie cyfry. Przy >12 stronach zamiast kropek jest pasek postępu.
- Przy powrocie z czytanki lista otwiera zakładkę i stronę z `lastOpenedId`.
- ◀ ▶ w widoku czytanki działają jak dziś (kolejność w `CZYTANKI`).

### Lista, tryb „losowo”

- Ten sam nagłówek z 🎲 podświetlonym. Zamiast siatki są 4 duże przyciski poziomów.
- Tap w poziom otwiera `/czytanki/<id>?los=<grupa>`, gdzie `id` to następna czytanka z talii poziomu.
- W widoku czytanki z `?los` ◀ jest ukryte, a ▶ losuje następną czytankę z talii (cue „Następna czytanka.”).
- **Scena jest zakryta, dopóki dziecko nie przeczyta tekstu** (ten sam dowód co dla ❓: całe ▶ albo 60% dotkniętych sylab). Tło widać od początku, aktorzy pojawiają się po przeczytaniu. W trybie „wszystkie” scena działa jak dziś.

### Audio (nowe klucze UI, Agnieszka, `azure`)

- `czytanki-ui-random-on`: „Losuję czytanki.”
- `czytanki-ui-random-off`: „Wszystkie czytanki.”
- `czytanki-ui-page-next` / `czytanki-ui-page-prev`: „Następna strona.” / „Poprzednia strona.”
- `czytanki-ui-level-1..4`: „Najłatwiejsze.” / „Łatwe.” / „Trudniejsze.” / „Najtrudniejsze.”
- `czytanki-random-intro` (raz): „Wybierz poziom, a ja wylosuję ci czytankę.”
- `czytanki-ui-picture`: „Brawo! Zobacz obrazek.”, gdy scena się odsłania.

## Talia (rotacja bez powtórek)

`czytankiStore` (v4) zapisuje `decks: Record<grupa, { order: string[]; pos: number }>`.

- `drawNext(group)`: zwraca `order[pos]` i przesuwa `pos`. Gdy talia jest wyczerpana, pusta albo `order` nie zgadza się z pulą grupy, buduje nową talię.
- **Budowa talii:** ważone tasowanie Efraimidis–Spirakis (`key = u^(1/w)`). Waga czytanki: `1 + min(2, suma dotknięć jej słów w historii / 5)`. Czytanki ze słowami, na które dziecko klika, trafiają bliżej początku, ale każda pada raz na rundę.
- **Szew między rundami:** żadna z ostatnich `K = min(50, ⌊n/4⌋)` czytanek poprzedniej rundy nie może znaleźć się w pierwszych `K` nowej. Kolizje trafiają na koniec.
- **Pogodzenie z pulą:** id nieistniejące wypadają, nowe dochodzą na losowe pozycje w reszcie talii.
- Czytanie w trybie losowym liczy się do `readCounts`, ⭐ i statystyk tak samo jak w trybie „wszystkie”.

Przełącznik trybu żyje w `settings.czytanki.randomMode` (settings v8, default `false`), obok pozostałych przełączników czytanek.

## Audio i offline

- `pnpm audio:czytanki` generuje słowa i sylaby z całej puli, tak jak dziś.
- Czytanki >100 nie trafiają do `czytanki-questions.json`.
- Precache PWA rośnie o ~15–20 MB (do ~35–40 MB). Mieści się.
- Push nagrań idzie paczkami ≤1 MB (sieć usera zrywa większe uploady).
- **Do odsłuchu przez usera:** nowe sylaby (`azure-ipa`). Nowe słowa (`azure`, plain) czytają się poprawnie z ortografii.

## Testy

- Dane: 500 czytanek na grupę, unikalne id, reguły grup, jeden podział sylab na formę, każde słowo i sylaba w manifeście audio, unikalne teksty, reguły pytań.
- Talia: brak powtórek w rundzie, szew K, pogodzenie z pulą, ważenie.
- Migracje: `czytanki` v3→v4 (`decks`), settings v7→v8 (`randomMode`).
