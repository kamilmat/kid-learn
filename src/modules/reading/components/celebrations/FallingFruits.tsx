import { useEffect } from 'react'

type Props = { onComplete: () => void }

const FRUITS = ['🍌', '🥑', '🦄', '⭐', '🍎', '🍓', '🥕', '🌟']

export function FallingFruits({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      data-testid="wild-falling-fruits"
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        pointerEvents: 'none',
        background: 'rgba(254, 249, 242, 0.85)',
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes fallFruit {
            0% { transform: translateY(-100px) rotate(0); opacity: 0; }
            15% { opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 1; }
          }
          .fall-fruit { animation: fallFruit var(--fall-duration) ease-in var(--fall-delay); }
        }
      `}</style>
      {FRUITS.map((emoji, i) => (
        <div
          key={i}
          className="fall-fruit"
          style={{
            position: 'absolute',
            left: `${(i + 0.5) * (100 / FRUITS.length)}%`,
            top: 0,
            fontSize: 48,
            transform: 'translateY(-100px)',
            ['--fall-duration' as string]: `${2200 + (i * 50)}ms`,
            ['--fall-delay' as string]: `${i * 80}ms`,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  )
}
