type QueueItem = {
  key: string
  resolve: () => void
  reject: (error: unknown) => void
}

// Vite wstrzykuje import.meta.env.BASE_URL: '/' lokalnie, '/kid-learn/' na GH Pages.
// Bez tego audio MP3 były szukane pod /audio/ od root domeny i 404'owały na produkcji.
const DEFAULT_BASE_PATH =
  ((typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/') + 'audio'

// Single persistent HTMLAudioElement zamiast `new Audio()` per wywołanie:
// iOS Safari unlock'uje audio per-element (każdy nowy element wymaga gesture).
// Re-using jeden element oznacza, że pierwsze synchroniczne `audio.play()`
// w gesture-context (np. onClick → audioBus.play) odblokowuje wszystkie
// kolejne odtworzenia w tej tab session.
export class AudioBus {
  private static instance: AudioBus | null = null
  private queue: QueueItem[] = []
  private element: HTMLAudioElement | null = null
  private currentEnded: (() => void) | null = null
  private currentError: (() => void) | null = null
  private currentResolve: (() => void) | null = null
  private playing = false
  private basePath = DEFAULT_BASE_PATH

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

  play(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      void this.drain()
    })
  }

  enqueue(key: string): Promise<void> {
    return this.play(key)
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
    if (this.element) {
      this.element.pause()
      this.element.currentTime = 0
    }
    this.clearCurrentListeners()
    if (this.currentResolve) {
      const resolve = this.currentResolve
      this.currentResolve = null
      resolve()
    }
    const pending = this.queue.splice(0, this.queue.length)
    for (const item of pending) {
      item.resolve()
    }
    // Reset `playing` defensywnie. Drain pętla i tak ustawia false po
    // wyjściu z while, ale jeśli stop() lądował MIĘDZY iteracjami pętli
    // (po cleanup'ie playOne, przed kolejnym shift'em), playing zostaje
    // true a drain re-entry zostaje zablokowany — kolejne play() nigdy
    // nie odpalą się aż do ponownego stopu.
    this.playing = false
  }

  private async drain(): Promise<void> {
    if (this.playing) {
      return
    }
    this.playing = true
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) {
        break
      }
      try {
        await this.playOne(item.key)
        item.resolve()
      } catch (error) {
        item.reject(error)
      }
    }
    this.playing = false
  }

  private playOne(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = this.getElement()
      // Wyczyść ewentualne listenery z poprzedniego playOne — np. gdy
      // poprzedni naturalny `ended` odpalił drain → next playOne, listener
      // jest już usunięty w `cleanup()`. Ale gdy stop() odresolvował
      // i drain jakoś dotarł tu ponownie, defensywnie czyścimy.
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
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error(`Failed to play audio: ${key}`))
      }
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('error', onError)
      this.currentEnded = onEnded
      this.currentError = onError
      this.currentResolve = resolve
      const playResult = audio.play()
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch((error) => {
          cleanup()
          reject(error)
        })
      }
    })
  }
}

export const audioBus = AudioBus.getInstance()
