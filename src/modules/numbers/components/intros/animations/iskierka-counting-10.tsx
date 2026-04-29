import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = Array.from({ length: 10 }, (_, i) => ({
  stage: i + 1,
  offsetMs: 400 + i * 400,
}))

function IskierkaCounting10({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-iskierka-counting-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={Math.min(stage, 10)} size={48} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 64, color: '#dc2626', minHeight: 80 }}>
        {stage > 0 ? Math.min(stage, 10) : ''}
      </div>
    </div>
  )
}
IskierkaCounting10.SCENES = SCENES
export default IskierkaCounting10
