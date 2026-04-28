import { useEffect } from 'react'

type Props = { onComplete: () => void }

export function ScreenFlip({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 1500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      data-testid="wild-screen-flip"
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, #fef3c7, #ddd6fe, #fbcfe8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'screenFlipSpin 1500ms ease-in-out',
      }}
    >
      <style>{`
        @keyframes screenFlipSpin {
          0% { transform: rotate(0); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ fontSize: 120 }}>🌀</div>
    </div>
  )
}
