import { useCallback, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { SyllableCue } from '@/shared/ui/syllableColors'
import { useSyllablePress } from '../hooks/useSyllablePress'
import './scene.css'

type Props = {
  text: string
  cue: SyllableCue
  fontSize: number
  onTap: () => void
  onLongPress: () => void
}

export function SyllableButton({ text, cue, fontSize, onTap, onLongPress }: Props) {
  const [bounce, setBounce] = useState(0)
  const tapSize = Math.max(56, Math.min(60, Math.round(fontSize * 1.5)))
  const handleTap = useCallback(() => {
    setBounce((n) => n + 1)
    onTap()
  }, [onTap])
  const press = useSyllablePress({ onTap: handleTap, onLongPress })
  // `role="button"` na divie nie dostaje natywnej aktywacji Enter/Spacją.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      handleTap()
    },
    [handleTap],
  )
  return (
    <div
      role="button"
      aria-label={text}
      data-testid="syllable"
      tabIndex={0}
      onKeyDown={onKeyDown}
      {...press}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Tap-target skaluje się z czcionką (auto-fit). Dolna granica to 56 px,
        // a nie wymagane 60 — przy najdłuższych czytankach (cz-47) auto-fit
        // schodzi do małej czcionki i 60 px rozpychało wiersz poza viewport.
        minWidth: tapSize,
        minHeight: tapSize,
        padding: '0 0.12em',
        fontFamily: 'var(--font-block)',
        fontWeight: 700,
        fontSize,
        lineHeight: 1.1,
        color: cue.color,
        borderBottom: `3px ${cue.underline} ${cue.color}`,
        borderRadius: 12,
        background: 'transparent',
        transition: 'background 150ms',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        // Long-press na iOS Safari otwiera lupę/callout zamiast wywołać onLongPress.
        WebkitTouchCallout: 'none',
        cursor: 'pointer',
      }}
    >
      <span key={bounce} className={bounce ? 'cz-syl-bounce' : undefined} style={{ display: 'inline-block' }}>
        {text}
      </span>
    </div>
  )
}
