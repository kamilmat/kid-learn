import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ConceptId } from '../types'
import { CONCEPT_LABELS } from './conceptLabels'
import { masteryAudioKey } from './masteryAudio'

const CONCEPT_IDS = Object.keys(CONCEPT_LABELS) as ConceptId[]

describe('masteryAudioKey', () => {
  it('każdy ConceptId ma niepusty klucz mastery-*', () => {
    for (const id of CONCEPT_IDS) {
      expect(masteryAudioKey(id)).toBeTruthy()
    }
  })

  it('każdy klucz istnieje w audio-source/math-ui-strings.json', () => {
    const source = JSON.parse(
      readFileSync(join(process.cwd(), 'audio-source/math-ui-strings.json'), 'utf8'),
    ) as Record<string, string>

    const missing = CONCEPT_IDS.map((id) => masteryAudioKey(id)).filter(
      (key) => typeof source[key] !== 'string',
    )

    expect(missing).toEqual([])
  })
})
