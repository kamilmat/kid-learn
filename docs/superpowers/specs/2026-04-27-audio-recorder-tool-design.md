# Iskierki — narzędzie deweloperskie do nagrywania audio

**Data:** 2026-04-27
**Powiązane:** [`memory/project_audio_voice_consistency.md`](../../../../.claude/projects/-Users-kamilmat87-kid-learn/memory/project_audio_voice_consistency.md), `scripts/generate-audio.ts`, `audio-source/`
**Status:** zaakceptowany w brainstormie, czeka na writing-plans

## Cel

Stworzyć standalone'owe narzędzie deweloperskie (`tools/recorder/`) pozwalające user'owi nagrać **wszystkie pliki audio projektu jednym głosem**, klucz po kluczu, z gotowymi promptami tekstowymi i auto-zapisem do `audio-source/manual-overrides/`. Cel pedagogiczny: zastąpić TTS Zofia (kobiecy, syntetyczny) jednolitym, ludzkim głosem (męski, user) — w tym fonetyczne **głoski** (polska metoda głoskowa, "literki jak się czyta") których syntezator nie potrafi wymówić.

## Motywacja

Obecny stan audio dla literek (`letter-X` w `audio-source/letters.json`) to mieszanka fonetycznych prób ("by", "cy", "śśśii") generowanych przez Edge TTS Zofia. Dziecko czasem nie rozumie, którą literkę kliknąć — niektóre brzmią niespójnie i niewystarczająco wyraźnie. TTS strukturalnie **nie wymówi czystego fonemu** ([b], [p], [ɕ]) — czyta zapis literowy jako słowo lub nazwę litery.

Próba znalezienia gotowego zbioru polskich głosek na licencji do redystrybucji (Wikimedia Commons, Wiktionary, Lingua Libre, polskinawynos.com) **nie powiodła się**:
- Wikimedia ma głównie wymowy całych słów; pojedyncze głoski rzadko, niekompletnie, różni autorzy.
- Wiktionary/Lingua Libre dla polskich liter to głównie nagrania Olafa — odrzucone wcześniej (`memory/project_audio_voice_consistency.md`) bo miks z TTS Zofia był jakościowo zły.
- Komercyjne kursy / Forvo — copyright, niemożliwe do hostowania.

User zdecydował: **nagrać wszystko sam**, jednolitym głosem, dla wszystkich kluczy projektu (~145 plików). Aby to zrobić ergonomicznie, potrzebne jest narzędzie nagrywające per-klucz, z auto-zapisem i prompterem.

## Decyzje (zaakceptowane w brainstormie)

1. **Standalone HTML, poza apką.** Recorder nie wchodzi do `src/`, nie jest częścią produkcyjnego buildu, nie jest dostępny z UI dziecka. Lokalizacja: `tools/recorder/`.
2. **Vanilla HTML + JS, bez framework'a, bez build steppu.** Otwierasz w Chrome — działa.
3. **Generic — czyta `audio-source/*.json`.** Nie zna z góry zbioru kluczy; dla każdego nowego JSON'a (np. `digits.json` w przyszłym module) recorder automatycznie pokaże nowe klucze do nagrania. Reusable charakter.
4. **Format nagrania: WebM/Opus** (natywny output `MediaRecorder`, najwyższa jakość out-of-the-box, zero zewnętrznych bibliotek). Konwersja do MP3 batch-em przez `ffmpeg` po stronie projektu, jednorazowo po nagraniach.
5. **Save flow: File System Access API.** User wskazuje folder docelowy raz na sesję; każde zatwierdzone nagranie zapisuje się bezpośrednio jako `<klucz>.webm` w `audio-source/manual-overrides/`. Zero downloadów, zero przeciągania.
6. **Chrome only.** Safari nie obsługuje File System Access API. Akceptujemy ograniczenie — to narzędzie dev, nie produkcyjne. Brak fallbacku download (świadomy YAGNI — patrz "Co jest poza zakresem").
7. **Cały audio-stack jednogłosowy.** User nagrywa wszystkie 145 kluczy (32 litery + 32 słowa + 31 asocjacji + ~50 ui-strings + 2 SFX zostają jak są). Memory: TTS Zofia tylko fallback dla NOWYCH kluczy bez override.
8. **Zachowujemy istniejący pipeline.** `scripts/generate-audio.ts` bez zmian dla MP3 override (już to obsługuje). Konwersja WebM→MP3 jest krokiem ręcznym przed `pnpm audio:build`, nie automatyczną częścią pipeline'u.

## Architektura

### Struktura plików

```
tools/recorder/
  ├── index.html        # struktura UI, link do recorder.js i recorder.css
  ├── recorder.js       # MediaRecorder + File System Access API + state
  ├── recorder.css      # proste, czytelne style
  └── README.md         # jak uruchomić, wymagania (Chrome, ffmpeg)
```

### Komponenty (logiczne, nie React — vanilla)

**1. Source loader.** Przy starcie `fetch('../../audio-source/letters.json')`, `words.json`, `ui-strings.json`. Łączy w jedną listę obiektów `{ key, text, group }`, gdzie `group` wyznacza się z nazwy pliku (np. `letters.json` → grupa "Litery"). Duplikaty kluczy w różnych plikach → błąd (taki sam invariant jak w `generate-audio.ts`).

**2. Folder picker.** Przycisk "Wybierz folder docelowy" → `window.showDirectoryPicker({ mode: 'readwrite' })`. Handle zapisany w pamięci sesji (nie persistowany — przy reloadzie trzeba wybrać ponownie, bo Chrome wymaga nowego user-gesture).

**3. Status scanner.** Po wyborze folderu iteruje przez `dirHandle.values()` i sprawdza, które klucze mają już istniejące pliki (`<klucz>.webm` lub `<klucz>.mp3`). Update statusu UI.

**4. Recorder.** `navigator.mediaDevices.getUserMedia({ audio: true })` → `MediaRecorder` z `mimeType: 'audio/webm;codecs=opus'`. Start/stop kontrolowane przez UI. Po stop → `Blob` → preview przez `<audio>` (URL.createObjectURL).

**5. VU meter.** Web Audio API: `AudioContext` → `MediaStreamAudioSourceNode` → `AnalyserNode` → `getByteFrequencyData()` w `requestAnimationFrame`. Renderowane jako pasek (CSS bar z height = średnia amplituda). Cel: widzisz że mikrofon żyje, że poziom nie jest zbyt niski/wysoki.

**6. Save handler.** Po zatwierdzeniu (Enter / "Zapisz"): `dirHandle.getFileHandle(`${key}.webm`, { create: true })` → `createWritable()` → `write(blob)` → `close()`. Update statusu na ✅.

**7. Keyboard handler.** `Spacja` = toggle start/stop, `Enter` = zapisz + następny, `R` = ponów (skasuj nagranie, wróć do start), `←/→` = nawigacja. Wszystkie skróty działają tylko gdy nie jest aktywny `<input>` (na wszelki wypadek — recorder nie ma input'ów, ale defensywnie).

### UI (jeden ekran)

```
┌──────────────────────────────────────────────────────────────────┐
│ Iskierki — Audio Recorder                                         │
│ Folder: audio-source/manual-overrides/  [Zmień]                   │
│ Postęp: 12 / 145  [████████░░░░░░░░░░] 8%                         │
├──────────────────────────────────────────────────────────────────┤
│ [Wszystkie] [Litery] [Słowa] [Asocjacje] [UI]   [✓ tylko nieskończone] │
├──────────────────────┬───────────────────────────────────────────┤
│ ┌─ Litery ─────────┐ │                                           │
│ │ ✅ letter-a   "a"│ │     ┌─────────────────────────────────┐   │
│ │ ✅ letter-b   "b"│ │     │                                  │   │
│ │ ⏺ letter-c   "c"│ │     │  Klucz:  letter-c                │   │
│ │ ⬜ letter-d   "d"│ │     │                                  │   │
│ │ ⬜ letter-e   "e"│ │     │  Tekst:  c                       │   │
│ │ ...              │ │     │  (źródło: audio-source/letters)  │   │
│ └──────────────────┘ │     │                                  │   │
│ ┌─ Słowa ─────────┐ │     │   ▓▓▓▓▓▓░░░░░░  (VU meter)       │   │
│ │ ⬜ word-arbuz    │ │     │                                  │   │
│ │ ⬜ word-balon    │ │     │   🎤 Start (Spacja)               │   │
│ │ ...              │ │     │                                  │   │
│ └──────────────────┘ │     │  Po nagraniu pojawia się:        │   │
│ ...                  │     │   ▶ Preview  ✅ Zapisz (Enter)    │   │
│                      │     │              🔄 Ponów (R)         │   │
│                      │     │                                  │   │
│                      │     └─────────────────────────────────┘   │
└──────────────────────┴───────────────────────────────────────────┘
```

**Lewa strona:** lista kluczy, grouped, scrollowalna. Każdy element pokazuje status (✅ / ⏺ / ⬜), klucz, tekst (z JSON-a) skrócony. Klik = wybór tego klucza jako aktywnego.

**Prawa strona:** aktywny klucz. Prompter pokazuje **klucz** (np. `letter-c`) i **tekst z JSON-a** (np. `c`). Recorder NIE generuje własnych hintów typu "powiedz głoskę [c]" — user wie z brainstormu i kontekstu, jak nagrywać dany klucz (np. dla `letter-X` to głoska, dla `assoc-X` to fraza "X jak Y"). Mikrofon-meter. Przyciski/skróty: Start/Stop, preview, Save, Retry. Po zapisie: auto-skok na następny nieskończony klucz (chyba że user kliknął konkretny).

### Stan (in-memory, nie persistowany do localStorage)

```js
{
  dirHandle: FileSystemDirectoryHandle | null,
  keys: [{ key, text, group, status: 'unrecorded' | 'recorded' | 'recording' | 'preview' }, ...],
  activeKey: string | null,
  mediaStream: MediaStream | null,
  mediaRecorder: MediaRecorder | null,
  currentBlob: Blob | null,
  filterGroup: 'all' | 'Litery' | 'Słowa' | 'Asocjacje' | 'UI',
  filterUnrecorded: boolean,
}
```

Status `recorded` ustawiany **z dwóch źródeł**: po zapisaniu w sesji (lokalna zmiana) ORAZ przy starcie (skan folderu). Nie zachowujemy info o nagranych plikach w localStorage — folder docelowy jest źródłem prawdy.

### Integracja z istniejącym pipeline'em

**Brak zmian w `scripts/generate-audio.ts`.** Pipeline już obsługuje override:
- Override `<klucz>.mp3` w `audio-source/manual-overrides/` → kopiuje do `public/audio/<klucz>.mp3`, manifest `source: 'override'`.

**Wymagany dodatkowy krok:** konwersja WebM → MP3.

Wprowadzamy nową komendę `pnpm audio:convert-overrides` (lub `pnpm audio:webm-to-mp3`) w `package.json` — uruchamia skrypt:

```bash
# scripts/convert-overrides.sh (lub TS równoważnik)
for f in audio-source/manual-overrides/*.webm; do
  out="${f%.webm}.mp3"
  if [ ! -f "$out" ] || [ "$f" -nt "$out" ]; then
    ffmpeg -i "$f" -codec:a libmp3lame -qscale:a 2 -ar 44100 -ac 1 "$out"
  fi
done
```

Idempotentny — pomija pliki gdzie .mp3 już istnieje i jest nowsze niż .webm. Jakość: VBR Q=2 (~190kbps), mono, 44.1kHz — odpowiednie dla mowy, mały rozmiar.

**Workflow użytkowy:**
1. `pnpm dev:recorder` (lub `cd tools/recorder && python3 -m http.server 8080`) — uruchamia recorder
2. User nagrywa N kluczy → pliki `.webm` w `manual-overrides/`
3. `pnpm audio:convert-overrides` — konwersja batch do MP3
4. `pnpm audio:build` — kopiuje MP3 do `public/audio/`, aktualizuje manifest
5. `pnpm dev` — apka brzmi nowym głosem

**`.gitignore`:** dodać `audio-source/manual-overrides/*.webm` (nie commitujemy źródłowych WebM — tylko skonwertowane MP3 idą do repo, bo to one są używane przez build). Decyzja: WebM trzymamy lokalnie tylko do ewentualnej re-konwersji w lepszej jakości.

## Konfiguracja środowiska

**Wymagane:**
- Chrome / Chromium-based browser (Edge, Brave, Arc) — File System Access API
- Mikrofon (wbudowany Maca lub zewnętrzny — recorder pokaże VU, sam zdecydujesz po jakości)
- `python3` (do `python3 -m http.server`) lub równoważny prosty HTTP server (`npx serve`, `php -S`)
- `ffmpeg` w PATH (`brew install ffmpeg`) — do konwersji WebM→MP3

**Niewymagane:**
- Node.js / pnpm dla samego recordera (vanilla, no build)
- Żadne biblioteki npm w `tools/recorder/`

## Workflow użytkownika (end-to-end)

1. `cd tools/recorder && python3 -m http.server 8080`
2. Otwórz http://localhost:8080 w Chrome
3. Klik "Wybierz folder docelowy" → wskaż `kid-learn/audio-source/manual-overrides/`
4. (Opcjonalnie) Filtruj: "tylko nieskończone" + grupa "Litery"
5. Recorder pokazuje pierwszą literę. Spacja → mów głoskę → Spacja → preview → Enter (zapisuje, skacze dalej) **albo** R (nagrywam ponownie)
6. Powtórz dla wszystkich kluczy. Możesz przerwać i wrócić — folder jest źródłem prawdy.
7. Po zakończeniu (lub w trakcie, na próbę): `pnpm audio:convert-overrides && pnpm audio:build && pnpm dev`
8. Słuchasz w apce, jeśli któraś brzmi źle → wracasz do recordera, klikasz tę literę, R, nagrywasz od nowa

## Co jest poza zakresem (świadomy YAGNI)

- **Edytor trim/normalize/EQ.** Jak nagranie ma cisze na początku/końcu lub jest za ciche → otwierasz w Audacity (Mac standardowo, free). Recorder nie próbuje być DAW.
- **Safari fallback (download zamiast File System Access API).** 145 ręcznych kliknięć "Save" + przeciągań to gorzej niż jednorazowy switch na Chrome. Akceptujemy.
- **Konwersja WAV/MP3 w przeglądarce (lamejs).** Niepotrzebne — ffmpeg jednorazowo, batch.
- **Vite middleware z auto-save.** Niepotrzebne — File System Access API załatwia to bez backendu.
- **Routing w głównej apce (`/dev/recorder`).** Recorder jest poza `src/`, nie wchodzi w build apki. Czyste rozdzielenie.
- **localStorage progress tracking.** Folder docelowy jest źródłem prawdy. Reload = przeskan folderu = aktualny stan.
- **Auto-progresja przez wszystkie klucze.** User decyduje, w jakiej kolejności i ile na raz nagra. Recorder respektuje filtr i klikalność.
- **Zip-export, batch-undo, historia wersji.** Plik nadpisuje plik. Wystarczy.
- **Wsparcie dla nowego SFX (już mamy CC0).** SFX `sfx-correct-ding.mp3` i `sfx-mastery-fanfara.mp3` zostają jak są (CC0 z mixkit) — nie nagrywamy ich głosem.

## Aktualizacja memory

Po wdrożeniu i pierwszej fali nagrań, aktualizujemy `memory/project_audio_voice_consistency.md`:

> Decyzja 2026-04-27 (revision): cały audio-stack projektu Iskierki nagrywany jest jednolicie przez user'a (męski głos). TTS Zofia używana wyłącznie jako fallback dla NOWYCH kluczy, dla których override jeszcze nie istnieje. Recorder w `tools/recorder/` jest narzędziem do iteracyjnego nagrywania kolejnych zestawów (literki → słowa → asocjacje → ui-strings → przyszłe moduły).

## Definition of Done

1. `tools/recorder/index.html`, `recorder.js`, `recorder.css`, `README.md` istnieją i działają w Chrome
2. Recorder ładuje wszystkie klucze z `audio-source/letters.json`, `words.json`, `ui-strings.json` i pokazuje je pogrupowane
3. Po wyborze folderu docelowego pokazuje aktualny status (✅/⬜) na podstawie zawartości folderu
4. Można nagrać → preview → zapisać → status zmienia się na ✅, plik istnieje na dysku jako `<klucz>.webm`
5. Klawiatura (Spacja / Enter / R / strzałki) działa zgodnie ze specem
6. VU meter pokazuje poziom mikrofonu live podczas nagrywania
7. `pnpm audio:convert-overrides` konwertuje wszystkie nowe `.webm` → `.mp3`, idempotentne
8. `pnpm audio:build` po konwersji oznacza pliki jako `source: 'override'` w manifeście
9. `pnpm dev` po pełnym cyklu odtwarza nagrane głosy w sesji nauki liter
10. `tools/recorder/README.md` zawiera krok-po-kroku jak uruchomić i jakie są wymagania

## Out of scope dla tego speca (przyszłe iteracje)

- Recorder dla nowych modułów (cyfry, sylaby) — działa automatycznie po dodaniu nowego JSON-a do `audio-source/`, bez zmian w narzędziu
- Lepsza jakość audio (post-processing, denoising) — jeśli nagrania okażą się zaszumione, dorzucamy stratę w `audio:convert-overrides` (`afftdn` filter w ffmpeg) lub workflow przez Audacity
- Współdzielenie nagrań między urządzeniami / cloud sync — out of scope, projekt jest no-backend
