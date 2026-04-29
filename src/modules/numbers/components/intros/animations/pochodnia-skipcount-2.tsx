import type { Scene } from '../IntroFrame'

const STEP = 2
const VALUES = [2, 4, 6, 8, 10]
const SCENES: readonly Scene[] = VALUES.map((_, i) => ({
  stage: i + 1,
  offsetMs: 600 + i * 600,
}))

function PochodniaSkipcount2({ stage }: { stage: number }) {
  return (
    <div data-testid={`anim-pochodnia-skipcount-${STEP}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {VALUES.map((v, i) => (
        <div
          key={v}
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: stage >= i + 1 ? '#3b82f6' : '#e5e7eb',
            color: stage >= i + 1 ? '#fff' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-block)',
            fontSize: 28,
            fontWeight: 700,
            transform: stage === i + 1 ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'transform 200ms, background 200ms',
          }}
        >
          {v}
        </div>
      ))}
    </div>
  )
}
PochodniaSkipcount2.SCENES = SCENES
export default PochodniaSkipcount2
