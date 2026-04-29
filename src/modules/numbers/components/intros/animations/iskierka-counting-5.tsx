import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1200 },
  { stage: 3, offsetMs: 1800 },
  { stage: 4, offsetMs: 2400 },
  { stage: 5, offsetMs: 3000 },
]

function IskierkaCounting5({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-iskierka-counting-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={Math.min(stage, 5)} size={56} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 64, color: '#dc2626', minHeight: 80 }}>
        {stage > 0 ? Math.min(stage, 5) : ''}
      </div>
    </div>
  )
}
IskierkaCounting5.SCENES = SCENES
export default IskierkaCounting5
