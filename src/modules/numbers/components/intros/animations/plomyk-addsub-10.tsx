import { TenFrame } from '../../representations/TenFrame'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 500 },
  { stage: 2, offsetMs: 1500 },
  { stage: 3, offsetMs: 3000 },
]

function PlomykAddsub10({ stage }: { stage: number }) {
  const count = stage === 1 ? 4 : stage === 2 ? 7 : stage >= 3 ? 5 : 0
  const op = stage === 2 ? '+3' : stage >= 3 ? '−2' : ''
  const highlightAfter = stage === 2 ? 4 : undefined
  return (
    <div data-testid="anim-plomyk-addsub-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <TenFrame count={count} {...(highlightAfter !== undefined ? { highlightAfter } : {})} highlightColor="#16a34a" size={56} />
      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 48, color: stage >= 3 ? '#dc2626' : '#16a34a', minHeight: 60 }}>
        {op}
      </div>
    </div>
  )
}
PlomykAddsub10.SCENES = SCENES
export default PlomykAddsub10
