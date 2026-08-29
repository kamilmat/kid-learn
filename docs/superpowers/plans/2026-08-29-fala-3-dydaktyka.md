# Iskierki — Fala 3 (duże inwestycje) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Siedem bloków spinających cztery moduły w jedną ścieżkę: multi-profil (G), wspólna ekonomia iskierek (B), plan na dziś (A), serie czytanek + nagrywanie (F), poziom pośredni CVC + most do zdań (D), porównywanie zbiorów i oś liczbowa (E), tracing liter (C).

**Architecture:** Nowe pakiety `src/shared/profiles/`, `src/shared/rewards/`, `src/shared/plan/` (czysta logika + Zustand persist + jeden route `/plan`). Moduły dokładają treść: `modules/czytanki/data/series.ts` + przepisane 60 czytanek + nagrywanie (MediaRecorder → IndexedDB), `modules/reading` (etap 2 Płomyka CVC + `SentenceBridge`), `modules/numbers` (`NumberLine` + 2 ćwiczenia + 3 koncepty), `modules/letters` (`letterPaths` + `TraceLetter`). Wszystkie store'y persistują pod kluczem z `storageKey(base)`.

**Tech Stack:** React 19, TS strict, Zustand 5 + persist, react-router-dom 7, @dnd-kit, Vitest 4, tsx (skrypty), Edge TTS (Zofia/Marek) + Azure Speech (Agnieszka, `azure` / `azure-ipa`).

**Spec:** `docs/superpowers/specs/2026-08-29-fala-3-dydaktyka-design.md` (sekcja „Decyzje" na końcu ma pierwszeństwo przed treścią speca)

## Global Constraints

- **Fala 1 i Fala 2 są zmergowane przed startem tego planu.** Stąd baseline różny od `main` z 2026‑08‑28: `settingsStore` jest w `version: 5`, `czytankiStore` w `version: 2` (`wordTaps`, `timeMs`, `readCounts`, `answeredQuestionIds`), `lettersStore` w `version: 2` (`dailyLetter`), `numbersStore` w `version: 3` (`recentOutcomes`, `factsCorrect`). Każdy task, który bumpuje wersję, **odczytuje aktualną wartość z kodu i dodaje 1** — nie wpisuje liczby z tego planu na ślepo.
- TS strict, brak `any` / `@ts-ignore`. Function components, named exports. Komentarz tylko gdy WHY niejasne.
- Klucze audio **lowercase**, `[a-z0-9_-]` (APFS maskuje 404, które wychodzą na GH Pages).
- Tap-targety ≥ 60×60 (wyjątek udokumentowany: `SyllableButton` 56). UI dziecka bez tekstu do czytania. Polskie napisy w UI rodzica.
- Tokeny z `@/app/theme` (`colors`, `radii`, `tapTargets`); kolory sylab przez `getSyllableCue` (Fala 1 §11).
- Każdy persist ma `migrate: (persisted) => persisted as …` **i** `merge` z defaultem dla każdego nowego pola. Bez `migrate` bump wersji kasuje postęp.
- `audioBus.play()` zwraca `boolean` (true = klip wystartował) i nigdy nie rzuca; `stop()` unieważnia kolejkę przez generation token.
- Testy tylko dla logiki czystej, danych, kluczy audio i store'ów (preferencja usera). Reszta weryfikowana w przeglądarce (viewport iPad 820×1180 i 1180×820).
- **Audio Azure**: buildy z `_engine: azure`/`azure-ipa` wymagają `.env.local` (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION=westeurope`), throttling ~3,1 s/request (F0 ≈20 req/min). Przed każdym buildem `pnpm audio:dry`. Klucze Zofia/`edge` są darmowe i szybkie — nie wliczają się do limitu.
- **Push**: paczki mp3 commitować w kawałkach ≤1 MB (sieć usera zrywa duże uploady).
- Commit po każdym tasku, message po polsku, z trailerem:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## Kolejność i równoległość

Sekwencyjnie: **T1 → T8** (fundament: profile, nagrody, plan — dotykają wszystkich store'ów i `Home`).
Potem trzy niezależne worktree (rozłączne pliki):

| Worktree | Taski | Pliki |
|---|---|---|
| `wt-tresc` | T9 → T10 → T11 → T12 | `modules/czytanki/data`, `modules/reading`, `scripts/czytanki-audio-source.ts`, `audio-source/czytanki-*.json` |
| `wt-cyferki` | T13 → T14 | wyłącznie `modules/numbers/**` + `audio-source/math-ui-strings.json` |
| `wt-tracing` | T15 → T16 | `modules/letters/**`, `scripts/generate-letter-paths.ts` + `audio-source/ui-strings.json` |

Kolizje do pilnowania przy merge: `SettingsScreen.tsx` (T16 dokłada przełącznik), `audio-source/ui-strings.json` (T16), `docs/STATUS.md` (tylko T18). T17 startuje po scaleniu `wt-tresc`. T18 na końcu, na scalonym `main`.

---

### Task 1: `storageKey` + `profilesStore` + `deviceStore`

**Files:**
- Create: `src/shared/profiles/storageKey.ts`, `src/shared/profiles/storageKey.test.ts`, `src/shared/profiles/profilesStore.ts`, `src/shared/profiles/profilesStore.test.ts`, `src/shared/device/deviceStore.ts`

**Interfaces:**
- Produces: `storageKey(base: string): string`, `DEFAULT_PROFILE_ID = 'p1'`, `PROFILE_AVATARS: readonly string[]`, `useProfiles` (Zustand), `Profile`, `ProfilesState`, `useDevice` (Zustand)

- [ ] **Step 1: Test `storageKey`**

```ts
// src/shared/profiles/storageKey.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { storageKey, DEFAULT_PROFILE_ID } from './storageKey'
import { useProfiles } from './profilesStore'

describe('storageKey', () => {
  beforeEach(() => { useProfiles.setState({ profiles: [{ id: 'p1', avatar: '🦊', color: '#0072B2', createdAt: 0 }], activeId: DEFAULT_PROFILE_ID }) })
  it('p1 nie zmienia klucza bazowego (zerowa migracja)', () => {
    expect(storageKey('iskierki-letters-v1')).toBe('iskierki-letters-v1')
  })
  it('inny profil dostaje sufiks', () => {
    useProfiles.setState({ activeId: 'p2' })
    expect(storageKey('iskierki-letters-v1')).toBe('iskierki-letters-v1__p2')
  })
  it('brak kolizji między bazami', () => {
    useProfiles.setState({ activeId: 'p3' })
    const keys = ['iskierki-letters-v1', 'iskierki-reading-v1'].map(storageKey)
    expect(new Set(keys).size).toBe(2)
  })
})
```

- [ ] **Step 2: Run** `pnpm vitest --run src/shared/profiles` → FAIL (module not found)

- [ ] **Step 3: Implementacja `storageKey.ts`**

```ts
// src/shared/profiles/storageKey.ts
export const DEFAULT_PROFILE_ID = 'p1'
export const MAX_PROFILES = 3

// WHY: `persist.name` jest czytane RAZ, przy tworzeniu store'a. Dlatego
// storageKey czyta activeId z getState() (nie hooka) i dlatego zmiana profilu
// wymaga location.reload() — patrz profilesStore.setActive.
export function storageKey(base: string): string {
  // Import cykliczny profilesStore → storageKey rozwiązany lazy require-em
  // przez dynamiczny odczyt globalnego stanu.
  const id = readActiveId()
  return id === DEFAULT_PROFILE_ID ? base : `${base}__${id}`
}

let activeIdReader: (() => string) | null = null
export function registerActiveIdReader(fn: () => string): void { activeIdReader = fn }
function readActiveId(): string {
  if (activeIdReader) return activeIdReader()
  try {
    const raw = localStorage.getItem('iskierki-profiles-v1')
    if (!raw) return DEFAULT_PROFILE_ID
    const parsed = JSON.parse(raw) as { state?: { activeId?: unknown } }
    const id = parsed.state?.activeId
    return typeof id === 'string' && id.length > 0 ? id : DEFAULT_PROFILE_ID
  } catch {
    return DEFAULT_PROFILE_ID
  }
}
```

- [ ] **Step 4: `profilesStore.ts`** — persist pod **nieprefiksowanym** `iskierki-profiles-v1`, `version: 1`, `migrate`, `merge` z defaultem `[{ id: 'p1', … }]` i `activeId: 'p1'`.

```ts
export type Profile = { id: string; avatar: string; color: string; createdAt: number }
export type ProfilesState = {
  profiles: Profile[]
  activeId: string
  addProfile: (avatar: string, color: string) => Profile | null   // null gdy >= MAX_PROFILES
  removeProfile: (id: string) => void                             // czyści klucze `*__id` + reload gdy aktywny
  setActive: (id: string) => void                                 // audioBus.stop() + location.reload()
}
export const PROFILE_AVATARS = ['🦊','🐻','🐼','🦁','🐸','🐧','🐰','🦉','🐢','🦄','🐬','🐝'] as const
export const PROFILE_COLORS = ['#0072B2','#B35900','#009E73','#CC79A7'] as const
```

`addProfile` generuje id `p${n}` gdzie `n` = najniższy wolny z 1..3. `removeProfile(id)` robi `Object.keys(localStorage).filter(k => k.endsWith('__' + id)).forEach(k => localStorage.removeItem(k))`, usuwa wpis z `profiles`, a gdy to był aktywny — `setActive(DEFAULT_PROFILE_ID)`. W module zaraz po `create(...)` zarejestruj czytnik: `registerActiveIdReader(() => useProfiles.getState().activeId)`.

- [ ] **Step 5: Test `profilesStore.test.ts`** — max 3 profile (4. `addProfile` → `null`); `removeProfile(activeId)` ustawia `activeId === 'p1'`; `merge(undefined, current)` daje jeden profil `p1`; `removeProfile` kasuje klucze z sufiksem, a bazowych nie rusza (stub `localStorage`).

- [ ] **Step 6: `deviceStore.ts`** — persist `iskierki-device-v1` (**bez** `storageKey`), `version: 1`, `migrate`, `merge`:

```ts
export type DeviceState = {
  mathGate: MathGateState
  recordingEnabled: boolean
  setMathGate: (s: MathGateState) => void
  setRecordingEnabled: (v: boolean) => void
}
```

- [ ] **Step 7: Run** `pnpm tsc -b && pnpm vitest --run src/shared/profiles` → 0 błędów, wszystkie zielone.

- [ ] **Step 8: Commit**

```bash
git add src/shared/profiles src/shared/device && git commit -m "$(cat <<'MSG'
feat(profiles): storageKey + store profili + store urządzenia

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Prefiksowanie 5 store'ów + migracja settings (math gate → device)

**Files:**
- Modify: `src/shared/settings/settingsStore.ts`, `src/modules/letters/store/lettersStore.ts`, `src/modules/reading/store/readingStore.ts`, `src/modules/numbers/store/numbersStore.ts`, `src/modules/czytanki/store/czytankiStore.ts`, `src/shared/settings/components/MathGate.tsx`, `src/shared/settings/types.ts`
- Modify: `src/shared/settings/settingsStore.test.ts`

**Interfaces:**
- Consumes: `storageKey`, `useDevice`
- Produces: wszystkie `persist({ name })` przechodzą przez `storageKey(...)`; `Settings` traci `czytanki.recordingEnabled` (jeśli Fala 3 T17 go jeszcze nie dodała — wtedy tylko math gate)

- [ ] **Step 1: Podmień `name` w pięciu store'ach**

W każdym: `name: storageKey('iskierki-letters-v1')` itd. `LETTERS_STORAGE_KEY` zostaje jako stała bazowa, ale `persist` dostaje `storageKey(LETTERS_STORAGE_KEY)`.

- [ ] **Step 2: Wyprowadź math gate do `deviceStore`**

`settingsStore` przestaje trzymać `mathGateState`; `tryUnlockGate` czyta i zapisuje przez `useDevice.getState().mathGate` / `setMathGate`. `parentGateUnlockedUntil` **zostaje** w settings (jest per-profil i tak ma TTL 5 min).

- [ ] **Step 3: Migracja wersji settings**

Odczytaj bieżącą wartość `version` w `settingsStore.ts` (po Fali 1 = 5), ustaw `version: <bieżąca + 1>` i dopisz w `merge` (append-only, pod istniejącymi guardami):

```ts
// v5 → v6: math gate wyprowadzony do `iskierki-device-v1` (urządzeniowy,
// nie per-profil — cooldown ma chronić przed dzieckiem, nie przed profilem).
const legacyGate = (p as { mathGateState?: MathGateState }).mathGateState
if (legacyGate && typeof legacyGate === 'object') {
  useDevice.getState().setMathGate(legacyGate)
}
```
oraz usuń `mathGateState` z `PersistedShape` i z wyniku `merge`.

- [ ] **Step 4: Test migracji** (dopisz do `settingsStore.test.ts`)

```ts
it('migracja wyprowadza math gate do iskierki-device-v1 bez utraty ustawień', () => {
  const persisted = { settings: { ...defaultSettings, humorMode: 'off' }, mathGateState: { failedAttempts: 2, cooldownUntil: 123 }, parentGateUnlockedUntil: 0 }
  const merged = mergeSettings(persisted, useSettings.getState())
  expect(merged.settings.humorMode).toBe('off')
  expect('mathGateState' in merged).toBe(false)
  expect(useDevice.getState().mathGate.failedAttempts).toBe(2)
})
```
(wyeksportuj `merge` jako nazwaną funkcję `mergeSettings`, jeśli jeszcze nie jest — test nie może wołać wewnętrznego domknięcia).

- [ ] **Step 5: Run** `pnpm tsc -b && pnpm test --run` → 0 błędów, 0 failed.

- [ ] **Step 6: Smoke w przeglądarce** — `pnpm dev`, otwórz z istniejącym `localStorage`: postęp liter/czytania/cyferek/czytanek **musi zostać** (profil `p1` = klucze bazowe). Math gate w ustawieniach dalej działa (3 błędy → 60 s cooldown).

- [ ] **Step 7: Commit** — `feat(profiles): store'y persistują pod kluczem profilu; math gate na urządzeniu` + trailer.

---

### Task 3: UI profili — Home, „Dzieci" w ustawieniach, selektor w raporcie

**Files:**
- Create: `src/shared/profiles/ProfileRow.tsx`, `src/shared/profiles/ProfilesSection.tsx`
- Modify: `src/app/Home.tsx`, `src/shared/settings/components/SettingsScreen.tsx`, `src/shared/stats/components/ReportScreen.tsx`, `src/shared/stats/exporter.ts`, `audio-source/ui-strings.json`

**Interfaces:**
- Produces: `ProfileRow({ audioBus }: { audioBus: Pick<AudioBus,'play'|'stop'> })` — render `null` gdy `profiles.length < 2`; `ProfilesSection()` (UI rodzica)

- [ ] **Step 1: `ProfileRow`** — rząd avatarów 64 px nad kartą planu (miejsce po Task 7). Aktywny: `opacity: 1` + `border: 3px solid profile.color`; pozostałe `opacity: .6`. Tap → `audioBus.stop()`, `void audioBus.play('profile-switch')`, `setActive(id)` (który robi `location.reload()`).
- [ ] **Step 2: `ProfilesSection`** w `SettingsScreen` (nowa `<section data-testid="section-profiles">` „Dzieci”): lista avatarów z ✏️ „usuń” (dwustopniowe potwierdzenie, wzór `section-reset`), „Dodaj dziecko” (siatka 12 emoji + 4 kolory) zablokowane przy 3 profilach. Tekst przy usuwaniu: „Usunięcie kasuje cały postęp tego dziecka i jego nagrania. Nie da się cofnąć.”
- [ ] **Step 3: Raport** — `ReportScreen` dostaje pasek avatarów (przełączenie = `setActive` + reload); nagłówek eksportu MD: `- Profil: <avatar> (<id>)`. `shared/stats/aggregate.ts` **nie zmienia się** — czyta store'y aktywnego profilu, bo store'y są już prefiksowane.
- [ ] **Step 4: Audio** — dopisz do `audio-source/ui-strings.json` (zofia, `edge`): `"profile-switch": "Cześć! Teraz twoja kolej."`
- [ ] **Step 5: Run** `pnpm audio:dry | grep profile-switch` → linia z `engine=edge`, akcja `generate`. Potem `pnpm audio:build` (tylko ten klucz idzie do TTS) i `pnpm audio:check` → 0 braków.
- [ ] **Step 6: Smoke** — dodaj profil `p2`, przełącz, sprawdź że Litery mają zerowy postęp; wróć na `p1` — postęp wraca. W DevTools → Application → Local Storage widać `iskierki-letters-v1__p2`.
- [ ] **Step 7: Commit** — `feat(profiles): rząd avatarów na Home, sekcja Dzieci, selektor w raporcie` + trailer.

---
### Task 4: Ekonomia nagród — `rules`, `rewardsStore`, seed z legacy

**Files:**
- Create: `src/shared/rewards/types.ts`, `src/shared/rewards/rules.ts`, `src/shared/rewards/rules.test.ts`, `src/shared/rewards/rewardsStore.ts`, `src/shared/rewards/rewardsStore.test.ts`, `src/shared/rewards/seedFromLegacy.ts`, `src/shared/rewards/seedFromLegacy.test.ts`
- Modify: `src/main.tsx` (jedno wywołanie seeda po rehydracji)

**Interfaces:**
- Produces:
```ts
export type ModuleId = 'letters' | 'reading' | 'numbers' | 'czytanki'
export type RewardEvent =
  | { kind: 'answer' }                 // dowolny wynik, także 🤷
  | { kind: 'retry-correct' }          // poprawa w drugiej próbie (Fala 1)
  | { kind: 'session-complete' }       // ukończona sesja albo krok planu
  | { kind: 'czytanka-second-read' }   // licznik „przeczytana 2×" (Fala 2)
  | { kind: 'plan-complete' }
export function iskierkiFor(event: RewardEvent): number
export type RewardsState = {
  total: number
  byModule: Record<ModuleId, number>
  daily: Record<string, number>        // 'YYYY-MM-DD' → suma dnia
  seededFromLegacy: boolean
  earn: (module: ModuleId, event: RewardEvent, dayKey: string) => number  // zwraca przyznane iskierki
  markSeeded: (total: number, byModule: Record<ModuleId, number>) => void
}
export function seedFromLegacy(input: { letters: LettersState; reading: ReadingState; numbers: PersistedNumbers; czytanki: CzytankiState }): { total: number; byModule: Record<ModuleId, number> }
```

- [ ] **Step 1: Test `rules.test.ts`** — tabela ze speca: `answer`→1, `retry-correct`→1, `session-complete`→3, `czytanka-second-read`→2, `plan-complete`→5; test wyczerpujący unię (`satisfies` + iteracja po liście wariantów).
- [ ] **Step 2: Implementacja `rules.ts`** — `switch` po `event.kind`, bez `default` (wyczerpalność sprawdza TS).
- [ ] **Step 3: `rewardsStore.ts`** — persist `storageKey('iskierki-rewards-v1')`, `version: 1`, `migrate`, `merge` z defaultami (`total: 0`, `byModule` z czterema zerami, `daily: {}`, `seededFromLegacy: false`). `earn` **tylko dodaje**: `total: s.total + n`, nigdy nie odejmuje, nigdy nie zeruje `daily` (cofnięty zegar → zwyczajnie starszy klucz).
- [ ] **Step 4: Test `rewardsStore.test.ts`** — `total` monotoniczne po serii losowych zdarzeń; `earn` aktualizuje `byModule` i `daily[dayKey]`; `merge({}, current)` daje komplet defaultów.
- [ ] **Step 5: `seedFromLegacy.ts`** — `total = Σ` odpowiedzi `outcome === 'correct'` w `sessions[]` liter, czytania i cyferek `+ 2 × czytanki.openedIds.length`; `byModule` analogicznie. Wołany raz z `main.tsx` **po** rehydracji wszystkich store'ów (`useLetters.persist.hasHydrated()` itd. — gdy któryś false, ustaw `onFinishHydration`), i tylko gdy `seededFromLegacy === false`; kończy `markSeeded(...)`.
- [ ] **Step 6: Test `seedFromLegacy.test.ts`** — suma z trzech store'ów + czytanki ×2; **drugie wywołanie nic nie zmienia** (flaga).
- [ ] **Step 7: Run** `pnpm tsc -b && pnpm vitest --run src/shared/rewards` → zielone.
- [ ] **Step 8: Commit** — `feat(rewards): wspólna ekonomia iskierek + seed z dotychczasowego postępu` + trailer.

---

### Task 5: `SessionEndShell` + wpięcie w cztery ekrany końca

**Files:**
- Create: `src/shared/rewards/SessionEndShell.tsx`
- Modify: `src/modules/letters/components/SessionEnd.tsx`, `src/modules/reading/components/SessionEnd.tsx`, `src/modules/numbers/components/SessionView.tsx`, `src/modules/letters/hooks/useSession.ts`, `src/modules/reading/hooks/useReadingSession.ts`, `src/modules/numbers/hooks/useNumbersSession.ts`, `src/shared/settings/components/SettingsScreen.tsx`, `src/shared/stats/components/ReportScreen.tsx`, `src/shared/stats/exporter.ts`, `audio-source/ui-strings.json`

**Interfaces:**
```ts
export type SessionEndVariant = 'standalone' | 'planStep' | 'planFinal'
export type SessionEndShellProps = {
  iskierkiEarned: number
  total: number
  breakdown: { correct: number; wrong: number; dontKnow: number }
  variant: SessionEndVariant
  slot?: ReactNode          // treść modułu: album, gałąź drzewka, sugestia poziomu
  onRestart?: () => void    // tylko variant 'standalone'
  onNext?: () => void       // tylko 'planStep' — jeden przycisk ▶
  onExit: () => void
}
```

- [ ] **Step 1: `SessionEndShell`** — nagłówek (Iskra + 🔥 `iskierkiEarned`, pod spodem szare `total`), `breakdown` (trzy komórki, wzór `BreakdownCell` z liter), `slot`, pasek przycisków wg wariantu: `standalone` → 🏠 duży + „jeszcze raz” mniejszy (kontrakt Fali 1 §8), `planStep` → jeden ▶, `planFinal` → tylko 🏠.
- [ ] **Step 2: Trzy `SessionEnd` jako cienkie wrappery** — zachowaj ich obecną treść merytoryczną (statystyki liter, nowe karty albumu, gałąź drzewka, sugestia poziomu z Fali 2 B‑10) i przekaż ją w `slot`. Nie przepisuj tej zawartości.
- [ ] **Step 3: `earn` wyłącznie z hooków sesji** — w miejscu flush `finishedRef` (letters `useSession.ts:509`, reading `useReadingSession.ts:674`, numbers `useNumbersSession.ts:172`): po `applySessionResults` woła się `earn(module, { kind: 'session-complete' }, dayKey)` oraz `earn(module, { kind: 'answer' }, dayKey)` × liczba odpowiedzi i `{ kind: 'retry-correct' }` × liczba poprawek (`attempt === 2 && outcome === 'correct'`). **Nigdy z komponentu** — remount `SessionEnd` nie może doliczać iskierek.
- [ ] **Step 4: Czytanki** — w miejscu inkrementu `readCounts` (Fala 2 §19): gdy licznik przechodzi 1→2, `earn('czytanki', { kind: 'czytanka-second-read' }, dayKey)`.
- [ ] **Step 5: Milestone** — w `rewardsStore.earn`: gdy `total` przekracza 100/250/500/1000, ustaw `pendingMilestone`; `SessionEndShell` gra `rewards-milestone` raz i czyści flagę. Dopisz klucz do `ui-strings.json` (zofia, `edge`): `"rewards-milestone": "Uzbierałeś całą garść iskierek!"`.
- [ ] **Step 6: Rodzic** — w `section-reset` dodaj checkbox „wyczyść też iskierki” (**domyślnie odznaczony**); w raporcie sekcja „Iskierki: total + rozbicie na moduły” i ta sama linia w eksporcie MD. **Home nie pokazuje liczby iskierek** (decyzja z 2026‑08‑29).
- [ ] **Step 7: Run** `pnpm tsc -b && pnpm test --run` → 0 failed. `pnpm audio:build && pnpm audio:check` → 0 braków.
- [ ] **Step 8: Smoke** — dokończ sesję Liter: iskierki rosną raz; reload strony na ekranie końca **nie** dolicza ponownie.
- [ ] **Step 9: Commit** — `feat(rewards): wspólny SessionEndShell + naliczanie iskierek z hooków sesji` + trailer.

---

### Task 6: Planer dnia — funkcja czysta

**Files:**
- Create: `src/shared/plan/types.ts`, `src/shared/plan/planner.ts`, `src/shared/plan/planner.test.ts`

**Interfaces:**
```ts
export type PlanStepKind = 'letters' | 'reading' | 'numbers' | 'czytanka'
export type PlanStep = { kind: PlanStepKind; level?: Level; czytankaId?: string; questions?: number; reason: 'due' | 'learning' | 'new' | 'fallback' }
export type DailyPlan = { date: string; steps: PlanStep[]; completed: boolean[]; startedAt: number | null; finishedAt: number | null }
export type DueSummary = { dueCount: number; level: Level | null }
export type ConceptSummary = DueSummary & { learningCount: number }
export type PlanInput = {
  today: string
  letters: DueSummary
  reading: DueSummary
  numbers: ConceptSummary
  czytanki: { openedIds: string[]; lastOpenedId: string | null }
  lastPlan: DailyPlan | null
  pickIndex: (n: number) => number      // wstrzykiwana losowość; brak Math.random w module
}
export function buildPlan(input: PlanInput): PlanStep[]        // zawsze 2–3 kroki
export function countDue(items: readonly BaseItemState[], now: number): number
```

- [ ] **Step 1: Test `planner.test.ts`**

```ts
const base: PlanInput = { today: '2026-08-29', letters: { dueCount: 0, level: null }, reading: { dueCount: 0, level: null },
  numbers: { dueCount: 0, level: null, learningCount: 0 }, czytanki: { openedIds: [], lastOpenedId: null }, lastPlan: null, pickIndex: () => 0 }

it('pusty stan → wariant startowy: litery iskierka + czytanka', () => {
  const steps = buildPlan(base)
  expect(steps.map(s => s.kind)).toEqual(['letters', 'czytanka'])
  expect(steps[0]!.level).toBe('iskierka'); expect(steps.every(s => s.reason === 'new')).toBe(true)
})
it('trzy kroki, bez dwóch tego samego modułu, ostatni zawsze czytanka', () => {
  const steps = buildPlan({ ...base, letters: { dueCount: 9, level: 'plomyk' }, reading: { dueCount: 4, level: 'plomyk' },
    numbers: { dueCount: 2, level: 'iskierka', learningCount: 1 }, czytanki: { openedIds: ['cz-01'], lastOpenedId: 'cz-01' } })
  expect(steps).toHaveLength(3)
  expect(steps[0]!.kind).toBe('letters'); expect(steps[1]!.kind).toBe('reading'); expect(steps[2]!.kind).toBe('czytanka')
  expect(new Set(steps.map(s => s.kind)).size).toBe(3)
  expect(steps[0]!.questions).toBe(6); expect(steps[1]!.questions).toBe(6)
})
it('remis rozstrzyga kolejność Litery → Czytanie → Cyferki', () => { /* dueCount 5/5/5 → letters, reading */ })
it('krok 3: pierwsza nieotwarta z najniższej grupy z ≥1 otwartą, inaczej powtórka lastOpenedId', () => { /* … */ })
it('determinizm — dwa wywołania z tym samym pickIndex dają identyczny plan', () => { /* toEqual */ })
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implementacja** wg reguł ze speca §A: (1) sortowanie modułów po `dueCount` malejąco ze stabilnym remisem `['letters','reading','numbers']`; (2) krok 1 i 2 = dwa różne moduły, `questions: 6`, `level` z `DueSummary.level` (fallback `'iskierka'`); (3) krok 3 zawsze `kind: 'czytanka'`; (4) gdy wszystkie `dueCount === 0` i `openedIds` puste → wariant startowy z `reason: 'new'`; (5) `reason: 'learning'` gdy moduł ma `learningCount > 0` a `dueCount === 0`, inaczej `'due'`, a przy kroku 3 z powtórką — `'fallback'`. Moduł **nie importuje** React ani żadnego store'a.
- [ ] **Step 4: `countDue`** — `box <= 2 || recentWrong > 0 || (now - lastSeen) > boxInterval(box)`; `boxInterval` reużyj z `@/shared/srs/scoring` (jeśli nie jest eksportowana, wyeksportuj — bez zmiany zachowania).
- [ ] **Step 5: Run** `pnpm vitest --run src/shared/plan` → zielone.
- [ ] **Step 6: Commit** — `feat(plan): deterministyczny planer dnia (2–3 kroki)` + trailer.

---
### Task 7: `planStore` + route `/plan` + karta na Home + wariant `planStep` w modułach

**Files:**
- Create: `src/shared/plan/planStore.ts`, `src/shared/plan/planStore.test.ts`, `src/shared/plan/PlanRunner.tsx`, `src/shared/plan/PlanCard.tsx`, `src/shared/plan/planInput.ts`
- Modify: `src/app/App.tsx`, `src/app/Home.tsx`, `src/modules/letters/index.tsx`, `src/modules/reading/index.tsx`, `src/modules/numbers/index.tsx`, `src/modules/czytanki/index.tsx`, `audio-source/ui-strings.json`

**Interfaces:**
```ts
export type PlanState = { today: DailyPlan | null; history: DailyPlan[] }   // history cap 30
export type PlanStore = PlanState & {
  ensurePlanForToday: (input: PlanInput) => DailyPlan   // generuje raz dziennie, archiwizuje poprzedni
  startPlan: (now: number) => void
  completeStep: (index: number, now: number) => void
  currentStepIndex: () => number | null                 // pierwszy nieukończony, null gdy koniec
  resetPlan: () => void
}
export function buildPlanInputFromStores(now: number): PlanInput   // planInput.ts — jedyne miejsce czytające 4 store'y
```

- [ ] **Step 1: `planStore.ts`** — persist `storageKey('iskierki-plan-v1')`, `version: 1`, `migrate`, `merge` (`today: null`, `history: []`). `ensurePlanForToday`: gdy `today?.date === input.today` → zwróć bieżący; inaczej przenieś `today` do `history` (cap 30, najnowsze pierwsze) i utwórz nowy z `buildPlan(input)`, `completed: steps.map(() => false)`.
- [ ] **Step 2: Test `planStore.test.ts`** — jeden plan na dzień (dwa `ensurePlanForToday` z tą samą datą → ta sama referencja `steps`); zmiana daty archiwizuje poprzedni; `history` nie przekracza 30; `merge({}, current)` daje defaulty; `completeStep` jest idempotentne, a po ostatnim kroku ustawia `finishedAt`.
- [ ] **Step 3: `PlanCard`** na Home nad siatką 2×2 (~120 px): Iskra + 3 kółka 72 px z ikonami modułów (`levelIcons` / emoji modułu), ukończony krok `✅` + `opacity: .5`. Zero tekstu. Tap = `audioBus.stop()`, `play('nav-tap')`, `navigate('/plan')`. Intro `home-plan-intro` przez `playIntroOnce`. Renderuje `null` gdy `settings.plan.enabled === false`.
- [ ] **Step 4: `PlanRunner`** (route `/plan` w `App.tsx`) — nie renderuje UI sesji:

```tsx
const idx = usePlan(s => s.currentStepIndex())
useEffect(() => {
  if (idx === null) { void audioBus.play('plan-done'); return }        // ekran domknięcia: Iskra + 3 ✅ + 🏠
  const step = plan.steps[idx]!
  void audioBus.play(idx === 0 ? 'plan-intro' : idx === plan.steps.length - 1 ? 'plan-last' : 'plan-next')
  navigate(routeForStep(step), { replace: true, state: { plan: true, stepIndex: idx } })
}, [idx])
```
`routeForStep`: `letters` → `/letters/session/${level}`, `reading` → `/reading/session/${level}`, `numbers` → `/numbers/session/${level}`, `czytanka` → `/czytanki/${czytankaId}`.

- [ ] **Step 5: Wariant `planStep` w modułach** — jedyna zmiana w hookach: przy `finish()` sprawdź `location.state?.plan`; wtedy `SessionEnd` dostaje `variant: 'planStep'` i `onNext = () => { completeStep(stepIndex, Date.now()); navigate('/plan') }`. `questions` z kroku planu nadpisuje `settings.questionsPerSession` dla tej sesji. Czytanka jako krok: `completeStep` wołane przy wyjściu z `CzytankaView` (tam gdzie `markOpened`).
- [ ] **Step 6: Brzegowe** — nieprawidłowy `czytankaId` (po Task 9) → podmień na pierwszą czytankę grupy 1; pusta pula poziomu (override liter) → krok pomijany (`completeStep` bez nawigacji); 🏠 w trakcie = plan zostaje niedokończony, bez kary; zmiana daty w trakcie nie przelicza `today` (data zamrożona w `DailyPlan.date`).
- [ ] **Step 7: Audio** — do `ui-strings.json` (zofia, `edge`): `plan-intro` „Mam dla ciebie plan na dziś. Trzy zadania i koniec.”, `plan-next` „Pierwsze zrobione! Idziemy dalej.”, `plan-last` „Zostało ostatnie — czytanka.”, `plan-done` „Cały plan zrobiony. Na dziś wystarczy, brawo!”, `home-plan-intro` „Tu jest twój plan na dziś. Dotknij, żeby zacząć.”
- [ ] **Step 8: Run** `pnpm tsc -b && pnpm test --run` → 0 failed; `pnpm audio:build && pnpm audio:check` → 0 braków.
- [ ] **Step 9: Smoke** — przejdź cały plan (3 kroki) bez wychodzenia; potem drugi raz tego samego dnia — plan pokazuje 3 ✅ i nie generuje nowego.
- [ ] **Step 10: Commit** — `feat(plan): store, runner /plan, karta na Home, wariant planStep` + trailer.

---

### Task 8: Plan w raporcie rodzica + przełącznik `plan.enabled`

**Files:**
- Create: `src/shared/stats/components/PlanSection.tsx`, `src/shared/stats/components/PlanSection.test.tsx`
- Modify: `src/shared/stats/components/ReportScreen.tsx`, `src/shared/stats/exporter.ts`, `src/shared/settings/components/SettingsScreen.tsx`, `src/shared/settings/defaults.ts`, `src/shared/settings/types.ts`

**Interfaces:**
- Produces: `PlanSection({ today, history }: PlanState)`; `weeklyPlanRows(state: PlanState, now: number): { date: string; steps: boolean[] }[]` (7 pozycji, pn–nd)
- Consumes: `settings.plan: { enabled: boolean }` (default `true`)

- [ ] **Step 1: `weeklyPlanRows`** — bieżący tydzień od poniedziałku, brakujące dni jako `steps: []`.
- [ ] **Step 2: Test** — 7 wierszy zawsze; dzień bez planu daje pustą tablicę; podsumowanie „Plan ukończony 4 z 7 dni” liczy tylko dni z `finishedAt !== null`.
- [ ] **Step 3: `PlanSection`** jako `CollapsibleSection` (wzór z Fali 2 §12): 7 kolumn × 3 kropki (pełna = krok wykonany), pod spodem tekst podsumowania.
- [ ] **Step 4: Eksport MD** — sekcja `## Plan na dziś` z tą samą tabelą (kontrakt: treść UI ≡ markdown).
- [ ] **Step 5: Ustawienie** — `plan: { enabled: true }` w `defaultSettings` + default w `merge` settings (bez bumpu wersji, jeśli Task 2 już ją podniósł w tej fali; inaczej podnieś); `ToggleField` „Plan na dziś na ekranie głównym” w `SettingsScreen`.
- [ ] **Step 6: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 7: Commit** — `feat(plan): tygodniowy widok planu w raporcie + przełącznik w ustawieniach` + trailer.

> **Checkpoint:** tu kończy się część sekwencyjna. Utwórz trzy worktree (`wt-tresc`, `wt-cyferki`, `wt-tracing`) z tego commita.

---

### Task 9: Serie czytanek — dane + przepisanie 60 tekstów  *(worktree `wt-tresc`)*

**Files:**
- Create: `src/modules/czytanki/data/series.ts`, `src/modules/czytanki/data/series.test.ts`
- Modify: `src/modules/czytanki/data/types.ts`, `src/modules/czytanki/data/czytanki.ts`, `src/modules/czytanki/data/czytanki.test.ts`

**Interfaces:**
```ts
export type SeriesId = 'ola-burek' | 'dom' | 'las' | 'przedszkole' | 'pory-roku'
export type Series = { id: SeriesId; title: string; emoji: string; color: string; cast: string[] }
export const SERIES: readonly Series[] = […]                     // 5 pozycji
export function getSeries(id: SeriesId): Series
export function getCzytankiBySeries(id: SeriesId): Czytanka[]
// types.ts: Czytanka dostaje `series: SeriesId` + `seriesIndex: number` (1..12)
```

- [ ] **Step 1: Reguły przepisania (nienaruszalne — łam je tylko gdy narracja serii tego wymaga, decyzja 2026‑08‑29):**
  1. **`id` czytanek zostaje bez zmian** (`cz-01`…`cz-60`) — `openedIds`, `readCounts`, `wordTaps` w `iskierki-czytanki-v1` są kluczowane po id; zmiana skasowałaby postęp.
  2. **Zachowaj obecny tekst wszędzie, gdzie imię/bohater już pasuje** — każde niezmienione słowo to zaoszczędzone wywołanie Azure. Przeredagowuj tylko tam, gdzie seria tego wymaga.
  3. Inwentarz fonologiczny grupy bez zmian: w G1 wolno tylko OLA/MAMA/TATA/LALA (sylaby otwarte CV); BUREK, MRUCZEK, DZIADEK dopiero od G2.
  4. Liczba zdań i słów per czytanka bez zmian (auto-fit i `SceneSpec` są na to skalibrowane).
  5. Zmieniamy **imiona i rekwizyty**, czasowniki zostają (koszt audio).
  6. Seria = spójne `scene.bg` i rodzina emoji; `title` z prefiksem serii („Ola i Burek — Burek śpi”).
  7. Stały skład: OLA (7 lat), TATA, MAMA, BUREK (pies), MRUCZEK (kot), DZIADEK.
  8. Rozkład: 5 serii × 12 czytanek, **po 3 w każdej grupie** (`seriesIndex` rośnie razem z grupą: 1–3 w G1, 4–6 w G2, 7–9 w G3, 10–12 w G4).
- [ ] **Step 2: `series.ts`** — 5 wpisów: `ola-burek` 🐕 `#B35900`, `dom` 🏠 `#0072B2`, `las` 🌲 `#009E73`, `przedszkole` 🎒 `#CC79A7`, `pory-roku` 🍂 `#0072B2`.
- [ ] **Step 3: Przepisz `czytanki.ts`** — do każdej z 60 dopisz `series` i `seriesIndex`, popraw `title`, imiona i rekwizyty wg reguł. Zachowaj `comprehension` z Fali 2 §17 i **zaktualizuj je, jeśli zmieniłeś rzeczownik z odpowiedzi** (poprawne emoji musi dalej być obecne w tekście).
- [ ] **Step 4: Test `series.test.ts`**

```ts
it('5 serii × 12 czytanek, po 3 w każdej grupie', () => {
  for (const s of SERIES) {
    const items = getCzytankiBySeries(s.id)
    expect(items).toHaveLength(12)
    for (const g of [1,2,3,4] as const) expect(items.filter(c => c.group === g)).toHaveLength(3)
    expect(new Set(items.map(c => c.seriesIndex)).size).toBe(12)
  }
})
it('każda czytanka ma serię, id bez zmian', () => {
  expect(CZYTANKI.map(c => c.id)).toEqual(Array.from({length:60},(_,i)=>`cz-${String(i+1).padStart(2,'0')}`))
  for (const c of CZYTANKI) expect(SERIES.some(s => s.id === c.series)).toBe(true)
})
```
- [ ] **Step 5: Regresja** — istniejący `czytanki.test.ts` (inwentarz sylab G1, punct, klucze audio, sceny) **musi przejść bez modyfikacji asercji**. Jeśli nie przechodzi — popraw tekst, nie test.
- [ ] **Step 6: Run** `pnpm vitest --run src/modules/czytanki` → zielone.
- [ ] **Step 7: Commit** — `feat(czytanki): 5 serii z bohaterami, przepisane 60 czytanek` + trailer.

---

### Task 10: Regeneracja audio czytanek + filtr serii na liście  *(wt-tresc)*

**Files:**
- Modify: `audio-source/czytanki-syllables.json`, `audio-source/czytanki-words.json` (generowane), `audio-source/czytanki-ui-strings.json`, `src/modules/czytanki/components/CzytankaList.tsx`, `src/modules/czytanki/components/CzytankaTile.tsx`, `public/audio/**`

- [ ] **Step 1: Plan buildu** — `pnpm audio:dry > /tmp/dry.txt`; policz `grep -c 'generate' /tmp/dry.txt`. Oczekiwane ~150 nowych `cz-word-*` i ~15 `cz-syl-*` (mniej, jeśli reguła „zachowaj tekst” zadziałała). Przy >200 kluczach **rozbij build na dwie tury** (limit F0).
- [ ] **Step 2: Build** — `pnpm audio:build`. Czas ≈ liczba kluczy × 3,1 s (~10 min dla 165). Potem `pnpm audio:check` → „0 braków”. Osierocone pliki starych kluczy zostają w `public/audio` — nie kasuj ich (rollback bez rebuildu).
- [ ] **Step 3: Odsłuch** — przesłuchaj 10 losowych nowych `cz-word-*` i **wszystkie** nowe `cz-syl-*`. Błędy wymowy → wpis w `audio-source/pronunciation-overrides.json` (`{"ipa": "…"}` lub `{"text": "…"}`) → ponowny `pnpm audio:build`.
- [ ] **Step 4: Filtr serii w `CzytankaList`** — pasek nad sekcjami grup: 5 ikon serii + ✳️ „wszystkie”, stan w `useState` (bez route'u), 72 px, aktywna z obwódką w `series.color`. Wybór filtruje kafelki, **nie blokuje** reszty. Tap gra `czytanki-series-<id>`.
- [ ] **Step 5: Kafelek** — mikro-ikona serii (28 px) w rogu przeciwnym do ⭐/kropek z Fali 2 §19.
- [ ] **Step 6: Audio cue** — dopisz do `czytanki-ui-strings.json` (agnieszka, `azure`) 5 kluczy: `czytanki-series-ola-burek` „Opowieści o Oli i Burku.”, `czytanki-series-dom` „Czytanki o domu.”, `czytanki-series-las` „Czytanki o lesie.”, `czytanki-series-przedszkole` „Czytanki o przedszkolu.”, `czytanki-series-pory-roku` „Czytanki o porach roku.” → `pnpm audio:build` (5 kluczy ≈ 20 s).
- [ ] **Step 7: Smoke** — filtr przełącza się bez skoku layoutu; czytanka gra nowe słowa (Network: brak 404 na `cz-word-*`).
- [ ] **Step 8: Commit** — mp3 w paczkach ≤1 MB: `git add public/audio/cz-word-a*` … kolejnymi commitami; ostatni commit z kodem: `feat(czytanki): filtr serii + regeneracja audio` + trailer.

---
### Task 11: Płomyk etap 2 — słowa CVC  *(wt-tresc)*

**Files:**
- Modify: `src/modules/reading/data/words.ts`, `src/modules/reading/data/words.test.ts`, `src/modules/reading/data/contrastiveSyllables.ts`, `src/modules/reading/types.ts`, `src/modules/reading/hooks/useReadingSession.ts`, `src/modules/reading/components/exercises/*` (wariant `word-assembly`), `src/shared/settings/types.ts`, `src/shared/settings/defaults.ts`, `src/shared/settings/components/SettingsScreen.tsx`, `audio-source/reading-ui-strings.json`
- Create: `src/modules/reading/data/plomykStage.ts`, `src/modules/reading/data/plomykStage.test.ts`

**Interfaces:**
```ts
export type PlomykStage = 1 | 2                     // 1: CV-CV (MAMA), 2: CVC (KOT)
// WordData: + `stage?: PlomykStage` (tylko dla level === 'plomyk')
export function computePlomykStage(words: readonly WordState[], override: 'auto' | 1 | 2): PlomykStage
export const CODA_CONTRASTS: Record<string, readonly string[]>   // 'T': ['K','P'], 'S': ['Z'], 'M': ['N'], …
```

- [ ] **Step 1: 14 słów etapu 2** w `ALL_WORDS` (`level: 'plomyk'`, `stage: 2`): KOT 🐈, DOM 🏠, LAS 🌲, MAK 🌺, SOK 🧃, LEW 🦁, NOS 👃, RAK 🦞, SER 🧀, DYM 💨, KOC 🛏️, MUR 🧱, BAT 🥁, SUM 🐟. `syllables` = `['KO','T']` (sylaba otwarta + koda), `id: 'word-KOT'`. Istniejącym 20 słowom dopisz `stage: 1`.
- [ ] **Step 2: Test `words.test.ts`** (dopisz)

```ts
it('każde słowo stage 2 to sylaba otwarta + pojedyncza koda, z fonemów poziomu', () => {
  for (const w of ALL_WORDS.filter(x => x.stage === 2)) {
    expect(w.syllables).toHaveLength(2)
    expect(w.syllables[0]!).toMatch(/^[BCDKLMNPRSTWZ][AEIOUY]$/)
    expect(w.syllables[1]!).toMatch(/^[BCDKLMNPRSTWZ]$/)
    expect(w.syllables.join('')).toBe(w.text)
  }
})
```
- [ ] **Step 3: `computePlomykStage`** — etap 2 gdy `override === 2`, etap 1 gdy `override === 1`, a przy `'auto'` gdy ≥70 % słów `stage === 1` ma `box >= 4`. Test `plomykStage.test.ts`: 13/20 → etap 1, 14/20 → etap 2, override wygrywa zawsze.
- [ ] **Step 4: Ćwiczenie** — w etapie 2 `word-assembly` składa słowo z **2 kafelków**: sylaba otwarta + koda. Kafelek kody gra **czysty fonem z Fali 1** (`phon-t`) — zero nowych kluczy audio dla kod. Dystraktory kody z `CODA_CONTRASTS` (T/K/P, S/Z, M/N, B/P, D/T, R/L), fallback do losowych kod z puli.
- [ ] **Step 5: Etap zamrożony na `start()`** — przełączenie w trakcie sesji nie zachodzi. Przy przejściu 1→2 zagraj raz `reading-plomyk-stage2` i zapamiętaj w `readingStore.seenIntros`.
- [ ] **Step 6: Ustawienie** — `settings.reading.plomykStage: 'auto' | 1 | 2` (default `'auto'`), jedno pole (nie per-level), default w `merge`; kontrolka w sekcji „Czytanie”.
- [ ] **Step 7: Audio** — `reading-ui-strings.json` (zofia, `edge`): `reading-plomyk-stage2` „Teraz trudniejsze słowa — z literką na końcu.”, `reading-bridge-intro` „Przeczytaj zdanie ze swoich słów!”
- [ ] **Step 8: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 9: Commit** — `feat(reading): etap 2 Płomyka — słowa CVC z kodą` + trailer.

---

### Task 12: Most do zdań — `SentenceBridge` + wspólne audio z czytankami  *(wt-tresc)*

**Files:**
- Create: `src/modules/reading/data/sentenceTemplates.ts`, `src/modules/reading/data/sentenceTemplates.test.ts`, `src/modules/reading/components/SentenceBridge.tsx`, `src/shared/ui/useAutoFit.ts`
- Modify: `scripts/czytanki-audio-source.ts`, `src/modules/reading/components/SessionEnd.tsx`, `src/modules/czytanki/components/CzytankaView.tsx` (przejście na `useAutoFit`)

**Interfaces:**
```ts
export type BridgeSentence = { words: { text: string; syllables: string[] }[] }
export const FUNCTION_WORDS = ['TO','JEST','MA','I','TU','MAMA','TATA','OLA'] as const
export function buildBridgeSentence(mastered: readonly WordData[], templates: readonly string[], pick: (n: number) => number): BridgeSentence | null
export function useAutoFit(deps: unknown[]): { ref: RefObject<HTMLDivElement | null>; fontSize: number }
```

- [ ] **Step 1: Szablony** — `'TO JEST [N].'`, `'[OSOBA] MA [N].'`, `'[N] I [N].'`, `'TU JEST [N].'`. `[N]` losowane wyłącznie ze słów `box >= 4`; `[OSOBA]` ∈ {MAMA, TATA, OLA}.
- [ ] **Step 2: Test `sentenceTemplates.test.ts`** — `null` przy <3 opanowanych słowach; żadne słowo nie powtarza się w zdaniu; wszystkie `[N]` pochodzą z `mastered`; determinizm przy stałym `pick`.
- [ ] **Step 3: `useAutoFit`** — wyciągnij logikę z `CzytankaView` (pomiar `boxRef`/`textRef`, `FIT_SAFETY = 0.95`, `fitPass`) 1:1, bez zmiany zachowania; `CzytankaView` przechodzi na hook. Weryfikacja: czytanka `cz-47` (najdłuższa) dalej mieści się bez scrolla w portrait.
- [ ] **Step 4: `SentenceBridge`** — renderowany w `SessionEnd` (etap 2 Płomyka, Ognik, Pochodnia) w `slot`; 1–2 zdania; **reużywa `SyllableButton`** z `@/modules/czytanki/components` i kluczy `cz-syl-*`/`cz-word-*` (Agnieszka): tap sylaby → `cz-syl-*`, long-press → `cz-word-*`, ▶ czyta całość przez `useReadAloud`. Gdy `buildBridgeSentence` zwróci `null` — komponent renderuje `null` (nigdy pusty prostokąt).
- [ ] **Step 5: Rozszerz `scripts/czytanki-audio-source.ts`** — obok `CZYTANKI` przejdź po `ALL_WORDS` modułu 2 i po `FUNCTION_WORDS`, dokładając te same klucze (`syllableAudioKey` / `wordAudioKey`) do tych samych dwóch plików źródłowych. Idempotentnie (Map deduplikuje), oba moduły dzielą jeden zestaw plików. Zaktualizuj `console.log` o łączną liczbę kluczy.
- [ ] **Step 6: Build audio** — `pnpm audio:dry | grep -c generate` → oczekiwane ~40 (≈30 `cz-word-*` + ≈10 `cz-syl-*` dla kod). `pnpm audio:build` (~2–3 min) → `pnpm audio:check` → 0 braków. Odsłuchaj kody (`cz-syl-t`, `cz-syl-s`) — przy złej wymowie override IPA.
- [ ] **Step 7: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 8: Smoke** — sesja Ognika do końca: most pokazuje 1–2 zdania ze słów, które dziecko zna; ▶ czyta całość; tap sylaby gra sylabę.
- [ ] **Step 9: Commit** — mp3 w paczkach ≤1 MB, potem `feat(reading): most do zdań ze słów opanowanych + wspólne audio z czytankami` + trailer.

---

### Task 13: Cyferki — koncepty porównywania i osi + fakty + audio  *(worktree `wt-cyferki`)*

**Files:**
- Modify: `src/modules/numbers/types.ts`, `src/modules/numbers/data/concepts.ts`, `src/modules/numbers/data/facts.ts`, `src/modules/numbers/data/facts.test.ts`, `src/modules/numbers/data/levelFacts.ts`, `src/modules/numbers/data/conceptLabels.ts`, `audio-source/math-ui-strings.json`, `audio-source/numbers.json`

**Interfaces:**
- Produces: `ConceptId` + `'iskierka-compare-5' | 'plomyk-compare-10' | 'plomyk-numberline-10'`; fakty `cmp-<a>-<b>` i `nl-<n>`

- [ ] **Step 1: Trzy koncepty** w `CONCEPTS`:
  - `iskierka-compare-5` (`level: 'iskierka'`, `minFacts: 5`, `minStreakForMastery: 8`, `intro-iskierka-compare-5`, `mastery-compare`), bez prerekwizytów;
  - `plomyk-compare-10` (`level: 'plomyk'`, `minFacts: 5`, `prerequisites: ['iskierka-compare-5']`, `mastery-compare`);
  - `plomyk-numberline-10` (`level: 'plomyk'`, `minFacts: 5`, `mastery-numberline`).
- [ ] **Step 2: Fakty** w `generateFactsForConcept`: dla `compare-5` pary `a,b ∈ 1..5`, dla `compare-10` pary `a,b ∈ 1..10`; **proporcja 3:1** par różnych do równych (`a !== b` : `a === b`); id `cmp-<a>-<b>`. Dla `numberline-10`: `nl-1`…`nl-10`, `args: [n]`.
- [ ] **Step 3: Test `facts.test.ts`** (dopisz) — id `cmp-*`/`nl-*` unikalne w całym zbiorze faktów; udział par równych w `compare-*` mieści się w 20–30 %; każdy `Fact.args` ma poprawną długość.
- [ ] **Step 4: `levelFacts.ts` + `conceptLabels.ts`** — nowe koncepty wchodzą do puli swoich poziomów i mają polskie etykiety („Porównywanie do 5”, „Porównywanie do 10”, „Oś liczbowa do 10”) dla raportu rodzica.
- [ ] **Step 5: Audio** — `math-ui-strings.json` (zofia, `edge`): `intro-iskierka-compare-5` „Popatrz na dwie grupy. Której jest więcej? Policz i pokaż.”, `intro-plomyk-compare-10` „Znak pokazuje, gdzie jest więcej. Otwarta buzia zawsze patrzy na większą liczbę.”, `intro-plomyk-numberline-10` „To jest oś liczbowa. Liczby idą po kolei — od małych do dużych.”, `cmp-which-more` „Gdzie jest więcej?”, `cmp-which-sign` „Który znak pasuje?”, `cmp-equal` „Tyle samo!”, `nl-where` „Gdzie na osi jest ta liczba?”, `nl-jump-2` „Skacz co dwa!”, `nl-jump-5` „Skacz co pięć!”, `nl-jump-10` „Skacz co dziesięć!”, `mastery-compare`, `mastery-numberline` (wzór istniejących `mastery-*`), `strategy-compare` „Ustaw obok siebie i sprawdź, która grupa jest dłuższa.”
- [ ] **Step 6: Run** `pnpm tsc -b && pnpm test --run` → 0 failed (uzupełnij wyczerpujące mapy po `ConceptId`: `CONCEPT_ICONS`, `conceptLabels`, `exerciseTypeForFact` — TS wskaże brakujące gałęzie). `pnpm audio:build && pnpm audio:check` → 0 braków (klucze `edge`, build ~15 s).
- [ ] **Step 7: Commit** — `feat(numbers): koncepty porównywania i osi liczbowej + fakty i audio` + trailer.

---
### Task 14: `NumberLine` + ćwiczenia porównywania/estymacji + przeprojektowany `SkipCountChase`  *(wt-cyferki)*

**Files:**
- Create: `src/modules/numbers/components/representations/NumberLine.tsx`, `src/modules/numbers/components/representations/numberLine.ts`, `src/modules/numbers/components/representations/numberLine.test.ts`, `src/modules/numbers/components/exercises/CompareSetsExercise.tsx`, `src/modules/numbers/components/exercises/NumberLineExercise.tsx`, `src/modules/numbers/utils/compare.ts`, `src/modules/numbers/utils/compare.test.ts`
- Modify: `src/modules/numbers/types.ts` (`ExerciseType` + `'compare-sets' | 'number-line'`), `src/modules/numbers/hooks/exerciseRouter.ts`, `src/modules/numbers/components/SessionView.tsx`, `src/modules/numbers/components/exercises/SkipCountChase.tsx`, `src/modules/numbers/components/MasteryTree.tsx`, `src/modules/numbers/data/promptAudio.ts`

**Interfaces:**
```ts
export type NumberLineProps = { min: number; max: number; step: number; marks?: number[]; marker?: number; ghost?: number; labels: 'all' | 'ends' | 'step' }
export function valueToRatio(value: number, min: number, max: number): number      // 0..1, liniowe
export function ratioToValue(ratio: number, min: number, max: number): number
export function withinTolerance(guess: number, target: number, step: number): boolean  // |guess-target| <= step/2
export function compareSign(a: number, b: number): '<' | '>' | '='
```

- [ ] **Step 1: Test `numberLine.test.ts`** — `valueToRatio(0,0,10)===0`, `(10,0,10)===1`, `(5,0,10)===0.5`; `ratioToValue(valueToRatio(v,…),…) === v` dla v ∈ 0..10 (odwracalność); `withinTolerance(7.4, 7, 1) === true`, `withinTolerance(7.6, 7, 1) === false`. Test `compare.test.ts`: `compareSign(3,5)==='<'`, `(5,3)==='>'`, `(4,4)==='='`.
- [ ] **Step 2: `NumberLine.tsx`** — SVG responsywne (`viewBox`, `preserveAspectRatio`), podziałka co `step`, etykiety cyfrowe wg `labels` (`'step'` przy zakresie 0–20 na portrait — inaczej crowding), `marker` jako 🐸, `ghost` jako ✨ (półprzezroczysty). Tolerancja liczona **w jednostkach osi, nie w pikselach**.
- [ ] **Step 3: `CompareSetsExercise`** — dwa zbiory `ConcreteIcons` (`compare-5`: ≤5, tap w zbiór, prompt `cmp-which-more`); po 3 poprawnych oraz zawsze w `plomyk-compare-10` — wariant ze znakiem: dwa `TenFrame` + 3 kafelki `<` `>` `=` 120 px, **tap-to-place** (bez drag). Gdy `a === b`, feedback gra `cmp-equal` — nigdy „więcej”.
- [ ] **Step 4: `NumberLineExercise`** — „gdzie na osi jest 7?”, prompt `nl-where` + `number-7`; dziecko tapie w oś, wynik przez `ratioToValue` + `withinTolerance(±step/2)`.
- [ ] **Step 5: Feedback nad reprezentacją** — po błędzie w obu ćwiczeniach `NumberLine` pokazuje obie porównywane liczby (hiperkorekcja osadzona w modelu, Fala 1); pas feedbacku z Fali 2 §15 nie zasłania osi.
- [ ] **Step 6: `SkipCountChase`** — zachowuje id ćwiczenia i fakty (**bez migracji**), zmienia warstwę wizualną na `NumberLine`: żabka skacze co 2/5/10, dziecko wskazuje następne lądowanie; prompt `nl-jump-<step>`.
- [ ] **Step 7: Router + drzewko** — `exerciseTypeForFact`: `iskierka-compare-5` i `plomyk-compare-10` → `'compare-sets'`, `plomyk-numberline-10` → `'number-line'`; `MasteryTree` dostaje 2 nowe gałęzie z ikonami (`⚖️`, `📏`) — bez tego mastery nowych konceptów nie ma gdzie wpaść. `promptAudio.ts`: `compare-sets` → `[number-a, number-b, cmp-which-more]`, `number-line` → `[number-n, nl-where]`.
- [ ] **Step 8: Run** `pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 9: Smoke** — sesja Iskierki i Płomyka: oba nowe ćwiczenia wchodzą, oś czytelna w portrait i landscape, `SkipCountChase` gra żabką po osi.
- [ ] **Step 10: Commit** — `feat(numbers): oś liczbowa, porównywanie zbiorów, wyścig po osi` + trailer.

---

### Task 15: Ścieżki liter — skrypt autorski + podgląd  *(worktree `wt-tracing`)*

**Files:**
- Create: `scripts/generate-letter-paths.ts`, `scripts/letter-paths-preview.html`, `src/modules/letters/data/letterPaths.ts` (generowany, **commitowany jako dane**), `src/modules/letters/data/letterPaths.test.ts`

**Interfaces:**
```ts
export type Stroke = { d: string; startHint: { x: number; y: number } }   // viewBox 0 0 100 100
export type GlyphPaths = { char: string; case: DisplayCase; strokes: Stroke[] }
export const LETTER_PATHS: Record<string, GlyphPaths>                     // klucz `${char}-${case}`, 64 wpisy
```

- [ ] **Step 1: Baza kresek w skrypcie** — `BASE_STROKES: Record<string, number[][][]>` (glif → lista kresek → lista punktów `[x, y]` w 0–100). Punkty bierz z **Hershey simplex** (public domain; plik `scripts/data/hershey-occident.txt`, jeśli jest dostępny offline) albo z obrysów fontu OFL; gdy nie ma źródła — autoruj polilinie ręcznie wg reguł niżej. Zapisuj **kolejność kresek jak w piśmie**: pion przed poziomem, góra→dół, lewo→prawo.
- [ ] **Step 2: Konwencje** — wysokość wersalika 10→90, x-height małych liter 40→90, wydłużenia dolne do 100, górne od 0. Trzy wzorce referencyjne (użyj ich jako testu poprawności konwersji):
```ts
A_upper: [[[20,90],[50,10],[80,90]], [[33,58],[67,58]]]     // dwie kreski: daszek, poprzeczka
O_upper: [[[50,10],[18,50],[50,90],[82,50],[50,10]]]        // jedna kreska zamknięta
L_upper: [[[28,10],[28,90],[72,90]]]                         // Ł = to samo + ukośnik diakrytu
```
- [ ] **Step 3: Diakryty** — `DIACRITIC_STROKES` dla `ą ę ć ł ń ó ś ź ż`: kreski glifu bazowego + kreska diakrytu jako **ostatni** stroke (ogonek `ą/ę` pod literą, kreska `ć/ń/ó/ś/ź` nad, ukośnik `ł` przez trzon, kropka `ż` nad).
- [ ] **Step 4: Emiter** — polilinia → `d` (`M x y L x y …`, 2 miejsca po przecinku), `startHint` = pierwszy punkt kreski. Skrypt pisze `letterPaths.ts` z nagłówkiem `// GENEROWANE przez scripts/generate-letter-paths.ts — nie edytuj ręcznie` dla 32 liter × 2 wielkości (`upper`, `lower`).
- [ ] **Step 5: Podgląd** — `scripts/letter-paths-preview.html`: 64 glify w siatce, każdy z numerami kresek i strzałką kierunku. Otwórz (`open scripts/letter-paths-preview.html`), przejrzyj **wszystkie 64** i popraw w skrypcie te, które odbiegają od polskiego wzoru szkolnego (spodziewane: `Ł`, `Ż`, `J`, `ą`, `ę`).
- [ ] **Step 6: Test `letterPaths.test.ts`**

```ts
it('64 glify, każdy z ≥1 kreską, d zaczyna się od M, współrzędne w 0–100', () => {
  expect(Object.keys(LETTER_PATHS)).toHaveLength(64)
  for (const [key, g] of Object.entries(LETTER_PATHS)) {
    expect(g.strokes.length).toBeGreaterThan(0)
    for (const s of g.strokes) {
      expect(s.d.startsWith('M'), key).toBe(true)
      for (const n of s.d.match(/-?\d+(\.\d+)?/g)!.map(Number)) { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(100) }
    }
  }
})
it('każda litera z levelLetterPools.pochodnia ma wariant upper i lower', () => { /* … */ })
```
- [ ] **Step 7: Run** `pnpm tsx scripts/generate-letter-paths.ts && pnpm vitest --run src/modules/letters/data/letterPaths.test.ts` → „64 glify zapisane”, testy zielone.
- [ ] **Step 8: Commit** — `feat(letters): skrypt autorski ścieżek liter + 64 glify` + trailer.

---
### Task 16: `TraceLetter` — tryb ✏️ i opcjonalny tracing po poprawnej  *(wt-tracing)*

**Files:**
- Create: `src/modules/letters/components/TraceLetter.tsx`, `src/modules/letters/components/TracingCanvas.tsx`, `src/modules/letters/components/TracingOverlay.tsx`, `src/modules/letters/components/DrawScreen.tsx`, `src/modules/letters/tracing/tracing.ts`, `src/modules/letters/tracing/tracing.test.ts`
- Modify: `src/modules/letters/index.tsx` (route `draw`), `src/modules/letters/components/LevelSelect.tsx`, `src/modules/letters/store/lettersStore.ts`, `src/modules/letters/hooks/useSession.ts`, `src/shared/settings/types.ts`, `src/shared/settings/defaults.ts`, `src/shared/settings/components/SettingsScreen.tsx`, `src/shared/stats/components/LettersSection.tsx`, `audio-source/ui-strings.json`

**Interfaces:**
```ts
export type Pt = { x: number; y: number }
export function samplePolyline(d: string, count: number): Pt[]                   // parsuje 'M…L…' bez SVG DOM
export function nearestOnPolyline(pts: readonly Pt[], p: Pt): { index: number; dist: number }
export function advanceCheckpoints(pts: readonly Pt[], done: number, p: Pt, tolerance: number): number  // nigdy nie cofa
// lettersStore: `tracing: Record<string, number>` + `markTraced(char: string): void`
// settings.letters.tracingAfterCorrect: 'off' | 'sometimes' | 'always'   // DEFAULT 'off' (decyzja 2026-08-29)
```

- [ ] **Step 1: Test `tracing.test.ts`** — `samplePolyline('M0 0L100 0', 5)` daje 5 równo odległych punktów; `nearestOnPolyline` zwraca poprawny indeks i dystans; `advanceCheckpoints` zalicza checkpointy **w kolejności**, a punkt poza tolerancją **nie cofa** postępu (`advance(..., 4, farPoint, 28) === 4`).
- [ ] **Step 2: Implementacja `tracing.ts`** — czysta, bez `SVGGeometryElement` (jsdom go nie ma); próbkowanie robimy **raz przy montowaniu**, checkpointy co 8 % długości kreski.
- [ ] **Step 3: `TracingCanvas`** — SVG kwadratowe `min(60vh, 70vw)`: szara ścieżka-duch (`stroke: 10`, `stroke-linecap: round`), zielona kropka startowa, animowana strzałka kierunku (2 s, potem znika; `prefers-reduced-motion` → statyczna). `pointerdown/move/up`: bierzemy **pierwszy `pointerId`**, resztę ignorujemy; `pointercancel` → reset kreski bez komunikatu. Wyjście poza tolerancję (28 px skalowane do rozmiaru SVG) **nie kończy porażką** — ślad przestaje się rysować, a po 1,5 s bezruchu wraca strzałka. Kreska zaliczona → `sfx-pop` + podświetlenie następnej; po ostatniej → `trace-done` + `markTraced(char)`. **Bez oceny**: żadnych procentów, „źle”, ani zapisu jakości.
- [ ] **Step 4: Tryb ✏️** — kafelek obok poziomów w `LevelSelect`, route `/letters/draw`: siatka liter puli poziomu → wybór → `TracingCanvas` pełnoekranowo z ◀▶ do sąsiednich liter. **Zawsze dostępny**, niezależnie od ustawienia.
- [ ] **Step 5: Tracing po poprawnej** — `TracingOverlay` nad `FeedbackOverlay` z przyciskiem ▶ „pomiń”; wchodzi tylko gdy `tracingAfterCorrect !== 'off'` (`'sometimes'` = co 4. poprawna i tylko dla liter `box <= 3`). Tracing **wstrzymuje auto-advance** do zamknięcia; pominięcie nie liczy się jako błąd i nie wydłuża feedbacku ponad limit.
- [ ] **Step 6: Store + raport** — `lettersStore`: `tracing: Record<string, number>`, `markTraced`, bump `version` o 1 + `migrate` + default `tracing: {}` w `merge`. `LettersSection`: linia „Obrysował N liter”.
- [ ] **Step 7: Ustawienie** — trójstan `letters.tracingAfterCorrect`, **default `'off'`**; kontrolka „Rysowanie literki po poprawnej odpowiedzi: nigdy / co 4. / zawsze”.
- [ ] **Step 8: Audio** — `ui-strings.json` (zofia, `edge`): `trace-intro` „Poprowadź palcem po literce. Zacznij od zielonej kropki.”, `trace-hint` „Zacznij tutaj i jedź po szarej ścieżce.”, `trace-stroke-next` „Teraz druga kreska.”, `trace-done` „Udało się! Napisałeś literkę palcem.” → `pnpm audio:build` (4 klucze `edge`).
- [ ] **Step 9: Run** `pnpm tsc -b && pnpm test --run` → 0 failed; `pnpm audio:check` → 0 braków.
- [ ] **Step 10: Smoke na iPadzie** — palcem, nie myszą: `i`, `j`, `ł` wymuszają kolejność kresek (nie da się zacząć od kropki); dwa palce nie rozjeżdżają śladu; obrót ekranu nie psuje proporcji.
- [ ] **Step 11: Commit** — `feat(letters): tracing liter — tryb rysowania i opcjonalny overlay po poprawnej` + trailer.

---

### Task 17: Czytanki — „nagraj siebie” (MediaRecorder + IndexedDB)  *(po scaleniu `wt-tresc`)*

**Files:**
- Create: `src/modules/czytanki/hooks/useRecorder.ts`, `src/modules/czytanki/audio/recordingsDb.ts`, `src/modules/czytanki/audio/recordingsDb.test.ts`, `src/modules/czytanki/components/RecorderControls.tsx`
- Modify: `src/modules/czytanki/components/CzytankaView.tsx`, `src/shared/settings/components/SettingsScreen.tsx`, `src/shared/device/deviceStore.ts`, `src/app/App.tsx` (reset czytanek kasuje nagrania), `audio-source/czytanki-ui-strings.json`
- Devdep: `fake-indexeddb`

**Interfaces:**
```ts
export type Recording = { id: string; czytankaId: string; profileId: string; blob: Blob; createdAt: number; bytes: number }
export const REC_MAX_MS = 60_000, REC_MAX_COUNT = 10, REC_SOFT_LIMIT_BYTES = 25 * 1024 * 1024
export async function putRecording(r: Omit<Recording,'id'>): Promise<string>     // LRU: kasuje najstarsze ponad limit
export async function getRecording(profileId: string, czytankaId: string): Promise<Recording | null>
export async function deleteAllRecordings(profileId: string): Promise<void>
export function isRecordingSupported(): boolean                                  // MediaRecorder + indexedDB
export function useRecorder(): { state: 'idle'|'recording'|'saving'; elapsedMs: number; start: () => Promise<void>; stop: () => void }
```

- [ ] **Step 1: `recordingsDb.ts`** — IndexedDB `iskierki-recordings`, store `byCzytanka`, **klucz `${profileId}:${czytankaId}`** (izolacja profili). LRU po `createdAt` przy przekroczeniu `REC_MAX_COUNT` lub `REC_SOFT_LIMIT_BYTES`. `QuotaExceededError` łapane i zwracane jako odmowa, nie wyjątek.
- [ ] **Step 2: Test `recordingsDb.test.ts`** (`fake-indexeddb/auto`) — 11. nagranie kasuje najstarsze (LRU trzyma 10); przekroczenie miękkiego limitu bajtów kasuje od najstarszego; `QuotaExceededError` nie zostawia wpisu-sieroty; nagrania profilu `p2` nie są widoczne dla `p1`.
- [ ] **Step 3: `useRecorder`** — `MediaRecorder.isTypeSupported('audio/mp4')` → fallback `'audio/webm'` (iPad Safari zwraca `audio/mp4`). Auto-stop po `REC_MAX_MS`. `visibilitychange` w trakcie → stop + zapis tego, co jest. Start nagrania woła `audioBus.stop()` i blokuje ▶ (nagrywanie i `useReadAloud` wzajemnie się wykluczają).
- [ ] **Step 4: UI** — 🎤 (72 px) obok ▶ w `CzytankaView`: tap = start (pulsująca kropka + pasek czasu, **bez cyfr**), tap = stop; potem obok siebie 👩 (lektor) i 🧒 (ja). Nagranie nigdy nie opuszcza urządzenia. 🎤 ukryte gdy `!isRecordingSupported()` (tryb prywatny) albo gdy zgoda wyłączona.
- [ ] **Step 5: Zgoda po dorosłemu** — `deviceStore.recordingEnabled` (**default `false`**, urządzeniowe, nie per-profil). Włączenie w `SettingsScreen` woła `getUserMedia` **na ekranie rodzica**, więc prompt widzi dorosły; `denied` → przełącznik wraca na `false` + komunikat „Przeglądarka odmówiła dostępu do mikrofonu”. Dziecko promptu nie widzi.
- [ ] **Step 6: Reset** — reset postępu czytanek woła `deleteAllRecordings(activeId)`; `profilesStore.removeProfile` też (jedna operacja, komunikat dla rodzica). `QuotaExceededError` w trakcie sesji → 🎤 znika do końca sesji.
- [ ] **Step 7: Audio** — `czytanki-ui-strings.json` (agnieszka, `azure`): `czytanki-rec-start` „Teraz ty. Czytaj powoli.”, `czytanki-rec-stop` „Gotowe! Posłuchaj siebie.”, `czytanki-rec-compare` „A teraz posłuchaj, jak czytam ja.” → `pnpm audio:build` (3 klucze ≈ 15 s) → `pnpm audio:check`.
- [ ] **Step 8: Run** `pnpm add -D fake-indexeddb && pnpm tsc -b && pnpm test --run` → 0 failed.
- [ ] **Step 9: Smoke na realnym iPadzie (Safari)** — prompt mikrofonu pojawia się na ekranie rodzica; nagranie odtwarza się po powrocie do czytanki; ▶ zablokowane w trakcie nagrywania.
- [ ] **Step 10: Commit** — `feat(czytanki): nagrywanie własnego czytania (MediaRecorder + IndexedDB, zgoda rodzica)` + trailer.

---

### Task 18: Dokumentacja i weryfikacja końcowa

**Files:**
- Modify: `docs/STATUS.md`, `CLAUDE.md`

- [ ] **Step 1: Scal trzy worktree do `main`** — kolejność `wt-tresc` → `wt-cyferki` → `wt-tracing`. Konflikty spodziewane w `SettingsScreen.tsx` i `audio-source/ui-strings.json` (obie zmiany są addytywne — zachowaj obie).
- [ ] **Step 2: `CLAUDE.md`** — dopisz w „Struktura”: `src/shared/profiles/`, `src/shared/device/`, `src/shared/rewards/`, `src/shared/plan/`; w „Persist kilka storage” dopisz `iskierki-profiles-v1`, `iskierki-device-v1` (oba **nieprefiksowane**), `iskierki-plan-v1`, `iskierki-rewards-v1` oraz zasadę `storageKey(base)` (profil `p1` = klucze bazowe); w „Gdzie ŁATWO się pomylić” dopisz: (a) `persist.name` czytane raz → zmiana profilu wymaga `location.reload()`; (b) `earn` wołane wyłącznie z hooka sesji przy flush `finishedRef`; (c) zmiana tekstów czytanek = regeneracja Azure ~10 min.
- [ ] **Step 3: `docs/STATUS.md`** — sekcja „Fala 3 (2026‑08‑29)”: co weszło (G, B, A, F×2, D, E, C), świadome odstępstwa (tracing po poprawnej domyślnie off; iskierki niewidoczne jako liczba na Home; serie zachowały teksty tam, gdzie się dało), znane ograniczenia (brak wariantu pisanego w tracingu — 64 glify tylko druk; nagrywanie zweryfikowane wyłącznie na Safari iPad).
- [ ] **Step 4: Weryfikacja końcowa** — uruchom i **wklej wyniki do commit message'a albo raportu**:

```bash
pnpm tsc -b                 # oczekiwane: brak outputu (0 błędów)
pnpm test --run             # oczekiwane: 0 failed; liczba testów > baseline z Fali 2
pnpm audio:dry | tail -5    # oczekiwane: „0 do wygenerowania"
pnpm audio:check            # oczekiwane: „wszystkie klucze mają plik"
pnpm build                  # oczekiwane: build OK, bez ostrzeżeń o brakujących modułach
```
- [ ] **Step 5: Smoke przeglądarkowy (viewport iPad 820×1180 i 1180×820)** — Home z planem i (przy 2 profilach) rzędem avatarów mieści się bez scrolla; pełny plan dnia od startu do `plan-done`; przełączenie profilu (reload <1 s, audio odblokowuje się pierwszym tapem); Network bez 404 na `cz-*`, `phon-*`, `trace-*`.
- [ ] **Step 6: Commit + push** — `docs(status): stan po Fali 3 — profile, iskierki, plan, serie, CVC, oś liczbowa, tracing` + trailer. Push w kawałkach (paczki mp3 ≤1 MB). Po pushu `gh run watch` → deploy zielony, sprawdź live https://kamilmat.github.io/kid-learn/ na iPadzie.
