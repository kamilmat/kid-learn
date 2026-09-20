import type { BgKind, Czytanka, CzytankaGroup, Punct, Sentence, Word } from './types'
import { PEOPLE, layoutScene } from './layoutScene'
import { PROPER_NAMES } from './lexicon'

/**
 * Zwarty zapis czytanki z puli generowanej — 1900 pełnych obiektów ze scenami
 * byłoby nieczytelne w review. Tekst: słowa rozdzielone spacją, sylaby
 * myślnikiem, interpunkcja przyklejona do słowa (`TA-TA MA LO-DY.`).
 * Emoji rozdzielone spacją (ZWJ i selektory wariantu zostają w jednym tokenie).
 */
export type CompactCzytanka = readonly [
  num: number,
  bg: BgKind,
  scene: string,
  text: string,
  question: string,
  options: string,
  answer: 0 | 1 | 2,
  tile?: string,
]

const PUNCT_RE = /[.,!?]$/

export function parseWords(text: string): Word[] {
  return text.trim().split(/\s+/).map((token) => {
    const punct = PUNCT_RE.test(token) ? (token.slice(-1) as Punct) : undefined
    const body = punct ? token.slice(0, -1) : token
    const syllables = body.split('-')
    return punct ? { syllables, punct } : { syllables }
  })
}

export function parseSentences(text: string): Sentence[] {
  const sentences: Word[][] = []
  let current: Word[] = []
  for (const word of parseWords(text)) {
    current.push(word)
    if (word.punct && word.punct !== ',') {
      sentences.push(current)
      current = []
    }
  }
  if (current.length > 0) sentences.push(current)
  return sentences
}

export function splitEmoji(list: string): string[] {
  return list.trim().split(/\s+/).filter(Boolean)
}

/** Zdanie zwykłą pisownią: „Tata ma lody”, imiona wielką literą. */
export function sentenceCase(words: readonly Word[]): string {
  return words
    .map((word, i) => {
      const joined = word.syllables.join('')
      const lower = joined.toLowerCase()
      const text = i === 0 || PROPER_NAMES.has(joined) ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
      return text + (word.punct ?? '')
    })
    .join(' ')
}

/**
 * Kafelek listy: pierwszy przedmiot/zwierzę sceny, najlepiej nie poprawna
 * odpowiedź na ❓ — sceny zwykle zaczynają się od postaci, więc same twarze
 * na kafelkach byłyby nie do odróżnienia.
 */
export function pickTileEmoji(scene: readonly string[], answer: string | undefined): string {
  // Kafelek NIGDY nie pokazuje poprawnej odpowiedzi — dziecko zapamiętałoby ją
  // z listy i trafiało w ❓ bez czytania. Gdy w scenie nie ma nic innego, wolimy
  // neutralne 📖 niż podpowiedź.
  const other = scene.filter((e) => e !== answer)
  return other.find((e) => !PEOPLE.has(e)) ?? other[0] ?? '📖'
}

export function czytankaId(num: number): string {
  return `cz-${String(num).padStart(2, '0')}`
}

export function expandCompact(group: CzytankaGroup, c: CompactCzytanka): Czytanka {
  const [num, bg, scene, text, question, options, answer, tile] = c
  const sentences = parseSentences(text)
  const sceneEmoji = splitEmoji(scene)
  const questionWords = parseWords(question)
  const firstSentence = sentences[0] ?? []
  const title = sentenceCase(firstSentence).replace(/[.!?,]$/, '')
  const opts = splitEmoji(options)
  return {
    id: czytankaId(num),
    group,
    title,
    emoji: tile ?? pickTileEmoji(sceneEmoji, opts[answer]),
    sentences,
    scene: { bg, actors: layoutScene(sceneEmoji, num) },
    comprehension: {
      question: sentenceCase(questionWords),
      options: [opts[0] ?? '', opts[1] ?? '', opts[2] ?? ''],
      answer,
      questionWords: questionWords.map((w) => w.syllables),
    },
  }
}
