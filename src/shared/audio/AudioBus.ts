/**
 * `play()` rozwiązuje się booleanem zamiast rzucać:
 *   true  — klip dograł do końca (`ended`)
 *   false — anulowany przez `stop()`, brak pliku (404 → `error`) albo
 *           odrzucone `element.play()` (autoplay policy)
 *
 * Dzięki temu ~60 call-site'ów `void audioBus.play(key)` nie generuje
 * unhandled rejection przy brakującym MP3, a onboardingi mogą palić flagę
 * "widziane" dopiero gdy audio faktycznie zagrało (`.then(ok => ok && ...)`).
 */
export type PlayResult = boolean

type QueueItem = {
  key: string
  resolve: (played: PlayResult) => void
}

// Vite wstrzykuje import.meta.env.BASE_URL: '/' lokalnie, '/kid-learn/' na GH Pages.
// Bez tego audio MP3 były szukane pod /audio/ od root domeny i 404'owały na produkcji.
const DEFAULT_BASE_PATH =
  ((typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/') + 'audio'

// ~10 ms ciszy (8 kHz, 8-bit mono WAV) — inline data: URI, żeby unlock nie
// zależał od żadnego pliku w public/audio ani od sieci.
const SILENCE_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='

// Single persistent HTMLAudioElement zamiast `new Audio()` per wywołanie:
// iOS Safari unlock'uje audio per-element (każdy nowy element wymaga gesture).
// Re-using jeden element oznacza, że pierwsze synchroniczne `audio.play()`
// w gesture-context (np. onClick → audioBus.play/unlock) odblokowuje wszystkie
// kolejne odtworzenia w tej tab session.
export class AudioBus {
  private static instance: AudioBus | null = null
  private queue: QueueItem[] = []
  private element: HTMLAudioElement | null = null
  private currentEnded: (() => void) | null = null
  private currentError: (() => void) | null = null
  private currentResolve: ((played: PlayResult) => void) | null = null
  private playing = false
  // Token generacji: każdy `stop()` inkrementuje. Zawieszona (na `await`)
  // pętla `drain()` po wznowieniu porównuje swój token z aktualnym i wychodzi
  // bez dotykania elementu ani flagi `playing` — inaczej zombie-drain
  // nadpisywał `src` nowszego odtwarzania i gasił `playing` pod nim.
  private generation = 0
  private basePath = DEFAULT_BASE_PATH
  private warnedKeys = new Set<string>()
  private unlocked = false

  static getInstance(): AudioBus {
    if (!AudioBus.instance) {
      AudioBus.instance = new AudioBus()
    }
    return AudioBus.instance
  }

  static resetInstanceForTests(): void {
    AudioBus.instance = null
  }

  setBasePath(path: string): void {
    this.basePath = path
  }

  private getElement(): HTMLAudioElement {
    if (!this.element) {
      this.element = new Audio()
    }
    return this.element
  }

  play(key: string): Promise<PlayResult> {
    return new Promise((resolve) => {
      this.queue.push({ key, resolve })
      void this.drain()
    })
  }

  enqueue(key: string): Promise<PlayResult> {
    return this.play(key)
  }

  /**
   * iOS/Safari: element audio jest odblokowany dopiero po `play()` wywołanym
   * SYNCHRONICZNIE w handlerze gestu. Wołaj z pointer/tap handlerów zanim
   * zrobisz navigate — kolejne odtworzenia (już poza gestem) zadziałają.
   * Idempotentne: no-op po pierwszym sukcesie, ciche przy odrzuceniu.
   */
  unlock(): void {
    if (this.unlocked) return
    // Coś już gra na tym elemencie → albo jest odblokowany, albo i tak nie
    // wolno nam nadpisać `src` w trakcie odtwarzania.
    if (this.playing || this.queue.length > 0) return
    try {
      const audio = this.getElement()
      audio.src = SILENCE_WAV_DATA_URI
      const result = audio.play() as Promise<void> | undefined
      if (result && typeof result.then === 'function') {
        result.then(
          () => {
            this.unlocked = true
          },
          () => {
            /* autoplay zablokowany — spróbujemy przy następnym gestcie */
          },
        )
      } else {
        this.unlocked = true
      }
    } catch {
      /* jsdom / brak wsparcia — unlock jest best-effort */
    }
  }

  private clearCurrentListeners(): void {
    if (!this.element) return
    if (this.currentEnded) {
      this.element.removeEventListener('ended', this.currentEnded)
      this.currentEnded = null
    }
    if (this.currentError) {
      this.element.removeEventListener('error', this.currentError)
      this.currentError = null
    }
  }

  stop(): void {
    this.generation += 1
    if (this.element) {
      this.element.pause()
      this.element.currentTime = 0
    }
    this.clearCurrentListeners()
    if (this.currentResolve) {
      const resolve = this.currentResolve
      this.currentResolve = null
      resolve(false)
    }
    const pending = this.queue.splice(0, this.queue.length)
    for (const item of pending) {
      item.resolve(false)
    }
    // Po `stop()` żaden drain nie jest już właścicielem elementu — kolejny
    // `play()` musi móc wystartować nową pętlę od razu.
    this.playing = false
  }

  private async drain(): Promise<void> {
    if (this.playing) {
      return
    }
    const generation = this.generation
    this.playing = true
    while (this.queue.length > 0) {
      if (generation !== this.generation) return
      const item = this.queue.shift()
      if (!item) {
        break
      }
      const played = await this.playOne(item.key)
      if (generation !== this.generation) {
        // stop() w trakcie odtwarzania: element (i flaga `playing`) należą już
        // do nowszej generacji — settlujemy własny item i milcząco znikamy.
        item.resolve(false)
        return
      }
      item.resolve(played)
    }
    if (generation === this.generation) {
      this.playing = false
    }
  }

  private warnMissing(key: string): void {
    if (this.warnedKeys.has(key)) return
    this.warnedKeys.add(key)
    console.warn(`[AudioBus] brak/uszkodzony plik audio: ${key}.mp3`)
  }

  private playOne(key: string): Promise<PlayResult> {
    return new Promise((resolve) => {
      const audio = this.getElement()
      // Wyczyść ewentualne listenery z poprzedniego playOne — np. gdy
      // poprzedni naturalny `ended` odpalił drain → next playOne, listener
      // jest już usunięty w `cleanup()`. Defensywnie czyścimy i tak.
      this.clearCurrentListeners()
      audio.src = `${this.basePath}/${key}.mp3`
      audio.currentTime = 0
      const cleanup = () => {
        if (this.currentEnded === onEnded) {
          audio.removeEventListener('ended', onEnded)
          this.currentEnded = null
        }
        if (this.currentError === onError) {
          audio.removeEventListener('error', onError)
          this.currentError = null
        }
        if (this.currentResolve === resolve) {
          this.currentResolve = null
        }
      }
      const onEnded = () => {
        cleanup()
        resolve(true)
      }
      const onError = () => {
        cleanup()
        this.warnMissing(key)
        resolve(false)
      }
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('error', onError)
      this.currentEnded = onEnded
      this.currentError = onError
      this.currentResolve = resolve
      const playResult = audio.play() as Promise<void> | undefined
      if (playResult && typeof playResult.then === 'function') {
        playResult.then(
          () => {
            this.unlocked = true
          },
          () => {
            // AbortError (src podmieniony przez stop/kolejny klip) albo
            // NotAllowedError (autoplay) — nie rzucamy, tylko "nie zagrało".
            cleanup()
            resolve(false)
          },
        )
      } else {
        this.unlocked = true
      }
    })
  }
}

export const audioBus = AudioBus.getInstance()
