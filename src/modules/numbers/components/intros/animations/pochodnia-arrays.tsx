import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 700 },
  { stage: 2, offsetMs: 1700 },
  { stage: 3, offsetMs: 2700 },
  { stage: 4, offsetMs: 3700 },
]

function PochodniaArrays({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]!
  return (
    <div data-testid="anim-pochodnia-arrays" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[1, 2, 3].map((row) => (
          <div key={row} style={{ opacity: stage >= row ? 1 : 0.15, transition: 'opacity 200ms' }}>
            <ConcreteIcons count={4} iconSet={apple} iconSize={36} layout="row" />
          </div>
        ))}
      </div>
      {stage >= 4 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 40, color: '#dc2626' }}>3 × 4 = 12</div>
      )}
    </div>
  )
}
PochodniaArrays.SCENES = SCENES
export default PochodniaArrays
