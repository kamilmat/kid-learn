# Audio source

Mapy klucz → tekst, z których `scripts/generate-audio.ts` produkuje pliki
`public/audio/<klucz>.mp3` przy użyciu Edge TTS (`pl-PL-ZofiaNeural`).

## Struktura

- `letters.json` — fonemy 32 polskich liter
- `words.json` — słowa-asocjacje + wymowy "X jak Y"
- `ui-strings.json` — pochwały, korekty, cues, nawigacja, onboarding, koniec sesji
- `manual-overrides/<klucz>.mp3` — ręczne nagranie nadpisujące TTS dla danego klucza

## Wymagania

```bash
pip install edge-tts        # CLI Pythona, używane przez generator
pnpm install                # tsx jest devDep
```

## Komendy

```bash
pnpm audio:build            # generuje brakujące/zmienione (idempotentnie)
pnpm audio:check            # weryfikuje kompletność (exit 1 jeśli brakuje)
```

Generator hashuje tekst (SHA-256) i zapisuje hash w `public/audio/.manifest.json`.
Zmiana tekstu w JSON-ie ⇒ następny `audio:build` przegeneruje tylko dotknięte klucze.

## Manualne nadpisanie dźwięku

Połóż własny plik `manual-overrides/<klucz>.mp3` (np. `manual-overrides/letter-b.mp3`)
i uruchom `pnpm audio:build`. Override jest kopiowany do `public/audio/`
i oznaczany w manifeście jako `source: "override"`.

## Głosy PL w Edge TTS

- `pl-PL-ZofiaNeural` — domyślny w Iskierkach (kobiecy, ciepły)
- `pl-PL-MarekNeural` — męski
- `pl-PL-AgnieszkaNeural` — alternatywny kobiecy

Aby zmienić głos, edytuj stałą `VOICE` w `scripts/generate-audio.ts`.
