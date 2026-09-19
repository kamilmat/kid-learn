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

export type Comprehension = {
  question: string                             // "Kto jadł trawę?"
  options: readonly [string, string, string]   // emoji, dokładnie 3
  answer: 0 | 1 | 2
  /**
   * Pytanie złożone z nagrań słów (sylaby per słowo). Czytanki z puli
   * generowanej nie mają własnego klipu `cz-q-*` — grają `cz-word-*` po kolei.
   */
  questionWords?: readonly (readonly string[])[]
}

export type Czytanka = {
  id: string          // 'cz-01' … 'cz-2000'
  group: CzytankaGroup
  title: string       // dla rodzica
  emoji: string       // ikona kafelka
  sentences: readonly Sentence[]
  scene: SceneSpec
  comprehension?: Comprehension
}
