import { useEffect } from 'react'

type Props = { onComplete: () => void }

export function RocketBlast({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2000)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      data-testid="wild-rocket-blast"
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(254, 249, 242, 0.85)',
      }}
    >
      <style>{`
        @keyframes rocketBlast {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-100vh) scale(0.4); }
        }
      `}</style>
      <div style={{ fontSize: 100, animation: 'rocketBlast 2000ms ease-in' }}>🚀</div>
    </div>
  )
}
