import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1400 },
  { stage: 3, offsetMs: 2400 },
]

function PlomykTenframe({ stage }: { stage: number }) {
  const count = stage >= 2 ? 7 : 0
  return (
    <div data-testid="anim-plomyk-tenframe" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={count} highlightAfter={count - 1} highlightColor="#dc2626" size={56} />
      {stage >= 3 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 56, color: '#dc2626' }}>7</div>
      )}
    </div>
  )
}
PlomykTenframe.SCENES = SCENES
export default PlomykTenframe
