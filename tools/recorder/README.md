# Iskierki — Audio Recorder

Standalone'owe narzędzie deweloperskie do nagrywania plików audio projektu (literek, słów, asocjacji, ui-strings) jednolitym ludzkim głosem zamiast TTS Zofia.

## Wymagania

- **Chrome / Chromium-based browser** (Edge, Brave, Arc) — Safari nie obsługuje File System Access API
- Mikrofon
- `python3` (do prostego HTTP servera; alternatywnie `npx serve` / `php -S`)
- `ffmpeg` w PATH (`brew install ffmpeg`) — tylko do kroku konwersji do MP3

## Uruchomienie

Z roota repo:

```bash
pnpm dev:recorder
```

Otwórz `http://localhost:8080` w Chrome.

## Workflow

1. **Wybierz folder docelowy** — klik "Wybierz folder", wskaż `kid-learn/audio-source/manual-overrides/`. Chrome zapyta o pozwolenie na zapis. Klucze, dla których plik już istnieje, dostaną status ✅.

2. **Filtruj** (opcjonalnie) — wybierz grupę (Litery / Słowa / Asocjacje / UI) i/lub zaznacz "tylko nieskończone".

3. **Wybierz klucz** — klikiem w listę po lewej lub strzałkami ↑/↓ ←/→.

4. **Nagraj** — Spacja = start, mów (obserwuj VU meter), Spacja = stop. Pojawia się preview audio.

5. **Zapisz lub powtórz** — Enter = zapisz (plik leci do folderu jako `<klucz>.webm`, recorder skacze na następny nieskończony klucz), R = nagraj jeszcze raz.

## Skróty klawiaturowe

| Klawisz | Akcja |
|---|---|
| Spacja | Start / Stop nagrywania |
| Enter | Zapisz (po preview) |
| R | Nagraj jeszcze raz (po preview) |
| ↓ / → | Następny klucz |
| ↑ / ← | Poprzedni klucz |

## Po nagraniu — konwersja do MP3

WebM jest formatem nagrywania w przeglądarce. Aby pliki były używane przez apkę, trzeba skonwertować do MP3:

```bash
pnpm audio:convert-overrides   # tworzy .mp3 obok .webm (idempotentne)
pnpm audio:build               # kopiuje override mp3 → public/audio/, manifest update
pnpm dev                       # apka brzmi nowymi nagraniami
```

## Re-nagrywanie

Klucz, który chcesz przenagrać:
1. W recorderze: klik klucza → R (jeśli był w preview) lub po prostu nagraj ponownie i zapisz — plik się nadpisze
2. `pnpm audio:convert-overrides` — wykryje że WebM jest nowszy niż MP3 i przekonwertuje
3. `pnpm audio:build` — manifest zaktualizuje się

## Troubleshooting

**"Brak dostępu do mikrofonu"** — w Chrome: ustawienia → prywatność → mikrofon → dodaj `localhost` jako dozwolone.

**"Błąd zapisu"** — sprawdź czy wybrałeś folder z prawami zapisu, czy Chrome nie utracił handle (po dłuższej bezczynności może wymagać ponownego wyboru).

**Niska jakość nagrania** — sprawdź VU meter. Jeśli pasek jest słaby (zielony tylko), podejdź bliżej do mikrofonu lub zmień mikrofon w preferencjach systemowych.

**Cisza na początku/końcu nagrania** — otwórz `.webm` w Audacity, wytnij ciszę, wyeksportuj jako `.webm` z powrotem do `manual-overrides/`. Następnie `pnpm audio:convert-overrides`.
