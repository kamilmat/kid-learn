# Iskierki — Iskra v3: redesign maskotki (hero variant + grzywka + flicker)

**Status:** spec — czeka na review
**Data:** 2026-04-29
**Scope:** rozbudowa `IskraMascot` (grzywka iskier + jaśniejszy rdzeń + flicker płomienia) + nowy `IskraHero` z rączkami/nóżkami/cieniem (3 stany + idle wave). Faza 1 z planu visual review round 3.
**Bazuje na:** STATUS sekcja "Maskotka Iskra — dalsze ulepszenia" (lista wybranych konkretów c/e/i)
**Faza 2 (osobna sesja):** systematyczny visual review 12 ekranów z nową Iskrą — top 3-5 follow-upów jako osobny spec.

---

## 1. Problem

Po commit `1e3615b` (kawaii: anime oczy + brwi + rumieńce + szerszy uśmiech, size 96→140 na home) user zaakceptował kierunek ale chce więcej "życia" maskotki. Trzy konkrety wybrane z listy w STATUS:

- **(c)** Mocniejszy gradient płomienia + animowany ruch (jak prawdziwy ogień, nie tylko skala 1↔1.05).
- **(e)** Mała "grzywka" iskier — kępka 3-4 iskierek na czubku jak fryzura (statyczna lub mikro-animacja).
- **(i)** Hero-version Iskry z rączkami i nóżkami + podstawą — używana na home + intros + LevelSelect + FeedbackOverlay. Standard `IskraMascot` zostaje dla małych instancji.

Cel — większa atrakcyjność dla 7-latka bez przebudowy istniejących użyć i bez nowego API w AudioBus / store.

## 2. Cele

- Każda Iskra w aplikacji (mała i duża) ma wizualnie żywy płomień (flicker opacity + jaśniejszy rdzeń) + grzywkę iskier — spójna marka.
- W kluczowych miejscach (Home, LevelSelect 3 modułów, FeedbackOverlay, SessionEnd, WildCelebration) Iskra ma rączki/nóżki/cień — więcej character.
- Reuse istniejących stanów `IskraMascot` (`idle`/`happy`/`surprise`/`dance`) — nie tworzymy równoległej hierarchii state'ów.
- iPad gen 7+ Safari — animacje płynne 60fps, bez jankowania.
- Respekt `prefers-reduced-motion` — wszystkie animacje wyłączone (motion sickness, ustawienie rodzica).
- Brak zmian persistencji, brak nowych nagrań audio, brak nowych dependencji.

## 3. Non-goals

- Nowy state Iskry (np. `cheer` osobny od `happy`) — reuse istniejących 4 stanów.
- Generalizacja `IskraMascotAnimated` (modules/reading) do shared — zostaje gdzie jest.
- Iskra w `MasteryTree` (moduł 3) jako duży character przy etapach drzewka — odłożone do v3.2.
- Soft sound effects na hover/tap — osobny temat.
- Floating gwiazdki orbitujące wokół Iskry na Home — scope creep.
- Zmiany w `levelIcons.tsx` (✨/🔆/🔥/torch) — to ikony POZIOMÓW, nie maskotka.
- Zmiany w QuizCard (status bar 44, pause 64), WordAlbum (56), reading SessionView top-bar (60) — małe instancje zostają na `IskraMascot`.
- Visual review round 3 (12 ekranów audit) — Faza 2, osobny spec po wdrożeniu Iskry v3.

## 4. Architektura — przegląd

**Pliki edytowane (2):**
- `src/shared/ui/IskraMascot.tsx` — dodanie grzywki, flicker, `prefers-reduced-motion` guard. Backward-compat (props bez zmian).
- `src/shared/ui/IskraMascot.test.tsx` — rozszerzenie o 1-2 smoke testy (grzywka + reduced-motion).

**Pliki nowe (2):**
- `src/shared/ui/IskraHero.tsx` — nowy komponent z rączkami/nóżkami/cieniem + `useIskraReaction` hook.
- `src/shared/ui/IskraHero.test.tsx` — smoke testy (4 stany × 2 idleVariants).

**Pliki edytowane (8 — integracja):**

Replace `IskraMascot` → `IskraHero` (5 instancji w 4 plikach):
- `src/app/Home.tsx` (`:91`) — Iskra na home.
- `src/modules/letters/components/FeedbackOverlay.tsx` (`:206`) — feedback po pytaniu.
- `src/modules/letters/components/SessionEnd.tsx` (`:157`) — koniec sesji liter.
- `src/modules/reading/components/SessionEnd.tsx` (`:118` ceremony + `:182` final) — koniec sesji czytania.

Add new `IskraHero` mounts (4 instancje w 4 plikach):
- `src/modules/letters/components/LevelSelect.tsx` — header.
- `src/modules/reading/components/ReadingLevelSelect.tsx` — header.
- `src/modules/numbers/components/NumbersLevelSelect.tsx` — header.
- `src/modules/numbers/components/SessionEnd.tsx` — Iskra na końcu sesji liczb (obecnie brak maskotki).

**Backward compat:**
- `IskraMascot` API bez zmian — wszyscy konsumenci dostają grzywkę + flicker automatycznie.
- `IskraMascotAnimated` (modules/reading) wraps `IskraMascot` → też dostaje grzywkę za darmo.

**Persistencja:** brak zmian.
**Audio:** brak nowych nagrań, brak nowego API.
**Dependencies:** brak nowych.

## 5. `IskraMascot` v3 — modyfikacje

### 5.1 Grzywka 3 iskierek (e)

Nowa grupa SVG `<g data-testid="iskra-fringe">` wstawiona PRZED grupą `iskra-body` (renderuje się na top płomienia, ale visually na czubku — pozycje cy 12-22 w viewBox 200×200). Trzy `<circle>`:

| Iskra | cx | cy | r | Animation delay |
|---|---|---|---|---|
| A (środek) | 100 | 16 | 4 | 0s |
| B (lewo) | 88 | 22 | 3 | 0.55s |
| C (prawo) | 112 | 22 | 3 | 1.1s |

Fill: `#fff8c2` (jaśniejszy żółty, kontrastuje z pomarańczem płomienia).

CSS animation per iskra:
```css
.${uid}-fringe-spark {
  animation: ${uid}-fringe-flicker var(--duration) ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
@keyframes ${uid}-fringe-flicker {
  0%, 100% { opacity: 0.6; transform: scale(0.85); }
  50% { opacity: 1.0; transform: scale(1.1); }
}
```

Każda iskra dostaje własny `--duration` (1.6s/2.1s/1.9s) i `animation-delay` z tabeli — desync flicker daje wrażenie żywego ognia.

### 5.2 Flicker płomienia (c)

Istniejący `radialGradient ${uid}-grad` zostaje. Istniejący `radialGradient ${uid}-inner` (rdzeń jaśniejszy) zostaje — JUŻ JEST w obecnej implementacji (`IskraMascot.tsx:112-116`).

**Co dodajemy:** opacity flicker na całej grupie `iskra-body` — dodajemy do istniejącej animacji body. Aktualnie `idle` ma tylko skala 1↔1.05 (linia 282-285). Rozszerzamy:

```css
@keyframes ${uid}-idle {
  0%, 100% { transform: scale(1); opacity: 0.96; }
  50% { transform: scale(1.05); opacity: 1.0; }
}
```

Pozostałe state'y (`happy`/`surprise`/`dance`) — bez zmian. Flicker jest dyskretny, działa tylko w idle (najczęstszy state — Home, LevelSelect, status bar).

### 5.3 `prefers-reduced-motion` guard

Wszystkie keyframes wrapowane w `@media (prefers-reduced-motion: no-preference)`. W `prefers-reduced-motion: reduce` animacje są wyłączone — Iskra statyczna.

```css
@media (prefers-reduced-motion: no-preference) {
  /* wszystkie istniejące + nowe keyframes */
}
```

W trybie reduced: brak `animation` property — tylko statyczna grafika.

### 5.4 Nic innego

`IskraMascotProps` bez zmian. `intensity` (sparks dookoła), `state` (4 warianty), `oneshotKey`, `size` — wszystko zostaje. Brak nowego API.

## 6. `IskraHero` — nowy komponent

### 6.1 Plik i API

`src/shared/ui/IskraHero.tsx` — nowy plik.

```ts
export type IskraHeroProps = {
  size?: number                        // default 180
  state?: IskraState                   // default 'idle'; reuse z IskraMascot
  intensity?: IskraIntensity           // default 'fire'; reuse z IskraMascot
  idleVariant?: 'static' | 'wave'      // default 'static'
  oneshotKey?: string                  // forwarded to IskraMascot
}

export function IskraHero(props: IskraHeroProps): JSX.Element
export function useIskraReaction(): {
  state: IskraState
  cheer(): void   // ustawia 'happy' na 900ms, potem powrót do 'idle'
  dance(): void   // ustawia 'dance' na 4000ms, potem powrót do 'idle'
}
```

Brak nowych typów state — reuse z `IskraMascot` (`IskraState = 'idle' | 'happy' | 'surprise' | 'dance'`).

### 6.2 SVG struktura

ViewBox `0 0 240 280` (większy niż Mascot 200×200, bo dochodzą rączki/nóżki/cień). Mascot wraprowany w środku z offsetem.

Layer order (od dołu do góry):
1. **Cień** — `<ellipse cx=120 cy=270 rx=50 ry=7 fill="rgba(0,0,0,0.18)" />`
2. **Nóżki** (2 linie + 2 kropki):
   - Lewa: `<line x1=104 y1=235 x2=98 y2=265 stroke="#3a2010" strokeWidth=4 strokeLinecap="round" />` + `<circle cx=98 cy=267 r=6 fill="#3a2010" />`
   - Prawa: `<line x1=136 y1=235 x2=142 y2=265 stroke="#3a2010" strokeWidth=4 strokeLinecap="round" />` + `<circle cx=142 cy=267 r=6 fill="#3a2010" />`
3. **Rączki** (2 linie + 2 kropki, z `<g>` per ramię żeby animacja rotate miała origin):
   - Lewa (`<g class="iskra-arm-left">`): `<line x1=78 y1=160 x2=58 y2=178 ... />` + `<circle cx=58 cy=180 r=7 ... />`
   - Prawa (`<g class="iskra-arm-right">`): `<line x1=162 y1=160 x2=182 y2=178 ... />` + `<circle cx=182 cy=180 r=7 ... />`
4. **Mascot body** — `<g transform="translate(20 20)"><IskraMascot.FlameBody /></g>` lub w prostszej wersji wstawiamy całe `<IskraMascot />` w środku (foreignObject NIE — wstawiamy direct SVG przez wewnętrzny komponent `<IskraMascotInner />`).

**Decyzja**: nie wydzielamy `<FlameBody />` jako osobnego komponentu (premature abstraction). Zamiast tego `IskraHero` używa `<IskraMascot size={size * 200/240} state={state} intensity={intensity} oneshotKey={oneshotKey} />` jako element składowy, wstawiony w wrapping `<div>` z position absolute centrowaniem nad warstwami SVG hero (cień/nóżki/rączki).

**Implementacja layout**:
```jsx
<div style={{ position: 'relative', width: size, height: size * 280/240, lineHeight: 0 }}>
  <svg viewBox="0 0 240 280" width={size} height={size * 280/240}
       style={{ position: 'absolute', inset: 0 }}>
    {/* cień + nóżki + rączki — pure SVG */}
  </svg>
  <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)' }}>
    <IskraMascot size={size * 200/240} state={state} intensity={intensity} oneshotKey={oneshotKey} />
  </div>
</div>
```

Dwa SVG w jednej kompozycji to OK — overhead minimalny, każdy zachowuje swoje keyframes (separate `<style>`).

### 6.3 Animacje per state

Wszystkie animacje wrapowane w `@media (prefers-reduced-motion: no-preference)`. CSS dla rączek/nóżek/cienia w wewnętrznym `<style>` tagu w SVG hero (analogicznie do `IskraMascot`).

| State | Animacja rączek/body |
|---|---|
| `idle` (static) | Rączki/nóżki statyczne. Mascot wewnętrzny działa wg swojego `idle` (skala + flicker). |
| `idle` (wave) | Prawa rączka: `animation: arm-wave 4.5s ease-in-out infinite` z `transform-origin: 162px 160px` (bark). Keyframes: `0%, 70% { rotate: 0deg } 80% { rotate: -25deg } 90% { rotate: 10deg } 100% { rotate: 0deg }` — krótkie 2-machnięcia w cyklu 4.5s. Reszta jak `static`. |
| `happy` (cheer) | Obie rączki: `rotate: -50deg` (lewa) / `+50deg` (prawa) z `transform-origin` u barku. Cały hero `translateY(-12px)` w 0.4s ease-out, hold 0.5s. Mascot wewnętrzny: state=`happy` (jego skok translateY -8px). Łączny efekt: rączki w górę + skok. |
| `dance` | Obie rączki bujają się rotate ±15° desync. Body translateX wave (-8px→+8px) loop 0.6s. Mascot wewnętrzny: state=`dance`. |
| `surprise` | Bez zmian rączek — Mascot wewnętrzny obsługuje (rotate ±5°). Hero rączki/nóżki statyczne. |

### 6.4 `useIskraReaction` hook

```ts
export function useIskraReaction(): {state, cheer, dance} {
  const [state, setState] = useState<IskraState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = (next: IskraState, durationMs: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState(next)
    timeoutRef.current = setTimeout(() => setState('idle'), durationMs)
  }

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  return {
    state,
    cheer: () => trigger('happy', 900),
    dance: () => trigger('dance', 4000),
  }
}
```

Cleanup na unmount. Re-trigger anuluje poprzedni timeout.

## 7. Integracja — mapa zmian

### 7.1 Replace IskraMascot → IskraHero (5 instancji)

| Plik | Linia | Obecne | Po zmianie |
|---|---|---|---|
| `src/app/Home.tsx` | 91 | `<IskraMascot size={140} state="happy" intensity="fire" />` | `<IskraHero size={180} state="idle" intensity="fire" idleVariant="wave" />` (Iskra macha co 4.5s; statyczny `idle` lepszy niż loop `happy` żeby nie być natrętna na ekranie głównym) |
| `src/modules/letters/components/FeedbackOverlay.tsx` | 206-211 | `<IskraMascot size={feedback.variant === 'mastery' ? 140 : 96} state={cfg.state} intensity={cfg.intensity} oneshotKey={...} />` | `<IskraHero size={feedback.variant === 'mastery' ? 160 : 120} state={cfg.state} intensity={cfg.intensity} oneshotKey={...} />` — bez zmiany istniejącej logiki `mascotConfigFor`; prop `idleVariant` pominięty (w feedback Iskra jest dynamiczna, nie idle) |
| `src/modules/letters/components/SessionEnd.tsx` | 157 | `<IskraMascot ...>` | `<IskraHero size={140} state="happy" intensity="torch" />` |
| `src/modules/reading/components/SessionEnd.tsx` | 118 | `<IskraMascot size={160} state="dance" intensity="torch" oneshotKey={...} />` | `<IskraHero size={160} state="dance" intensity="torch" oneshotKey={...} />` |
| `src/modules/reading/components/SessionEnd.tsx` | 182 | `<IskraMascot ...>` | `<IskraHero size={140} state="happy" intensity="torch" />` |

### 7.2 ADD IskraHero (4 nowe mounty)

| Plik | Gdzie | Co dodać |
|---|---|---|
| `src/modules/letters/components/LevelSelect.tsx` | header obok / nad tytułem modułu | `<IskraHero size={100} state="idle" intensity="fire" />` |
| `src/modules/reading/components/ReadingLevelSelect.tsx` | header | jak wyżej |
| `src/modules/numbers/components/NumbersLevelSelect.tsx` | header | jak wyżej |
| `src/modules/numbers/components/SessionEnd.tsx` | nad headlinem `<h2>` | `<IskraHero size={140} state="happy" intensity="torch" />` (obecnie Numbers SessionEnd nie ma maskotki — dodajemy dla spójności z Letters/Reading) |

Dokładny markup ustali plan implementacji — header layouts różnią się między modułami; możliwe że wymagana drobna restrukturyzacja flex (Iskra obok lub nad tytułem). Plan implementacji zrobi review w przeglądarce per moduł.

### 7.3 Bez zmian (IskraMascot zostaje)

| Plik | Linia | Powód |
|---|---|---|
| `src/modules/letters/components/QuizCard.tsx` | 170 | size 44 status bar — za mała na hero |
| `src/modules/letters/components/QuizCard.tsx` | 312 | size 64 surprise pause — średnia, ale nie hero context (overlay) |
| `src/modules/reading/components/SessionView.tsx` | 267 | size 60 IskraMascotAnimated — pasek górny sesji |
| `src/modules/reading/components/WordAlbum.tsx` | 70 | size 56 IskraMascotAnimated — element listy |
| `src/modules/reading/components/IskraMascotAnimated.tsx` | 111 | wewnętrzne renderowanie Mascot — wraps; dostaje grzywkę "for free" |
| `src/modules/numbers/components/MasteryTree.tsx` | (existing) | brak Iskry obecnie — odłożone do v3.2 |
| `src/modules/reading/components/WildCelebration.tsx` | (n/a) | wrapper renderujący `def.Component` z `wildCelebrations` data; aktualnie nie używa IskraMascot — wild celebrations są czystymi CSS/emoji animacjami (rakieta, owoce, salto, awokado, tęcza). Jeśli któraś z nich w przyszłości będzie chciała Iskrę, użyje IskraHero. Out of scope v3. |

### 7.4 Konsumenci `useIskraReaction`

W tym specu **nie podpinamy** `useIskraReaction` w sesji liter ani numbers (Reading ma już własny `IskraMascotAnimated` z `reactionsHook`). W FeedbackOverlay liter — `state` jest przekazywany z parenta (sesji), już istnieje wewnętrzna logika. Hook `useIskraReaction` jest **dostępny** dla przyszłych konsumentów (v3.2 może go użyć w numbers SessionView na top barze, np.) ale nie jest wymagany w v3.

Decyzja: **YAGNI** — eksportujemy hook, ale używamy w v3 tylko jeśli SessionEnd / WildCelebration potrzebują dynamicznej zmiany (większość statycznie ustawia `state` przy mount).

## 8. Animacje — manifest timing

Wszystko GPU-friendly: tylko `transform` + `opacity`. Zero `width`/`height`/`top`/`left`/`d`/`filter: blur`.

| Animacja | Komponent | Duration | Easing | Loop | Trigger |
|---|---|---|---|---|---|
| `${uid}-idle` (skala+opacity) | IskraMascot | 2.4s | ease-in-out | infinite | mount, state=idle |
| `${uid}-happy` | IskraMascot | 0.8s | ease-in-out | infinite | state=happy |
| `${uid}-surprise` | IskraMascot | 0.6s | ease-in-out | infinite | state=surprise |
| `${uid}-dance` | IskraMascot | 1.2s | ease-in-out | infinite | state=dance |
| `${uid}-spark` (sparks dookoła) | IskraMascot | 1.6s | ease-in-out | infinite | mount per intensity |
| `${uid}-rain` | IskraMascot | 1.4s | ease-in-out | infinite | dance |
| **NEW** `${uid}-fringe-flicker` × 3 | IskraMascot | 1.6/2.1/1.9s | ease-in-out | infinite | mount |
| **NEW** `arm-wave` (right) | IskraHero | 4.5s | ease-in-out | infinite | idleVariant=wave |
| **NEW** `cheer-pose` (both arms+body) | IskraHero | 0.9s | ease-out | once + hold | state=happy |
| **NEW** `dance-arms` (both, desync) | IskraHero | 0.6s | ease-in-out | infinite | state=dance |
| **NEW** `dance-body-wave` (translateX) | IskraHero | 0.6s | ease-in-out | infinite | state=dance |

**Łącznie animowanych elementów per IskraHero w state=dance:** 3 fringe sparks + 1 body opacity + 1 body skala + N intensity sparks + 1 rain group (~6 nodes) + 2 arms + 1 body translateX = ~15 nodes. Wszystkie composited (transform/opacity). iPad gen 7+ Safari obsłuży 60fps.

Większość czasu Hero jest w state=`idle` — wtedy aktywne tylko 3 fringe + 1 body skala + 1 body opacity + N intensity sparks (~8 nodes). Bez problemu.

## 9. Testy

Zgodnie z preferencją "nie pisz nadmiarowych" (memory `feedback`):

**`IskraMascot.test.tsx`** — rozszerzyć istniejący:
- Render mascot, sprawdzenie obecności `data-testid="iskra-fringe"` z 3 `<circle>` w środku.
- Render w `prefers-reduced-motion: reduce` (mock matchMedia) — sprawdzenie że animacja nie jest aplikowana (no-op smoke).

**`IskraHero.test.tsx`** — nowy plik (3-5 testów):
- Render w 4 stanach (idle/happy/surprise/dance) — sprawdzenie że nie crashuje, że wewnętrzny `data-testid="iskra-mascot"` jest mountowany z prawidłowym `data-state`.
- Render w 2 idleVariants (static/wave) — sprawdzenie obecności rączek/nóżek/cienia w SVG (data-testids: `iskra-hero-shadow`, `iskra-hero-arm-left/right`, `iskra-hero-leg-left/right`).
- `useIskraReaction` — test setTimeout cleanup (mock timers, cheer() → 900ms → state='idle'; unmount przed expiration nie wycieka timer).

**Manualna weryfikacja w przeglądarce** (krytyczna, golden path 8 punktów):
1. Home — Iskra macha co 4.5s
2. LettersLevelSelect header — Iskra widoczna, idle z grzywką
3. ReadingLevelSelect header — j.w.
4. NumbersLevelSelect header — j.w.
5. Sesja Liter (Iskierka) — correct → IskraHero w FeedbackOverlay (state happy/dance per istniejąca logika `mascotConfigFor`)
6. Letters SessionEnd — Iskra duża z grzywką (state happy)
7. Reading SessionEnd — Iskra ceremony (dance) + final (happy)
8. Numbers SessionEnd — Iskra duża z grzywką (NEW mount, wcześniej brak maskotki)

**Manualna weryfikacja na iPadzie** (gen 7+ Safari, fizyczne urządzenie):
- 60fps na każdym z 9 punktów (Safari DevTools → Frames)
- Brak jankowania przy przejściu między ekranami
- `prefers-reduced-motion` test: iOS Settings → Accessibility → Motion → Reduce Motion ON → Iskra statyczna

## 10. Acceptance criteria

- [ ] `IskraMascot` ma grzywkę 3 iskierek (`data-testid="iskra-fringe"`) z desyncronizowanym opacity flicker.
- [ ] `IskraMascot` `idle` keyframe ma flicker opacity (0.96↔1.0) oprócz istniejącego skala (1↔1.05).
- [ ] `IskraMascot` respektuje `prefers-reduced-motion: reduce` (animacje wyłączone).
- [ ] `IskraHero` istnieje w `src/shared/ui/IskraHero.tsx`, eksportuje komponent + `useIskraReaction` hook.
- [ ] `IskraHero` renderuje SVG z cieniem + 2 nóżkami + 2 rączkami (kreski + kropki) + wewnętrzny `IskraMascot` w środku.
- [ ] `IskraHero` 4 stany (idle/happy/surprise/dance) + 2 idleVariants (static/wave) działają wizualnie.
- [ ] 5 instancji `IskraMascot` zastąpione na `IskraHero` (Home `:91`, Letters FeedbackOverlay `:206`, Letters SessionEnd `:157`, Reading SessionEnd `:118` ceremony + `:182` final).
- [ ] 4 nowe instancje `IskraHero` dodane (Letters/Reading/Numbers LevelSelect headers + Numbers SessionEnd).
- [ ] `pnpm tsc -b` ✓
- [ ] `pnpm test --run` zielone (≥561 testów: 559 obecnie + min. 2 nowe).
- [ ] `pnpm build` ✓ (bundle < 540 kB JS).
- [ ] **iPad gen 7+ Safari**: 60fps na 9-punktowym golden path. Brak jankowania.
- [ ] `prefers-reduced-motion: reduce` — wszystkie animacje wyłączone.

## 11. Risks (zamknięte podczas self-review)

- **iPad jankowanie**: max 15 animowanych nodes per Hero w state=dance, GPU-only properties, `prefers-reduced-motion` respect. Acceptance wymaga fizycznej weryfikacji.
- **Bundle size**: nowy plik ~3-5 kB SVG/CSS + IskraHero ~6-8 kB = łącznie +10-13 kB. STATUS notuje 525 kB build, +13 kB → ~538 kB, w budżecie 540 kB.
- **Layout shift na LevelSelect**: dodanie nowego komponenta IskraHero w header'ze 3 modułów może zmienić istniejący layout. Plan implementacji zrobi review w przeglądarce per moduł i ewentualnie dostroi flex/grid.
- **Backward compat**: wszystkie istniejące `IskraMascot` use'y dostają grzywkę "for free". Akceptowalne — wszędzie gdzie Mascot jest pokazywany, grzywka jest mile widziana (drobne 3 iskry na czubku, niezależne od size). Edge case: w QuizCard size=44 grzywka będzie skalowana do 7-8% rozmiaru Mascot — może być niewidoczna ale nie szkodzi.
- **Reading IskraMascotAnimated** (modules/reading) wraps IskraMascot — nie wymaga zmian, dostaje upgrade automatycznie.

## 12. Faza 2 — visual review round 3 (osobny spec)

Po zatwierdzonym wdrożeniu Iskry v3 (commit + push + GH Pages live + iPad weryfikacja):
1. Systematyczny pass przez 12 ekranów z chrome-devtools-mcp screenshotami (lista w STATUS.md sekcja "Następna sesja").
2. Ranking impact × effort top 3-5 follow-upów.
3. Osobny spec + plan dla zatwierdzonych pozycji.

Faza 2 nie blokuje merge'a Iskry v3 — review wymaga już nowej Iskry w produkcji żeby ocenić co jeszcze potrzebuje pracy.
