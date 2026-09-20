// Walidacja puli generowanej czytanek: `pnpm tsx scripts/czytanki-validate.ts [plik...]`.
// Bez argumentów sprawdza wszystkie `src/modules/czytanki/data/generated/g*.ts`.
// Wypisuje błędy, słowa spoza słownika (z liczbą wystąpień) i rozkład odpowiedzi.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { CompactCzytanka } from '../src/modules/czytanki/data/compact'
import { parseWords } from '../src/modules/czytanki/data/compact'
import type { CzytankaGroup } from '../src/modules/czytanki/data/types'
import { syllableAudioKey, wordAudioKey } from '../src/modules/czytanki/data/audioKeys'
import { normalizedText, validateCompact } from '../src/modules/czytanki/data/validate'
import { CZYTANKI_LEGACY } from '../src/modules/czytanki/data/czytanki'
import { LEXICON, LEXICON_CONFLICTS } from '../src/modules/czytanki/data/lexicon'

console.log(`Słownik: ${LEXICON.size} form`)
for (const c of LEXICON_CONFLICTS) console.log(`KONFLIKT PODZIAŁU w słowniku: ${c}`)
if (LEXICON_CONFLICTS.length > 0) process.exitCode = 1

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GEN_DIR = join(ROOT, 'src/modules/czytanki/data/generated')

const args = process.argv.slice(2)
const files = args.length > 0
  ? args.map((f) => resolve(f))
  : readdirSync(GEN_DIR).filter((f) => /^g\d.*\.ts$/.test(f)).map((f) => join(GEN_DIR, f))

const seenText = new Map<string, string>()
for (const c of CZYTANKI_LEGACY) {
  seenText.set(c.sentences.map((s) => s.map((w) => w.syllables.join('') + (w.punct ?? '')).join(' ')).join(' ').replace(/[.,!?]/g, '').trim(), c.id)
}
// Numery ręcznych cz-01…cz-100 są zajęte — bez zasiania skrypt przepuściłby kolizję id.
const seenIds = new Set<number>(CZYTANKI_LEGACY.map((c) => Number(c.id.replace('cz-', ''))))
let total = 0
let errorCount = 0
const unknown = new Map<string, number>()

// Słownik pilnuje spójnego podziału na sylaby, ale NIE istnienia nagrania —
// formę można do niego dopisać i nigdy nie nagrać. Manifest plus pliki na dysku
// to jedyne źródło prawdy (paczki audio jadą do repo osobnymi commitami).
const manifestPath = join(ROOT, 'public/audio/.manifest.json')
const manifestRaw = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>)
  : {}
// Manifest bywa zapisany płasko albo pod kluczem `entries` — obsługujemy oba.
const manifest = (manifestRaw.entries ?? manifestRaw) as Record<string, unknown>
const audioDir = join(ROOT, 'public/audio')
const recorded = new Set(
  existsSync(audioDir)
    ? readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4))
    : [],
)
const noAudio = new Map<string, number>()

function needKey(key: string): void {
  if (!(key in manifest) || !recorded.has(key)) noAudio.set(key, (noAudio.get(key) ?? 0) + 1)
}

function checkAudio(c: CompactCzytanka): void {
  // Tekst: dziecko stuka sylaby i przytrzymuje słowa, więc potrzebne są oba klucze.
  for (const w of parseWords(c[3])) {
    needKey(wordAudioKey(w.syllables))
    for (const syl of w.syllables) needKey(syllableAudioKey(syl))
  }
  // Pytanie ❓ gra tylko całymi słowami — jego sylab nikt nie odtwarza.
  for (const w of parseWords(c[4])) needKey(wordAudioKey(w.syllables))
}

for (const file of files) {
  const m = /^g(\d)/.exec(basename(file))
  if (!m) { console.error(`${file}: nazwa musi zaczynać się od g<grupa>`); process.exitCode = 1; continue }
  const group = Number(m[1]) as CzytankaGroup
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>
  const list = Object.values(mod).find(Array.isArray) as CompactCzytanka[] | undefined
  if (!list) { console.error(`${file}: brak eksportowanej tablicy`); process.exitCode = 1; continue }
  const dist = [0, 0, 0]
  for (const c of list) {
    total++
    dist[c[6]]! += 1
    const errs = validateCompact(group, c)
    checkAudio(c)
    if (seenIds.has(c[0])) errs.push(`#${c[0]}: powtórzony numer`)
    seenIds.add(c[0])
    const norm = normalizedText(c[3])
    const dup = seenText.get(norm)
    if (dup) errs.push(`#${c[0]}: ten sam tekst co ${dup}`)
    seenText.set(norm, `#${c[0]}`)
    for (const e of errs) {
      const u = /słowa (\S+) nie ma w słowniku/.exec(e)
      if (u) unknown.set(u[1]!, (unknown.get(u[1]!) ?? 0) + 1)
      else { console.log(`${basename(file)} ${e}`); errorCount++ }
    }
  }
  console.log(`${basename(file)}: ${list.length} czytanek, odpowiedzi [${dist.join(', ')}]`)
}
if (noAudio.size > 0) {
  console.log(`\nKlucze bez nagrania (${noAudio.size}) — uruchom \`pnpm audio:build\`:`)
  console.log([...noAudio.keys()].sort().slice(0, 60).join(' '))
}
if (unknown.size > 0) {
  console.log(`\nSłowa spoza słownika (${unknown.size}):`)
  console.log([...unknown.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}×${n}`).join(' '))
}
console.log(
  `\nRazem: ${total} czytanek, błędów (poza słownikiem): ${errorCount}, ` +
    `słów spoza słownika: ${unknown.size}, kluczy bez nagrania: ${noAudio.size}`,
)
if (errorCount > 0 || unknown.size > 0 || noAudio.size > 0) process.exitCode = 1
