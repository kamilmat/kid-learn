import { describe, expect, it } from 'vitest'
import { GENERATED_BY_GROUP } from './generated'
import { CZYTANKI_LEGACY } from './czytanki'
import { normalizedText, validateCompact } from './validate'
import { LEXICON_CONFLICTS } from './lexicon'
import { GROUP_ORDER } from './czytanki'

const all = GROUP_ORDER.flatMap((g) => GENERATED_BY_GROUP[g].map((c) => ({ g, c })))

describe('pula generowana czytanek', () => {
  it('słownik: żadna forma nie ma dwóch różnych podziałów', () => {
    expect(LEXICON_CONFLICTS).toEqual([])
  })

  it('każda czytanka spełnia reguły swojej grupy, słownika i pytania', () => {
    const errors = all.flatMap(({ g, c }) => validateCompact(g, c))
    expect(errors).toEqual([])
  })

  it('numery unikalne i powyżej ręcznych cz-01…cz-100', () => {
    const nums = all.map(({ c }) => c[0])
    expect(new Set(nums).size).toBe(nums.length)
    for (const n of nums) expect(n).toBeGreaterThan(100)
  })

  it('żaden tekst się nie powtarza (także względem cz-01…cz-100)', () => {
    const legacy = CZYTANKI_LEGACY.map((c) =>
      c.sentences.map((s) => s.map((w) => w.syllables.join('')).join(' ')).join(' '),
    )
    const texts = [...legacy, ...all.map(({ c }) => normalizedText(c[3]))]
    const dups = texts.filter((t, i) => texts.indexOf(t) !== i)
    expect(dups).toEqual([])
  })

  it('pozycja poprawnej odpowiedzi rozłożona równo w każdej grupie', () => {
    for (const g of GROUP_ORDER) {
      const list = GENERATED_BY_GROUP[g]
      if (list.length === 0) continue
      const counts = [0, 0, 0]
      for (const c of list) counts[c[6]]! += 1
      for (const n of counts) expect(n, `grupa ${g}: [${counts.join(', ')}]`).toBeGreaterThanOrEqual(list.length * 0.25)
    }
  })
})
