import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1600 },
  { stage: 3, offsetMs: 2600 },
]

function OgnikDoubles({ stage }: { stage: number }) {
  const star = CONCRETE_SETS[1] ?? CONCRETE_SETS[0]!
  return (
    <div data-testid="anim-ognik-doubles" style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-handwritten)', fontSize: 56 }}>
      <ConcreteIcons count={stage >= 1 ? 4 : 0} iconSet={star} iconSize={40} layout="grid" cols={2} />
      <span style={{ opacity: stage >= 2 ? 1 : 0.15 }}>+</span>
      <ConcreteIcons count={stage >= 2 ? 4 : 0} iconSet={star} iconSize={40} layout="grid" cols={2} />
      <span style={{ opacity: stage >= 3 ? 1 : 0.15 }}>=</span>
      <span style={{ opacity: stage >= 3 ? 1 : 0.15, color: '#dc2626' }}>8</span>
    </div>
  )
}
OgnikDoubles.SCENES = SCENES
export default OgnikDoubles
