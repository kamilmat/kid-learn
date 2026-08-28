// Generuje audio-source/czytanki.json z danych czytanek (unikalne sylaby + słowa).
// Plik wynikowy NIE jest edytowany ręcznie. Uruchom: pnpm audio:czytanki
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CZYTANKI } from '../src/modules/czytanki/data/czytanki'
import { syllableAudioKey, wordAudioKey } from '../src/modules/czytanki/data/audioKeys'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'audio-source', 'czytanki.json')

export function buildCzytankiSource(): Record<string, string> {
  const out: Record<string, string> = { _voice: 'zofia' }
  const syl = new Map<string, string>()
  const words = new Map<string, string>()
  for (const c of CZYTANKI) {
    for (const sent of c.sentences) {
      for (const w of sent) {
        for (const s of w.syllables) syl.set(syllableAudioKey(s), s.toLowerCase())
        words.set(wordAudioKey(w.syllables), w.syllables.join('').toLowerCase())
      }
    }
  }
  for (const [k, v] of [...syl.entries()].sort()) out[k] = v
  for (const [k, v] of [...words.entries()].sort()) out[k] = v
  return out
}

const map = buildCzytankiSource()
writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n', 'utf8')
console.log(`czytanki.json: ${Object.keys(map).length - 1} kluczy`)
