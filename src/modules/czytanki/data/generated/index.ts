import type { CompactCzytanka } from '../compact'
import type { CzytankaGroup } from '../types'
import { G1 } from './g1'
import { G2A } from './g2a'
import { G2B } from './g2b'
import { G3A } from './g3a'
import { G3B } from './g3b'
import { G4A } from './g4a'
import { G4B } from './g4b'
import { G4C } from './g4c'

// Pula generowana (spec 2026-09-19).
export const GENERATED_BY_GROUP: Record<CzytankaGroup, readonly CompactCzytanka[]> = {
  1: [...G1],
  2: [...G2A, ...G2B],
  3: [...G3A, ...G3B],
  4: [...G4A, ...G4B, ...G4C],
}
