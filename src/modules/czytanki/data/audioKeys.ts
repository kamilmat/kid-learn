import { slugPl } from '@/shared/audio/slugPl'

export { slugPl, AUDIO_KEY_RE } from '@/shared/audio/slugPl'

export function syllableAudioKey(syllable: string): string {
  return `cz-syl-${slugPl(syllable)}`
}

export function wordAudioKey(syllables: readonly string[]): string {
  return `cz-word-${slugPl(syllables.join(''))}`
}
