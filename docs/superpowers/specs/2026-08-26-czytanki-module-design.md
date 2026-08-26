# Iskierki — Moduł 4: Czytanki (design)

**Data:** 2026-08-26
**Status:** zaakceptowany w brainstormie, do implementacji

## Cel

Swobodne czytanie sylabami dla dziecka, które zna litery i sylaby (po module 2). Dziecko dotyka sylabę → słyszy ją → powtarza. Dotyka słowo (long-press) → słyszy całe słowo. Bez oceniania, bez SRS, bez sesji. 60 czytanek, od 1 zdania z 3 słów do mini-historyjek 5–6 zdań, każda z animowaną sceną emoji.

Nie-cele: układanie zdań, drag-drop, quiz, rozpoznawanie mowy, tracing.

## 1. Architektura

- Nowy moduł `src/modules/czytanki/` — czwarty kafelek na Home (📖). Home przechodzi z gridu 1×3 na 2×2.
- Routes: `/czytanki` (lista), `/czytanki/:id` (czytanka). Nieprawidłowy `:id` → redirect do listy.
- Store `czytankiStore` (Zustand + persist, klucz `iskierki-czytanki-v1`):
  - `seenIntros: Record<string, boolean>` + `hasSeenIntro/markIntroSeen` (jak w innych modułach)
  - `openedIds: string[]` — czytanki, które dziecko otworzyło (⭐ na kafelku, raport rodzica)
  - `lastOpenedId: string | null`
  - `merge` callback z defaultami (wymóg CLAUDE.md)
- Reużywane shared: `audioBus`, `KidNav`, `IskraMascot`, `useTapHandler`, `theme`, `levelIcons`.
- `getSyllableColor` przenosi się z `src/modules/reading/utils/syllableColors.ts` do `src/shared/ui/syllableColors.ts`; moduł 2 importuje z shared (re-export ze starej ścieżki niepotrzebny — aktualizuję importy).
- Raport rodzica (`ReportScreen`): sekcja „Czytanki — otwarte X/60” + lista otwartych tytułów. Eksporter MD: sekcja `## Czytanki`.
- Settings: brak nowych ustawień. Reset w SettingsScreen dostaje dodatkowy przycisk „Reset czytanek”.

## 2. Dane

Plik `src/modules/czytanki/data/czytanki.ts`:

```ts
export type Word = {
  syllables: string[]          // ['KO', 'TA'] — wielkie litery, jak w module 2
  punct?: '.' | '!' | '?' | ','
}
export type Sentence = Word[]

export type Czytanka = {
  id: string                   // 'cz-01' … 'cz-60'
  group: 1 | 2 | 3 | 4
  title: string                // dla rodzica / raportu, np. "Kot taty"
  emoji: string                // ikona kafelka
  sentences: Sentence[]
  scene: SceneSpec             // sekcja 4
}
export const CZYTANKI: readonly Czytanka[]
```

Klucze audio (helpery w `data/audioKeys.ts`, wszystko lowercase):
- sylaba → `cz-syl-<sylaba>` (np. `cz-syl-ko`). Osobny prefix od modułu 2 (`syl-`), żeby moduły były niezależne i głos/ton mógł się różnić; duplikacja ~23 mp3 jest akceptowalna.
- słowo → `cz-word-<słowo>` (sylaby sklejone, np. `cz-word-kota`)
- intro modułu → `czytanki-intro`, nawigacja/ui → `czytanki-ui-*`

Polskie znaki w kluczach: `ą→a_`, `ę→e_`, `ó→o_`, `ł→l_`, `ś→s_`, `ć→c_`, `ń→n_`, `ź→z_`, `ż→z-`. Helper `slugPl()` z testem.

**Generacja źródła TTS:** `scripts/czytanki-audio-source.ts` (uruchamiany przez `pnpm audio:czytanki`, wpięty też przed `audio:build`) przechodzi po `CZYTANKI`, zbiera unikalne sylaby i słowa i zapisuje `audio-source/czytanki.json` (`_voice: zofia`; tekst sylaby lowercase, tekst słowa lowercase). Plik generowany nie jest edytowany ręcznie — stałe stringi UI trzymam w `audio-source/czytanki-ui-strings.json` (ręcznie). Manual override działa jak zwykle.

**Grupy (15 czytanek każda):**

| Grupa | Zdania | Słowa/zdanie | Fonologia |
|---|---|---|---|
| 1 | dokładnie 1 | dokładnie 3 | tylko sylaby otwarte CV (MA, TA, KO…) |
| 2 | 2 | 3–4 | sylaby zamknięte (DOM, KOT, LAS), spójniki I, A |
| 3 | 3–4 | 3–5 | dwuznaki SZ/CZ/RZ/CH/DZ, ę/ą, ó |
| 4 | 5–6 | 3–6 | zbitki (KRO-WA, DRZE-WO), słowa 3-sylabowe |

Zawsze pełne zdania z wielkiej litery i znakiem interpunkcyjnym. Tematyka z życia 7-latka: rodzina, zwierzęta, dom, park, przedszkole, pory roku, jedzenie, zabawki. Podział na sylaby zgodny z polską zasadą (spółgłoska między samogłoskami idzie do następnej sylaby; zbitki dzielone tak, żeby sylaba była wymawialna).

## 3. Ekran czytanki — `CzytankaView`

Layout (bez scrolla, iPad landscape i portrait):
- Góra ~40% wysokości: `CzytankaScene`.
- Dół: tekst. Font Lexend, rozmiar per grupa: 1 → 64px, 2 → 54px, 3 → 46px, 4 → 40px. Każde zdanie w osobnym wierszu (`flex-wrap` w razie potrzeby), wyśrodkowane.
- Każda **sylaba** = `SyllableButton` (plain div, `touch-action: manipulation`, min 60×60 przez padding), kolor z `getSyllableColor(indexWSłowie)`. Odstęp między sylabami 0.15em, między słowami 0.7em. Interpunkcja doklejona do ostatniej sylaby (nieklikalna, kolor tekstu).
- **Tap sylaby** → `audioBus.stop(); audioBus.play('cz-syl-x')` + animacja bounce 250 ms.
- **Long-press (≥500 ms) na sylabie** → `audioBus.stop(); play('cz-word-xxx')`, wszystkie sylaby słowa dostają highlight (tło żółte, 600 ms). Implementacja w hooku `useSyllablePress` (pointerdown → timer; pointerup przed 500 ms = tap; ruch >10px = anuluj). Bez `useTapHandler` bo ten nie obsługuje long-press.
- **Przycisk „▶” (czytaj całość)** — 72×72, prawy dolny róg nad KidNav. Czyta słowo po słowie (`cz-word-*` sekwencyjnie przez `await audioBus.play`), aktualne słowo podświetlone; między zdaniami pauza 600 ms. Ponowny tap = stop. Tap sylaby podczas czytania = stop i normalna obsługa.
- **Strzałki ◀ ▶** (60×60, boki ekranu, na wysokości sceny) — poprzednia/następna czytanka w kolejności `CZYTANKI`. Audio cue `czytanki-ui-next` / `-prev` („następna czytanka”). Na skrajach ukryte.
- Wejście na czytankę: `markOpened(id)`, `audioBus.stop()`, jeśli `!hasSeenIntro('czytanka-first')` → play `czytanki-intro` („Dotknij sylabę, a ja ją przeczytam. Ty powtórz. Przytrzymaj, a przeczytam całe słowo!”).
- Page visibility hidden → `audioBus.stop()` i przerwanie „czytaj całość”. Bez idle-pauzy.
- KidNav: wstecz → `/czytanki`, home → `/`.

## 4. Sceny — `CzytankaScene`

```ts
export type BgKind = 'sky' | 'room' | 'meadow' | 'forest' | 'beach' | 'night' | 'snow' | 'kitchen'
export type AnimKind = 'bob' | 'sway' | 'pulse' | 'wiggle' | 'float' | 'none'
export type Actor = { emoji: string; x: number; y: number; size: number; anim: AnimKind; delay?: number }
export type SceneSpec = { bg: BgKind; actors: Actor[] }   // x,y w % sceny, size w px
```

- `data/backgrounds.tsx` — 8 tł jako inline SVG (`viewBox 0 0 100 60`, `preserveAspectRatio="xMidYMid slice"`): gradient + 2–3 dekoracje (słońce/chmurki/trawa/okno/choinki/fale/gwiazdy/płatki/blat kuchenny). Dekoracje mają własne wolne animacje (chmurki dryfują, gwiazdy migają).
- 6 keyframes w `scene.css` (importowany raz): `bob` (góra-dół 6px, 2 s), `sway` (rotate ±6°, 3 s), `pulse` (scale 1↔1.08, 2 s), `wiggle` (rotate ±10° szybko, 0.8 s co 4 s), `float` (przesunięcie po ósemce, 6 s), `none`.
- Tap w aktora → klasa `.poke` (scale 1.3 + rotate, 500 ms), bez audio.
- `prefers-reduced-motion` → animacje wyłączone.
- Kafelek listy pokazuje `emoji` czytanki na tle w kolorze grupy (paleta poziomów: żółty/pomarańcz/czerwony/róż).

## 5. Lista — `CzytankaList`

- Nagłówek z `IskraMascot` + tytuł-ikona 📖. Onboarding 1×: `czytanki-list-intro` („Wybierz czytankę!”).
- 4 sekcje, każda z nagłówkiem = ikona poziomu z `levelIcons` (✨/🔆/🔥/pochodnia) + gwiazdki trudności (1–4 ⭐, jak w innych LevelSelect).
- Grid kafelków: `repeat(auto-fill, minmax(140px, 1fr))`. Kafelek 140×140: emoji 64px, tło koloru grupy, w rogu ⭐ jeśli w `openedIds`. Bez tekstu.
- Ekran przewijalny (jedyny wyjątek od „bez scrolla” — 60 kafelków). `scrollbar-gutter: stable`. Po powrocie z czytanki przewija do `lastOpenedId` (`scrollIntoView({ block: 'center' })`).
- Tap kafelka → audio `czytanki-ui-open` (krótki „klik”) + navigate.

## 6. Audio — podsumowanie plików

- `audio-source/czytanki.json` — generowany (sylaby + słowa), ~150 + ~250 pozycji.
- `audio-source/czytanki-ui-strings.json` — ręczny: `czytanki-intro`, `czytanki-list-intro`, `czytanki-ui-next`, `czytanki-ui-prev`, `czytanki-ui-open`, `home-czytanki-intro` („Tu są czytanki — możesz czytać sylabami!”).
- Wszystko głos Zofia. Po buildzie `pnpm audio:check` musi być zielony.
- Ryzyko: pojedyncze sylaby zamknięte/zbitki TTS może czytać dziwnie (np. „PSA”, „DRZE”). Po buildzie odsłuch próbki; złe → manual override.

## 7. Testy (minimum)

- `czytanki.test.ts`: 60 pozycji, unikalne id `cz-NN`, 15 na grupę, grupa 1 = 1 zdanie × 3 słowa, każde słowo ≥1 sylaba niepusta, każde zdanie kończy się `punct`, aktorzy sceny w zakresie 0–100.
- `audioKeys.test.ts`: `slugPl`, klucze lowercase, brak niedozwolonych znaków.
- `czytankiStore.test.ts`: `markOpened` idempotentne, `merge` daje defaulty.
- Reszta — test w przeglądarce (chrome-devtools-mcp, viewport iPad).

## 8. Pliki

```
src/modules/czytanki/
├── index.tsx                   # routes
├── store/czytankiStore.ts
├── data/czytanki.ts            # 60 czytanek
├── data/audioKeys.ts           # slugPl, syllableKey, wordKey
├── data/backgrounds.tsx        # 8 tł SVG
├── data/scene.css
├── hooks/useSyllablePress.ts
├── hooks/useReadAloud.ts       # „czytaj całość”
├── components/CzytankaList.tsx
├── components/CzytankaTile.tsx
├── components/CzytankaView.tsx
├── components/SyllableButton.tsx
├── components/CzytankaScene.tsx
scripts/czytanki-audio-source.ts
audio-source/czytanki-ui-strings.json
src/shared/ui/syllableColors.ts   # przeniesione
```

Zmiany w istniejących: `App.tsx` (route + reset), `Home.tsx` (4. kafelek, grid 2×2, intro), `ReportScreen` + eksport MD, `SettingsScreen` (reset), `package.json` (`audio:czytanki`), `CLAUDE.md` + `docs/STATUS.md`.
