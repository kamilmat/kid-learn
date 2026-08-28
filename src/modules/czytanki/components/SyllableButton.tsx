import { useState } from 'react'
import { useSyllablePress } from '../hooks/useSyllablePress'
import './scene.css'

type Props = {
  text: string
  color: string
  highlighted: boolean
  fontSize: number
  onTap: () => void
  onLongPress: () => void
}

export function SyllableButton({ text, color, highlighted, fontSize, onTap, onLongPress }: Props) {
  const [bounce, setBounce] = useState(0)
  const press = useSyllablePress({
    onTap: () => {
      setBounce((n) => n + 1)
      onTap()
    },
    onLongPress,
  })
  return (
    <div
      role="button"
      aria-label={text}
      data-testid="syllable"
      {...press}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
        minHeight: 60,
        padding: '0 0.08em',
        fontFamily: 'var(--font-block)',
        fontWeight: 700,
        fontSize,
        lineHeight: 1.1,
        color,
        borderRadius: 12,
        background: highlighted ? '#fde047' : 'transparent',
        transition: 'background 150ms',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
      }}
    >
      <span key={bounce} className={bounce ? 'cz-syl-bounce' : undefined} style={{ display: 'inline-block' }}>
        {text}
      </span>
    </div>
  )
}
