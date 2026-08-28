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
  try {
    const played = await audioBus.play(audioKey)
    if (played) markSeen(key)
  } catch {
    // Brak pliku / przerwane odtwarzanie — intro zostaje nieoznaczone i
    // zagra przy następnej wizycie.
  } finally {
    inFlight.delete(key)
  }
}
