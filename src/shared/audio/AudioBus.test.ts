import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioBus } from './AudioBus'

type FakeAudio = {
  src: string
  paused: boolean
  currentTime: number
  listeners: Map<string, Set<EventListener>>
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  fire: (type: string) => void
}

// Po refaktorze AudioBus używa jednego persistent HTMLAudioElement —
// w testach widzimy zatem tylko jedno `new Audio()` per session, a kolejne
// odtwarzania zmieniają `.src`. created[0] jest tym samym mockiem przez
// całe życie buseu (do resetInstanceForTests).
const created: FakeAudio[] = []

function makeFakeAudio(src: string): FakeAudio {
  const listeners = new Map<string, Set<EventListener>>()
  const audio: FakeAudio = {
    src,
    paused: true,
    currentTime: 0,
    listeners,
    play: vi.fn(() => {
      audio.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(() => {
      audio.paused = true
    }),
    addEventListener: (type, listener) => {
      let set = listeners.get(type)
      if (!set) {
        set = new Set()
        listeners.set(type, set)
      }
      set.add(listener)
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener)
    },
    fire: (type) => {
      const set = listeners.get(type)
      if (!set) return
      for (const l of [...set]) {
        l(new Event(type))
      }
    },
  }
  return audio
}

describe('AudioBus', () => {
  let originalAudio: typeof globalThis.Audio

  beforeEach(() => {
    AudioBus.resetInstanceForTests()
    created.length = 0
    originalAudio = globalThis.Audio
    function FakeAudioCtor(this: unknown, src?: string) {
      const fake = makeFakeAudio(src ?? '')
      created.push(fake)
      return fake as unknown as HTMLAudioElement
    }
    globalThis.Audio = FakeAudioCtor as unknown as typeof globalThis.Audio
  })

  afterEach(() => {
    globalThis.Audio = originalAudio
  })

  it('plays a single key and resolves on ended', async () => {
    const bus = AudioBus.getInstance()
    const promise = bus.play('letter-b')

    expect(created).toHaveLength(1)
    expect(created[0]!.src).toContain('/audio/letter-b.mp3')
    expect(created[0]!.play).toHaveBeenCalledTimes(1)

    created[0]!.fire('ended')
    await promise
  })

  it('plays queued items in FIFO order on the same element', async () => {
    const bus = AudioBus.getInstance()
    const p1 = bus.play('a')
    const p2 = bus.enqueue('b')

    await Promise.resolve()
    expect(created).toHaveLength(1)
    const el = created[0]!
    expect(el.src).toContain('/audio/a.mp3')

    el.fire('ended')
    await p1

    await Promise.resolve()
    // Persistent element — nie tworzymy nowego Audio, tylko zmieniamy src.
    expect(created).toHaveLength(1)
    expect(el.src).toContain('/audio/b.mp3')
    expect(el.play).toHaveBeenCalledTimes(2)

    el.fire('ended')
    await p2
  })

  it('stop clears the queue and pauses current', async () => {
    const bus = AudioBus.getInstance()
    const p1 = bus.play('a')
    const p2 = bus.play('b')

    await Promise.resolve()
    expect(created).toHaveLength(1)

    bus.stop()
    await p1
    await p2

    expect(created[0]!.pause).toHaveBeenCalled()
    expect(created).toHaveLength(1)
  })

  it('resolves false (nie rzuca) on audio error i ostrzega raz per klucz', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bus = AudioBus.getInstance()
    const promise = bus.play('missing')
    await Promise.resolve()
    created[0]!.fire('error')
    await expect(promise).resolves.toBe(false)

    const second = bus.play('missing')
    await Promise.resolve()
    created[0]!.fire('error')
    await expect(second).resolves.toBe(false)

    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('resolves true gdy klip dograł do końca', async () => {
    const bus = AudioBus.getInstance()
    const promise = bus.play('a')
    await Promise.resolve()
    created[0]!.fire('ended')
    await expect(promise).resolves.toBe(true)
  })

  it('stop() nie zostawia zombie draina: play(C) w trakcie B nie nadpisuje src', async () => {
    const bus = AudioBus.getInstance()
    const pA = bus.play('a')
    await Promise.resolve()
    const el = created[0]!
    expect(el.src).toContain('/audio/a.mp3')

    bus.stop()
    const pB = bus.play('b')
    await expect(pA).resolves.toBe(false)
    await Promise.resolve()
    expect(el.src).toContain('/audio/b.mp3')

    // C dokłada się do kolejki — B gra dalej, src NIE może się zmienić.
    const pC = bus.play('c')
    await Promise.resolve()
    await Promise.resolve()
    expect(el.src).toContain('/audio/b.mp3')

    el.fire('ended')
    await expect(pB).resolves.toBe(true)
    await Promise.resolve()
    expect(el.src).toContain('/audio/c.mp3')

    el.fire('ended')
    await expect(pC).resolves.toBe(true)
  })

  it('każda obietnica play() settluje się po stop() (także ta zawieszona w drainie)', async () => {
    const bus = AudioBus.getInstance()
    const settled: string[] = []
    const pA = bus.play('a').then((ok) => settled.push(`a:${ok}`))
    const pB = bus.play('b').then((ok) => settled.push(`b:${ok}`))
    const pC = bus.play('c').then((ok) => settled.push(`c:${ok}`))
    await Promise.resolve()

    bus.stop()
    await Promise.all([pA, pB, pC])
    expect(settled.sort()).toEqual(['a:false', 'b:false', 'c:false'])

    // Bus dalej działa po stopie — kolejny play startuje nową generację.
    const pD = bus.play('d')
    await Promise.resolve()
    expect(created[0]!.src).toContain('/audio/d.mp3')
    created[0]!.fire('ended')
    await expect(pD).resolves.toBe(true)
  })

  it('unlock() gra cichy klip synchronicznie i jest idempotentny', async () => {
    const bus = AudioBus.getInstance()
    bus.unlock()
    expect(created).toHaveLength(1)
    expect(created[0]!.src).toContain('data:audio/wav')
    expect(created[0]!.play).toHaveBeenCalledTimes(1)

    await Promise.resolve()
    bus.unlock()
    expect(created[0]!.play).toHaveBeenCalledTimes(1)
  })

  it('unlock() nie nadpisuje src gdy coś już gra', async () => {
    const bus = AudioBus.getInstance()
    const p = bus.play('a')
    await Promise.resolve()
    bus.unlock()
    expect(created[0]!.src).toContain('/audio/a.mp3')
    created[0]!.fire('ended')
    await p
  })

  it('after stop, next play reuses the same element and starts fresh', async () => {
    const bus = AudioBus.getInstance()
    const p1 = bus.play('a')
    await Promise.resolve()
    bus.stop()
    await p1

    const p2 = bus.play('c')
    await Promise.resolve()
    expect(created).toHaveLength(1)
    expect(created[0]!.src).toContain('/audio/c.mp3')
    created[0]!.fire('ended')
    await p2
  })
})
