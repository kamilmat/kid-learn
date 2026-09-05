/**
 * Podział sylaby na „literki" do trybu przypominajki (guzik A|B).
 *
 * Jednostką NIE jest zawsze pojedynczy znak: dwuznaki (SZ, CZ, RZ, CH, DZ,
 * DŹ, DŻ) to jeden dźwięk i jedna jednostka. Dziecko, które usłyszałoby
 * „sy… zy…" na SZY, uczyłoby się właśnie tego, czego czytanie ma go oduczyć.
 *
 * Miękkie „i" (NIE, CIA, ZIE) świadomie zostaje osobną literką — decyzja
 * usera: to przypominajka „jakie tu są literki", a nie kurs fonetyki.
 */

// DŻ/DŹ przed DZ — inaczej „DŻA" rozpadłoby się na „DZ" + „…".
export const DIGRAPHS = ['DŻ', 'DŹ', 'DZ', 'SZ', 'CZ', 'RZ', 'CH'] as const

export type LetterUnit = string

export function splitToLetterUnits(syllable: string): LetterUnit[] {
  const chars = [...syllable]
  const units: LetterUnit[] = []
  for (let i = 0; i < chars.length; i++) {
    const pair = (chars[i] ?? '') + (chars[i + 1] ?? '')
    const isDigraph = pair.length === 2 && DIGRAPHS.some((d) => d === pair.toUpperCase())
    if (isDigraph) {
      units.push(pair)
      i++
      continue
    }
    units.push(chars[i]!)
  }
  return units
}
