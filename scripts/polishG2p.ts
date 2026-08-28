/**
 * Polski G2P: ortografia → IPA dla pojedynczej sylaby / krótkiego wyrazu.
 *
 * WHY: Edge TTS (darmowy endpoint, bez SSML) zgaduje wymowę izolowanych sylab
 * i myli się — "lo" czyta jako "elo", "ka" jako "ka a", "ry" jako "ri".
 * Azure Speech przyjmuje <phoneme alphabet="ipa" ph="…">, co całkowicie omija
 * ten zgadywacz. Ten moduł produkuje `ph` z ortografii sylaby.
 *
 * Kolejność przekształceń (każdy krok zależy od poprzedniego):
 *   1. segmentacja — dopasowanie najdłuższego wzorca (trójznaki → dwuznaki → litery)
 *   2. rozwiązanie samogłosek nosowych ą/ę zależnie od następnej głoski
 *   3. progresywne ubezdźwięcznienie /v/, /ʐ/ po bezdźwięcznej ("twa" → tfa)
 *   4. ubezdźwięcznienie wygłosowe ("chleb" → xlɛp)
 *   5. regresywna asymilacja dźwięczności w zbitkach ("wsko" → fskɔ)
 *   6. znak akcentu głównego przed pierwszą samogłoską
 */

// Znaki zapisane jako escape, bo wizualnie mylą się z ASCII albo są łączące.
const G = 'ɡ' // ɡ — IPA script g, NIE ascii "g"
const TIE = '͡' // ͡ — łuk afrykaty
const NAS = '̃' // ̃ — tylda nosowości
const PAL = 'ʲ' // ʲ — zmiękczenie
const STRESS = 'ˈ' // ˈ — akcent główny

const affricate = (a: string, b: string): string => `${a}${TIE}${b}`

const TS_ = affricate('t', 's') // t͡s
const DZ_ = affricate('d', 'z') // d͡z
const TSZ = affricate('t', 'ʂ') // t͡ʂ
const DZH = affricate('d', 'ʐ') // d͡ʐ
const TCI = affricate('t', 'ɕ') // t͡ɕ
const DZI = affricate('d', 'ʑ') // d͡ʑ

const NASAL_O = `ɔ${NAS}`
const NASAL_E = `ɛ${NAS}`

export type G2pOptions = {
  /** Łuk afrykaty U+0361 (Azure go akceptuje). Domyślnie true. */
  tieBar?: boolean
}

type PhoneKind = 'vowel' | 'sonorant' | 'obstruent'

type Phone = {
  ipa: string
  kind: PhoneKind
  nasalVowel: boolean
}

// ---------- inwentarz ----------

/** Pary dźwięczności: [bezdźwięczna, dźwięczna]. */
const VOICING_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['p', 'b'],
  [`p${PAL}`, `b${PAL}`],
  ['t', 'd'],
  ['k', G],
  [`k${PAL}`, `${G}${PAL}`],
  ['f', 'v'],
  [`f${PAL}`, `v${PAL}`],
  ['s', 'z'],
  ['ʂ', 'ʐ'],
  ['ɕ', 'ʑ'],
  [TS_, DZ_],
  [TSZ, DZH],
  [TCI, DZI],
]

const VOICELESS_OF = new Map<string, string>()
const VOICED_OF = new Map<string, string>()
for (const [voiceless, voiced] of VOICING_PAIRS) {
  VOICELESS_OF.set(voiced, voiceless)
  VOICED_OF.set(voiceless, voiced)
}

// /x/ nie ma w tym systemie dźwięcznego odpowiednika (ɣ nie występuje w zbiorze
// IPA pl-PL Azure), więc jest obstruentem, który tylko wymusza ubezdźwięcznienie.
const OBSTRUENTS = new Set<string>([...VOICELESS_OF.keys(), ...VOICED_OF.keys(), 'x'])
const VOICELESS = new Set<string>([...VOICED_OF.keys(), 'x'])

const VOWELS = new Set<string>(['a', 'ɛ', 'i', 'ɔ', 'u', 'ɨ', NASAL_O, NASAL_E])

function classify(ipa: string): PhoneKind {
  if (VOWELS.has(ipa)) return 'vowel'
  if (OBSTRUENTS.has(ipa)) return 'obstruent'
  return 'sonorant'
}

function phone(ipa: string): Phone {
  return { ipa, kind: classify(ipa), nasalVowel: ipa === NASAL_O || ipa === NASAL_E }
}

// ---------- segmentacja ----------

type Rule = {
  from: string
  to: string
  /** Zmiękczenie przez "i": przed samogłoską "i" znika (sia → ɕa), inaczej zostaje (si → ɕi). */
  soft?: boolean
}

/** Samogłoski, przed którymi "i" pełni rolę znaku miękkości (bez samego "i"). */
const SOFTENING_FOLLOWERS = new Set(['a', 'ą', 'e', 'ę', 'o', 'ó', 'u', 'y'])

// Kolejność ma znaczenie: dopasowujemy pierwszy pasujący wzorzec, więc
// dłuższe wzorce muszą stać przed krótszymi.
// Uwaga: "drz" NIE jest tu dwuznakiem — "drzewo" to d + ʐ (dʐ), nie afrykata d͡ʐ.
const RULES: readonly Rule[] = [
  { from: 'dzi', to: DZI, soft: true },
  { from: 'ci', to: TCI, soft: true },
  { from: 'si', to: 'ɕ', soft: true },
  { from: 'zi', to: 'ʑ', soft: true },
  { from: 'ni', to: 'ɲ', soft: true },
  { from: 'bi', to: `b${PAL}`, soft: true },
  { from: 'pi', to: `p${PAL}`, soft: true },
  { from: 'mi', to: `m${PAL}`, soft: true },
  { from: 'wi', to: `v${PAL}`, soft: true },
  { from: 'fi', to: `f${PAL}`, soft: true },
  { from: 'ki', to: `k${PAL}`, soft: true },
  { from: 'gi', to: `${G}${PAL}`, soft: true },
  { from: 'dź', to: DZI },
  { from: 'dż', to: DZH },
  { from: 'dz', to: DZ_ },
  { from: 'sz', to: 'ʂ' },
  { from: 'rz', to: 'ʐ' },
  { from: 'cz', to: TSZ },
  { from: 'ch', to: 'x' },
  { from: 'a', to: 'a' },
  { from: 'ą', to: NASAL_O },
  { from: 'b', to: 'b' },
  { from: 'c', to: TS_ },
  { from: 'ć', to: TCI },
  { from: 'd', to: 'd' },
  { from: 'e', to: 'ɛ' },
  { from: 'ę', to: NASAL_E },
  { from: 'f', to: 'f' },
  { from: 'g', to: G },
  { from: 'h', to: 'x' },
  { from: 'i', to: 'i' },
  { from: 'j', to: 'j' },
  { from: 'k', to: 'k' },
  { from: 'l', to: 'l' },
  { from: 'ł', to: 'w' },
  { from: 'm', to: 'm' },
  { from: 'n', to: 'n' },
  { from: 'ń', to: 'ɲ' },
  { from: 'o', to: 'ɔ' },
  { from: 'ó', to: 'u' },
  { from: 'p', to: 'p' },
  { from: 'r', to: 'r' },
  { from: 's', to: 's' },
  { from: 'ś', to: 'ɕ' },
  { from: 't', to: 't' },
  { from: 'u', to: 'u' },
  { from: 'w', to: 'v' },
  { from: 'y', to: 'ɨ' },
  { from: 'z', to: 'z' },
  { from: 'ź', to: 'ʑ' },
  { from: 'ż', to: 'ʐ' },
]

function segment(src: string): Phone[] {
  const out: Phone[] = []
  let i = 0
  while (i < src.length) {
    const rule = RULES.find((r) => src.startsWith(r.from, i))
    if (!rule) {
      throw new Error(`polishG2p: nieznany znak "${src[i]}" w "${src}"`)
    }
    i += rule.from.length
    out.push(phone(rule.to))
    if (rule.soft) {
      const next = src[i]
      // "si" na końcu albo przed spółgłoską — "i" jest samogłoską sylaby (nich → ɲix).
      if (next === undefined || !SOFTENING_FOLLOWERS.has(next)) out.push(phone('i'))
    }
  }
  return out
}

// ---------- samogłoski nosowe ----------

const LABIAL_STOPS = new Set(['p', 'b', `p${PAL}`, `b${PAL}`])
const DENTAL_STOPS = new Set(['t', 'd', TS_, DZ_])
const PALATAL_AFFRICATES = new Set([TCI, DZI])
const POSTALVEOLAR_AFFRICATES = new Set([TSZ, DZH])
const VELAR_STOPS = new Set(['k', G, `k${PAL}`, `${G}${PAL}`])
/** Przed l/ł nosowość ginie: "wziął" → vʑɔw, "zaczęli" → zat͡ʂɛli. */
const DENASALIZERS = new Set(['l', 'w'])

const ORAL_OF_NASAL: Record<string, string> = { [NASAL_O]: 'ɔ', [NASAL_E]: 'ɛ' }

/** Homorganiczna spółgłoska nosowa przed zwartą/afrykatą, albo null gdy nosówka zostaje. */
function nasalConsonantBefore(next: Phone | undefined): string | null {
  if (!next) return null // wygłos: "są" → sɔ̃, "gęś"… (nosówka zostaje)
  if (LABIAL_STOPS.has(next.ipa)) return 'm'
  if (DENTAL_STOPS.has(next.ipa)) return 'n'
  if (PALATAL_AFFRICATES.has(next.ipa)) return 'ɲ'
  if (POSTALVEOLAR_AFFRICATES.has(next.ipa)) return 'n'
  if (VELAR_STOPS.has(next.ipa)) return 'ŋ'
  return null // szczelinowe i sonorne: nosówka zostaje ("gęś" → ɡɛ̃ɕ)
}

function resolveNasals(phones: readonly Phone[]): Phone[] {
  const out: Phone[] = []
  for (let i = 0; i < phones.length; i += 1) {
    const p = phones[i]!
    if (!p.nasalVowel) {
      out.push(p)
      continue
    }
    const oral = ORAL_OF_NASAL[p.ipa]!
    const next = phones[i + 1]
    if (next && DENASALIZERS.has(next.ipa)) {
      out.push(phone(oral))
      continue
    }
    const nasalConsonant = nasalConsonantBefore(next)
    if (nasalConsonant) {
      out.push(phone(oral))
      out.push(phone(nasalConsonant))
      continue
    }
    out.push(p)
  }
  return out
}

// ---------- dźwięczność ----------

function devoice(p: Phone): void {
  const voiceless = VOICELESS_OF.get(p.ipa)
  if (voiceless) p.ipa = voiceless
}

function voice(p: Phone): void {
  const voiced = VOICED_OF.get(p.ipa)
  if (voiced) p.ipa = voiced
}

function isVoicelessObstruent(p: Phone): boolean {
  return p.kind === 'obstruent' && VOICELESS.has(p.ipa)
}

/**
 * Progresywne ubezdźwięcznienie: /v/ i /ʐ/ po bezdźwięcznej tracą dźwięczność
 * ("twarz" → tfaʂ, "przy" → pʂɨ, "kwiat" → kfʲat). To wyjątek od regresywnej
 * asymilacji — dlatego musi zadziałać wcześniej.
 */
function devoiceProgressive(phones: readonly Phone[]): void {
  const targets = new Set(['v', `v${PAL}`, 'ʐ'])
  for (let i = 1; i < phones.length; i += 1) {
    const p = phones[i]!
    if (targets.has(p.ipa) && isVoicelessObstruent(phones[i - 1]!)) devoice(p)
  }
}

/** Wygłosowe ubezdźwięcznienie — pomijane dla izolowanej spółgłoski ("z" zostaje z). */
function devoiceFinal(phones: readonly Phone[]): void {
  if (!phones.some((p) => p.kind === 'vowel')) return
  const last = phones[phones.length - 1]
  if (last && last.kind === 'obstruent') devoice(last)
}

/** Regresywna asymilacja: w zbitce obstruentów decyduje ostatni ("wsko" → fskɔ). */
function assimilateRegressive(phones: readonly Phone[]): void {
  for (let i = phones.length - 2; i >= 0; i -= 1) {
    const current = phones[i]!
    const next = phones[i + 1]!
    if (current.kind !== 'obstruent' || next.kind !== 'obstruent') continue
    if (isVoicelessObstruent(next)) devoice(current)
    else voice(current)
  }
}

// ---------- akcent ----------

function withStress(phones: readonly Phone[]): string {
  const firstVowel = phones.findIndex((p) => p.kind === 'vowel')
  return phones
    .map((p, i) => (i === firstVowel ? `${STRESS}${p.ipa}` : p.ipa))
    .join('')
}

/**
 * Zamienia sylabę/krótkie słowo (lowercase, polskie znaki) na IPA dla Azure.
 * Rzuca na nieznanym znaku — lepiej wysypać build niż wysłać śmieci do TTS.
 */
export function toIpa(syllable: string, options: G2pOptions = {}): string {
  const src = syllable.normalize('NFC').toLowerCase().trim()
  if (src === '') return ''

  const phones = resolveNasals(segment(src))
  devoiceProgressive(phones)
  devoiceFinal(phones)
  assimilateRegressive(phones)

  const out = withStress(phones)
  return options.tieBar === false ? out.split(TIE).join('') : out
}

/** Zbiór znaków IPA, których używa pl-PL w Azure — do walidacji wyjścia. */
export const AZURE_PL_IPA_CHARS: ReadonlySet<string> = new Set([
  ...['a', 'ɛ', 'i', 'ɔ', 'u', 'ɨ'],
  ...['p', 'b', 't', 'd', 'k', G, 'c', 'ɟ'],
  ...['m', 'n', 'ɲ', 'ŋ'],
  ...['f', 'v', 's', 'z', 'ʂ', 'ʐ', 'ɕ', 'ʑ', 'x'],
  ...['r', 'l', 'j', 'w'],
  ...[PAL, STRESS, NAS, TIE],
])
