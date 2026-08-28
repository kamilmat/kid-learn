// playIntroOnce — jedno odtworzenie intro na klucz, odporne na podwójny efekt.
//
// WHY: flaga "widziane" zapala się dopiero gdy `play()` się rozstrzygnie
// (inaczej zablokowany autoplay / brak pliku kasowałby onboarding na zawsze).
// Przez to okno między `play()` a `markSeen()` `hasSeen()` wciąż zwraca false —
// a React StrictMode w dev montuje efekty dwa razy, więc drugie przejście
// kolejkowało to samo intro jeszcze raz i dziecko słyszało je podwójnie.
// Moduł trzyma zbiór kluczy aktualnie granych i pomija powtórki.

const inFlight = new Set<string>()

type IntroBus = { play: (key: string) => Promise<boolean> }

/**
 * Flaga zapala się gdy `play()` zwróci `true` — czyli gdy audio FAKTYCZNIE
 * wystartowało (patrz nagłówek `AudioBus`). Intro przerwane tapem dziecka
 * liczy się jako usłyszane; zablokowany autoplay albo brak pliku (`false`)
 * zostawia flagę zgaszoną i intro wraca przy następnej wizycie.
 *
 * @param key klucz flagi "widziane" (i domyślnie klucz audio)
 * @param audioKey gdy plik audio nazywa się inaczej niż flaga
 */
export async function playIntroOnce(
  audioBus: IntroBus,
  key: string,
  hasSeen: (key: string) => boolean,
  markSeen: (key: string) => void,
  audioKey: string = key,
): Promise<void> {
  if (hasSeen(key) || inFlight.has(key)) return
  inFlight.add(key)
  // `.finally` PROSTO na obietnicy play(), a nie na tej funkcji async: guard
  // znika w pierwszym microtasku po rozstrzygnięciu, zanim ta funkcja zdąży
  // się wznowić po `await`. WHY: StrictMode montuje efekt dwa razy —
  // cleanup pierwszego woła `audioBus.stop()`, więc pierwsze odtworzenie
  // rozstrzyga się `false` (anulowane przed startem). Drugie wywołanie musi
  // móc wtedy zagrać intro, a nie odbić się od nieposprzątanego guardu.
  const pending = audioBus.play(audioKey).finally(() => {
    inFlight.delete(key)
  })
  try {
    if (await pending) markSeen(key)
  } catch {
    // Brak pliku / przerwane odtwarzanie — intro zostaje nieoznaczone i
    // zagra przy następnej wizycie.
  }
}
