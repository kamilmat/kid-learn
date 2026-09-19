import type { BgKind, CzytankaGroup } from './types'
import type { CompactCzytanka } from './compact'
import { parseSentences, parseWords, splitEmoji } from './compact'
import { LEXICON } from './lexicon'

// Reguły trudności grup — te same, którymi układano cz-01…cz-100, tu
// egzekwowane dla puli generowanej (test + `scripts/czytanki-validate.ts`).
export const GROUP_RULES: Record<CzytankaGroup, { sentences: [number, number]; words: [number, number] }> = {
  1: { sentences: [1, 1], words: [3, 3] },
  2: { sentences: [2, 2], words: [3, 4] },
  3: { sentences: [3, 4], words: [3, 5] },
  4: { sentences: [5, 6], words: [3, 6] },
}

export const OPEN_CV = /^[BCDFGHJKLŁMNPRSTWZ]?[AEIOUYÓ]$/u
const BGS: readonly BgKind[] = ['sky', 'room', 'meadow', 'forest', 'beach', 'night', 'snow', 'kitchen']
const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/u
const NEGATION = /(?<!\p{L})nie(?!\p{L})|dlaczego/iu

/** Tekst bez podziału i interpunkcji — do wykrywania duplikatów. */
export function normalizedText(text: string): string {
  return text.replace(/[-.,!?]/g, '').replace(/\s+/g, ' ').trim()
}

function checkWord(syllables: readonly string[], where: string, errors: string[]): void {
  const joined = syllables.join('')
  const known = LEXICON.get(joined)
  if (!known) errors.push(`${where}: słowa ${syllables.join('-')} nie ma w słowniku`)
  else if (known.join('-') !== syllables.join('-')) {
    errors.push(`${where}: ${syllables.join('-')} — w słowniku podział ${known.join('-')}`)
  }
}

export function validateCompact(group: CzytankaGroup, c: CompactCzytanka): string[] {
  const errors: string[] = []
  const [num, bg, scene, text, question, options, answer, tile] = c
  const where = `#${num}`
  if (!BGS.includes(bg)) errors.push(`${where}: nieznane tło ${bg}`)
  if (text !== text.toUpperCase()) errors.push(`${where}: tekst musi być WIELKIMI literami`)

  const rules = GROUP_RULES[group]
  const sentences = parseSentences(text)
  if (sentences.length < rules.sentences[0] || sentences.length > rules.sentences[1]) {
    errors.push(`${where}: ${sentences.length} zdań, grupa ${group} wymaga ${rules.sentences.join('–')}`)
  }
  sentences.forEach((sent, i) => {
    if (sent.length < rules.words[0] || sent.length > rules.words[1]) {
      errors.push(`${where}: zdanie ${i + 1} ma ${sent.length} słów, grupa ${group} wymaga ${rules.words.join('–')}`)
    }
    const last = sent[sent.length - 1]
    if (!last?.punct || last.punct === ',') errors.push(`${where}: zdanie ${i + 1} bez kropki/!/?`)
    for (const w of sent) {
      checkWord(w.syllables, where, errors)
      if (group === 1) {
        for (const s of w.syllables) if (!OPEN_CV.test(s)) errors.push(`${where}: sylaba ${s} nie jest otwarta CV (grupa 1)`)
      }
    }
  })

  const qWords = parseWords(question)
  if (question !== question.toUpperCase()) errors.push(`${where}: pytanie musi być WIELKIMI literami`)
  if (qWords.length > 5) errors.push(`${where}: pytanie ma ${qWords.length} słów (max 5)`)
  if (qWords[qWords.length - 1]?.punct !== '?') errors.push(`${where}: pytanie bez „?”`)
  if (NEGATION.test(question.replace(/-/g, ''))) errors.push(`${where}: pytanie z przeczeniem/„dlaczego”`)
  for (const w of qWords) checkWord(w.syllables, `${where} (pytanie)`, errors)

  const sceneEmoji = splitEmoji(scene)
  if (sceneEmoji.length < 1 || sceneEmoji.length > 5) errors.push(`${where}: scena ma ${sceneEmoji.length} emoji (1–5)`)
  const opts = splitEmoji(options)
  if (opts.length !== 3 || new Set(opts).size !== 3) errors.push(`${where}: opcje muszą być 3 różnymi emoji`)
  if (![0, 1, 2].includes(answer)) errors.push(`${where}: answer poza 0–2`)
  for (const e of [...sceneEmoji, ...opts, ...(tile ? [tile] : [])]) {
    if (SKIN_TONE.test(e)) errors.push(`${where}: emoji ${e} z odcieniem skóry`)
  }
  const correct = opts[answer]
  if (correct && !sceneEmoji.includes(correct) && tile !== correct) {
    errors.push(`${where}: poprawnej odpowiedzi ${correct} nie ma w scenie ani na kafelku`)
  }
  if (!opts.some((o, i) => i !== answer && sceneEmoji.includes(o))) {
    errors.push(`${where}: żaden dystraktor nie jest widoczny w scenie (anty-three-cueing)`)
  }
  return errors
}
