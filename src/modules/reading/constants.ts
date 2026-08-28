// Stałe modułu 2 współdzielone z ekranem ustawień.
//
// TODO(follow-up): `useReadingSession.ts` trzyma własną kopię
// `DEFAULT_QUESTIONS_PER_SESSION`. Nie ruszam jej tutaj, bo ten plik edytuje
// równolegle inna zmiana — przy najbliższej okazji hook ma importować stąd,
// żeby została jedna definicja.

/** Ile pytań ma sesja czytania, gdy rodzic nie ustawił własnej wartości. */
export const DEFAULT_QUESTIONS_PER_SESSION = 8
