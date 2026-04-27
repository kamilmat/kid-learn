import { useNavigate } from 'react-router-dom'
import { colors, radii, tapTargets } from '@/app/theme'
import { useTapHandler } from './useTapHandler'

type KidNavProps = {
  onBack?: () => void
  onHome?: () => void
}

const buttonStyle = {
  width: tapTargets.minSize,
  height: tapTargets.minSize,
  borderRadius: radii.kid,
  background: '#ffffff',
  border: `2px solid ${colors.accentBlue}`,
  color: colors.text,
  fontSize: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
} as const

export function KidNav({ onBack, onHome }: KidNavProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    navigate(-1)
  }

  const handleHome = () => {
    if (onHome) {
      onHome()
      return
    }
    navigate('/')
  }

  const backTap = useTapHandler({ onTap: handleBack })
  const homeTap = useTapHandler({ onTap: handleHome })

  return (
    <nav
      aria-label="Nawigacja"
      style={{
        display: 'flex',
        gap: tapTargets.minMargin,
        padding: tapTargets.minMargin,
        background: colors.bg,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        aria-label="Wróć"
        {...backTap}
        style={buttonStyle}
      >
        <span aria-hidden="true">⬅️</span>
      </button>
      <button
        type="button"
        aria-label="Strona główna"
        {...homeTap}
        style={buttonStyle}
      >
        <span aria-hidden="true">🏠</span>
      </button>
    </nav>
  )
}
