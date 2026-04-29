import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1600 },
  { stage: 3, offsetMs: 2600 },
]

function IskierkaRhythm({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]!
  return (
    <div data-testid="anim-iskierka-rhythm" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {[1, 2, 3].map((g) => (
        <div
          key={g}
          style={{
            opacity: stage >= g ? 1 : 0.15,
            transition: 'opacity 200ms',
          }}
        >
          <ConcreteIcons count={3} iconSet={apple} iconSize={48} layout="row" />
        </div>
      ))}
    </div>
  )
}
IskierkaRhythm.SCENES = SCENES
export default IskierkaRhythm
