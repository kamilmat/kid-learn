type QueueItem = {
  key: string
  resolve: () => void
  reject: (error: unknown) => void
}

export class AudioBus {
  private static instance: AudioBus | null = null
  private queue: QueueItem[] = []
  private current: HTMLAudioElement | null = null
  private currentResolve: (() => void) | null = null
  private playing = false
  private basePath = '/audio'

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

  play(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      void this.drain()
    })
  }

  enqueue(key: string): Promise<void> {
    return this.play(key)
  }

  stop(): void {
    if (this.current) {
      this.current.pause()
      this.current.currentTime = 0
      this.current = null
    }
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
      const audio = new Audio(`${this.basePath}/${key}.mp3`)
      this.current = audio
      this.currentResolve = resolve
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('error', onError)
        if (this.current === audio) {
          this.current = null
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
