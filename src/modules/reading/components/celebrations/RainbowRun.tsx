import { useEffect } from 'react'

type Props = { onComplete: () => void }

export function RainbowRun({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      data-testid="wild-rainbow-run"
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, #fee2e2, #fef3c7, #d1fae5, #dbeafe, #ddd6fe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes rainbowRun {
          0% { transform: translateX(-200px) scale(0.8); }
          50% { transform: translateX(50vw) translateY(-30px) scale(1.2); }
          100% { transform: translateX(calc(100vw + 200px)) scale(0.8); }
        }
      `}</style>
      <div style={{ fontSize: 100, animation: 'rainbowRun 2500ms ease-in-out' }}>🔥</div>
    </div>
  )
}
