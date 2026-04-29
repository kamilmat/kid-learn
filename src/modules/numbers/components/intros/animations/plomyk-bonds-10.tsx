import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 2400 },
  { stage: 3, offsetMs: 3800 },
]

const PAIRS: Array<[number, number]> = [[4, 6], [7, 3], [5, 5]]

function PlomykBonds10({ stage }: { stage: number }) {
  const idx = Math.max(0, Math.min(stage - 1, PAIRS.length - 1))
  const pair = PAIRS[idx]!
  return (
    <div data-testid="anim-plomyk-bonds-10">
      <NumberBondShape
        whole={10}
        partA={stage >= 1 ? pair[0] : null}
        partB={stage >= 1 ? pair[1] : null}
      />
    </div>
  )
}
PlomykBonds10.SCENES = SCENES
export default PlomykBonds10
