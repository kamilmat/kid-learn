// Generuje źródła audio czytanek z danych (unikalne sylaby + słowa).
// Pliki wynikowe NIE są edytowane ręcznie. Uruchom: pnpm audio:czytanki
//
// Sylaby i słowa są rozdzielone, bo mają różne silniki Azure: izolowaną
// sylabę trzeba czytać z jawnym IPA ("lo" → "elo" bez tego), więc idzie
// przez `azure-ipa`; całe słowa Azure wymawia poprawnie z samej ortografii,
// więc zostają na zwykłym SSML (`azure`, głos Agnieszka, plain text, bez IPA).
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CZYTANKI } from '../src/modules/czytanki/data/czytanki'
import { syllableAudioKey, wordAudioKey } from '../src/modules/czytanki/data/audioKeys'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AUDIO_SOURCE_DIR = join(ROOT, 'audio-source')
const SYLLABLES_OUT = join(AUDIO_SOURCE_DIR, 'czytanki-syllables.json')
const WORDS_OUT = join(AUDIO_SOURCE_DIR, 'czytanki-words.json')
const LEGACY_OUT = join(AUDIO_SOURCE_DIR, 'czytanki.json')

export type CzytankiSources = {
  syllables: Record<string, string>
  words: Record<string, string>
}

export function buildCzytankiSource(): CzytankiSources {
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
  const syllables: Record<string, string> = { _voice: 'agnieszka', _engine: 'azure-ipa' }
  for (const [k, v] of [...syl.entries()].sort()) syllables[k] = v
  const wordMap: Record<string, string> = { _voice: 'agnieszka', _engine: 'azure' }
  for (const [k, v] of [...words.entries()].sort()) wordMap[k] = v
  return { syllables, words: wordMap }
}

function countKeys(map: Record<string, string>): number {
  return Object.keys(map).filter((k) => !k.startsWith('_')).length
}

const { syllables, words } = buildCzytankiSource()
writeFileSync(SYLLABLES_OUT, JSON.stringify(syllables, null, 2) + '\n', 'utf8')
writeFileSync(WORDS_OUT, JSON.stringify(words, null, 2) + '\n', 'utf8')
if (existsSync(LEGACY_OUT)) rmSync(LEGACY_OUT)
console.log(
  `czytanki-syllables.json: ${countKeys(syllables)} kluczy (azure-ipa), ` +
    `czytanki-words.json: ${countKeys(words)} kluczy (azure)`,
)
