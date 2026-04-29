import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 2200 },
  { stage: 3, offsetMs: 3000 },
]

function PochodniaCommutativity({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]!
  const rotated = stage >= 3
  return (
    <div data-testid="anim-pochodnia-commutativity" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          transform: stage === 2 ? 'rotate(45deg)' : rotated ? 'rotate(0deg)' : 'rotate(0deg)',
          transition: 'transform 600ms',
        }}
      >
        {!rotated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3].map((r) => (
              <ConcreteIcons key={r} count={4} iconSet={apple} iconSize={32} layout="row" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[1, 2, 3, 4].map((r) => (
              <ConcreteIcons key={r} count={3} iconSet={apple} iconSize={32} layout="row" />
            ))}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 40, color: '#dc2626' }}>
        {rotated ? '4 × 3 = 12' : stage >= 1 ? '3 × 4 = 12' : ''}
      </div>
    </div>
  )
}
PochodniaCommutativity.SCENES = SCENES
export default PochodniaCommutativity
