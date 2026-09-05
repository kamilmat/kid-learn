import { useCallback, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { SyllableCue } from '@/shared/ui/syllableColors'
import { colors } from '@/app/theme'
import { useSyllablePress } from '../hooks/useSyllablePress'
import { splitToLetterUnits } from '../data/letterUnits'
import { SPELL_WHOLE } from '../hooks/useSpellSyllable'
import './scene.css'

type Props = {
  text: string
  cue: SyllableCue
  fontSize: number
  /**
   * Tryb scalony: sylaba gubi własny kolor i podkreślenie, żeby słowo czytało
   * się jako całość. Warstwa czysto wizualna — tap i long-press działają jak
   * zawsze (dziecko wciąż może dotknąć pojedynczej sylaby).
   */
  merged?: boolean
  /**
   * Tryb przypominajki: indeks aktualnie wymawianej literki, `SPELL_WHOLE`
   * gdy gra już cała sylaba, `null` gdy ta sylaba akurat nie jest literowana.
   */
  spellIndex?: number | null
  onTap: () => void
  onLongPress: () => void
}

export function SyllableButton({ text, cue, fontSize, merged = false, spellIndex = null, onTap, onLongPress }: Props) {
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
        color: merged ? colors.text : cue.color,
        ...(merged ? {} : { borderBottom: `3px ${cue.underline} ${cue.color}` }),
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
        {/* Litery są osobnymi spanami ZAWSZE (nie tylko przy literowaniu) —
            inaczej wejście w tryb przypominajki przerysowywałoby tekst i
            auto-fit mógłby zmienić rozmiar w trakcie czytania. */}
        {splitToLetterUnits(text).map((unit, i) => {
          const lit = spellIndex !== null && (spellIndex === i || spellIndex === SPELL_WHOLE)
          return (
            <span
              key={i}
              data-testid={lit ? 'spell-letter-active' : undefined}
              style={{
                display: 'inline-block',
                borderRadius: '0.18em',
                background: lit ? '#fde047' : 'transparent',
                transition: 'background 120ms',
              }}
            >
              {unit}
            </span>
          )
        })}
      </span>
    </div>
  )
}
