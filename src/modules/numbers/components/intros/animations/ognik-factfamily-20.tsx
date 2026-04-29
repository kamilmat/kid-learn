import { NumberBondShape } from '../../representations/NumberBondShape'
import type { Scene } from '../IntroFrame'

const SCENES: readonly Scene[] = [
  { stage: 1, offsetMs: 600 },
  { stage: 2, offsetMs: 1600 },
  { stage: 3, offsetMs: 2400 },
  { stage: 4, offsetMs: 3200 },
  { stage: 5, offsetMs: 4000 },
]

const EQUATIONS = ['', '8 + 7 = 15', '7 + 8 = 15', '15 − 8 = 7', '15 − 7 = 8']

function OgnikFactfamily20({ stage }: { stage: number }) {
  return (
    <div data-testid="anim-ognik-factfamily-20" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <NumberBondShape whole={15} partA={8} partB={7} />
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
OgnikFactfamily20.SCENES = SCENES
export default OgnikFactfamily20
