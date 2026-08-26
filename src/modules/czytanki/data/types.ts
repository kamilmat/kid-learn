export type Punct = '.' | '!' | '?' | ','
export type Word = { syllables: readonly string[]; punct?: Punct }
export type Sentence = readonly Word[]
export type CzytankaGroup = 1 | 2 | 3 | 4

export type BgKind = 'sky' | 'room' | 'meadow' | 'forest' | 'beach' | 'night' | 'snow' | 'kitchen'
export type AnimKind = 'bob' | 'sway' | 'pulse' | 'wiggle' | 'float' | 'none'
export type Actor = {
  emoji: string
  x: number      // % szerokości sceny (środek aktora)
  y: number      // % wysokości sceny
  size: number   // px (font-size emoji)
  anim: AnimKind
  delay?: number // s, przesunięcie fazy animacji
}
export type SceneSpec = { bg: BgKind; actors: readonly Actor[] }

export type Czytanka = {
  id: string          // 'cz-01' … 'cz-60'
  group: CzytankaGroup
  title: string       // dla rodzica
  emoji: string       // ikona kafelka
  sentences: readonly Sentence[]
  scene: SceneSpec
}
