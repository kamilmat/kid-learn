import { ConcreteIcons } from '../../representations/ConcreteIcons'
import { CONCRETE_SETS } from '../../../data/concreteSets'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 800 },
  { stage: 2, offsetMs: 2000 },
  { stage: 3, offsetMs: 3200 },
]

function IskierkaAddingConcrete({ stage }: { stage: number }) {
  const apple = CONCRETE_SETS[0]!
  return (
    <div data-testid="anim-iskierka-adding-concrete" style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-handwritten)', fontSize: 56 }}>
      <ConcreteIcons count={stage >= 1 ? 2 : 0} iconSet={apple} iconSize={48} layout="row" />
      <span style={{ opacity: stage >= 2 ? 1 : 0.15 }}>+</span>
      <ConcreteIcons count={stage >= 2 ? 1 : 0} iconSet={apple} iconSize={48} layout="row" />
      <span style={{ opacity: stage >= 3 ? 1 : 0.15 }}>=</span>
      <span style={{ opacity: stage >= 3 ? 1 : 0.15, color: '#dc2626' }}>3</span>
    </div>
  )
}
IskierkaAddingConcrete.SCENES = SCENES
export default IskierkaAddingConcrete
