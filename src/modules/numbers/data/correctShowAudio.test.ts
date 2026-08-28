import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Level } from '@/shared/settings/types'
import { getLevelFacts, opForFact } from './levelFacts'
import { extractCorrectValue } from './correctValue'
import { exerciseTypeForFact } from '../hooks/exerciseRouter'

const LEVELS: Level[] = ['iskierka', 'plomyk', 'ognik', 'pochodnia']

/** Wszystkie wartości, które feedback może wypowiedzieć jako `correct-show-<n>`. */
function derivedCorrectValues(): number[] {
  const values = new Set<number>()
  for (const level of LEVELS) {
    for (const fact of getLevelFacts(level)) {
      const value = extractCorrectValue({
        exerciseType: exerciseTypeForFact(fact, level),
        payload: { args: fact.args, op: opForFact(fact) },
      })
      if (value !== null) values.add(value)
    }
  }
  return [...values].sort((a, b) => a - b)
}

describe('correct-show audio coverage', () => {
  it('każda możliwa poprawna wartość ma tekst w math-ui-strings.json', () => {
    const source = JSON.parse(
      readFileSync(join(process.cwd(), 'audio-source/math-ui-strings.json'), 'utf8'),
    ) as Record<string, string>

    const missing = derivedCorrectValues()
      .map((n) => `correct-show-${n}`)
      .filter((key) => typeof source[key] !== 'string')

    expect(missing).toEqual([])
  })

  it('skip-count Pochodni sięga 50 (regresja: brakowało 25/30/40/50)', () => {
    const values = derivedCorrectValues()
    expect(values).toContain(25)
    expect(values).toContain(50)
  })
})
