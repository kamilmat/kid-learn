/**
 * HandwrittenLetter — render litery (lub pary "Bb") w polskiej czterolinii
 * zgodnie z sekcją 10.3 specyfikacji Iskierek.
 *
 * Czterolinia (proporcje od góry SVG, ratio):
 *   - top         (0.0)  — niebieskoszara, cienka, ciągła; górna granica liter wysokich
 *   - upper-helper(0.3)  — czerwona, kreskowana; górna granica x-height
 *   - baseline    (0.7)  — czerwona, ciągła; baseline
 *   - bottom      (1.0)  — niebieskoszara, cienka, ciągła; dół ogonków
 *
 * Litera renderowana jest jako element <text> z dominant-baseline="alphabetic"
 * na y = size * 0.7 (baseline) i font-size = size * 0.7 (top→baseline). Font
 * pisany sam zadba o proporcje wysokości / x-height / descenderów.
 */

const TOP_RATIO = 0
const UPPER_HELPER_RATIO = 0.3
const BASELINE_RATIO = 0.7
const BOTTOM_RATIO = 1.0
const FONT_SIZE_RATIO = 0.7
const CHAR_WIDTH_RATIO = 0.6
const HORIZONTAL_PADDING = 16

const DEFAULT_SIZE = 120
const DEFAULT_LINE_COLOR = '#9ab8d4'
const DEFAULT_ACCENT_COLOR = '#d04a4a'

const FONT_FAMILY = "var(--font-handwritten)"

type HandwrittenLetterProps = {
  letter: string
  size?: number
  lineColor?: string
  accentColor?: string
  width?: number
}

export function HandwrittenLetter({
  letter,
  size = DEFAULT_SIZE,
  lineColor = DEFAULT_LINE_COLOR,
  accentColor = DEFAULT_ACCENT_COLOR,
  width,
}: HandwrittenLetterProps) {
  const height = size
  const computedWidth =
    typeof width === 'number'
      ? width
      : Math.max(size, Math.round(letter.length * size * CHAR_WIDTH_RATIO + HORIZONTAL_PADDING * 2))

  const yTop = height * TOP_RATIO
  const yUpperHelper = height * UPPER_HELPER_RATIO
  const yBaseline = height * BASELINE_RATIO
  const yBottom = height * BOTTOM_RATIO

  const fontSize = size * FONT_SIZE_RATIO
  const xCenter = computedWidth / 2

  const thinStroke = Math.max(1, Math.round(size / 80))
  const accentStroke = Math.max(1, Math.round(size / 70))
  const dashLength = Math.max(4, Math.round(size / 18))

  return (
    <svg
      role="img"
      aria-label={letter}
      data-testid="handwritten-letter"
      width={computedWidth}
      height={height}
      viewBox={`0 0 ${computedWidth} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        data-line="top"
        x1={0}
        y1={yTop + thinStroke / 2}
        x2={computedWidth}
        y2={yTop + thinStroke / 2}
        stroke={lineColor}
        strokeWidth={thinStroke}
      />
      <line
        data-line="upper-helper"
        x1={0}
        y1={yUpperHelper}
        x2={computedWidth}
        y2={yUpperHelper}
        stroke={accentColor}
        strokeWidth={thinStroke}
        strokeDasharray={`${dashLength} ${dashLength}`}
      />
      <line
        data-line="baseline"
        x1={0}
        y1={yBaseline}
        x2={computedWidth}
        y2={yBaseline}
        stroke={accentColor}
        strokeWidth={accentStroke}
      />
      <line
        data-line="bottom"
        x1={0}
        y1={yBottom - thinStroke / 2}
        x2={computedWidth}
        y2={yBottom - thinStroke / 2}
        stroke={lineColor}
        strokeWidth={thinStroke}
      />
      <text
        data-testid="handwritten-letter-text"
        x={xCenter}
        y={yBaseline}
        textAnchor="middle"
        dominantBaseline="alphabetic"
        fontFamily={FONT_FAMILY}
        fontSize={fontSize}
        fill="#2d2d33"
      >
        {letter}
      </text>
    </svg>
  )
}
