import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { CzytankiTempo } from '@/shared/settings/types'
import type { Czytanka } from '../data/types'
import { wordAudioKey } from '../data/audioKeys'

const SENTENCE_PAUSE_MS = 450
// Żółw czyta wolniej, więc i oddech między zdaniami jest dłuższy.
const SENTENCE_PAUSE_TURTLE_MS = 700
// Echo: tyle czasu dziecko ma na powtórzenie zdania po lektorze.
const ECHO_PAUSE_MS = 2500
const TURTLE_RATE = 0.75

export type WordPos = { s: number; w: number }

type Props = {
  czytanka: Czytanka
  audioBus: Pick<AudioBus, 'play' | 'stop' | 'setPlaybackRate'>
  echoMode?: boolean
  tempo?: CzytankiTempo
  /**
   * Cue zagrane raz, przed pierwszym słowem. Musi być kolejkowane WEWNĄTRZ
   * hooka — `toggle()` startuje od `audioBus.stop()`, więc klip wrzucony
   * przez wywołującego tuż przed tapem zostałby wyrzucony z kolejki.
   */
  introKey?: string | null
  /** Wołane tylko gdy przebieg dobiegł końca sam — nie po `stop()` ani po zmianie czytanki. */
  onFinished?: () => void
}

export function useReadAloud({
  czytanka,
  audioBus,
  echoMode = false,
  tempo = 'normal',
  introKey = null,
  onFinished,
}: Props) {
  const [activeWord, setActiveWord] = useState<WordPos | null>(null)
  // Indeks zdania, po którym trwa pauza na powtórzenie; null = nie czekamy.
  const [echoing, setEchoing] = useState<number | null>(null)
  const runId = useRef(0)
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  // Timer pauzy trzymany w refie, żeby `stop()` mógł go anulować — gołe
  // `await new Promise(setTimeout)` grałoby dalej po wyjściu z ekranu.
  const pauseTimerRef = useRef<number | null>(null)
  const pauseResolveRef = useRef<(() => void) | null>(null)

  const clearPause = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
    const resolve = pauseResolveRef.current
    pauseResolveRef.current = null
    resolve?.()
  }, [])

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        clearPause()
        pauseResolveRef.current = resolve
        pauseTimerRef.current = window.setTimeout(() => {
          pauseTimerRef.current = null
          pauseResolveRef.current = null
          resolve()
        }, ms)
      }),
    [clearPause],
  )

  const stop = useCallback(() => {
    runId.current += 1
    clearPause()
    audioBus.stop()
    audioBus.setPlaybackRate(1)
    setActiveWord(null)
    setEchoing(null)
  }, [audioBus, clearPause])

  /** Dziecko już powtórzyło — nie każemy mu czekać do końca pauzy. */
  const skipEcho = useCallback(() => {
    clearPause()
  }, [clearPause])

  const reading = activeWord !== null || echoing !== null
  // `toggle` musi widzieć aktualny stan czytania bez wpisywania go w deps —
  // inaczej każdy krok pętli tworzyłby nową referencję handlera.
  const readingRef = useRef(reading)
  readingRef.current = reading

  const toggle = useCallback(() => {
    if (readingRef.current) {
      stop()
      return
    }
    const id = ++runId.current
    audioBus.stop()
    audioBus.setPlaybackRate(tempo === 'turtle' ? TURTLE_RATE : 1)
    void (async () => {
      if (introKey) {
        await audioBus.play(introKey)
        if (runId.current !== id) return
      }
      for (let s = 0; s < czytanka.sentences.length; s++) {
        const sent = czytanka.sentences[s]!
        for (let w = 0; w < sent.length; w++) {
          if (runId.current !== id) return
          setActiveWord({ s, w })
          await audioBus.play(wordAudioKey(sent[w]!.syllables))
        }
        if (runId.current !== id) return
        if (echoMode) {
          setActiveWord(null)
          setEchoing(s)
          await wait(ECHO_PAUSE_MS)
          if (runId.current !== id) return
          setEchoing(null)
        } else if (s < czytanka.sentences.length - 1) {
          await wait(tempo === 'turtle' ? SENTENCE_PAUSE_TURTLE_MS : SENTENCE_PAUSE_MS)
          if (runId.current !== id) return
        }
      }
      if (runId.current === id) {
        setActiveWord(null)
        setEchoing(null)
        audioBus.setPlaybackRate(1)
        onFinishedRef.current?.()
      }
    })()
  }, [audioBus, czytanka, echoMode, introKey, stop, tempo, wait])

  useEffect(
    () => () => {
      runId.current += 1
      clearPause()
    },
    [czytanka, clearPause],
  )

  return { reading, activeWord, echoing, toggle, stop, skipEcho }
}
