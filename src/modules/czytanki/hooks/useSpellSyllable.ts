import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { letterUnitAudioKey, syllableAudioKey } from '../data/audioKeys'
import { splitToLetterUnits } from '../data/letterUnits'

// Oddech między literkami — bez niego „k-o" zlewa się w jedno i przypominajka
// przestaje przypominać cokolwiek.
const UNIT_PAUSE_MS = 220
// Dłuższa przerwa przed klamrą: „to były literki, a TERAZ cała sylaba".
const BLEND_PAUSE_MS = 380

/** -1 = faza klamry (gra cała sylaba, podświetlone wszystkie literki). */
export const SPELL_WHOLE = -1

export type SpellState = { key: string; index: number }

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

export function useSpellSyllable({ audioBus }: Props) {
  const [spelling, setSpelling] = useState<SpellState | null>(null)
  const runId = useRef(0)
  const timerRef = useRef<number | null>(null)
  const resolveRef = useRef<(() => void) | null>(null)

  const clearPause = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const resolve = resolveRef.current
    resolveRef.current = null
    resolve?.()
  }, [])

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        clearPause()
        resolveRef.current = resolve
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null
          resolveRef.current = null
          resolve()
        }, ms)
      }),
    [clearPause],
  )

  const stop = useCallback(() => {
    runId.current += 1
    clearPause()
    setSpelling(null)
  }, [clearPause])

  /**
   * Literuje sylabę: literka po literce, na końcu cała sylaba. Sylaba
   * jednoliterowa („O", „A") gra tylko raz — klamra byłaby echem samej siebie.
   */
  const spell = useCallback(
    (key: string, syllable: string) => {
      const id = ++runId.current
      clearPause()
      audioBus.stop()
      const units = splitToLetterUnits(syllable)
      void (async () => {
        for (let i = 0; i < units.length; i++) {
          if (runId.current !== id) return
          setSpelling({ key, index: i })
          await audioBus.play(letterUnitAudioKey(units[i]!))
          if (runId.current !== id) return
          if (i < units.length - 1) await wait(UNIT_PAUSE_MS)
        }
        if (runId.current !== id) return
        if (units.length > 1) {
          await wait(BLEND_PAUSE_MS)
          if (runId.current !== id) return
          setSpelling({ key, index: SPELL_WHOLE })
          await audioBus.play(syllableAudioKey(syllable))
        }
        if (runId.current === id) setSpelling(null)
      })()
    },
    [audioBus, clearPause, wait],
  )

  // Odmontowanie ekranu (albo zmiana czytanki) nie może zostawić biegnącej
  // pętli, która dopisze podświetlenie do już nieistniejącego tekstu.
  useEffect(
    () => () => {
      runId.current += 1
      clearPause()
    },
    [clearPause],
  )

  return { spelling, spell, stop }
}
