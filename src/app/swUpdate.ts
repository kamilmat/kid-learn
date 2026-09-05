/**
 * Most między rejestracją service workera (`main.tsx`, poza Reactem) a UI.
 *
 * WHY: nowa wersja z GitHub Pages instaluje się w tle i CZEKA — przeładowanie
 * robimy sami, żeby nie ucinać sesji dziecka w połowie pytania. Dopóki nie było
 * tu nic widocznego, „czeka" znaczyło w praktyce „nie da się wejść w nową
 * wersję bez czyszczenia danych przeglądarki": twardy refresh nie pomaga, bo
 * stroną wciąż steruje stary, aktywny SW.
 */

type Listener = () => void

let apply: (() => void) | null = null
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Woła `main.tsx`, gdy nowy SW czeka. `fn` przeładowuje stronę na nową wersję. */
export function setUpdateReady(fn: () => void): void {
  apply = fn
  emit()
}

/** Aktualizacja weszła sama (np. dziecko wróciło na Home) — guzik znika. */
export function clearUpdateReady(): void {
  apply = null
  emit()
}

export function subscribeUpdate(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isUpdateReady(): boolean {
  return apply !== null
}

export function applyUpdate(): void {
  const fn = apply
  apply = null
  emit()
  fn?.()
}

/** Testy — stan żyje w module, więc trzeba go móc wyzerować między testami. */
export function resetUpdateStateForTests(): void {
  apply = null
  listeners.clear()
}
