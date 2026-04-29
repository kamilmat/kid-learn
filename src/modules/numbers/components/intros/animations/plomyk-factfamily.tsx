import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1600 },
  { stage: 3, offsetMs: 2400 },
  { stage: 4, offsetMs: 3200 },
  { stage: 5, offsetMs: 4000 },
]

const EQUATIONS = ['', '3 + 4 = 7', '4 + 3 = 7', '7 − 3 = 4', '7 − 4 = 3']

function PlomykFactfamily({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-plomyk-factfamily" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <NumberBondShape whole={7} partA={3} partB={4} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-handwritten)', fontSize: 32 }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ opacity: stage >= s + 1 ? 1 : 0.15, transition: 'opacity 200ms' }}>
            {EQUATIONS[s]}
          </div>
        ))}
      </div>
    </div>
  )
}
PlomykFactfamily.SCENES = SCENES
export default PlomykFactfamily
