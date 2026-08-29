# Fala 1 — ulepszenia dydaktyczne (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` albo `superpowers:executing-plans`. Każdy task wykonuje świeży agent **bez kontekstu** — task jest samowystarczalny. Kroki mają checkboxy.

**Goal:** Domknąć lukę „uczymy rozpoznawania, za mało produkcji i strategii": czysty fonem + nazwa litery, jawny krok syntezy sylab, druga próba po błędzie, wypowiadane liczby i strategie w matematyce, echo + tempo w czytankach, wyraźny koniec sesji, dane diagnostyczne z czytanek, pochwały procesowe, paleta bezpieczna dla daltonistów.

**Architecture:** Cztery moduły (`src/modules/{letters,reading,numbers,czytanki}`) + `src/shared/`. Bez backendu, postęp w `localStorage` (5 store'ów Zustand persist). Audio pre-generowane do `public/audio/` z `audio-source/*.json` przez `scripts/generate-audio.ts` (silniki `edge` | `azure` | `azure-ipa`).

**Tech Stack:** React 19, TS strict, Vite 8, Tailwind 4, Zustand 5, react-router-dom 7, Vitest, tsx, @dnd-kit.

**Spec:** `docs/superpowers/specs/2026-08-29-fala-1-dydaktyka-design.md` (czytaj z sekcją „Decyzje" na końcu).

## Global Constraints (obowiązują w KAŻDYM tasku)

- **TS strict**, zero `any` / `@ts-ignore`. Function components, **named exports**.
- **Klucze audio lowercase ASCII, tylko `[a-z0-9_-]`.** APFS jest case-insensitive i maskuje 404, które wychodzą na GH Pages (Linux). Polskie znaki mapuje `slugPl`: `ą→a_ ę→e_ ó→o_ ł→l_ ś→s_ ć→c_ ń→n_ ź→z_ ż→z-`.
- **Tap-targety ≥60×60.** UI dziecka: tylko ikony + audio, **zero tekstu do czytania** (poza samą czytanką). Polskie napisy tylko dla rodzica.
- `audioBus.play(key)` zwraca `Promise<boolean>`, **nigdy nie rzuca**: `true` = klip FAKTYCZNIE wystartował (choćby przerwany przez `stop()`), `false` = nie ruszył (autoplay/404/`stop()` w kolejce). `await` bez try/catch jest bezpieczny.
- Intro **zawsze** przez `playIntroOnce(audioBus, key, hasSeen, markSeen, audioKey?)` z `@/shared/audio/playIntroOnce`.
- Persist: `merge` z defaultem dla KAŻDEGO pola **oraz** `migrate: (p) => p` — bez `migrate` zustand odrzuca persist przy bumpie `version` i kasuje postęp.
- Tokeny z `@/app/theme` (`colors`, `radii`, `tapTargets`). Fonty `var(--font-block)` / `var(--font-handwritten)`.
- **Testy minimalne** — tylko te wypisane w planie. Reszta w przeglądarce.
- Testy uruchamiaj worktree-safe: `pnpm vitest run --dir src`, `pnpm vitest run --dir scripts` (nie `pnpm test --run`).
- **Commit po każdym tasku**, message po polsku, z trailerem `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Branch `feat/fala-1`. Nie pushuj bez polecenia.

---

### Task 1: Klucze audio sylab modułu 2 → lowercase `slugPl` + generator `syllables.json`

**Dlaczego:** `getSyllableAudioKey('MA')` → `syl-MA`; nowe sylaby ze słów (`GĘŚ`, `DŹWIEDŹ`) dałyby `syl-GĘŚ.mp3` = 404 na Linuxie. Ale `syl-<TEXT>` jest **kluczem SRS w persist** (`iskierki-reading-v1.syllables`), a `makeInitialSyllableState` odzyskuje z niego tekst przez `replace('syl-','')`. Dlatego **rozdzielamy id SRS od klucza audio**: id bez zmian (zero migracji persist), zmienia się tylko klucz audio.

**Files:** Create `src/shared/audio/slugPl.ts`, `scripts/reading-audio-source.ts`. Modify `src/modules/czytanki/data/audioKeys.ts`, `src/modules/reading/data/syllables.ts` + `.test.ts`, `src/modules/reading/hooks/useReadingSession.ts`, `package.json`, `audio-source/syllables.json`, `public/audio/syl-*.mp3`, `public/audio/.manifest.json`.

**Interfaces:**
- Produces: `slugPl(text: string): string`, `AUDIO_KEY_RE: RegExp` z `@/shared/audio/slugPl`
- Produces: `getSyllableId(syllable: string): string` → `syl-<TEXT>` (SRS), `getSyllableAudioKey(syllable: string): string` → `syl-<slug>` (audio)
- Produces: `buildReadingSyllableSource(): Record<string, string>`
- Consumes: `ALL_SYLLABLES` (`src/modules/reading/data/syllables.ts`), `ALL_WORDS` (`src/modules/reading/data/words.ts`)

- [ ] **Step 1: `src/shared/audio/slugPl.ts`** — przenieś `PL_MAP`, `AUDIO_KEY_RE`, `slugPl` z `src/modules/czytanki/data/audioKeys.ts` (razem z komentarzem WHY o APFS). W `audioKeys.ts` zostaw `import { slugPl } from '@/shared/audio/slugPl'` + `export { slugPl, AUDIO_KEY_RE } from '@/shared/audio/slugPl'`; `syllableAudioKey`/`wordAudioKey` bez zmian.

- [ ] **Step 2: `src/modules/reading/data/syllables.ts`**
```ts
import { slugPl } from '@/shared/audio/slugPl'
/** Id itemu SRS (klucz persist). NIE zmieniać — migracja skasowałaby postęp. */
export function getSyllableId(syllable: string): string { return `syl-${syllable}` }
/** Klucz pliku audio — lowercase ASCII. */
export function getSyllableAudioKey(syllable: string): string { return `syl-${slugPl(syllable)}` }
```
`ALL_SYLLABLES` buduje `id: getSyllableId(text)`.

- [ ] **Step 3: Rozdziel call-sites w `useReadingSession.ts`.** SRS → `getSyllableId`: ~183 (`targetSyllableIds` w `generateWordAssembly`), ~463 (`lastTargetRef.current = …`), ~590 (`targetId = …` w `handleOutcome`). Audio → **zostaje** `getSyllableAudioKey`: ~328 (`playPromptAudio`), ~571 (`playCorrectionAudio`). Popraw import.

- [ ] **Step 4: `syllables.test.ts`** — zamień asercję `syl-MA` na trzy: `getSyllableId('MA')==='syl-MA'`, `getSyllableAudioKey('MA')==='syl-ma'`, `getSyllableAudioKey('GĘŚ')==='syl-ge_s_'`.

- [ ] **Step 5: `scripts/reading-audio-source.ts`** (wzór: `scripts/czytanki-audio-source.ts`)
```ts
// Generuje audio-source/syllables.json: SYLLABLE_TEXTS ∪ sylaby ALL_WORDS.
// Plik wynikowy NIE jest edytowany ręcznie. Uruchom: pnpm audio:reading
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_SYLLABLES, getSyllableAudioKey } from '../src/modules/reading/data/syllables'
import { ALL_WORDS } from '../src/modules/reading/data/words'

const OUT = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'audio-source', 'syllables.json')

export function buildReadingSyllableSource(): Record<string, string> {
  const texts = new Set<string>(ALL_SYLLABLES.map((s) => s.text))
  for (const w of ALL_WORDS) for (const s of w.syllables) texts.add(s)
  const entries = [...texts].map((t) => [getSyllableAudioKey(t), t.toLowerCase()] as [string, string])
  entries.sort((a, b) => a[0].localeCompare(b[0]))
  const out: Record<string, string> = { _voice: 'zofia', _engine: 'azure-ipa' }
  for (const [k, v] of entries) out[k] = v
  return out
}

const map = buildReadingSyllableSource()
writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n', 'utf8')
console.log(`syllables.json: ${Object.keys(map).length - 2} kluczy`)
```

- [ ] **Step 6: `package.json`** — dodaj `"audio:reading": "tsx scripts/reading-audio-source.ts"` i wepnij ją do trzech skryptów: `audio:build`, `audio:check`, `audio:dry` — każdy zaczyna się teraz `pnpm audio:czytanki && pnpm audio:reading && tsx scripts/generate-audio.ts …`.

- [ ] **Step 7: Rename 24 mp3 (dwuetapowo — APFS jest case-insensitive)**
```bash
cd /Users/kamilmat87/kid-learn/public/audio
for f in syl-*.mp3; do base="${f%.mp3}"; low=$(echo "$base" | tr 'A-Z' 'a-z')
  [ "$base" = "$low" ] && continue
  git mv "$f" "__t_$low.mp3" && git mv "__t_$low.mp3" "$low.mp3"; done
ls syl-*.mp3 | wc -l   # → 24, wszystkie lowercase
```

- [ ] **Step 8: Przepisz klucze `syl-*` w manifeście** (zachowuje cache-hit — build nie regeneruje tych 24)
```bash
node -e '
const fs=require("fs"),p="public/audio/.manifest.json",m=JSON.parse(fs.readFileSync(p,"utf8")),o={};
for(const k of Object.keys(m)) o[k.startsWith("syl-")?k.toLowerCase():k]=m[k];
fs.writeFileSync(p,JSON.stringify(Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]])),null,2)+"\n");'
```

- [ ] **Step 9: Plan** — `pnpm audio:reading && pnpm audio:dry | grep "^syl-" | grep -c cache-hit` → 24; łącznie kluczy `syl-*` ≈ 89. **Nie budujemy mp3** — build jest w Tasku 2.
- [ ] **Step 10:** `pnpm tsc -b && pnpm vitest run --dir src && pnpm vitest run --dir scripts` → 0 błędów, wszystko zielone.
- [ ] **Step 11: Commit** `git add -A && git commit -m "refactor(reading): klucze audio sylab na lowercase slugPl + generator syllables.json" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 2: Wszystkie nowe źródła audio w jednej paczce + build

**Dlaczego jako jeden task:** jedyny krok z zewnętrzną zależnością (limit Azure F0, ~20 req/min) — jeden przebieg przez wszystkie nowe klucze.

**Files:** Create `audio-source/letters-phonemes.json`, `audio-source/letters-names.json`. Modify `audio-source/pronunciation-overrides.json`, `ui-strings.json`, `reading-ui-strings.json`, `math-ui-strings.json`, `czytanki-ui-strings.json`, `public/audio/*`.

**Interfaces — produces klucze:** `phon-<slug>` (32), `letter-name-<slug>` (32), `praise-proc-1..10`, `retry-correct`, `session-stop-enough`, `reading-praise-proc-1..6`, `reading-blend-prefix`, `strategy-{count-on,make10,doubles,near-doubles,count-back}`, `praise-proc-num-1..6`, `czytanki-echo-intro`, `czytanki-ui-{echo-on,echo-off,slow,normal}`.

> **ODSTĘPSTWO OD SPECU (świadome):** spec pisze `phon-<litera>` / `letter-name-<litera>` z polskim znakiem — naruszałoby to zasadę lowercase ASCII i decyzję o migracji sylab na `slugPl`. Używamy `slugPl`: `phon-a_` (ą), `phon-l_` (ł), `phon-z-` (ż). Litery bez diakrytyku bez zmian.

- [ ] **Step 1: `audio-source/letters-phonemes.json`** — `_voice: zofia`, `_engine: azure-ipa`; 32 klucze (pula = `levelLetterPools.pochodnia`), wartość = sama litera:
```json
{ "_voice": "zofia", "_engine": "azure-ipa",
  "phon-a": "a", "phon-a_": "ą", "phon-b": "b", "phon-c": "c", "phon-c_": "ć", "phon-d": "d",
  "phon-e": "e", "phon-e_": "ę", "phon-f": "f", "phon-g": "g", "phon-h": "h", "phon-i": "i",
  "phon-j": "j", "phon-k": "k", "phon-l": "l", "phon-l_": "ł", "phon-m": "m", "phon-n": "n",
  "phon-n_": "ń", "phon-o": "o", "phon-o_": "ó", "phon-p": "p", "phon-r": "r", "phon-s": "s",
  "phon-s_": "ś", "phon-t": "t", "phon-u": "u", "phon-w": "w", "phon-y": "y", "phon-z": "z",
  "phon-z_": "ź", "phon-z-": "ż" }
```

- [ ] **Step 2: `audio-source/letters-names.json`** — `_engine: azure` (plain SSML; `edge` zgaduje „be"/„es" tak samo źle jak izolowane sylaby). Samogłoski `a ą e ę i o u` = same siebie:
```json
{ "_voice": "zofia", "_engine": "azure",
  "letter-name-a": "a", "letter-name-a_": "ą", "letter-name-b": "be", "letter-name-c": "ce",
  "letter-name-c_": "cie", "letter-name-d": "de", "letter-name-e": "e", "letter-name-e_": "ę",
  "letter-name-f": "ef", "letter-name-g": "gie", "letter-name-h": "ha", "letter-name-i": "i",
  "letter-name-j": "jot", "letter-name-k": "ka", "letter-name-l": "el", "letter-name-l_": "eł",
  "letter-name-m": "em", "letter-name-n": "en", "letter-name-n_": "eń", "letter-name-o": "o",
  "letter-name-o_": "u otwarte", "letter-name-p": "pe", "letter-name-r": "er", "letter-name-s": "es",
  "letter-name-s_": "eś", "letter-name-t": "te", "letter-name-u": "u", "letter-name-w": "wu",
  "letter-name-y": "igrek", "letter-name-z": "zet", "letter-name-z_": "ziet", "letter-name-z-": "żet" }
```

- [ ] **Step 3: `pronunciation-overrides.json`** — dopisz 23 wpisy (nie ruszaj istniejących `cz-*`). Ciągłe wydłużamy `ː`, zwarte/afrykaty bez przedłużenia i bez samogłoski. Samogłoski idą przez G2P bez override:
```json
  "phon-f": {"ipa":"fː"}, "phon-h": {"ipa":"xː"}, "phon-j": {"ipa":"jː"}, "phon-l": {"ipa":"lː"},
  "phon-l_": {"ipa":"wː"}, "phon-m": {"ipa":"mː"}, "phon-n": {"ipa":"nː"}, "phon-n_": {"ipa":"ɲː"},
  "phon-r": {"ipa":"rː"}, "phon-s": {"ipa":"sː"}, "phon-s_": {"ipa":"ɕː"}, "phon-w": {"ipa":"vː"},
  "phon-z": {"ipa":"zː"}, "phon-z_": {"ipa":"ʑː"}, "phon-z-": {"ipa":"ʐː"},
  "phon-b": {"ipa":"b"}, "phon-c": {"ipa":"t͡s"}, "phon-c_": {"ipa":"t͡ɕ"}, "phon-d": {"ipa":"d"},
  "phon-g": {"ipa":"ɡ"}, "phon-k": {"ipa":"k"}, "phon-p": {"ipa":"p"}, "phon-t": {"ipa":"t"}
```

- [ ] **Step 4: `ui-strings.json`** (zofia/edge — domyślne) — dopisz:
```json
  "praise-proc-1": "uważnie słuchałeś!", "praise-proc-2": "nie poddałeś się!",
  "praise-proc-3": "poprawiłeś się!", "praise-proc-4": "dobrze pomyślałeś!",
  "praise-proc-5": "słuchałeś do końca!", "praise-proc-6": "próbowałeś i wyszło!",
  "praise-proc-7": "szukałeś spokojnie!", "praise-proc-8": "nie spieszyłeś się!",
  "praise-proc-9": "skupiłeś się!", "praise-proc-10": "sam to znalazłeś!",
  "retry-correct": "O, teraz dobrze! Poprawiłeś się.",
  "session-stop-enough": "Na dziś wystarczy. Wrócimy jutro!"
```

- [ ] **Step 5: `reading-ui-strings.json`** (zofia) — dopisz:
```json
  "reading-praise-proc-1": "Ładnie poskładałeś sylaby!", "reading-praise-proc-2": "Słuchałeś uważnie!",
  "reading-praise-proc-3": "Czytałeś powoli i dobrze!", "reading-praise-proc-4": "Sam to rozłożyłeś!",
  "reading-praise-proc-5": "Nie poddałeś się!", "reading-praise-proc-6": "Dobrze wybrałeś!",
  "reading-blend-prefix": "Składamy:"
```

- [ ] **Step 6: `math-ui-strings.json`** (zofia/edge) — dopisz:
```json
  "strategy-count-on": "Policz od większej liczby: siedem… osiem, dziewięć.",
  "strategy-make10": "Najpierw zrób dziesięć, potem dodaj resztę.",
  "strategy-doubles": "To podwójna liczba — tyle samo i tyle samo.",
  "strategy-near-doubles": "To prawie podwójka: podwójna i jeszcze jeden.",
  "strategy-count-back": "Licz do tyłu od większej liczby.",
  "praise-proc-num-1": "Policzyłeś po kolei!", "praise-proc-num-2": "Sprawdziłeś zanim wybrałeś!",
  "praise-proc-num-3": "Użyłeś dobrej strategii!", "praise-proc-num-4": "Nie zgadywałeś!",
  "praise-proc-num-5": "Pomyślałeś o dziesiątce!", "praise-proc-num-6": "Liczyłeś od większej!"
```

- [ ] **Step 7: `czytanki-ui-strings.json`** (agnieszka/azure) — dopisz:
```json
  "czytanki-echo-intro": "Posłuchaj, a potem powtórz.",
  "czytanki-ui-echo-on": "Będę czekać, aż powtórzysz.", "czytanki-ui-echo-off": "Czytam bez przerw.",
  "czytanki-ui-slow": "Czytam wolniej.", "czytanki-ui-normal": "Czytam normalnie."
```

- [ ] **Step 8: Plan buildu** — `pnpm audio:dry | tail -20`. Expected: `azure-ipa/generate` ≈ 65 sylab + 32 fonemy, `azure/generate` ≈ 37, `edge/generate` ≈ 24, reszta cache-hit. Sprawdź `pnpm audio:dry | grep "^phon-" | head` — spółgłoski MUSZĄ mieć `override=ipa:"…"`.
- [ ] **Step 9: Build** (wymaga `.env.local` z `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION=westeurope`; ~7–10 min przez throttling F0): `pnpm audio:build` → `Done. generated=… failed=0`.
- [ ] **Step 10: Weryfikacja + odsłuch** — `pnpm audio:check` → `✓ Wszystkie N pliki audio na miejscu.` (**zapisz N** — pójdzie do CLAUDE.md w Tasku 14). Odsłuch obowiązkowy, ryzyko: Azure renderuje izolowaną zwartą jako ciszę/trzask.
```bash
for k in phon-b phon-p phon-t phon-k phon-d phon-g phon-c phon-c_ phon-s phon-r phon-l_ \
         syl-dz-wiedz- syl-s_liw syl-nia_dz syl-ge_s_ syl-ksie_; do echo "$k"; afplay public/audio/$k.mp3; done
```
Złe klucze → wpis w `pronunciation-overrides.json` (`{"ipa":…}` albo `{"text":…}`) + `pnpm audio:build`. Gdy zwarta dalej jest ciszą — nagraj `audio-source/manual-overrides/phon-<slug>.mp3` (plan B ze speca) i rebuild. Zanotuj poprawione klucze — trafią do STATUS.md.
- [ ] **Step 11: Commit** `git add -A && git commit -m "feat(audio): fonemy i nazwy liter, strategie, pochwały procesowe, cue czytanek" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 3: Paleta sylab Okabe–Ito + kod niekolorowy

**Files:** Modify `src/shared/ui/syllableColors.ts`, `src/modules/reading/components/{SyllableText,DropSlot}.tsx`, `src/modules/reading/components/exercises/SyllableFillExercise.tsx`, `src/modules/czytanki/components/{CzytankaView,SyllableButton}.tsx`, `src/app/Home.tsx`. Create `src/shared/ui/syllableColors.test.ts`.

**Interfaces:** Produces `type SyllableCue = { color: string; underline: 'solid'|'dotted'|'dashed'|'double' }`, `getSyllableCue(index: number): SyllableCue`; `getSyllableColor(index): string` zostaje jako wrapper (nie łamiemy importów).

- [ ] **Step 1: Test** `src/shared/ui/syllableColors.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { getSyllableColor, getSyllableCue } from './syllableColors'
describe('syllableColors', () => {
  it('4 kolory i 4 style, cyklicznie', () => {
    const cues = [0, 1, 2, 3].map(getSyllableCue)
    expect(new Set(cues.map((c) => c.color)).size).toBe(4)
    expect(new Set(cues.map((c) => c.underline)).size).toBe(4)
    expect(getSyllableCue(4)).toEqual(getSyllableCue(0))
  })
  it('wrapper zgodny z cue', () => { expect(getSyllableColor(2)).toBe(getSyllableCue(2).color) })
})
```
Run `pnpm vitest run --dir src src/shared/ui/syllableColors.test.ts` → FAIL.

- [ ] **Step 2: Implementacja** (zastąp cały `src/shared/ui/syllableColors.ts`)
```ts
// Paleta Okabe–Ito (color-universal design) z korektą kontrastu: oryginalny
// pomarańcz #E69F00 daje ~2,1:1 na tle #fef9f2 — poniżej progu nawet dla dużego
// tekstu — więc przyciemniony do #B35900. Wszystkie ≥3:1; sylaby mają 40–64 px.
// Kolor NIE MOŻE być jedynym nośnikiem granicy sylaby (WCAG 1.4.1), więc każdy
// indeks ma też własny styl podkreślenia. Rysujemy je przez `borderBottom`, nie
// `text-decoration` — w Lexend dekoracja wchodzi w wydłużenia dolne.
export type SyllableUnderline = 'solid' | 'dotted' | 'dashed' | 'double'
export type SyllableCue = { color: string; underline: SyllableUnderline }

const SYLLABLE_CUES: readonly SyllableCue[] = [
  { color: '#0072B2', underline: 'solid' },
  { color: '#B35900', underline: 'dotted' },
  { color: '#009E73', underline: 'dashed' },
  { color: '#CC79A7', underline: 'double' },
]

export function getSyllableCue(index: number): SyllableCue {
  const n = SYLLABLE_CUES.length
  return SYLLABLE_CUES[((index % n) + n) % n]!
}
/** Wrapper zgodności — nowy kod bierze `getSyllableCue`. */
export function getSyllableColor(index: number): string { return getSyllableCue(index).color }
```
Run → PASS.

- [ ] **Step 3: Konsumenci** — wszędzie, gdzie renderowana jest pojedyncza sylaba, dołóż `borderBottom: \`3px ${cue.underline} ${cue.color}\``:
  - `SyllableText.tsx:18` i `SyllableFillExercise.tsx:160` — `const cue = getSyllableCue(i)`, użyj `cue.color` + border.
  - `DropSlot.tsx:72` — cue liczone tylko gdy `filled && resolvedState === 'filled'`; border tylko wtedy.
  - `CzytankaView.tsx:220` — przekaż `cue={getSyllableCue(i)}`; w `SyllableButton.tsx` zamień prop `color: string` na `cue: SyllableCue` i użyj obu pól.
- [ ] **Step 4: `src/app/Home.tsx`** — cztery zestawy hardkodowanych spanów (`#1d4ed8`/`#dc2626`/`#16a34a`, linie ~171, ~222, ~273, ~327) przechodzą na `getSyllableColor(0|1|2)` per litera/sylaba. Kolory ramek i teł kafelków **bez zmian**.
- [ ] **Step 5:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(ui): paleta sylab Okabe-Ito + niekolorowy kod granicy sylaby" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 4: Pochwały procesowe — losowanie 50/50 w trzech modułach

**Files:** Create `src/shared/audio/pickPraiseMixed.ts` + `.test.ts`. Modify `src/modules/letters/hooks/useSession.pickers.ts`, `src/modules/reading/hooks/useReadingSession.ts`, `src/modules/numbers/data/praise.ts`, `src/modules/numbers/hooks/useNumbersSession.ts`.

**Interfaces:** Produces `pickPraiseMixed<T extends string>(outcomeKeys: readonly T[], processKeys: readonly T[], lastKey: T | null, rng: () => number): T`. Consumes `pickNoRepeat` z `@/shared/audio/pickNoRepeat`.

- [ ] **Step 1: Test** `src/shared/audio/pickPraiseMixed.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { pickPraiseMixed } from './pickPraiseMixed'
const OUT = ['o1', 'o2', 'o3'] as const
const PROC = ['p1', 'p2', 'p3'] as const
describe('pickPraiseMixed', () => {
  it('rng < 0.5 → lista procesowa', () => { expect(PROC).toContain(pickPraiseMixed(OUT, PROC, null, () => 0.1)) })
  it('rng >= 0.5 → lista wynikowa', () => { expect(OUT).toContain(pickPraiseMixed(OUT, PROC, null, () => 0.9)) })
  it('nigdy nie powtarza poprzedniego klucza, także między listami', () => {
    const seq = [0.1, 0.2, 0.1, 0.3, 0.9, 0.4]; let i = 0
    let last: 'o1'|'o2'|'o3'|'p1'|'p2'|'p3'|null = 'p1'
    for (let n = 0; n < 3; n++) {
      const k = pickPraiseMixed(OUT, PROC, last, () => seq[i++]!)
      expect(k).not.toBe(last); last = k
    }
  })
})
```
Run → FAIL.

- [ ] **Step 2: Implementacja** `src/shared/audio/pickPraiseMixed.ts`
```ts
import { pickNoRepeat } from './pickNoRepeat'
/**
 * Rzut monetą między pochwałą PROCESOWĄ („uważnie słuchałeś") a WYNIKOWĄ
 * („brawo"), potem `pickNoRepeat` WEWNĄTRZ wybranej listy. `lastKey` pamięta
 * klucz niezależnie od listy, więc dwie pochwały pod rząd nigdy nie są takie
 * same. WHY 50/50: same wynikowe oceniają dziecko, same procesowe nużą.
 */
export function pickPraiseMixed<T extends string>(
  outcomeKeys: readonly T[], processKeys: readonly T[], lastKey: T | null, rng: () => number,
): T {
  const useProcess = rng() < 0.5
  const list = useProcess ? processKeys : outcomeKeys
  if (list.length === 0) return pickNoRepeat(useProcess ? outcomeKeys : processKeys, lastKey, rng)
  return pickNoRepeat(list, lastKey, rng)
}
```
Run → PASS.

- [ ] **Step 3: Litery** — w `useSession.pickers.ts` dodaj `export const PRAISE_PROCESS_KEYS = ['praise-proc-1', …, 'praise-proc-10'] as const`, rozszerz `PraiseKey` o `(typeof PRAISE_PROCESS_KEYS)[number]`, a `pickPraiseKey` przepisz na `pickPraiseMixed<PraiseKey>(PRAISE_KEYS, PRAISE_PROCESS_KEYS, lastKey, rng)`. Call-site w `useSession.playFeedbackAudio` bez zmian.
- [ ] **Step 4: Czytanie** — obok `READING_PRAISE_KEYS` dodaj `READING_PRAISE_PROCESS_KEYS` (`reading-praise-proc-1..6`); w `handleOutcome` zamień `pickNoRepeat(READING_PRAISE_KEYS, …)` na `pickPraiseMixed(READING_PRAISE_KEYS, READING_PRAISE_PROCESS_KEYS, lastPraiseRef.current, rng)` i rozszerz typ `lastPraiseRef` na union obu list.
- [ ] **Step 5: Cyferki** — w `data/praise.ts` dodaj `NUMBERS_PRAISE_PROCESS_KEYS` (`praise-proc-num-1..6`), rozszerz `NumbersPraiseKey`; w `useNumbersSession.answer` zamień picker analogicznie. Fallback `NUMBERS_PRAISE_KEYS[Math.random()…]` w `SessionView.tsx` **zostaw** (działa tylko gdy `praiseKey === null`).
- [ ] **Step 6:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono. Jeśli test pickerów liter asertuje konkretny klucz przy zamrożonym rng — dostosuj go: teraz są DWA losowania zamiast jednego.
- [ ] **Step 7: Commit** `git add -A && git commit -m "feat(audio): pochwały procesowe 50/50 we wszystkich modułach" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 5: Cyferki — wypowiadanie liczb zadania

**Files:** Create `src/modules/numbers/data/promptAudio.test.ts`. Modify `src/modules/numbers/data/promptAudio.ts`, `src/modules/numbers/components/SessionView.tsx` + wszystkie `components/exercises/*.tsx`, które kolejkują prompt w `useEffect`.

**Interfaces:** Produces `promptAudioKeys(question: Question | null): string[]` (obok istniejącej `promptAudioKey`, która zostaje jako źródło klucza generycznego). Consumes `Question` z `../types` (payload `{ args?: number[]; op?: '+'|'-' }`). Klucze `number-0..20`, `op-plus|minus|times` już są w `audio-source/numbers.json` (były martwe).

- [ ] **Step 1: Test** `src/modules/numbers/data/promptAudio.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { promptAudioKeys } from './promptAudio'
import type { Question } from '../types'
const q = (exerciseType: Question['exerciseType'], args: number[], op?: '+' | '-'): Question =>
  ({ factId: 'f', conceptId: 'iskierka-adding-concrete', exerciseType,
     payload: op ? { args, op } : { args } } as Question)

describe('promptAudioKeys', () => {
  it('concrete-add', () => expect(promptAudioKeys(q('concrete-add', [3, 4])))
    .toEqual(['number-3', 'op-plus', 'number-4', 'ask-howmany-total']))
  it('concrete-add-subtract z minusem', () => expect(promptAudioKeys(q('concrete-add-subtract', [9, 4], '-')))
    .toEqual(['number-9', 'op-minus', 'number-4', 'ask-howmany-left']))
  it('equal-groups → op-times', () => expect(promptAudioKeys(q('equal-groups', [3, 5])))
    .toEqual(['number-3', 'op-times', 'number-5', 'ask-howmany-total']))
  it('jedna liczba + pytanie', () => {
    expect(promptAudioKeys(q('ten-frame-fill', [7]))).toEqual(['number-7', 'ask-howmany-missing'])
    expect(promptAudioKeys(q('number-bond-builder', [10]))).toEqual(['number-10', 'ask-build-bond'])
  })
  it('subitize-flash bez liczb (są celem pytania)', () =>
    expect(promptAudioKeys(q('subitize-flash', [4]))).toEqual(['ask-howmany']))
  it('argument poza 0-20 → sam klucz generyczny', () =>
    expect(promptAudioKeys(q('concrete-add', [30, 4]))).toEqual(['ask-howmany-total']))
  it('null → pusta lista', () => expect(promptAudioKeys(null)).toEqual([]))
})
```
Run → FAIL.

- [ ] **Step 2: Implementacja** — dopisz do `promptAudio.ts`:
```ts
/** `number-0..20` istnieją w numbers.json; poza zakresem nie ma pliku. */
function numberKey(n: number | undefined): string | null {
  return n !== undefined && Number.isInteger(n) && n >= 0 && n <= 20 ? `number-${n}` : null
}

/**
 * Pełna sekwencja polecenia: liczby zadania wypowiadane wprost, potem pytanie.
 * WHY: 29 kluczy `number-*`/`op-*` było martwych, a dziecko słyszało samo „ile
 * jest razem?" bez składników. Argument spoza 0–20 → cofamy się do klucza
 * generycznego: lepiej krótszy prompt niż 404 w środku kolejki.
 */
export function promptAudioKeys(question: Question | null): string[] {
  const generic = promptAudioKey(question)
  if (!question || generic === null) return []
  const args = (question.payload as { args?: number[] }).args ?? []
  const a = numberKey(args[0]); const b = numberKey(args[1])
  const withOp = (op: string): string[] => (a !== null && b !== null ? [a, op, b, generic] : [generic])
  switch (question.exerciseType) {
    case 'concrete-add': case 'doubles': case 'near-doubles': case 'make-10':
      return withOp('op-plus')
    case 'subtract-maintenance':
      return withOp('op-minus')
    case 'concrete-add-subtract':
      return withOp((question.payload as { op?: '+' | '-' }).op === '-' ? 'op-minus' : 'op-plus')
    case 'equal-groups': case 'array-match':
      return withOp('op-times')
    case 'ten-frame-fill': case 'number-bond-builder':
      return a !== null ? [a, generic] : [generic]
    default:
      // subitize-flash, match-digit-dots, number-rhythm, skip-count-chase,
      // fact-family-triangle — liczby SĄ celem pytania albo jest ich za dużo.
      return [generic]
  }
}
```
Run → PASS.

- [ ] **Step 3: Konsumenci** — `grep -rn "promptAudioKey" src/modules/numbers/`. W `SessionView.tsx` (przycisk 🔊) i w `useEffect` promptu każdego ćwiczenia zamień `void audioBus.play(key)` na `for (const key of promptAudioKeys(question)) void audioBus.play(key)`. Kolejka jest FIFO — bez `await`, bez `stop()` między kluczami.
- [ ] **Step 4:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono. Prompt rośnie o ~1,5 s — zamierzone.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(numbers): wypowiadanie liczb zadania w poleceniu" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 6: Cyferki — audio strategii po błędzie (max 2× na sesję)

**Files:** Create `src/modules/numbers/data/strategyAudio.ts` + `.test.ts`. Modify `src/modules/numbers/components/SessionView.tsx`.

**Interfaces:** Produces `strategyAudioKey(conceptId: ConceptId, op: '+'|'-'): string | null`, `MAX_STRATEGY_CUES_PER_SESSION = 2`.

- [ ] **Step 1: Test** `src/modules/numbers/data/strategyAudio.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { strategyAudioKey } from './strategyAudio'
describe('strategyAudioKey', () => {
  it('count-on', () => {
    expect(strategyAudioKey('iskierka-adding-concrete', '+')).toBe('strategy-count-on')
    expect(strategyAudioKey('plomyk-addsub-10', '+')).toBe('strategy-count-on')
  })
  it('count-back przy minusie', () => expect(strategyAudioKey('plomyk-addsub-10', '-')).toBe('strategy-count-back'))
  it('doubles / near-doubles', () => {
    expect(strategyAudioKey('ognik-doubles', '+')).toBe('strategy-doubles')
    expect(strategyAudioKey('ognik-neardoubles', '+')).toBe('strategy-near-doubles')
  })
  it('make10 i tenframe', () => {
    expect(strategyAudioKey('ognik-make10', '+')).toBe('strategy-make10')
    expect(strategyAudioKey('plomyk-tenframe', '+')).toBe('strategy-make10')
  })
  it('bez strategii → null', () => {
    expect(strategyAudioKey('iskierka-rhythm', '+')).toBeNull()
    expect(strategyAudioKey('pochodnia-arrays', '+')).toBeNull()
  })
})
```
Run → FAIL.

- [ ] **Step 2: Implementacja** `src/modules/numbers/data/strategyAudio.ts`
```ts
import type { ConceptId } from '../types'
/**
 * Nazwanie strategii po błędzie — dziecko dostaje NARZĘDZIE, nie tylko
 * poprawną odpowiedź. Limit 2× na sesję: częściej robi się zrzędzenie.
 * `subtract-maintenance` to typ ĆWICZENIA — jego fakty mają conceptId
 * 'plomyk-addsub-10' z op '-', więc trafiają w count-back poniżej.
 */
export const MAX_STRATEGY_CUES_PER_SESSION = 2

export function strategyAudioKey(conceptId: ConceptId, op: '+' | '-'): string | null {
  switch (conceptId) {
    case 'iskierka-adding-concrete': return 'strategy-count-on'
    case 'plomyk-addsub-10': return op === '-' ? 'strategy-count-back' : 'strategy-count-on'
    case 'ognik-doubles': return 'strategy-doubles'
    case 'ognik-neardoubles': return 'strategy-near-doubles'
    case 'ognik-make10': case 'plomyk-tenframe': return 'strategy-make10'
    default: return null
  }
}
```
Run → PASS.

- [ ] **Step 3: `SessionView.tsx`** — w komponencie overlaya feedbacku (ten z `try-again-soft` / `correct-show-N`, ~476) strategia gra **po** `correct-show-N`:
  1. W rodzicu `const strategyCuesRef = useRef(0)`, zerowany przy starcie sesji.
  2. Rodzic liczy prop `strategyKey`:
```ts
const strategyKey =
  session.lastOutcome !== null && session.lastOutcome !== 'correct' &&
  session.currentQuestion !== null && strategyCuesRef.current < MAX_STRATEGY_CUES_PER_SESSION
    ? strategyAudioKey(session.currentQuestion.conceptId,
        (session.currentQuestion.payload as { op?: '+' | '-' }).op ?? '+')
    : null
```
  3. W overlayu, w gałęzi nie-correct, po `plays.push(settled(audioBus.play(\`correct-show-${correctValue}\`)))` dodaj `if (strategyKey !== null) plays.push(settled(audioBus.play(strategyKey)))`.
  4. Inkrementuj `strategyCuesRef.current` w `useEffect` rodzica (nie w renderze — StrictMode policzyłby dwa razy).
  Bezpiecznik `MAX_FEEDBACK_MS = 12_000` mieści strategię (~3 s) z zapasem.
- [ ] **Step 4:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(numbers): audio strategii po błędzie, max 2 razy na sesję" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 7: Cyferki — wagi konceptów + `prerequisites`

**Dlaczego:** `pickAndSetQuestion` losuje z PŁASKIEJ puli faktów poziomu → Płomyk daje `addsub-10` w ~70% pytań (90/128 faktów), Ognik pokazuje `doubles` w 16% mimo „doubles first". Wprowadzamy dwa kroki: koncept → fakt.

**Files:** Create `src/modules/numbers/hooks/pickConcept.ts` + `.test.ts`. Modify `src/modules/numbers/data/concepts.ts`, `src/modules/numbers/hooks/useNumbersSession.ts`.

**Interfaces:** Produces `ConceptDef.prerequisites?: ConceptId[]`, `unlockedConcepts(level, concepts): ConceptDef[]`, `pickConcept(params): ConceptId | null`. Consumes `CONCEPTS`/`getConceptsForLevel`, `ConceptMastery` (`{ state: 'unseen'|'learning'|'mastered', … }`), `MathFactState` (`{ conceptId, recentWrong, … }`).

- [ ] **Step 1: `concepts.ts`** — dodaj do `ConceptDef` pole `prerequisites?: ConceptId[]` i uzupełnij (Iskierka bez prerekwizytów): `plomyk-bonds-10: ['plomyk-bonds-5']`; `plomyk-tenframe: ['plomyk-bonds-10']`; `plomyk-addsub-10: ['plomyk-bonds-10']`; `plomyk-factfamily: ['plomyk-tenframe','plomyk-addsub-10']`; `ognik-neardoubles: ['ognik-doubles']`; `ognik-make10: ['ognik-neardoubles']`; `ognik-factfamily-20: ['ognik-make10']`; `pochodnia-skipcount-5 | -10 | pochodnia-equalgroups: ['pochodnia-skipcount-2']`; `pochodnia-arrays: ['pochodnia-equalgroups']`; `pochodnia-commutativity: ['pochodnia-arrays']`.

- [ ] **Step 2: Test** `src/modules/numbers/hooks/pickConcept.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { pickConcept, unlockedConcepts } from './pickConcept'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'

const m = (state: ConceptMastery['state']): ConceptMastery =>
  ({ state, firstSeenAt: 1, lastSeenAt: 1, correctStreak: 0, factsTouched: [] })
function seeded(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
}

describe('pickConcept', () => {
  it('koncept z niespełnionym prerekwizytem nie wychodzi ani razu', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = { 'plomyk-bonds-5': m('learning') }
    const rng = seeded(7); const seen = new Set<ConceptId>()
    for (let i = 0; i < 200; i++) {
      const c = pickConcept({ level: 'plomyk', concepts, facts: {}, lastConceptId: null, rng })
      if (c) seen.add(c)
    }
    expect(seen.has('plomyk-addsub-10')).toBe(false)
    expect(seen.has('plomyk-bonds-5')).toBe(true)
  })
  it('żaden koncept nie przekracza 45% z 200 losowań w Płomyku', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = {
      'plomyk-bonds-5': m('mastered'), 'plomyk-bonds-10': m('mastered'),
      'plomyk-tenframe': m('learning'), 'plomyk-addsub-10': m('learning'),
    }
    const rng = seeded(42); const counts = new Map<ConceptId, number>(); let last: ConceptId | null = null
    for (let i = 0; i < 200; i++) {
      const c = pickConcept({ level: 'plomyk', concepts, facts: {}, lastConceptId: last, rng })
      if (!c) continue
      counts.set(c, (counts.get(c) ?? 0) + 1); last = c
    }
    for (const n of counts.values()) expect(n / 200).toBeLessThanOrEqual(0.45)
  })
  it('bezpiecznik: nic nie odblokowane → koncepty bez prerekwizytów', () => {
    expect(unlockedConcepts('ognik', {}).map((c) => c.id)).toEqual(['ognik-doubles'])
  })
  it('fakt z recentWrong podbija wagę swojego konceptu', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = {
      'iskierka-counting-5': m('learning'), 'iskierka-rhythm': m('learning'),
    }
    const facts = { f1: { id: 'f1', conceptId: 'iskierka-rhythm', box: 1, lastSeen: 0,
      recentWrong: 2, totalSeen: 3, totalCorrect: 1, totalWrong: 2 } } as unknown as Record<string, MathFactState>
    const rng = seeded(3); let hits = 0
    for (let i = 0; i < 200; i++)
      if (pickConcept({ level: 'iskierka', concepts, facts, lastConceptId: null, rng }) === 'iskierka-rhythm') hits++
    expect(hits).toBeGreaterThan(40)
  })
})
```
Run → FAIL.

- [ ] **Step 3: Implementacja** `src/modules/numbers/hooks/pickConcept.ts`
```ts
import type { Level } from '@/shared/settings/types'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'
import { getConceptsForLevel, type ConceptDef } from '../data/concepts'

/** Odblokowany = wszystkie prerekwizyty w stanie `mastered`. */
export function unlockedConcepts(
  level: Level, concepts: Partial<Record<ConceptId, ConceptMastery>>,
): ConceptDef[] {
  const all = getConceptsForLevel(level)
  const open = all.filter((c) => (c.prerequisites ?? []).every((p) => concepts[p]?.state === 'mastered'))
  // Bezpiecznik: gdy filtr wyciął wszystko, wpuszczamy koncepty bez prerekwizytów —
  // sesja nie może zostać bez pytań.
  return open.length > 0 ? open : all.filter((c) => (c.prerequisites ?? []).length === 0)
}

function weightFor(
  def: ConceptDef, concepts: Partial<Record<ConceptId, ConceptMastery>>,
  facts: Record<string, MathFactState>,
): number {
  if ((concepts[def.id]?.state ?? 'unseen') === 'mastered') return 0.4  // utrzymanie
  return Object.values(facts).some((f) => f.conceptId === def.id && f.recentWrong > 0) ? 2 : 1
}

/**
 * Krok 1 doboru pytania: WAŻONY wybór konceptu z anti-repeat wobec poprzedniego.
 * Krok 2 (`pickNextItem` na faktach TEGO konceptu) zostaje bez zmian.
 */
export function pickConcept(params: {
  level: Level
  concepts: Partial<Record<ConceptId, ConceptMastery>>
  facts: Record<string, MathFactState>
  lastConceptId: ConceptId | null
  rng: () => number
}): ConceptId | null {
  const { level, concepts, facts, lastConceptId, rng } = params
  const open = unlockedConcepts(level, concepts)
  if (open.length === 0) return null
  const pool = open.length > 1 ? open.filter((c) => c.id !== lastConceptId) : open
  const weights = pool.map((c) => weightFor(c, concepts, facts))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return pool[Math.floor(rng() * pool.length)]?.id ?? null
  let r = rng() * total
  for (let i = 0; i < pool.length; i++) { r -= weights[i]!; if (r <= 0) return pool[i]!.id }
  return pool[pool.length - 1]!.id
}
```
Run → PASS (jeśli rozkład > 45%, popraw wagi/anti-repeat, nie test).

- [ ] **Step 4: `useNumbersSession.pickAndSetQuestion`** — gałąź maintenance Pochodni (18%) zostaje PRZED doborem konceptu; w gałęzi `else`:
```ts
const lastConceptRef = useRef<ConceptId | null>(null)   // obok lastFactRef; zeruj w start()
// …
const store = useNumbers.getState()
const conceptId = pickConcept({
  level, concepts: store.concepts, facts: store.facts,
  lastConceptId: lastConceptRef.current, rng,
})
const conceptPool = conceptId
  ? excludeMaintenance(levelFacts).filter((f) => f.conceptId === conceptId).map((f) => f.id)
  : []
pool = conceptPool.length > 0 ? conceptPool : mainPoolIds
if (conceptId) lastConceptRef.current = conceptId
```
Persist bez zmian — `numbersStore.concepts` już trzyma `state`.
- [ ] **Step 5:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono. Jeśli istniejący test `useNumbersSession` asertuje konkretny `factId` przy zamrożonym rng — dostosuj asercję do nowej ścieżki losowania.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(numbers): ważony dobór konceptu + prerequisites w drzewku" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 8: Druga próba — wspólny kontrakt + moduł Litery

**Wspólny kontrakt (obowiązuje też Task 9):**
1. `wrong` → SRS aktualizowany **od razu i bez zmian** (box −2, `recentWrong`+1). Pierwsza pomyłka to pomyłka.
2. Audio korekty jak dziś + cue `try-again` — klucz **już istnieje** w `math-ui-strings.json`, a przestrzeń kluczy jest globalna: zero nowego audio.
3. Status `retry`: **to samo** pytanie, **2 opcje** — poprawna + wybrana przez dziecko, w losowej kolejności.
4. Wynik idzie do logu jako `attempt: 2` i **nie dotyka SRS**: retry-correct nie podnosi boxa (pochwała `retry-correct`, bez iskierki), retry-wrong → hiperkorekcja i dalej. Dokładnie **jedna** dodatkowa próba.
5. 🤷 w fazie retry = retry-wrong. Pauza → wznowienie powtarza `try-again`. Retry jest **bez timera**.

**Files:** Modify `src/shared/settings/types.ts`, `defaults.ts`, `components/SettingsScreen.tsx`, `src/modules/letters/types.ts`, `hooks/useSession.ts`, `components/{SessionView,QuizCard}.tsx`, `src/shared/stats/aggregate.ts`. Create `src/modules/letters/hooks/useSession.retry.test.ts`.

**Interfaces:** Produces `Settings.secondAttempt: boolean` (default `true`); `SessionStatus` + `'retry'`; `SessionEvent` typu `answer` + `attempt?: 1 | 2`; `UnifiedSession.retries: number`. Consumes `shuffled` z `@/shared/srs/distractors`.

- [ ] **Step 1: Ustawienie** — `types.ts`: `secondAttempt: boolean` w `Settings`; `defaults.ts`: `secondAttempt: true`. `settingsStore.merge` robi `{ ...defaultSettings, ...sanitizedSettings }`, więc stary persist dostanie default automatycznie (bump wersji jest w Tasku 13).
- [ ] **Step 2: `SettingsScreen.tsx`** — jedna globalna kontrolka przez istniejący `ToggleField`: label „Druga próba po błędzie", `checked={settings.secondAttempt}`, `onChange={() => updateSetting('secondAttempt', !settings.secondAttempt)}`, `data-testid="second-attempt"`.
- [ ] **Step 3: Typ logu** — w `src/modules/letters/types.ts`, wariant `{ type: 'answer' … }` dostaje `attempt?: 1 | 2` (brak pola = 1, stare logi). `SessionStatus` dostaje `'retry'`.
- [ ] **Step 4: `useSession.ts`**
  - `UseSessionConfig` + `secondAttempt?: boolean` (default `true`); nowy `retryQuestionRef = useRef<Question | null>(null)` (zerowany w `start()`).
  - `handleOutcome(outcome, chosenLetter, chosenSlot, attempt: 1 | 2 = 1)`: `updateLetterState` oraz liczniki (`iskierki`, `wrongCount`, `dontKnowCount`, `timeoutCount`) **tylko gdy `attempt === 1`**; event dostaje `...(attempt === 2 ? { attempt: 2 } : {})`.
  - Gdy `outcome === 'wrong' && attempt === 1 && cfg.secondAttempt && chosenLetter` → zamiast `scheduleFeedbackDismissRef.current(...)` wywołaj `scheduleRetry(q, chosenLetter, durationMs + extraDurationMs)`:
```ts
const scheduleRetry = useCallback((q: Question, chosenLetter: string, effectiveMs: number) => {
  const cfg = cfgRef.current
  void cfg.audioBus.play('try-again')
  const tiles = shuffled([q.targetLetter, chosenLetter], cfg.rng)
  retryQuestionRef.current = { ...q, tiles, targetSlot: tiles.indexOf(q.targetLetter) }
  clearFeedbackTimer()
  feedbackTimerRef.current = setTimeout(() => {
    feedbackTimerRef.current = null
    setLastFeedback(null)
    setCurrentQuestion(retryQuestionRef.current)
    questionStartedAtRef.current = cfgRef.current.now()
    setStatus('retry')   // bez startCountdown() — retry bez presji czasu
  }, effectiveMs)
}, [clearFeedbackTimer])
```
  - `answer()` / `dontKnow()`: gdy `status === 'retry'` → `handleOutcome(outcome, chosen, slot, 2)`; po nim normalna ścieżka `scheduleFeedbackDismiss` → następne pytanie.
  - `playFeedbackAudio` dostaje parametr `attempt`; w case `'correct'`: `if (attempt === 2) void cfg.audioBus.play('retry-correct')` zamiast `sfx-correct-ding` + pochwały.
  - `resume()` po pauzie w statusie `retry` gra **ponownie** `try-again` (pauza robi `audioBus.stop()`).
- [ ] **Step 5: UI** — `QuizCard.gridLayoutFor`: dodaj `case 2: return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' }`. W `SessionView.tsx` traktuj `status === 'retry'` jak `'playing'` (kafelki aktywne).
- [ ] **Step 6: Raport** — w `aggregate.ts` `summarize()` dodaj `retries`; w pętli, **przed** `questions++`:
```ts
// Poprawki (druga próba) liczone OSOBNO — nie są ani correct, ani wrong,
// żeby nie zaburzać procentów pierwszego podejścia.
if (ev.attempt === 2) { retries++; continue }
```
Rozszerz `UnifiedSession` o `retries: number` i zwróć je z `summarize`. Wyświetl w `ReportScreen` jako „poprawki: N".
- [ ] **Step 7: Test** `useSession.retry.test.ts` — `renderHook` z `secondAttempt: true`, stub audioBus, `rng: () => 0`. Asercje: (a) po `answer(zła litera)` status → `'retry'`, `currentQuestion.tiles.length === 2` i zawiera target + wybraną; (b) box litery zmieniony **raz** — po drugiej, poprawnej odpowiedzi jest ten sam co po pierwszej; (c) log ma event z `attempt: 2`.
Run: `pnpm vitest run --dir src src/modules/letters` → PASS.
- [ ] **Step 8:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono.
- [ ] **Step 9: Commit** `git add -A && git commit -m "feat(letters): druga próba po błędzie z dwiema opcjami" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 9: Druga próba — moduły Czytanie i Cyferki

**Kontrakt:** identyczny jak w Tasku 8, punkty 1–5 (przeczytaj je tam). `settings.secondAttempt` już istnieje.

**Files:** Modify `src/modules/reading/types.ts`, `hooks/useReadingSession.ts`, `components/SessionView.tsx`; `src/modules/numbers/types.ts`, `hooks/useNumbersSession.ts`, `components/SessionView.tsx`, `utils/buildChoices.ts`. Create `src/modules/reading/hooks/useReadingSession.retry.test.ts`, `src/modules/numbers/hooks/useNumbersSession.retry.test.ts`.

**Interfaces:** Produces `ReadingSessionEvent.attempt?: 1|2`, `NumbersSessionEvent.attempt?: 1|2`, `BuildChoicesOptions.restrictChoicesTo?: number[]`. Consumes `Settings.secondAttempt` (przekazywane z `SessionView` do hooka).

- [ ] **Step 1: Czytanie — typy.** `ReadingSessionEvent` + `attempt?: 1 | 2`; `Status` z `useReadingSession` + `'retry'`.
- [ ] **Step 2: Czytanie — hook.**
  - `handleOutcome(outcome, attempt: 1 | 2 = 1, chosen?: string)`; `updateSyllableState`/`updateWordState` oraz `correctCountRef`/`wrongCountRef` **tylko przy `attempt === 1`**; event z `attempt`.
  - Gdy `outcome === 'wrong' && attempt === 1 && settings.secondAttempt && q.type !== 'word-assembly'` (**drag-drop wyłączony** — nie ma tam „dwóch opcji"): po `playCorrectionAudio` dorzuć `plays.push(audioBus.play('try-again'))`, ustaw `setStatus('retry')` i przytnij pytanie:
```ts
const correctChoice = q.type === 'syllable-match' ? q.targetSyllable
  : q.type === 'word-choice' ? q.targetWord : q.missingSyllable
retryQuestionRef.current = { ...q, choices: shuffled([correctChoice, chosen!], rng) }
```
  `submitAnswer` musi przekazywać wybraną opcję (dostępna w call-site w `SessionView`).
  - retry-correct: graj `retry-correct` zamiast pochwały; bez `sfx-correct-ding`, bez iskierki. `resume()` w `retry` powtarza `try-again`.
- [ ] **Step 3: Czytanie — UI.** `SessionView.tsx` renderuje ćwiczenie także dla `status === 'retry'` (ta sama gałąź co `'asking'`). Sprawdź `SyllableMatchExercise` / `WordChoiceExercise` / `SyllableFillExercise` — jeśli któryś ma hardkodowany grid `repeat(4, 1fr)`, zamień na `repeat(${choices.length}, 1fr)` dla `length <= 2`.
- [ ] **Step 4: Cyferki — `buildChoices`.** `NumbersSessionEvent` + `attempt?: 1|2`. W `utils/buildChoices.ts` dodaj `restrictChoicesTo?: number[]` do `BuildChoicesOptions` i na początku funkcji:
```ts
// Faza retry: zamiast generować dystraktory, pokazujemy dokładnie dwie opcje —
// poprawną i tę, którą dziecko wybrało. Kolejność losowa (nie da się zapamiętać pozycji).
if (options.restrictChoicesTo && options.restrictChoicesTo.length > 0) {
  return shuffled(Array.from(new Set([correct, ...options.restrictChoicesTo])), options.rng ?? Math.random)
}
```
(`shuffled` z `@/shared/srs/distractors`, chyba że plik ma już własny helper tasowania.)
- [ ] **Step 5: Cyferki — hook.** `answer(outcome, attempt: 1|2 = 1, chosenValue?: number)`; SRS/liczniki tylko przy `attempt === 1`; event z `attempt`. Nowy `SessionStatus` `'retry'` + `retryChoicesRef = useRef<number[] | null>(null)`. Po `wrong` przy `attempt === 1`, gdy `secondAttempt` **i** `exerciseType` nie jest `'number-bond-builder'` ani `'fact-family-triangle'` (odpowiedź nie jest wyborem z listy) → `retryChoicesRef.current = [correctValue, chosenValue]`, `setStatus('retry')`; `advance()` dopiero po drugiej próbie. `UseNumbersSessionParams` + `secondAttempt?: boolean` (default `true`), przekazywane z `SessionView`.
- [ ] **Step 6: Cyferki — UI.** `SessionView.tsx` w `'retry'` renderuje to samo `currentQuestion` co `'asking'`, przekazując `restrictChoicesTo={session.retryChoices}` do ćwiczenia, które oddaje to do `buildChoices`. Overlay retry-correct gra `retry-correct` zamiast pochwały.
- [ ] **Step 7: Testy (po jednym na hook).** Czytanie: „wrong w `word-choice` → status `retry`, `choices.length === 2`, box słowa zmieniony raz; retry-correct nie podnosi boxa". Cyferki: „wrong → status `retry`, `retryChoices` = [poprawna, wybrana]; retry-correct nie zmienia `facts[factId].box` względem stanu po pierwszej odpowiedzi".
Run: `pnpm vitest run --dir src src/modules/reading src/modules/numbers` → PASS.
- [ ] **Step 8:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono. Ryzyko regresji dystraktorów w ~13 ćwiczeniach — `buildChoices.test.ts` musi przejść bez zmian (nowa gałąź jest opt-in).
- [ ] **Step 9: Commit** `git add -A && git commit -m "feat(reading,numbers): druga próba po błędzie z dwiema opcjami" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 10: Litery — czyste fonemy + nazwy liter + `promptMode`

**Files:** Create `src/modules/letters/audio/promptKeys.ts` + `.test.ts`. Modify `src/shared/settings/{types,defaults,settingsStore}.ts`, `components/SettingsScreen.tsx`, `src/modules/letters/hooks/useSession.ts`, `components/SessionView.tsx`.

**Interfaces:** Produces `type PromptMode = 'phoneme' | 'name' | 'both'`, `promptAudioKeys(letter: string, mode: PromptMode): string[]`, `Settings.letters: { promptMode: PromptMode; promptModeByLevel: Partial<Record<Level, PromptMode>> }`, `getEffectivePromptMode(settings, level): PromptMode`. Consumes `slugPl` i klucze `phon-*`/`letter-name-*` z Taska 2.

- [ ] **Step 1: Test** `src/modules/letters/audio/promptKeys.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { promptAudioKeys } from './promptKeys'
import { levelLetterPools } from '@/shared/settings/defaults'
import phonemes from '../../../../audio-source/letters-phonemes.json'
import names from '../../../../audio-source/letters-names.json'

describe('promptAudioKeys', () => {
  it('trzy tryby', () => {
    expect(promptAudioKeys('b', 'phoneme')).toEqual(['phon-b'])
    expect(promptAudioKeys('b', 'name')).toEqual(['letter-name-b'])
    // `both`: nazwa identyfikuje, fonem zostaje OSTATNI — jest potrzebny do scalania.
    expect(promptAudioKeys('b', 'both')).toEqual(['letter-name-b', 'phon-b'])
  })
  it('polskie znaki przez slugPl', () => {
    expect(promptAudioKeys('ż', 'both')).toEqual(['letter-name-z-', 'phon-z-'])
    expect(promptAudioKeys('ą', 'phoneme')).toEqual(['phon-a_'])
  })
  it('każda litera puli Pochodni ma wpis w obu plikach źródłowych', () => {
    for (const letter of levelLetterPools.pochodnia) {
      const [nameKey, phonKey] = promptAudioKeys(letter, 'both')
      expect(names, letter).toHaveProperty(nameKey!)
      expect(phonemes, letter).toHaveProperty(phonKey!)
    }
  })
})
```
Run → FAIL.

- [ ] **Step 2: Implementacja** `src/modules/letters/audio/promptKeys.ts`
```ts
import { slugPl } from '@/shared/audio/slugPl'
import type { PromptMode } from '@/shared/settings/types'

/**
 * W trybie `both` kolejność to NAZWA → FONEM: nazwa identyfikuje literę, a fonem
 * zostaje ostatnim bodźcem przed wyborem — to on jest potrzebny do scalania
 * głosek w słowo (Piasta & Wagner 2010). Brak pliku nie boli: `play()` zwraca
 * `false`, kolejka idzie dalej, a przy `both` dziecko usłyszy przynajmniej nazwę.
 */
export function promptAudioKeys(letter: string, mode: PromptMode): string[] {
  const slug = slugPl(letter)
  switch (mode) {
    case 'phoneme': return [`phon-${slug}`]
    case 'name': return [`letter-name-${slug}`]
    case 'both': return [`letter-name-${slug}`, `phon-${slug}`]
  }
}
```
Run → PASS.

- [ ] **Step 3: Ustawienia.** W `settings/types.ts` zdefiniuj `export type PromptMode = 'phoneme' | 'name' | 'both'` (tam, nie w module liter — inaczej cykl importów) i pole `letters: { promptMode: PromptMode; promptModeByLevel: Partial<Record<Level, PromptMode>> }`. `defaults.ts`: `letters: { promptMode: 'both', promptModeByLevel: {} }` (default `both` — Piasta & Wagner 2010). W `settingsStore.merge` dopisz deep-merge analogiczny do `reading`:
```ts
const persistedLetters = sanitizedSettings.letters as Record<string, unknown> | undefined
sanitizedSettings.letters = { ...defaultSettings.letters, ...(persistedLetters ?? {}) }
```
W `defaults.ts` dodaj `export function getEffectivePromptMode(settings: Settings, level: Level): PromptMode { return settings.letters.promptModeByLevel[level] ?? settings.letters.promptMode }`.
- [ ] **Step 4: `SettingsScreen.tsx`** — `<select data-testid="prompt-mode">` „Jak czytamy literę": `phoneme` → „Sam dźwięk (b)", `name` → „Sama nazwa (be)", `both` → „Nazwa i dźwięk (be… b)". Override per poziom w sekcji „zaawansowane" (wzór: `styleMode` per poziom).
- [ ] **Step 5: `useSession.ts`** — `UseSessionConfig` + `promptMode: PromptMode`. Zamień trzy call-site'y `letter-${target}` na `for (const k of promptAudioKeys(target, cfg.promptMode)) void cfg.audioBus.play(k)`: `generateNextQuestion` (~505), `playFeedbackAudio` case `'wrong'` (po `prefixKey`), case `'dontKnow'/'timeout'` (między `dont-know-*` a asocjacją). Podbij `FEEDBACK_DURATION_BASE_MS.wrong` z `5500` na `6300` (+800 ms na dłuższą kolejkę w `both`) i zaktualizuj komentarz nad stałą. `letter-<x>` przestaje grać, ale **plików nie kasujemy** (rollback bez rebuildu) — usunięcie w Fali 2.
- [ ] **Step 6: `SessionView.tsx`** — bierze tryb przez `getEffectivePromptMode(settings, level)`, przekazuje do hooka; handler 🔊 (`onPlayAudio` w `QuizCard`) robi `audioBus.stop()` + pętlę po `promptAudioKeys(question.targetLetter, promptMode)`.
- [ ] **Step 7:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono.
- [ ] **Step 8: Commit** `git add -A && git commit -m "feat(letters): czyste fonemy i nazwy liter + ustawienie promptMode" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 11: Czytanie — krok syntezy „MA + MA = MAMA"

**Files:** Create `src/modules/reading/hooks/blendSequence.ts` + `.test.ts`. Modify `hooks/useReadingSession.ts`, `components/FeedbackOverlay.tsx`, `components/SessionView.tsx`.

**Interfaces:** Produces `syllablesForWord(word: string): string[]`, `blendAudioKeys(word: string): string[]`; hook wystawia `blend: { syllables: string[]; activeIndex: number | null }`; `FeedbackOverlayProps.blend?`. Consumes `ALL_WORDS`, `getSyllableAudioKey`, `getWordAudioKey`, `getSyllableCue`.

- [ ] **Step 1: Test** `src/modules/reading/hooks/blendSequence.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { blendAudioKeys, syllablesForWord } from './blendSequence'
import { ALL_WORDS } from '../data/words'
import { AUDIO_KEY_RE } from '@/shared/audio/slugPl'

describe('blendSequence', () => {
  it('prefiks, sylaby w kolejności, potem całe słowo', () => {
    expect(blendAudioKeys('MAMA')).toEqual(['reading-blend-prefix', 'syl-ma', 'syl-ma', 'word-mama'])
  })
  it('każda sylaba każdego słowa ma poprawny klucz audio', () => {
    for (const w of ALL_WORDS) {
      const keys = blendAudioKeys(w.text)
      expect(keys.length, w.text).toBe(w.syllables.length + 2)
      for (const k of keys) expect(k, `${w.text} ${k}`).toMatch(AUDIO_KEY_RE)
    }
  })
  it('nieznane słowo → pusto (nie zgadujemy podziału)', () => {
    expect(blendAudioKeys('XYZ')).toEqual([]); expect(syllablesForWord('XYZ')).toEqual([])
  })
})
```
Run → FAIL.

- [ ] **Step 2: Implementacja** `src/modules/reading/hooks/blendSequence.ts`
```ts
import { ALL_WORDS, getWordAudioKey } from '../data/words'
import { getSyllableAudioKey } from '../data/syllables'

export function syllablesForWord(word: string): string[] {
  return ALL_WORDS.find((w) => w.text === word)?.syllables.slice() ?? []
}

/**
 * Jawny krok syntezy: „Składamy: MA… MA… MAMA". Bez niego dziecko nigdy nie
 * słyszy pojedynczych sylab SWOJEGO słowa — a to ten krok przenosi
 * rozpoznawanie w czytanie.
 */
export function blendAudioKeys(word: string): string[] {
  const syllables = syllablesForWord(word)
  if (syllables.length === 0) return []
  return ['reading-blend-prefix', ...syllables.map(getSyllableAudioKey), getWordAudioKey(word)]
}
```
Run → PASS.

- [ ] **Step 3: Hook.** Dodaj stan `blend` i `blendRunIdRef`. Sekwencja odpalana po **każdym** rozstrzygnięciu pytania **słownego** (`word-assembly`, `word-choice`, `syllable-fill`) — correct i wrong/dontKnow; **nie** w wariancie `wild` i **nie** w `syllable-match` (nie ma tam słowa). Asynchronicznie z `runId` (wzorzec `useReadAloud`), nie samą kolejką FIFO — pauzy trzeba wstawić jawnie:
```ts
const BLEND_PAUSE_MS = 350
const playBlend = useCallback((word: string) => {
  const syllables = syllablesForWord(word)
  if (syllables.length === 0) return
  const id = ++blendRunIdRef.current
  setBlend({ syllables, activeIndex: null })
  void (async () => {
    await audioBus.play('reading-blend-prefix')
    for (let i = 0; i < syllables.length; i++) {
      if (blendRunIdRef.current !== id) return
      setBlend({ syllables, activeIndex: i })
      await audioBus.play(getSyllableAudioKey(syllables[i]!))
      await new Promise((r) => setTimeout(r, BLEND_PAUSE_MS))
    }
    if (blendRunIdRef.current !== id) return
    setBlend({ syllables, activeIndex: null })
    await audioBus.play(getWordAudioKey(word))
  })()
}, [audioBus])
```
Wywołaj `playBlend(q.targetWord)` w `handleOutcome` po zakolejkowaniu dotychczasowego audio (correct: po pochwale; wrong/dontKnow: po `playCorrectionAudio`) i dołącz jego obietnicę do `feedbackAudioRef` — overlay nie może zniknąć w środku sekwencji. `pause()` robi `blendRunIdRef.current++`; `resume()` gra sekwencję **od początku** (jak dziś korekta). Zwróć `blend` z hooka.
- [ ] **Step 4: `FeedbackOverlay.tsx`** — nowy opcjonalny prop `blend?: { syllables: string[]; activeIndex: number | null }`. Gdy niepuste, renderuj pod ikoną rząd sylab: każda kolor + `borderBottom` z `getSyllableCue(i)`, `fontFamily: var(--font-block)`, `fontSize: 40`, aktywna z tłem `#fde047` i `transform: scale(1.15)`; `aria-hidden="true"` (to ilustracja dźwięku, nie tekst do czytania).
- [ ] **Step 5: `SessionView.tsx`** — przekaż `blend={session.blend}` do `<FeedbackOverlay …>`.
- [ ] **Step 6:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono. Odsłuchaj trudne zbitki (`DŹWIEDŹ`, `ŚLIW`, `NIĄDZ`); złe → `pronunciation-overrides.json` + `pnpm audio:build`.
- [ ] **Step 7: Commit** `git add -A && git commit -m "feat(reading): krok syntezy sylab po każdym pytaniu słownym" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 12: Czytanki — echo, tempo, licznik tapów i czasu + raport

**Files:** Modify `src/shared/audio/AudioBus.ts`, `src/modules/czytanki/hooks/useReadAloud.ts`, `components/CzytankaView.tsx`, `components/scene.css`, `store/czytankiStore.ts`, `src/shared/settings/{types,defaults,settingsStore}.ts`, `src/shared/stats/components/ReportScreen.tsx`, `src/shared/stats/exporter.ts`. Create/extend `src/modules/czytanki/store/czytankiStore.test.ts`.

**Interfaces:** Produces `AudioBus.setPlaybackRate(rate: number): void`; `useReadAloud({ czytanka, audioBus, echoMode, tempo })` → `{ reading, activeWord, echoing: number | null, toggle, stop, skipEcho }`; `CzytankiState.wordTaps: Record<string, Record<string, number>>`, `.timeMs: Record<string, number>`, `recordVisit(id, taps, ms)`; `Settings.czytanki: { echoMode: boolean; tempo: 'turtle'|'normal' }`; `CzytankiSnapshot` + `wordTaps`/`timeMs`.

- [ ] **Step 1: `AudioBus.setPlaybackRate`** — pole `private playbackRate = 1` i metoda:
```ts
/**
 * Tempo kolejnych klipów. Przypisywane w `playOne` przy KAŻDYM klipie —
 * `playbackRate` gubi się przy podmianie `src`. <0.5 zniekształca głos w iOS Safari.
 */
setPlaybackRate(rate: number): void { this.playbackRate = Math.min(2, Math.max(0.5, rate)) }
```
W `playOne`, zaraz po `audio.currentTime = 0`, dopisz `audio.playbackRate = this.playbackRate`.
- [ ] **Step 2: Ustawienia** — `Settings.czytanki: { echoMode: boolean; tempo: 'turtle' | 'normal' }`, defaulty `{ echoMode: false, tempo: 'normal' }` (echo włącza dziecko ikoną — ustawienie tylko **pamięta** wybór). W `settingsStore.merge` deep-merge jak dla `reading`.
- [ ] **Step 3: `useReadAloud`** — stałe `ECHO_PAUSE_MS = 2500`, `SENTENCE_PAUSE_MS = 450`, `SENTENCE_PAUSE_TURTLE_MS = 700`, `TURTLE_RATE = 0.75`. Parametry `echoMode: boolean`, `tempo: 'turtle'|'normal'`. W `toggle()` przed pętlą `audioBus.setPlaybackRate(tempo === 'turtle' ? TURTLE_RATE : 1)`; w `stop()` przywróć `1`. Po każdym **zdaniu**: gdy `echoMode` → `setEchoing(s)` i czekaj `ECHO_PAUSE_MS` na timerze trzymanym w refie (nie gołe `setTimeout` w `await` — `stop()` musi go czyścić), potem `setEchoing(null)`; bez echa — dotychczasowa pauza (`SENTENCE_PAUSE_TURTLE_MS` przy żółwiu). `skipEcho()` czyści timer i rozwiązuje oczekiwanie natychmiast. `stop()` (już inkrementuje `runId`) dodatkowo czyści timer echa — wyjście w trakcie pauzy nie może odpalić kolejnego zdania.
- [ ] **Step 4: `CzytankaView` — UI.** Dwie ikony 60×60 obok ▶ w scenie: 🗣 (echo on/off) i 🐢 (tempo). Tap gra cue (`czytanki-ui-echo-on`/`-echo-off`/`-slow`/`-normal`) i zapisuje przez `updateSetting('czytanki', …)`. Przy uruchomieniu ▶ z włączonym echem zagraj raz `czytanki-echo-intro` (przed pierwszym słowem). Gdy `echoing !== null` — pulsująca ikona 🗣 (64 px) nad tekstem; w `scene.css` dodaj keyframes i regułę `@media (prefers-reduced-motion: reduce) { animation: none !important }`. Tap w obszarze tekstu w stanie `echoing` woła `skipEcho()`.
- [ ] **Step 5: Store v2.** `version: 2`; `initialState` + `wordTaps: {}`, `timeMs: {}`; `mergeCzytankiState` dopisuje defaulty z guardami typu jak reszta. Nowa akcja:
```ts
/** Batch na wyjściu z ekranu — nie zapisujemy per tap (persist to zapis do localStorage). */
recordVisit: (id: string, taps: Record<string, number>, ms: number) =>
  set((s) => {
    const merged = { ...(s.wordTaps[id] ?? {}) }
    for (const [slug, n] of Object.entries(taps)) merged[slug] = (merged[slug] ?? 0) + n
    return { wordTaps: { ...s.wordTaps, [id]: merged },
             timeMs: { ...s.timeMs, [id]: (s.timeMs[id] ?? 0) + ms } }
  }),
```
`resetAllProgress` robi `set(initialState)` — czyści też tapy i czas.
- [ ] **Step 6: Zliczanie w `CzytankaView`.** Tap w sylabę **i** long-press liczą się do **słowa**: klucz = `wordAudioKey(word.syllables)` bez prefiksu `cz-word-`. Trzymaj `tapsRef = useRef<Record<string, number>>({})` i `enteredAtRef = useRef(Date.now())`:
```ts
const VISIT_CAP_MS = 10 * 60_000   // zapomniana karta nie może zaliczyć godzin
const flushVisit = useCallback(() => {
  const ms = Math.min(VISIT_CAP_MS, Date.now() - enteredAtRef.current)
  const taps = tapsRef.current
  if (ms > 0 || Object.keys(taps).length > 0) recordVisit(czytanka.id, taps, ms)
  tapsRef.current = {}; enteredAtRef.current = Date.now()
}, [czytanka.id, recordVisit])
```
Wołaj w cleanupie efektu (unmount / zmiana `czytanka.id`) i w `usePageVisibility({ onHidden })` obok `stop()`; w `onVisible` zresetuj `enteredAtRef.current = Date.now()`.
- [ ] **Step 7: Raport.** W `ReportScreen.CzytankiStats` dodaj „Najczęściej dotykane" (top 5 malejąco, format `WIE-WIÓR-KA — 7×`; slug → tekst przez wyszukanie słowa w `CZYTANKI` po `wordAudioKey`) i „Łączny czas czytania: X min" (`Math.round(sum / 60000)`). Brak danych → sekcja jak dziś. W `exporter.ts` rozszerz `CzytankiSnapshot` o `wordTaps`/`timeMs` i dopisz te same dwie linie do sekcji `## Czytanki`; w `ReportScreen.handleCopy` przekaż nowe pola z `useCzytanki.getState()`.
- [ ] **Step 8: Testy** (`czytankiStore.test.ts`): (a) merge v1→v2 daje puste mapy i **nie gubi** `openedIds`; (b) `recordVisit` kumuluje tapy i czas przy dwóch wizytach; (c) top-5 sortuje malejąco (test helpera z `ReportScreen`, jeśli go wyekstrahujesz — inaczej pomiń).
Run: `pnpm vitest run --dir src src/modules/czytanki` → PASS.
- [ ] **Step 9:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono.
- [ ] **Step 10: Commit** `git add -A && git commit -m "feat(czytanki): tryb echo, tempo żółwia oraz licznik tapów i czasu w raporcie" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 13: Stopping cue + jedna kontrolka długości sesji (settings v5)

**Files:** Create `src/shared/stats/todaySessions.ts`, `src/shared/settings/settingsStore.migration.test.ts`. Modify `src/shared/settings/{types,defaults,settingsStore}.ts`, `components/SettingsScreen.tsx`, `src/modules/letters/components/{SessionView,SessionEnd}.tsx`, `src/modules/reading/components/SessionEnd.tsx`, `src/modules/reading/hooks/useReadingSession.ts`, `src/modules/numbers/components/{SessionView,SessionEnd}.tsx`, `src/shared/stats/components/SuggestionsSection.tsx`, `src/shared/stats/exporter.ts`.

**Interfaces:** Produces `Settings.questionsPerSession: 5 | 8 | 12` (globalne, default `8`); `Settings.sessionLength` **usunięte**; `completedSessionsToday(sessions: readonly UnifiedSession[], now: number): number`. Consumes `toUnifiedSessions` z `@/shared/stats/aggregate`.

- [ ] **Step 1: Typy i defaulty** — w `types.ts` usuń `sessionLength` z `Settings` (typ `SessionLength` **zostaw** — używa go migracja), dodaj `questionsPerSession: 5 | 8 | 12`. W `defaults.ts`: `questionsPerSession: 8`, usuń `sessionLength: 10`. „Zaawansowane" zostają: `reading.questionsPerSession[level]` bez zmian, `numbers.questionCount` staje się **overridem**.
- [ ] **Step 2: Migracja v4 → v5** w `settingsStore.ts` (`version: 5`; konwencja append-only — dopisz POD istniejącymi guardami w `merge`, nie reorderuj):
```ts
// v4 → v5: `sessionLength` (5|10|15, Litery) → globalne `questionsPerSession` (5|8|12).
const legacyLength = sanitizedSettings.sessionLength
if (sanitizedSettings.questionsPerSession === undefined && typeof legacyLength === 'number') {
  sanitizedSettings.questionsPerSession = legacyLength >= 15 ? 12 : legacyLength <= 5 ? 5 : 8
}
delete sanitizedSettings.sessionLength
```
- [ ] **Step 3: Test migracji** `settingsStore.migration.test.ts` — wsadź do `localStorage` blob v4 z `settings: { sessionLength: 10, celebrationTempo: 'long', humorMode: 'off' }`, zrób `await useSettings.persist.rehydrate()` i sprawdź: `questionsPerSession === 8`, `celebrationTempo === 'long'`, `humorMode === 'off'`, `'sessionLength' in settings === false`. Run `pnpm vitest run --dir src src/shared/settings` → PASS.
- [ ] **Step 4: Konsumenci** — `letters/components/SessionView.tsx:84,166` → `settings.questionsPerSession`; `numbers/components/SessionView.tsx:72` → `settings.numbers?.questionCount ?? settings.questionsPerSession`; `reading/hooks/useReadingSession.ts:411` → `settings.reading.questionsPerSession[level] ?? settings.questionsPerSession`; `exporter.ts:244` → `- Długość sesji: ${settings.questionsPerSession} pytań`.
- [ ] **Step 5: `SettingsScreen.tsx`** — sekcja `data-testid="section-session-length"` staje się globalna: `SESSION_LENGTH_OPTIONS` → `[5, 8, 12] as const`, `name="questionsPerSession"`, `checked={settings.questionsPerSession === opt}`, `onChange={() => updateSetting('questionsPerSession', opt)}`, `data-testid={\`questions-per-session-${opt}\`}`, label „Ile pytań". Per-poziom Czytania i `numbers.questionCount` przenieś pod nagłówek „Zaawansowane (nadpisują globalną)".
- [ ] **Step 6: `src/shared/stats/todaySessions.ts`**
```ts
import type { UnifiedSession } from './aggregate'
/** Sesje ukończone DZIŚ, we wszystkich modułach. Puste (0 pytań) się nie liczą. */
export function completedSessionsToday(sessions: readonly UnifiedSession[], now: number): number {
  const d = new Date(now); d.setHours(0, 0, 0, 0)
  const from = d.getTime()
  return sessions.filter((s) => s.startedAt >= from && s.questions > 0).length
}
```
- [ ] **Step 7: Stopping cue w trzech `SessionEnd`.** W `useEffect` grającym audio końca, **po** własnym kluczu (`session-end` / `session-end-perfect` / `session-end-good`):
```ts
// „Na dziś wystarczy" — dwie krótkie sesje biją jedną długą. Liczymy sesje ze
// WSZYSTKICH modułów (dziecko mogło już grać w Cyferki).
const enough = completedSessionsToday(toUnifiedSessions({
  letters: useLetters.getState().sessions,
  reading: useReading.getState().sessions,
  numbers: useNumbers.getState().sessions,
}), Date.now()) >= 2
if (enough) void audioBus.play('session-stop-enough')
```
Gdy `enough` — 🏠 jest **głównym** przyciskiem (pełna szerokość, `colors.accentGreen`), „jeszcze raz" schodzi na mniejszy, boczny. Oba dalej ≥60×60.
- [ ] **Step 8: Nudge dla rodzica** — `generateSuggestions` dostaje parametr `sessionsToday?: number` i regułę: gdy `sessionsToday === 1` → `'Dziś była jedna sesja; druga wieczorem działa lepiej niż jedna długa.'`. Przekaż wartość z `ReportScreen` **i** z `exporter.ts` (ta sama funkcja karmi oba — treść UI ≡ markdown).
- [ ] **Step 9:** `pnpm tsc -b && pnpm vitest run --dir src` → zielono; testy `SettingsScreen`/`exporter` odwołujące się do `sessionLength` wymagają aktualizacji na `questionsPerSession`.
- [ ] **Step 10: Commit** `git add -A && git commit -m "feat(settings): jedna kontrolka długości sesji (v5) + stopping cue na koniec" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

---

### Task 14: Dokumentacja + weryfikacja końcowa

**Files:** Modify `CLAUDE.md`, `docs/STATUS.md`.

- [ ] **Step 1: `CLAUDE.md`**
  - **Audio:** nowe źródła `letters-phonemes.json` (zofia/`azure-ipa`, klucze `phon-<slug>`) i `letters-names.json` (zofia/`azure`, `letter-name-<slug>`); `syllables.json` jest teraz **generowany** przez `pnpm audio:reading`.
  - **Struktura:** `scripts/reading-audio-source.ts`, `src/shared/audio/{slugPl,pickPraiseMixed}.ts`, `src/shared/stats/todaySessions.ts`, `src/modules/letters/audio/promptKeys.ts`, `src/modules/reading/hooks/blendSequence.ts`, `src/modules/numbers/data/strategyAudio.ts`, `src/modules/numbers/hooks/pickConcept.ts`.
  - **Komendy:** `pnpm audio:reading`; zaktualizuj liczbę mp3 (z `pnpm audio:check`, Task 2 Step 10) i liczbę testów.
  - **Persist:** `iskierki-state-v1` → `version: 5` (`questionsPerSession` zamiast `sessionLength`, nowe `letters.*`, `czytanki.*`, `secondAttempt`); `iskierki-czytanki-v1` → `version: 2` (`wordTaps`, `timeMs`).
  - **Gdzie ŁATWO się pomylić:** (a) klucz audio sylab modułu 2 ≠ id SRS — `getSyllableAudioKey` vs `getSyllableId`; (b) `AudioBus` `playbackRate` musi być przypisywany w `playOne` przy każdym klipie; (c) `FEEDBACK_DURATION_BASE_MS.wrong` uwzględnia tryb promptu `both`.
  - **Co JESZCZE nie działa:** usuń „Czyste fonemy IPA — niemożliwe" (zrobione przez Azure); dopisz nie-cele Fali 2/3 ze speca.
- [ ] **Step 2: `docs/STATUS.md`** — nowa sekcja na górze „Fala 1 dydaktyka ukończona (2026-08-29)": 11 pozycji ze speca po zdaniu każda, lista kluczy audio wymagających `pronunciation-overrides.json` / `manual-overrides/` (z Taska 2), otwarte ryzyka (izolowane zwarte w Azure; diakrytyki w nazwach plików → sprawdzić 404 po deployu).
- [ ] **Step 3: Weryfikacja końcowa** — uruchom po kolei:
```bash
pnpm tsc -b
pnpm vitest run --dir src
pnpm vitest run --dir scripts
pnpm build
pnpm audio:check
```
Expected: 0 błędów TS; wszystkie testy zielone (baseline przed Falą 1: 746); build bez błędów; `✓ Wszystkie N pliki audio na miejscu.`
- [ ] **Step 4: Test w przeglądarce (iPad viewport — priorytet > testów jednostkowych).** `pnpm dev`, chrome-devtools-mcp `emulate` iPad 1180×820 landscape i 820×1180 portrait. Checklist:
  1. Litery: prompt gra „be… b"; po błędzie 2 kafelki + `try-again`; retry-correct gra `retry-correct` i **nie** daje iskierki.
  2. Czytanie: po pytaniu słownym słychać sylaby po kolei i całe słowo, overlay podświetla aktualną; sylaby mają różny kolor **i** podkreślenie.
  3. Cyferki: polecenie wypowiada liczby; po błędzie strategia max 2× na sesję; koncepty widocznie rozłożone.
  4. Czytanki: 🗣 i 🐢 działają, echo robi pauzę po zdaniu, żółw czyta wolniej; raport pokazuje top-5 tapów i czas.
  5. Koniec sesji: po drugiej dzisiejszej sesji gra `session-stop-enough`, 🏠 jest głównym przyciskiem.
  6. Konsola: **zero** 404 na `/audio/*.mp3` (diakrytyki w nazwach plików).
  Znalezione problemy popraw i zacommituj jako `fix(...)`.
- [ ] **Step 5: Commit** `git add -A && git commit -m "docs: Fala 1 — CLAUDE.md i STATUS.md po wdrożeniu" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`

> **Push:** sieć usera zrywa uploady >2 MB — nowe mp3 (~160 plików) pushuj w paczkach ≤1 MB, po jednym commicie naraz. Nie pushuj bez polecenia usera.
