import { useNavigate } from 'react-router-dom'
import { audioBus } from '@/shared/audio/AudioBus'
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

  // Cue gramy SYNCHRONICZNIE w handlerze tapa, jeszcze przed nawigacją:
  // "każdy klik mówi co zrobił", a przy okazji pierwszy play() w gestcie
  // odblokowuje audio na iOS (unlock() poniżej to no-op gdy cue już w kolejce).
  const playCue = (key: 'nav-back' | 'nav-home') => {
    audioBus.stop()
    void audioBus.play(key)
    audioBus.unlock()
  }

  const handleBack = () => {
    playCue('nav-back')
    if (onBack) {
      onBack()
      return
    }
    navigate(-1)
  }

  const handleHome = () => {
    playCue('nav-home')
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
