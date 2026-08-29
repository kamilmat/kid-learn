// Generuje audio-source/syllables.json: SYLLABLE_TEXTS ∪ sylaby ALL_WORDS.
// Plik wynikowy NIE jest edytowany ręcznie. Uruchom: pnpm audio:reading
//
// Izolowaną sylabę Azure zgaduje źle ("lo" → "elo"), więc idzie przez
// `azure-ipa` (IPA liczy scripts/polishG2p.ts). Głos: Zofia — lektor modułów 1-3.
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
