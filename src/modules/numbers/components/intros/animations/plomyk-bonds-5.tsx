import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1800 },
  { stage: 3, offsetMs: 2800 },
]

function PlomykBonds5({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-plomyk-bonds-5">
      <NumberBondShape
        whole={5}
        partA={stage >= 2 ? 2 : null}
        partB={stage >= 3 ? 3 : null}
      />
    </div>
  )
}
PlomykBonds5.SCENES = SCENES
export default PlomykBonds5
