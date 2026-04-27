// LetterTile — pojedynczy kafelek z literą.
// Sekcja 10.1 spec: render zależny od `caseMode` + `styleMode`.
// Sekcja 5.1 spec: warm light kolory, ≥120×120 (większy niż minimum 60).

import type { CSSProperties } from 'react'
import { colors, radii } from '@/app/theme'
import type { CaseMode, StyleMode } from '@/shared/settings/types'
import { toUpper } from '@/modules/letters/data/alphabet'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type LetterTileState =
  | 'idle'
  | 'selected'
  | 'correct'
  | 'wrong'
  | 'highlighted-correct'

export type LetterTileProps = {
  letter: string
  caseMode: CaseMode
  styleMode: StyleMode
  /** Wybór wielkości dla bieżącego pytania (używany przez tryb `mieszane`). */
  chosenCase: 'upper' | 'lower'
  state: LetterTileState
  onClick: () => void
  disabled?: boolean
  /** Dodatkowy testid, pomocny w testach gdy wiele kafelków. */
  testId?: string
}

const TILE_MIN_SIZE = 120
const TILE_FONT_SIZE = 64

function stateStyle(state: LetterTileState): CSSProperties {
  switch (state) {
    case 'idle':
      return {
        background: '#ffffff',
        border: `2px solid #e2e2e8`,
        boxShadow: 'none',
        transform: 'scale(1)',
      }
    case 'selected':
      return {
        background: '#ffffff',
        border: `3px solid ${colors.accentBlue}`,
        boxShadow: `0 0 0 4px ${colors.accentBlue}33`,
        transform: 'scale(1)',
      }
    case 'correct':
      return {
        background: '#f3fbef',
        border: `3px solid ${colors.accentGreen}`,
        boxShadow: `0 0 0 8px ${colors.accentGreen}44`,
        transform: 'scale(1)',
      }
    case 'wrong':
      return {
        background: '#fff4ea',
        border: `3px solid ${colors.accentOrange}`,
        boxShadow: `0 0 0 8px ${colors.accentOrange}55`,
        transform: 'scale(1)',
      }
    case 'highlighted-correct':
      return {
        background: '#f3fbef',
        border: `3px solid ${colors.accentGreen}`,
        boxShadow: `0 0 0 12px ${colors.accentGreen}66`,
        transform: 'scale(1.2)',
      }
  }
}

// Odstęp między literami w parze "Aa" — bez niego "Ll" zlepia się w jedną
// pionową kreskę dla 7-latka. 0.18em = ok 10-12px przy fontSize 56-64.
const PAIR_LETTER_SPACING = '0.18em'

function HandwrittenLetter({ text, fontSize, pair }: { text: string; fontSize: number; pair: boolean }) {
  return (
    <span
      data-testid="handwritten-letter"
      style={{
        fontFamily: 'var(--font-handwritten)',
        fontStyle: 'italic',
        fontSize,
        lineHeight: 1,
        letterSpacing: pair ? PAIR_LETTER_SPACING : undefined,
      }}
    >
      {text}
    </span>
  )
}

function PrintLetter({ text, fontSize, pair }: { text: string; fontSize: number; pair: boolean }) {
  return (
    <span
      data-testid="print-letter"
      style={{
        fontFamily: 'system-ui, sans-serif',
        fontSize,
        lineHeight: 1,
        letterSpacing: pair ? PAIR_LETTER_SPACING : undefined,
      }}
    >
      {text}
    </span>
  )
}

function pairText(letter: string): string {
  return `${toUpper(letter)}${letter}`
}

function casedText(letter: string, chosenCase: 'upper' | 'lower'): string {
  return chosenCase === 'upper' ? toUpper(letter) : letter
}

/**
 * Wybiera tekst do wyświetlenia w zależności od trybu wielkości.
 */
function textForCase(
  letter: string,
  caseMode: CaseMode,
  chosenCase: 'upper' | 'lower',
): string {
  switch (caseMode) {
    case 'tylko-duze':
      return toUpper(letter)
    case 'tylko-male':
      return letter
    case 'para':
      return pairText(letter)
    case 'mieszane':
      return casedText(letter, chosenCase)
  }
}

export function LetterTile({
  letter,
  caseMode,
  styleMode,
  chosenCase,
  state,
  onClick,
  disabled,
  testId,
}: LetterTileProps) {
  const text = textForCase(letter, caseMode, chosenCase)
  const showHandwritten = styleMode === 'tylko-pisane' || styleMode === 'oba-na-kafelku'
  const showPrint = styleMode !== 'tylko-pisane'
  const showsBothStyles = showPrint && showHandwritten
  const isPair = caseMode === 'para'

  // Skalujemy font żeby zmieścić się w kafelku:
  // - 1 forma, 1 znak: pełny rozmiar
  // - 1 forma, 2 znaki (para): nieco mniejszy
  // - 2 formy, 1 znak: mniejszy żeby zmieścić w pionie
  // - 2 formy, 2 znaki (para + oba style): najmniejszy
  const fontSize =
    showsBothStyles && isPair
      ? 38
      : showsBothStyles
        ? 48
        : isPair
          ? 56
          : TILE_FONT_SIZE

  const baseStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: showsBothStyles ? 140 : TILE_MIN_SIZE,
    borderRadius: radii.kid,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    color: colors.text,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    padding: showsBothStyles ? 8 : 12,
    gap: showsBothStyles ? 6 : 4,
    overflow: 'hidden',
    // touch-action: manipulation wyłącza double-tap zoom + browser-level pan,
    // user-select: none chroni przed text-selection przy press z rysika.
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  const tapProps = useTapHandler({ onTap: onClick, disabled: !!disabled })

  return (
    <button
      type="button"
      {...tapProps}
      disabled={disabled}
      aria-label={`Litera ${toUpper(letter)}`}
      data-letter={letter}
      data-state={state}
      data-testid={testId ?? `letter-tile-${letter}`}
      style={{ ...baseStyle, ...stateStyle(state) }}
    >
      {showPrint && <PrintLetter text={text} fontSize={fontSize} pair={isPair} />}
      {showHandwritten && <HandwrittenLetter text={text} fontSize={fontSize} pair={isPair} />}
    </button>
  )
}
