import { describe, expect, it, vi } from 'vitest'
import { playIntroOnce } from './playIntroOnce'

/** Bus z ręcznie rozstrzyganym `play()` — symuluje trwające odtwarzanie. */
function makeDeferredBus() {
  let resolve!: (played: boolean) => void
  let reject!: (err: unknown) => void
  const play = vi.fn(
    () =>
      new Promise<boolean>((res, rej) => {
        resolve = res
        reject = rej
      }),
  )
  return { bus: { play }, play, resolve: (v: boolean) => resolve(v), reject: (e: unknown) => reject(e) }
}

describe('playIntroOnce', () => {
  it('dwa równoległe wywołania grają intro tylko raz (StrictMode double-effect)', async () => {
    const { bus, play, resolve } = makeDeferredBus()
    let seen = false
    const markSeen = vi.fn(() => {
      seen = true
    })
    const hasSeen = () => seen

    const first = playIntroOnce(bus, 'home-letters-intro', hasSeen, markSeen)
    const second = playIntroOnce(bus, 'home-letters-intro', hasSeen, markSeen)

    expect(play).toHaveBeenCalledTimes(1)
    resolve(true)
    await Promise.all([first, second])

    expect(play).toHaveBeenCalledTimes(1)
    expect(markSeen).toHaveBeenCalledExactlyOnceWith('home-letters-intro')
  })

  it('nie gra gdy intro jest już oznaczone jako widziane', async () => {
    const { bus, play } = makeDeferredBus()
    await playIntroOnce(bus, 'seen-intro', () => true, vi.fn())
    expect(play).not.toHaveBeenCalled()
  })

  it('nie pali flagi gdy play() zwróci false (zablokowany autoplay / brak pliku)', async () => {
    const { bus, resolve } = makeDeferredBus()
    const markSeen = vi.fn()
    const pending = playIntroOnce(bus, 'blocked-intro', () => false, markSeen)
    resolve(false)
    await pending
    expect(markSeen).not.toHaveBeenCalled()
  })

  it('zwalnia guard po odrzuconej obietnicy — kolejna wizyta może zagrać', async () => {
    const first = makeDeferredBus()
    const markSeen = vi.fn()
    const pending = playIntroOnce(first.bus, 'retry-intro', () => false, markSeen)
    first.reject(new Error('brak pliku'))
    await expect(pending).resolves.toBeUndefined()

    const second = makeDeferredBus()
    const again = playIntroOnce(second.bus, 'retry-intro', () => false, markSeen)
    expect(second.play).toHaveBeenCalledTimes(1)
    second.resolve(true)
    await again
    expect(markSeen).toHaveBeenCalledExactlyOnceWith('retry-intro')
  })

  it('audioKey pozwala grać inny plik niż klucz flagi (czytanka-first → czytanki-intro)', async () => {
    const { bus, play, resolve } = makeDeferredBus()
    const markSeen = vi.fn()
    const pending = playIntroOnce(
      bus,
      'czytanka-first',
      () => false,
      markSeen,
      'czytanki-intro',
    )
    expect(play).toHaveBeenCalledWith('czytanki-intro')
    resolve(true)
    await pending
    expect(markSeen).toHaveBeenCalledExactlyOnceWith('czytanka-first')
  })
})
