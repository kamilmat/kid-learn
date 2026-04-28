import type { ConceptId, MathFactId } from '../types'

export type Fact = {
  id: MathFactId
  conceptId: ConceptId
  args: number[]
}

export function generateFactsForConcept(conceptId: ConceptId): Fact[] {
  switch (conceptId) {
    case 'iskierka-counting-5':
      return Array.from({ length: 5 }, (_, i) => ({
        id: `count-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'iskierka-counting-10':
      return Array.from({ length: 10 }, (_, i) => ({
        id: `count-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'iskierka-subitizing-6':
      return Array.from({ length: 6 }, (_, i) => ({
        id: `subitize-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'iskierka-rhythm':
      return [
        { id: 'rhythm-12', conceptId, args: [1, 2] },
        { id: 'rhythm-13', conceptId, args: [1, 3] },
        { id: 'rhythm-23', conceptId, args: [2, 3] },
        { id: 'rhythm-123', conceptId, args: [1, 2, 3] },
        { id: 'rhythm-135', conceptId, args: [1, 3, 5] },
      ]

    case 'iskierka-adding-concrete':
      return [
        { id: 'cadd-1-1', conceptId, args: [1, 1] },
        { id: 'cadd-2-1', conceptId, args: [2, 1] },
        { id: 'cadd-2-2', conceptId, args: [2, 2] },
        { id: 'cadd-3-2', conceptId, args: [3, 2] },
        { id: 'cadd-3-3', conceptId, args: [3, 3] },
        { id: 'cadd-4-3', conceptId, args: [4, 3] },
        { id: 'cadd-5-2', conceptId, args: [5, 2] },
        { id: 'cadd-5-5', conceptId, args: [5, 5] },
      ]

    case 'plomyk-bonds-5':
      return generateBondsForWhole(5, conceptId)

    case 'plomyk-bonds-10':
      return [6, 7, 8, 9, 10].flatMap((w) => generateBondsForWhole(w, conceptId))

    case 'plomyk-tenframe':
      return Array.from({ length: 11 }, (_, i) => ({
        id: `tenframe-need-${10 - i}`,
        conceptId,
        args: [i, 10 - i],
      }))

    case 'plomyk-addsub-10':
      return [...generateAddsUpTo(10, conceptId), ...generateSubsUpTo(10, conceptId)]

    case 'plomyk-factfamily':
      return [
        { id: 'ff-3-4-7', conceptId, args: [3, 4, 7] },
        { id: 'ff-2-5-7', conceptId, args: [2, 5, 7] },
        { id: 'ff-3-5-8', conceptId, args: [3, 5, 8] },
        { id: 'ff-4-5-9', conceptId, args: [4, 5, 9] },
        { id: 'ff-2-8-10', conceptId, args: [2, 8, 10] },
        { id: 'ff-3-7-10', conceptId, args: [3, 7, 10] },
      ]

    case 'ognik-doubles':
      return Array.from({ length: 10 }, (_, i) => ({
        id: `double-${i + 1}`,
        conceptId,
        args: [i + 1],
      }))

    case 'ognik-neardoubles':
      return Array.from({ length: 9 }, (_, i) => ({
        id: `neardouble-${i + 1}-${i + 2}`,
        conceptId,
        args: [i + 1, i + 2],
      }))

    case 'ognik-make10': {
      const make10: Fact[] = []
      for (let a = 2; a <= 9; a++) {
        for (let b = 2; b <= 9; b++) {
          if (a + b > 10 && a + b <= 18) {
            make10.push({ id: `make10-${a}-${b}`, conceptId, args: [a, b] })
          }
        }
      }
      return make10
    }

    case 'ognik-factfamily-20':
      return [
        { id: 'ff-7-9-16', conceptId, args: [7, 9, 16] },
        { id: 'ff-8-9-17', conceptId, args: [8, 9, 17] },
        { id: 'ff-6-8-14', conceptId, args: [6, 8, 14] },
        { id: 'ff-5-9-14', conceptId, args: [5, 9, 14] },
        { id: 'ff-4-7-11', conceptId, args: [4, 7, 11] },
        { id: 'ff-6-7-13', conceptId, args: [6, 7, 13] },
        { id: 'ff-5-7-12', conceptId, args: [5, 7, 12] },
      ]

    case 'pochodnia-skipcount-2':
      return Array.from({ length: 4 }, (_, i) => ({
        id: `skip2-step${i + 1}`,
        conceptId,
        args: [2, i + 1, (i + 2) * 2],
      }))

    case 'pochodnia-skipcount-5':
      return Array.from({ length: 4 }, (_, i) => ({
        id: `skip5-step${i + 1}`,
        conceptId,
        args: [5, i + 1, (i + 2) * 5],
      }))

    case 'pochodnia-skipcount-10':
      return Array.from({ length: 4 }, (_, i) => ({
        id: `skip10-step${i + 1}`,
        conceptId,
        args: [10, i + 1, (i + 2) * 10],
      }))

    case 'pochodnia-equalgroups':
      return [
        { id: 'eqgroups-2x2', conceptId, args: [2, 2] },
        { id: 'eqgroups-2x3', conceptId, args: [2, 3] },
        { id: 'eqgroups-3x2', conceptId, args: [3, 2] },
        { id: 'eqgroups-3x3', conceptId, args: [3, 3] },
        { id: 'eqgroups-4x2', conceptId, args: [4, 2] },
        { id: 'eqgroups-5x2', conceptId, args: [5, 2] },
      ]

    case 'pochodnia-arrays':
      return [
        { id: 'array-2x3', conceptId, args: [2, 3] },
        { id: 'array-3x4', conceptId, args: [3, 4] },
        { id: 'array-4x2', conceptId, args: [4, 2] },
        { id: 'array-2x5', conceptId, args: [2, 5] },
        { id: 'array-3x3', conceptId, args: [3, 3] },
      ]

    case 'pochodnia-commutativity':
      return [
        { id: 'mult-2-3', conceptId, args: [2, 3] },
        { id: 'mult-3-2', conceptId, args: [3, 2] },
        { id: 'mult-2-5', conceptId, args: [2, 5] },
        { id: 'mult-5-2', conceptId, args: [5, 2] },
        { id: 'mult-3-4', conceptId, args: [3, 4] },
        { id: 'mult-4-3', conceptId, args: [4, 3] },
      ]
  }
}

function generateBondsForWhole(whole: number, conceptId: ConceptId): Fact[] {
  const bonds: Fact[] = []
  for (let a = 1; a <= Math.floor(whole / 2); a++) {
    const b = whole - a
    bonds.push({ id: `bond-${whole}-${a}-${b}`, conceptId, args: [whole, a, b] })
  }
  return bonds
}

function generateAddsUpTo(max: number, conceptId: ConceptId): Fact[] {
  const adds: Fact[] = []
  for (let a = 1; a <= max - 1; a++) {
    for (let b = 1; b <= max - a; b++) {
      adds.push({ id: `add-${a}-${b}`, conceptId, args: [a, b] })
    }
  }
  return adds
}

function generateSubsUpTo(max: number, conceptId: ConceptId): Fact[] {
  const subs: Fact[] = []
  for (let a = 2; a <= max; a++) {
    for (let b = 1; b < a; b++) {
      subs.push({ id: `sub-${a}-${b}`, conceptId, args: [a, b] })
    }
  }
  return subs
}
