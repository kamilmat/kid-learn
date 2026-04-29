import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 2200 },
  { stage: 3, offsetMs: 3200 },
]

function OgnikNeardoubles({ stage }: { stage: number }) {
  const star = CONCRETE_SETS[1] ?? CONCRETE_SETS[0]!
  const rightCount = stage >= 2 ? 5 : 4
  const result = stage >= 3 ? 9 : stage >= 1 ? 8 : 0
  return (
    <div data-testid="anim-ognik-neardoubles" style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-handwritten)', fontSize: 56 }}>
      <ConcreteIcons count={4} iconSet={star} iconSize={40} layout="grid" cols={2} />
      <span>+</span>
      <ConcreteIcons count={rightCount} iconSet={star} iconSize={40} layout="grid" cols={2} groupColor={stage === 2 ? '#fef3c7' : 'transparent'} />
      <span>=</span>
      <span style={{ color: '#dc2626' }}>{result || ''}</span>
    </div>
  )
}
OgnikNeardoubles.SCENES = SCENES
export default OgnikNeardoubles
