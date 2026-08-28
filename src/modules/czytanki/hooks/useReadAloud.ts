import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Czytanka } from '../data/types'
import { wordAudioKey } from '../data/audioKeys'

const SENTENCE_PAUSE_MS = 450
export type WordPos = { s: number; w: number }

export function useReadAloud({ czytanka, audioBus }: { czytanka: Czytanka; audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const [activeWord, setActiveWord] = useState<WordPos | null>(null)
  const runId = useRef(0)

  const stop = useCallback(() => {
    runId.current += 1
    audioBus.stop()
    setActiveWord(null)
  }, [audioBus])

  const toggle = useCallback(() => {
    if (activeWord) { stop(); return }
    const id = ++runId.current
    audioBus.stop()
    void (async () => {
      for (let s = 0; s < czytanka.sentences.length; s++) {
        const sent = czytanka.sentences[s]!
        for (let w = 0; w < sent.length; w++) {
          if (runId.current !== id) return
          setActiveWord({ s, w })
          try { await audioBus.play(wordAudioKey(sent[w]!.syllables)) } catch { /* brak pliku — idziemy dalej */ }
        }
        if (runId.current !== id) return
        if (s < czytanka.sentences.length - 1) {
          await new Promise((r) => setTimeout(r, SENTENCE_PAUSE_MS))
        }
      }
      if (runId.current === id) setActiveWord(null)
    })()
  }, [activeWord, audioBus, czytanka, stop])

  useEffect(() => () => { runId.current += 1 }, [czytanka])

  return { reading: activeWord !== null, activeWord, toggle, stop }
}
