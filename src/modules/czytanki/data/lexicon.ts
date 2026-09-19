import { LEXICON_TEXT } from './lexiconText'
import { EXTRA_LEXICON_TEXT } from './generated/extraLexicon'

/**
 * Słownik czytanek = budżet nagrań. Każda forma to jedno nagranie `cz-word-*`
 * i jeden, ustalony podział na sylaby. Czytanki z puli generowanej mogą używać
 * wyłącznie form stąd — dzięki temu dziecko spotyka te same wyrazy w wielu
 * zdaniach (rozpoznaje słowo, nie zdanie), a liczba nagrań jest skończona.
 *
 * Format `lexiconText.ts`: formy rozdzielone białymi znakami, sylaby myślnikiem,
 * `*` na początku = imię (wielka litera w tytułach), `#` do końca linii = komentarz.
 */
function parseLexicon(text: string): { forms: Map<string, string[]>; names: Set<string>; conflicts: string[] } {
  const forms = new Map<string, string[]>()
  const names = new Set<string>()
  const conflicts: string[] = []
  for (const line of text.split('\n')) {
    const body = line.replace(/#.*$/, '')
    for (const raw of body.trim().split(/\s+/)) {
      if (!raw) continue
      const isName = raw.startsWith('*')
      const syllables = (isName ? raw.slice(1) : raw).split('-')
      const joined = syllables.join('')
      const prev = forms.get(joined)
      if (prev && prev.join('-') !== syllables.join('-')) conflicts.push(`${prev.join('-')} ≠ ${syllables.join('-')}`)
      if (!prev) forms.set(joined, syllables)
      if (isName) names.add(joined)
    }
  }
  return { forms, names, conflicts }
}

const parsed = parseLexicon(LEXICON_TEXT + '\n' + EXTRA_LEXICON_TEXT)

/** Forma (wielkie litery, bez podziału) → sylaby. */
export const LEXICON: ReadonlyMap<string, readonly string[]> = parsed.forms
export const PROPER_NAMES: ReadonlySet<string> = parsed.names
/** Ta sama forma wpisana dwa razy z różnym podziałem — musi być pusta. */
export const LEXICON_CONFLICTS: readonly string[] = parsed.conflicts
export { parseLexicon }
