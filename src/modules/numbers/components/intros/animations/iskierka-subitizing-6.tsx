import { DotPattern } from '../../representations/DotPattern'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 800 },
  { stage: 2, offsetMs: 2000 },
  { stage: 3, offsetMs: 3200 },
]

const PATTERN_FOR_STAGE: Record<number, number> = { 1: 3, 2: 5, 3: 6 }

function IskierkaSubitizing6({ stage }: { stage: number }) {
  const count = PATTERN_FOR_STAGE[stage] ?? 0
  return (
    <div data-testid="anim-iskierka-subitizing-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {count > 0 && <DotPattern count={count} pattern="dice" size={140} />}
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 56, color: '#1d4ed8', minHeight: 70 }}>
        {count > 0 ? count : ''}
      </div>
    </div>
  )
}
IskierkaSubitizing6.SCENES = SCENES
export default IskierkaSubitizing6
