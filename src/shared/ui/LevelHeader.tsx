import type { CSSProperties } from 'react'
import { IskraHero } from './IskraHero'

type Props = {
  title: string
  titleStyle?: CSSProperties
  iskraSize?: number
}

export function LevelHeader({ title, titleStyle, iskraSize = 100 }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}
    >
      <IskraHero size={iskraSize} state="idle" intensity="fire" />
      <h1 style={titleStyle}>{title}</h1>
    </div>
  )
}
