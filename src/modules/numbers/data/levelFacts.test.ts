import { describe, expect, it } from 'vitest'
import {
  excludeMaintenance,
  getLevelFacts,
  POCHODNIA_SUB_MAINTENANCE_FACTS,
} from './levelFacts'

describe('getLevelFacts — skipCountStep', () => {
  it("'mixed' zostawia wszystkie trzy kroki skip-count", () => {
    const concepts = new Set(getLevelFacts('pochodnia', 'mixed').map((f) => f.conceptId))
    expect(concepts.has('pochodnia-skipcount-2')).toBe(true)
    expect(concepts.has('pochodnia-skipcount-5')).toBe(true)
    expect(concepts.has('pochodnia-skipcount-10')).toBe(true)
  })

  it('konkretny krok wycina pozostałe skip-county, resztę puli zostawia', () => {
    const facts = getLevelFacts('pochodnia', 5)
    const concepts = new Set(facts.map((f) => f.conceptId))
    expect(concepts.has('pochodnia-skipcount-5')).toBe(true)
    expect(concepts.has('pochodnia-skipcount-2')).toBe(false)
    expect(concepts.has('pochodnia-skipcount-10')).toBe(false)
    expect(concepts.has('pochodnia-equalgroups')).toBe(true)
  })

  it('inne poziomy ignorują skipCountStep', () => {
    expect(getLevelFacts('plomyk', 10)).toEqual(getLevelFacts('plomyk', 'mixed'))
  })
})

describe('excludeMaintenance', () => {
  it('usuwa fakty maintenance z głównej puli (mają własną gałąź 18%)', () => {
    const all = getLevelFacts('pochodnia')
    const main = excludeMaintenance(all)
    const maintenanceIds = POCHODNIA_SUB_MAINTENANCE_FACTS.map((f) => f.id)
    expect(all.length - main.length).toBe(maintenanceIds.length)
    for (const id of maintenanceIds) {
      expect(main.some((f) => f.id === id)).toBe(false)
    }
  })

  it('nie rusza puli poziomów bez maintenance', () => {
    const plomyk = getLevelFacts('plomyk')
    expect(excludeMaintenance(plomyk)).toHaveLength(plomyk.length)
  })
})
