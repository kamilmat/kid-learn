import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1800 },
  { stage: 3, offsetMs: 3000 },
]

function OgnikMake10({ stage }: { stage: number }) {
  const count = stage === 1 ? 8 : stage === 2 ? 10 : stage >= 3 ? 13 : 0
  const highlightAfter = stage === 2 ? 8 : stage >= 3 ? 10 : undefined
  return (
    <div data-testid="anim-ognik-make10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame
        count={count}
        {...(highlightAfter !== undefined ? { highlightAfter } : {})}
        highlightColor={stage === 2 ? '#16a34a' : '#1d4ed8'}
        size={48}
      />
      {stage >= 3 && (
        <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 48, color: '#dc2626' }}>10 + 3 = 13</div>
      )}
    </div>
  )
}
OgnikMake10.SCENES = SCENES
export default OgnikMake10
