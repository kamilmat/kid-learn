import { useEffect } from 'react'

type Props = { onComplete: () => void }

export function DancingAvocado({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2000)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      data-testid="wild-dancing-avocado"
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        pointerEvents: 'none',
        background: 'rgba(254, 249, 242, 0.85)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16,
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes avocadoDance {
            0%, 100% { transform: translateY(0) rotate(0); }
            25% { transform: translateY(-20px) rotate(-15deg); }
            75% { transform: translateY(-20px) rotate(15deg); }
          }
          @keyframes avocadoBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
          .avocado-dance { animation: avocadoDance 600ms ease-in-out infinite; }
          .avocado-bounce { animation: avocadoBounce 800ms ease-in-out infinite; }
        }
      `}</style>
      <div className="avocado-dance" style={{ fontSize: 160 }}>🥑</div>
      <div className="avocado-bounce" style={{
        fontFamily: 'var(--font-handwritten)', fontSize: 48, fontWeight: 700, color: '#10b981',
      }}>
        ŁAAŁ!
      </div>
    </div>
  )
}
