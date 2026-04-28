import { useState, useCallback, useRef, useEffect } from 'react'
import { pickRandomEasterEgg, type EasterEgg } from '../data/easterEggs'
import { useSettings } from '@/shared/settings/settingsStore'

export type ComicFailVariant = 'scratch' | 'eatBanana' | 'confusionDance' | 'sigh' | 'sillyFace'

export type IskraReaction =
  | { type: 'idle' }
  | { type: 'success' }
  | { type: 'streak'; level: 1 | 2 | 3 }
  | { type: 'wild' }
  | { type: 'easter-egg'; egg: EasterEgg }
  | { type: 'comic-fail'; variant: ComicFailVariant }

const COMIC_FAIL_VARIANTS: ComicFailVariant[] = ['scratch', 'eatBanana', 'confusionDance', 'sigh', 'sillyFace']
const COMIC_FAIL_DURATION = 1000  // krótszy niż correct celebration (~2.5s)

export function useIskraReactions(rng: () => number = Math.random) {
  const humorMode = useSettings(
    s => (s.settings as Record<string, unknown>).humorMode === 'off' ? 'off' : 'on'
  ) as 'on' | 'off'
  const [reaction, setReaction] = useState<IskraReaction>({ type: 'idle' })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const triggerEasterEgg = useCallback(() => {
    const egg = pickRandomEasterEgg(humorMode, rng)
    setReaction({ type: 'easter-egg', egg })
    clearTimer()
    timerRef.current = setTimeout(() => setReaction({ type: 'idle' }), egg.durationMs)
  }, [humorMode, rng, clearTimer])

  const triggerComicFail = useCallback(() => {
    const variant = COMIC_FAIL_VARIANTS[Math.floor(rng() * COMIC_FAIL_VARIANTS.length)]!
    setReaction({ type: 'comic-fail', variant })
    clearTimer()
    timerRef.current = setTimeout(() => setReaction({ type: 'idle' }), COMIC_FAIL_DURATION)
  }, [rng, clearTimer])

  const triggerSuccess = useCallback(() => {
    setReaction({ type: 'success' })
    clearTimer()
    timerRef.current = setTimeout(() => setReaction({ type: 'idle' }), 1500)
  }, [clearTimer])

  const triggerStreak = useCallback((level: 1 | 2 | 3) => {
    setReaction({ type: 'streak', level })
    clearTimer()
    timerRef.current = setTimeout(() => setReaction({ type: 'idle' }), 2000)
  }, [clearTimer])

  return { reaction, triggerEasterEgg, triggerComicFail, triggerSuccess, triggerStreak }
}
