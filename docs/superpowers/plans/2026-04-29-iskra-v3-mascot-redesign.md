# Iskra v3 — Mascot Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozbudować `IskraMascot` o grzywkę iskier, opacity flicker i `prefers-reduced-motion` guard. Stworzyć nowy `IskraHero` z rączkami/nóżkami/cieniem (NumberBlocks-style) i `useIskraReaction` hook. Wymienić 5 instancji `IskraMascot` na `IskraHero` i dodać 4 nowe mounty (Home, 3× LevelSelect, 4 SessionEnd).

**Architecture:** `IskraMascot` zostaje source-of-truth dla płomienia/buźki/grzywki. `IskraHero` wraps `IskraMascot` w większym viewBox z dodatkowymi warstwami SVG (cień + nóżki + rączki). Reuse istniejących `IskraState` i `IskraIntensity` typów — żadnego nowego API/state'ów. Wszystkie animacje GPU-friendly (transform/opacity), guard'em `prefers-reduced-motion`.

**Tech Stack:** React 19, TypeScript strict, Vitest + @testing-library/react + jsdom, czyste SVG + CSS keyframes (zero nowych dependencji).

**Spec:** `docs/superpowers/specs/2026-04-29-iskra-v3-mascot-redesign-design.md`

---

## File Structure

**Modified:**
- `src/shared/ui/IskraMascot.tsx` (~313 → ~370 LOC) — grzywka, flicker, reduced-motion
- `src/shared/ui/IskraMascot.test.tsx` (~107 → ~125 LOC) — 2 nowe testy
- `src/app/Home.tsx:91` — IskraMascot → IskraHero
- `src/modules/letters/components/LevelSelect.tsx` — ADD IskraHero w header (przed `<h1>`)
- `src/modules/letters/components/FeedbackOverlay.tsx:206-211` — IskraMascot → IskraHero
- `src/modules/letters/components/SessionEnd.tsx:157-162` — IskraMascot → IskraHero
- `src/modules/reading/components/ReadingLevelSelect.tsx` — ADD IskraHero w header
- `src/modules/reading/components/SessionEnd.tsx:118` — IskraMascot → IskraHero (ceremony)
- `src/modules/reading/components/SessionEnd.tsx:182-187` — IskraMascot → IskraHero
- `src/modules/numbers/components/NumbersLevelSelect.tsx` — ADD IskraHero w header
- `src/modules/numbers/components/SessionEnd.tsx` — ADD IskraHero przed `<h2>` "Świetna sesja!"

**Created:**
- `src/shared/ui/IskraHero.tsx` (~190 LOC) — komponent + `useIskraReaction` hook
- `src/shared/ui/IskraHero.test.tsx` (~80 LOC) — smoke testy

---

## Parallelization

Plan jest zaprojektowany pod parallel execution. Trzy fazy:

**Faza 1 (parallel, 2 agentów)** — fundament komponentów (różne pliki, brak file collision):
- Agent A: Tasks 1-3 (IskraMascot v3 — modyfikacje)
- Agent B: Tasks 4-7 (IskraHero v3 — nowy komponent + hook + testy)

**Faza 2 (parallel, 4 agentów)** — integracje per moduł (każdy agent dotyka innych plików):
- Agent C: Task 8 (Letters integracja — 3 pliki)
- Agent D: Task 9 (Reading integracja — 2 pliki)
- Agent E: Task 10 (Numbers integracja — 2 pliki)
- Agent F: Task 11 (Home integracja — 1 plik)

**Faza 3 (sequential)** — Task 12 (final QA: tsc, test, build).

---

## Faza 1 — Agent A: IskraMascot v3

### Task 1: Dodanie grzywki 3 iskierek do `IskraMascot`

**Files:**
- Modify: `src/shared/ui/IskraMascot.tsx`

- [ ] **Step 1: Dodać grupę grzywki w SVG przed `iskra-body`**

W `src/shared/ui/IskraMascot.tsx` po `</defs>` (linia ~117), przed `<g data-testid="iskra-sparks" ...>`, dodać:

```tsx
{/* Grzywka 3 iskierek na czubku — każda z desyncronizowanym flicker */}
<g data-testid="iskra-fringe">
  <circle
    cx={100}
    cy={16}
    r={4}
    fill="#fff8c2"
    className={`${uid}-fringe-spark ${uid}-fringe-spark-a`}
  />
  <circle
    cx={88}
    cy={22}
    r={3}
    fill="#fff8c2"
    className={`${uid}-fringe-spark ${uid}-fringe-spark-b`}
  />
  <circle
    cx={112}
    cy={22}
    r={3}
    fill="#fff8c2"
    className={`${uid}-fringe-spark ${uid}-fringe-spark-c`}
  />
</g>
```

- [ ] **Step 2: Dodać CSS keyframes dla grzywki w `buildCss()`**

W funkcji `buildCss(uid, _state, sparkCount)` (linia ~255), na końcu return template literal (przed zamykającym backtickiem `` ` ``), dodać:

```js
@keyframes ${uid}-fringe-flicker {
  0%, 100% { opacity: 0.6; transform: scale(0.85); }
  50% { opacity: 1.0; transform: scale(1.1); }
}
.${uid}-fringe-spark {
  transform-origin: center;
  transform-box: fill-box;
}
.${uid}-fringe-spark-a {
  animation: ${uid}-fringe-flicker 1.6s ease-in-out infinite;
}
.${uid}-fringe-spark-b {
  animation: ${uid}-fringe-flicker 2.1s ease-in-out infinite;
  animation-delay: 0.55s;
}
.${uid}-fringe-spark-c {
  animation: ${uid}-fringe-flicker 1.9s ease-in-out infinite;
  animation-delay: 1.1s;
}
```

- [ ] **Step 3: Verify type-check**

Run: `pnpm tsc -b`
Expected: PASS (zero errors)

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/IskraMascot.tsx
git commit -m "feat(mascot): grzywka 3 iskierek z desync flicker

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Opacity flicker w `idle` keyframe

**Files:**
- Modify: `src/shared/ui/IskraMascot.tsx`

- [ ] **Step 1: Rozszerzyć `idle` keyframe o opacity**

W `buildCss()` znaleźć blok:

```js
@keyframes ${uid}-idle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

Zastąpić na:

```js
@keyframes ${uid}-idle {
  0%, 100% { transform: scale(1); opacity: 0.96; }
  50% { transform: scale(1.05); opacity: 1.0; }
}
```

- [ ] **Step 2: Verify type-check + uruchom istniejące testy mascota**

Run:
```bash
pnpm tsc -b && pnpm test --run src/shared/ui/IskraMascot.test.tsx
```
Expected: PASS (10/10 testów istniejących IskraMascot)

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/IskraMascot.tsx
git commit -m "feat(mascot): opacity flicker w idle keyframe (płomień żywy)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `prefers-reduced-motion` guard

**Files:**
- Modify: `src/shared/ui/IskraMascot.tsx`
- Modify: `src/shared/ui/IskraMascot.test.tsx`

- [ ] **Step 1: Wrapnąć wszystkie keyframes w media query**

W `buildCss()` zwracaną wartość (cały template literal po `return \``) zmienić tak, żeby cała zawartość keyframes była w `@media (prefers-reduced-motion: no-preference) { ... }`. Konkretnie:

```js
return `
  @media (prefers-reduced-motion: no-preference) {
    @keyframes ${uid}-idle {
      0%, 100% { transform: scale(1); opacity: 0.96; }
      50% { transform: scale(1.05); opacity: 1.0; }
    }
    @keyframes ${uid}-happy {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.04); }
    }
    @keyframes ${uid}-surprise {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }
    @keyframes ${uid}-dance {
      0% { transform: translateY(0) rotate(-6deg) scale(1); }
      25% { transform: translateY(-10px) rotate(0deg) scale(1.06); }
      50% { transform: translateY(0) rotate(6deg) scale(1); }
      75% { transform: translateY(-6px) rotate(0deg) scale(1.04); }
      100% { transform: translateY(0) rotate(-6deg) scale(1); }
    }
    @keyframes ${uid}-spark {
      0%, 100% { opacity: 0.5; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes ${uid}-rain {
      0% { opacity: 0; transform: translateY(-12px); }
      40% { opacity: 1; }
      100% { opacity: 0; transform: translateY(12px); }
    }
    @keyframes ${uid}-fringe-flicker {
      0%, 100% { opacity: 0.6; transform: scale(0.85); }
      50% { opacity: 1.0; transform: scale(1.1); }
    }
    .${uid}-fringe-spark {
      transform-origin: center;
      transform-box: fill-box;
    }
    .${uid}-fringe-spark-a {
      animation: ${uid}-fringe-flicker 1.6s ease-in-out infinite;
    }
    .${uid}-fringe-spark-b {
      animation: ${uid}-fringe-flicker 2.1s ease-in-out infinite;
      animation-delay: 0.55s;
    }
    .${uid}-fringe-spark-c {
      animation: ${uid}-fringe-flicker 1.9s ease-in-out infinite;
      animation-delay: 1.1s;
    }
    ${sparkKeyframes}
    ${rainKeyframes}
  }
`
```

UWAGA — całe `${sparkKeyframes}` i `${rainKeyframes}` (które już mają definicje per-element animation) też wewnątrz `@media`.

- [ ] **Step 2: Dodać 1 smoke test dla grzywki w `IskraMascot.test.tsx`**

Dodać w `describe('IskraMascot', ...)` (po ostatnim `it`, przed zamykającym `})`):

```tsx
it('renders fringe with 3 sparks (data-testid="iskra-fringe")', () => {
  const { getByTestId } = render(<IskraMascot state="idle" />)
  const fringe = getByTestId('iskra-fringe')
  expect(fringe).toBeInTheDocument()
  expect(fringe.querySelectorAll('circle')).toHaveLength(3)
})
```

- [ ] **Step 3: Run test, verify PASS**

Run: `pnpm test --run src/shared/ui/IskraMascot.test.tsx`
Expected: 11/11 testów przechodzi (10 istniejących + 1 nowy).

- [ ] **Step 4: Type-check**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/IskraMascot.tsx src/shared/ui/IskraMascot.test.tsx
git commit -m "feat(mascot): respect prefers-reduced-motion + smoke test grzywki

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Faza 1 — Agent B: IskraHero v3

### Task 4: Szkielet `IskraHero.tsx` — SVG layers + wewnętrzny IskraMascot

**Files:**
- Create: `src/shared/ui/IskraHero.tsx`

- [ ] **Step 1: Utworzyć plik z bazową strukturą**

`src/shared/ui/IskraHero.tsx`:

```tsx
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  IskraMascot,
  type IskraIntensity,
  type IskraState,
} from './IskraMascot'

export type IskraHeroProps = {
  size?: number
  state?: IskraState
  intensity?: IskraIntensity
  /** 'wave' = prawa rączka macha co 4.5s (tylko gdy state='idle') */
  idleVariant?: 'static' | 'wave'
  oneshotKey?: string
}

const VIEWBOX_W = 240
const VIEWBOX_H = 280
const MASCOT_OFFSET_TOP = 20
// IskraMascot ma viewBox 200x200 — w hero zajmuje ratio 200/240 width.
const MASCOT_RATIO = 200 / VIEWBOX_W

export function IskraHero({
  size = 180,
  state = 'idle',
  intensity = 'fire',
  idleVariant = 'static',
  oneshotKey,
}: IskraHeroProps) {
  const reactId = useId()
  const uid = useMemo(
    () => `iskra-hero-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`,
    [reactId],
  )

  const heroHeight = (size * VIEWBOX_H) / VIEWBOX_W
  const mascotSize = size * MASCOT_RATIO

  const css = buildHeroCss(uid, state, idleVariant)

  return (
    <div
      data-testid="iskra-hero"
      data-state={state}
      data-idle-variant={idleVariant}
      style={{
        width: size,
        height: heroHeight,
        position: 'relative',
        display: 'inline-block',
        lineHeight: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        width={size}
        height={heroHeight}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        aria-hidden="true"
      >
        <style>{css}</style>

        {/* Cień pod stopami */}
        <ellipse
          data-testid="iskra-hero-shadow"
          cx={120}
          cy={270}
          rx={50}
          ry={7}
          fill="rgba(0,0,0,0.18)"
        />

        {/* Nóżki — 2 linie + 2 kropki (NumberBlocks-style) */}
        <g data-testid="iskra-hero-leg-left">
          <line
            x1={104}
            y1={235}
            x2={98}
            y2={265}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={98} cy={267} r={6} fill="#3a2010" />
        </g>
        <g data-testid="iskra-hero-leg-right">
          <line
            x1={136}
            y1={235}
            x2={142}
            y2={265}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={142} cy={267} r={6} fill="#3a2010" />
        </g>

        {/* Rączki — 2 linie + 2 kropki, każda w osobnej grupie dla animacji rotate */}
        <g
          data-testid="iskra-hero-arm-left"
          className={`${uid}-arm-left`}
          style={{ transformOrigin: '78px 160px', transformBox: 'fill-box' }}
        >
          <line
            x1={78}
            y1={160}
            x2={58}
            y2={178}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={58} cy={180} r={7} fill="#3a2010" />
        </g>
        <g
          data-testid="iskra-hero-arm-right"
          className={`${uid}-arm-right`}
          style={{ transformOrigin: '162px 160px', transformBox: 'fill-box' }}
        >
          <line
            x1={162}
            y1={160}
            x2={182}
            y2={178}
            stroke="#3a2010"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={182} cy={180} r={7} fill="#3a2010" />
        </g>
      </svg>

      {/* Wewnętrzny IskraMascot — wstawiony nad SVG hero, scentrowany */}
      <div
        className={`${uid}-body-wrapper`}
        style={{
          position: 'absolute',
          top: MASCOT_OFFSET_TOP * (size / VIEWBOX_W),
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <IskraMascot
          size={mascotSize}
          state={state}
          intensity={intensity}
          {...(oneshotKey !== undefined ? { oneshotKey } : {})}
        />
      </div>
    </div>
  )
}

// Placeholder — zostanie wypełniona w Tasku 5 (animacje per state).
function buildHeroCss(_uid: string, _state: IskraState, _idleVariant: string): string {
  return ''
}

// Placeholder — zostanie wypełniony w Tasku 6.
export function useIskraReaction(): {
  state: IskraState
  cheer: () => void
  dance: () => void
} {
  return { state: 'idle', cheer: () => {}, dance: () => {} }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: PASS (komponent eksportowany, typy dopasowane).

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/IskraHero.tsx
git commit -m "feat(hero): IskraHero szkielet — cień, nóżki, rączki, wewnętrzny IskraMascot

Placeholdery dla animacji (Task 5) i useIskraReaction hook (Task 6).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `IskraHero` animacje per state — wypełnić `buildHeroCss()`

**Files:**
- Modify: `src/shared/ui/IskraHero.tsx`

- [ ] **Step 1: Zastąpić placeholder `buildHeroCss()` pełną implementacją**

W `src/shared/ui/IskraHero.tsx` zastąpić funkcję `buildHeroCss` (placeholder zwracający `''`) na:

```tsx
function buildHeroCss(uid: string, state: IskraState, idleVariant: 'static' | 'wave'): string {
  // Wave: tylko gdy state='idle' i idleVariant='wave'
  const armRightAnimation =
    state === 'idle' && idleVariant === 'wave'
      ? `animation: ${uid}-arm-wave 4.5s ease-in-out infinite;`
      : ''

  // Cheer (state='happy'): obie rączki w górę
  const cheerArms =
    state === 'happy'
      ? `
        .${uid}-arm-left { transform: rotate(-50deg); }
        .${uid}-arm-right { transform: rotate(50deg); }
      `
      : ''

  // Dance (state='dance'): obie rączki bujają, body translateX wave
  const danceAnimations =
    state === 'dance'
      ? `
        .${uid}-arm-left {
          animation: ${uid}-dance-arm-left 0.6s ease-in-out infinite;
        }
        .${uid}-arm-right {
          animation: ${uid}-dance-arm-right 0.6s ease-in-out infinite;
          animation-delay: 0.3s;
        }
        .${uid}-body-wrapper {
          animation: ${uid}-dance-body 0.6s ease-in-out infinite;
        }
      `
      : ''

  return `
    @media (prefers-reduced-motion: no-preference) {
      .${uid}-arm-right { ${armRightAnimation} }
      ${cheerArms}
      ${danceAnimations}

      @keyframes ${uid}-arm-wave {
        0%, 70%, 100% { transform: rotate(0deg); }
        80% { transform: rotate(-25deg); }
        90% { transform: rotate(10deg); }
      }
      @keyframes ${uid}-dance-arm-left {
        0%, 100% { transform: rotate(-15deg); }
        50% { transform: rotate(15deg); }
      }
      @keyframes ${uid}-dance-arm-right {
        0%, 100% { transform: rotate(15deg); }
        50% { transform: rotate(-15deg); }
      }
      @keyframes ${uid}-dance-body {
        0%, 100% { transform: translateX(calc(-50% - 8px)); }
        50% { transform: translateX(calc(-50% + 8px)); }
      }
    }
  `
}
```

UWAGA: Dance keyframe `${uid}-dance-body` używa `translateX(calc(-50% - 8px))` żeby zachować centrowanie wrappera (`translateX(-50%)` w base style + ±8px wave).

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/IskraHero.tsx
git commit -m "feat(hero): animacje per state — wave (idle), cheer (happy), dance

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `useIskraReaction` hook

**Files:**
- Modify: `src/shared/ui/IskraHero.tsx`

- [ ] **Step 1: Zastąpić placeholder `useIskraReaction` pełną implementacją**

W `src/shared/ui/IskraHero.tsx` zastąpić funkcję `useIskraReaction` na:

```tsx
export function useIskraReaction(): {
  state: IskraState
  cheer: () => void
  dance: () => void
} {
  const [state, setState] = useState<IskraState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = (next: IskraState, durationMs: number) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }
    setState(next)
    timeoutRef.current = setTimeout(() => {
      setState('idle')
      timeoutRef.current = null
    }, durationMs)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    state,
    cheer: () => trigger('happy', 900),
    dance: () => trigger('dance', 4000),
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/IskraHero.tsx
git commit -m "feat(hero): useIskraReaction hook — cheer/dance z auto-reset

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `IskraHero` testy

**Files:**
- Create: `src/shared/ui/IskraHero.test.tsx`

- [ ] **Step 1: Utworzyć plik testów**

`src/shared/ui/IskraHero.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { IskraHero, useIskraReaction } from './IskraHero'
import type { IskraState } from './IskraMascot'

const ALL_STATES: IskraState[] = ['idle', 'happy', 'surprise', 'dance']

describe('IskraHero', () => {
  it.each(ALL_STATES)('renders shadow + 2 legs + 2 arms + inner mascot for state=%s', (state) => {
    const { getByTestId } = render(<IskraHero state={state} />)
    const root = getByTestId('iskra-hero')
    expect(root.getAttribute('data-state')).toBe(state)
    expect(getByTestId('iskra-hero-shadow')).toBeInTheDocument()
    expect(getByTestId('iskra-hero-leg-left')).toBeInTheDocument()
    expect(getByTestId('iskra-hero-leg-right')).toBeInTheDocument()
    expect(getByTestId('iskra-hero-arm-left')).toBeInTheDocument()
    expect(getByTestId('iskra-hero-arm-right')).toBeInTheDocument()
    // Wewnętrzny IskraMascot — sprawdzenie że state jest forwardowany
    const mascot = getByTestId('iskra-mascot')
    expect(mascot.getAttribute('data-state')).toBe(state)
  })

  it('idleVariant default is "static"', () => {
    const { getByTestId } = render(<IskraHero state="idle" />)
    expect(getByTestId('iskra-hero').getAttribute('data-idle-variant')).toBe('static')
  })

  it('idleVariant="wave" applies to root element', () => {
    const { getByTestId } = render(<IskraHero state="idle" idleVariant="wave" />)
    expect(getByTestId('iskra-hero').getAttribute('data-idle-variant')).toBe('wave')
  })

  it('default size is 180 (width)', () => {
    const { getByTestId } = render(<IskraHero />)
    expect(getByTestId('iskra-hero').style.width).toBe('180px')
  })

  it('honors custom size prop and computes proportional height', () => {
    const { getByTestId } = render(<IskraHero size={120} />)
    const root = getByTestId('iskra-hero')
    expect(root.style.width).toBe('120px')
    // height = 120 * 280/240 = 140
    expect(root.style.height).toBe('140px')
  })

  it('forwards intensity to inner mascot', () => {
    const { getByTestId } = render(<IskraHero state="idle" intensity="torch" />)
    expect(getByTestId('iskra-mascot').getAttribute('data-intensity')).toBe('torch')
  })
})

describe('useIskraReaction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useIskraReaction())
    expect(result.current.state).toBe('idle')
  })

  it('cheer() sets state to happy for 900ms then back to idle', () => {
    const { result } = renderHook(() => useIskraReaction())
    act(() => {
      result.current.cheer()
    })
    expect(result.current.state).toBe('happy')
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.state).toBe('idle')
  })

  it('dance() sets state to dance for 4000ms then back to idle', () => {
    const { result } = renderHook(() => useIskraReaction())
    act(() => {
      result.current.dance()
    })
    expect(result.current.state).toBe('dance')
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.state).toBe('idle')
  })

  it('cleanup on unmount cancels pending timeout (no state leak)', () => {
    const { result, unmount } = renderHook(() => useIskraReaction())
    act(() => {
      result.current.cheer()
    })
    unmount()
    // Brak crash przy advance po unmount; jeśli setTimeout nie był clearowany,
    // setState rzuciłby ostrzeżenie (we wcześniejszych React, w R19 tylko silently).
    expect(() => {
      vi.advanceTimersByTime(2000)
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run testy**

Run: `pnpm test --run src/shared/ui/IskraHero.test.tsx`
Expected: 11/11 PASS (4 from `it.each` × 4 stany = 4 + 6 from describe IskraHero + 4 from useIskraReaction = 14? Recount: it.each ALL_STATES = 4 testów + 5 testów (idleVariant default, idleVariant wave, default size, custom size, intensity forward) = 9 IskraHero. + 4 useIskraReaction = 13 testów total.)

Expected: 13/13 PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/IskraHero.test.tsx
git commit -m "test(hero): smoke testy IskraHero + useIskraReaction (13 testów)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Faza 2 — Agent C: Letters integracja

### Task 8: Letters — LevelSelect ADD + FeedbackOverlay REPLACE + SessionEnd REPLACE

**Files:**
- Modify: `src/modules/letters/components/LevelSelect.tsx` (ADD IskraHero)
- Modify: `src/modules/letters/components/FeedbackOverlay.tsx:206-211` (REPLACE)
- Modify: `src/modules/letters/components/SessionEnd.tsx:157-162` (REPLACE)

- [ ] **Step 1: LevelSelect — dodać import IskraHero**

W `src/modules/letters/components/LevelSelect.tsx` po linii 16 (`import { useTapHandler ...`), dodać:

```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```

- [ ] **Step 2: LevelSelect — dodać IskraHero w header przed `<h1>`**

W `LevelSelect` (function component) — w returned JSX, znaleźć `<h1 style={...}>Wybierz poziom</h1>` (linia ~251) i zmienić ten cały header section. Zastąpić istniejące `<h1>...</h1>` na:

```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  }}
>
  <IskraHero size={80} state="idle" intensity="fire" />
  <h1 style={{ fontSize: 22, margin: 0, color: colors.text }}>
    Wybierz poziom
  </h1>
</div>
```

- [ ] **Step 3: FeedbackOverlay — REPLACE IskraMascot**

W `src/modules/letters/components/FeedbackOverlay.tsx`:

a) Linia 17 — zmienić import na:
```tsx
import { type IskraState, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { IskraHero } from '@/shared/ui/IskraHero'
```
(usuwamy `IskraMascot` z importu tej linii — typy zostają, IskraHero dodajemy z nowego pliku)

b) Linie 206-211 — zastąpić cały blok JSX:
```tsx
<IskraMascot
  size={feedback.variant === 'mastery' ? 140 : 96}
  state={cfg.state}
  intensity={cfg.intensity}
  oneshotKey={`${feedback.targetLetter}-${feedback.variant}`}
/>
```
na:
```tsx
<IskraHero
  size={feedback.variant === 'mastery' ? 160 : 120}
  state={cfg.state}
  intensity={cfg.intensity}
  oneshotKey={`${feedback.targetLetter}-${feedback.variant}`}
/>
```

- [ ] **Step 4: SessionEnd — REPLACE IskraMascot**

W `src/modules/letters/components/SessionEnd.tsx`:

a) Linia 12 — zmienić import na:
```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```
(usuwamy import IskraMascot)

b) Linie 156-163 — zastąpić blok:
```tsx
<div data-testid="iskra-end" aria-hidden="true">
  <IskraMascot
    size={isPerfect ? 180 : 120}
    state={isPerfect ? 'dance' : 'happy'}
    intensity={isPerfect ? 'torch' : 'flame'}
    oneshotKey={isPerfect ? 'perfect' : 'normal'}
  />
</div>
```
na:
```tsx
<div data-testid="iskra-end" aria-hidden="true">
  <IskraHero
    size={isPerfect ? 180 : 140}
    state={isPerfect ? 'dance' : 'happy'}
    intensity={isPerfect ? 'torch' : 'flame'}
    oneshotKey={isPerfect ? 'perfect' : 'normal'}
  />
</div>
```

- [ ] **Step 5: Type-check + run testy modułu liter**

Run:
```bash
pnpm tsc -b && pnpm test --run src/modules/letters/
```
Expected: PASS (wszystkie testy modułu liter — istniejące powinny działać bo testują behavior, nie konkretne nazwy komponentów).

UWAGA: Jeśli któryś test używa `getByTestId('iskra-mascot')` w SessionEnd lub FeedbackOverlay i to obecnie nie działa po zamianie — sprawdzić: IskraHero nadal renderuje wewnętrznie IskraMascot, więc `data-testid="iskra-mascot"` JEST nadal w DOM. Jeśli test wymaga unique mascot, to nadal pass. Jeśli wszystkie testy zielone — ok.

- [ ] **Step 6: Commit**

```bash
git add src/modules/letters/components/LevelSelect.tsx src/modules/letters/components/FeedbackOverlay.tsx src/modules/letters/components/SessionEnd.tsx
git commit -m "feat(letters): IskraHero w LevelSelect header + FeedbackOverlay + SessionEnd

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Faza 2 — Agent D: Reading integracja

### Task 9: Reading — ReadingLevelSelect ADD + SessionEnd REPLACE (2 instancje)

**Files:**
- Modify: `src/modules/reading/components/ReadingLevelSelect.tsx` (ADD)
- Modify: `src/modules/reading/components/SessionEnd.tsx` (REPLACE × 2)

- [ ] **Step 1: ReadingLevelSelect — sprawdzić strukturę headera i dodać IskraHero**

Otworzyć `src/modules/reading/components/ReadingLevelSelect.tsx`. Znaleźć blok `return (` (linia ~22-23) i `<h1>` w środku (linia ~39). Strukturalnie wygląda podobnie do `LevelSelect` modułu liter.

a) Dodać import na końcu istniejących importów:
```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```

b) Znaleźć `<h1>` w returned JSX. Zastąpić:
```tsx
<h1 style={...}>{tytuł}</h1>
```
(skopiuj istniejące style i tekst tytułu z aktualnego pliku) na blok podobny do letters:
```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  }}
>
  <IskraHero size={80} state="idle" intensity="fire" />
  <h1 style={{ /* zachować istniejące style */ }}>
    {/* zachować istniejący tekst tytułu */}
  </h1>
</div>
```

- [ ] **Step 2: SessionEnd — REPLACE ceremony IskraMascot (linia 118)**

W `src/modules/reading/components/SessionEnd.tsx`:

a) Linia 8 — zmienić import:
```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```
(usuwamy IskraMascot)

b) Linia 118 — zastąpić:
```tsx
<IskraMascot size={160} state="dance" intensity="torch" oneshotKey={`ceremony-${milestone}`} />
```
na:
```tsx
<IskraHero size={160} state="dance" intensity="torch" oneshotKey={`ceremony-${milestone}`} />
```

- [ ] **Step 3: SessionEnd — REPLACE drugi IskraMascot (linie 182-187)**

Zastąpić blok:
```tsx
<IskraMascot
  size={isPerfect ? 180 : 120}
  state={isPerfect ? 'dance' : 'happy'}
  intensity={isPerfect ? 'torch' : 'flame'}
  oneshotKey={isPerfect ? 'reading-perfect' : 'reading-normal'}
/>
```
na:
```tsx
<IskraHero
  size={isPerfect ? 180 : 140}
  state={isPerfect ? 'dance' : 'happy'}
  intensity={isPerfect ? 'torch' : 'flame'}
  oneshotKey={isPerfect ? 'reading-perfect' : 'reading-normal'}
/>
```

- [ ] **Step 4: Type-check + testy modułu reading**

Run:
```bash
pnpm tsc -b && pnpm test --run src/modules/reading/
```
Expected: PASS (wszystkie istniejące testy reading przechodzą — IskraMascotAnimated używany w SessionView nie jest dotykany).

- [ ] **Step 5: Commit**

```bash
git add src/modules/reading/components/ReadingLevelSelect.tsx src/modules/reading/components/SessionEnd.tsx
git commit -m "feat(reading): IskraHero w ReadingLevelSelect + SessionEnd ceremony + final

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Faza 2 — Agent E: Numbers integracja

### Task 10: Numbers — NumbersLevelSelect ADD + SessionEnd ADD (nowa Iskra)

**Files:**
- Modify: `src/modules/numbers/components/NumbersLevelSelect.tsx` (ADD)
- Modify: `src/modules/numbers/components/SessionEnd.tsx` (ADD przed `<h2>`)

- [ ] **Step 1: NumbersLevelSelect — dodać IskraHero w header**

Otworzyć `src/modules/numbers/components/NumbersLevelSelect.tsx`. Znaleźć blok `return (` (linia ~22) i `<h2>` w środku (linia ~38). Strukturalnie podobnie jak inne moduły.

a) Dodać import na końcu istniejących importów:
```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```

b) Znaleźć `<h2>` w returned JSX. Zastąpić:
```tsx
<h2 style={...}>{tytuł}</h2>
```
na:
```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  }}
>
  <IskraHero size={80} state="idle" intensity="fire" />
  <h2 style={{ /* zachować istniejące style */ }}>
    {/* zachować istniejący tekst tytułu */}
  </h2>
</div>
```

- [ ] **Step 2: SessionEnd — ADD IskraHero przed `<h2>` "Świetna sesja!"**

W `src/modules/numbers/components/SessionEnd.tsx`:

a) Dodać import:
```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```

b) Znaleźć `<h2 style={{ color: colors.text }}>Świetna sesja!</h2>` (lub podobnie — sprawdzić aktualną treść).

c) DODAĆ przed tym `<h2>` nowy element:
```tsx
<div aria-hidden="true">
  <IskraHero size={140} state="happy" intensity="torch" />
</div>
```

- [ ] **Step 3: Type-check + testy modułu numbers**

Run:
```bash
pnpm tsc -b && pnpm test --run src/modules/numbers/
```
Expected: PASS (wszystkie istniejące testy numbers przechodzą — Iskra dodana, niczego nie usuwamy).

- [ ] **Step 4: Commit**

```bash
git add src/modules/numbers/components/NumbersLevelSelect.tsx src/modules/numbers/components/SessionEnd.tsx
git commit -m "feat(numbers): IskraHero w NumbersLevelSelect header + SessionEnd celebrate

Numbers SessionEnd dotąd nie miał maskotki — dodanie dla spójności
z Letters/Reading modułami.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Faza 2 — Agent F: Home integracja

### Task 11: Home — REPLACE IskraMascot na IskraHero z idleVariant=wave

**Files:**
- Modify: `src/app/Home.tsx:91`

- [ ] **Step 1: Home.tsx — REPLACE import + JSX**

W `src/app/Home.tsx`:

a) Linia 17 — zmienić import na:
```tsx
import { IskraHero } from '@/shared/ui/IskraHero'
```
(usuwamy import IskraMascot)

b) Linia 91 — zastąpić:
```tsx
<IskraMascot size={140} state="happy" intensity="fire" />
```
na:
```tsx
<IskraHero size={180} state="idle" intensity="fire" idleVariant="wave" />
```

UWAGA: zmienione `state="happy"` → `state="idle"` z `idleVariant="wave"` — Iskra na home macha co 4.5s zamiast nieprzerwanie skakać (mniej natrętne na ekranie głównym).

- [ ] **Step 2: Type-check + testy app**

Run:
```bash
pnpm tsc -b && pnpm test --run src/app/
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/Home.tsx
git commit -m "feat(home): IskraHero na ekranie głównym z idleVariant=wave

Iskra macha co 4.5s zamiast loopowanego skoku — mniej natrętne na home.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Faza 3 — Final QA

### Task 12: Type-check + full test suite + build + manualna weryfikacja

**Files:** brak nowych zmian — verification only.

- [ ] **Step 1: Full type-check**

Run: `pnpm tsc -b`
Expected: PASS (zero errors)

- [ ] **Step 2: Full test suite**

Run: `pnpm test --run`
Expected: ≥561 testów PASS (559 baseline + 1 IskraMascot smoke + 13 IskraHero/useIskraReaction tests; -1 jeśli któryś istniejący test trzeba dostosować do IskraHero wrapper).

Jeśli któryś test FAIL po integracji — sprawdzić czy używa `getByTestId('iskra-mascot')` w sytuacji gdzie teraz pojawia się IskraHero. IskraHero NADAL renderuje wewnętrzny IskraMascot z testid `iskra-mascot`, więc taki test powinien działać bez zmian. Jeśli test używa exact unique selector — dostosować do nowej struktury (nie usuwać testu, dostosować selektor).

- [ ] **Step 3: Build production**

Run: `pnpm build`
Expected:
- PASS, brak warning'ów innych niż istniejące
- Bundle size < 540 kB JS (główny plik)
- Brak nowych chunk warnings

- [ ] **Step 4: Dev server + manualna weryfikacja w Chrome**

Run: `pnpm dev`

Manualnie sprawdzić w Chrome (localhost:5173):
1. Home — IskraHero widoczna, prawa rączka macha co 4.5s
2. /letters → LevelSelect — IskraHero w headerze obok "Wybierz poziom"
3. /reading → ReadingLevelSelect — IskraHero w headerze
4. /numbers → NumbersLevelSelect — IskraHero w headerze
5. /letters/session/iskierka → odpowiedź correct → FeedbackOverlay z IskraHero (state happy lub dance per `mascotConfigFor`)
6. Letters SessionEnd (skończ sesję) — IskraHero z grzywką
7. Reading SessionEnd — IskraHero, ceremony view (state dance) jeśli milestone aktywny
8. Numbers SessionEnd (skończ sesję matematyczną) — IskraHero (NEW mount)

Wszystkie powinny mieć:
- Grzywkę 3 iskierek na czubku z desync flicker
- Płomień z opacity flicker (subtelny)
- Cień + nóżki + rączki (Hero wariant)

- [ ] **Step 5: Manualna weryfikacja `prefers-reduced-motion`**

W Chrome DevTools → Cmd+Shift+P → "rendering" → "Emulate CSS prefers-reduced-motion: reduce".

Wszystkie animacje powinny się zatrzymać. Iskra statyczna.

- [ ] **Step 6: Commit final + push (jeśli wszystko zielone)**

```bash
# Jeśli są jakieś niezacommitowane drobne fixy z weryfikacji:
git status
git add -A  # tylko jeśli wynika z tego planu
git commit -m "..."

# Push
git push
```

Po push GH Actions wykona deploy ~40s. Sprawdzić https://kamilmat.github.io/kid-learn/ z hard reload.

- [ ] **Step 7: iPad weryfikacja** (POZA SCRIPTEM — wymaga fizycznego urządzenia)

User wykona na iPadzie:
- 8-punktowy golden path (wszystkie ekrany)
- Safari DevTools → Frames → 60fps na każdym
- iOS Settings → Accessibility → Motion → Reduce Motion ON → Iskra statyczna
- Brak jankowania przy nawigacji między ekranami

Jeśli iPad weryfikacja wykryje problem (jankowanie, niepoprawne renderowanie) — następna sesja patch.

---

## Acceptance Criteria (z spec, zsumowane)

- [ ] `IskraMascot` ma grzywkę 3 iskierek (`data-testid="iskra-fringe"`).
- [ ] `IskraMascot` `idle` keyframe ma flicker opacity (0.96↔1.0).
- [ ] `IskraMascot` respektuje `prefers-reduced-motion: reduce`.
- [ ] `IskraHero` istnieje, eksportuje komponent + `useIskraReaction` hook.
- [ ] `IskraHero` 4 stany + 2 idleVariants działają.
- [ ] 5 instancji `IskraMascot` zastąpione na `IskraHero`.
- [ ] 4 nowe instancje `IskraHero` dodane.
- [ ] `pnpm tsc -b` ✓
- [ ] `pnpm test --run` ≥561 testów PASS
- [ ] `pnpm build` ✓ < 540 kB
- [ ] iPad gen 7+ Safari: 60fps golden path
- [ ] `prefers-reduced-motion: reduce` — animacje wyłączone

---

## Self-Review Notes

**Spec coverage check:**
- Sekcja 5 spec (IskraMascot v3 modyfikacje): Tasks 1, 2, 3 ✓
- Sekcja 6 spec (IskraHero komponent + hook): Tasks 4, 5, 6, 7 ✓
- Sekcja 7.1 spec (5 replace): Tasks 8 (Letters: 2 replace), 9 (Reading: 2 replace), 11 (Home: 1 replace) = 5 ✓
- Sekcja 7.2 spec (4 add): Tasks 8 (Letters LevelSelect), 9 (Reading LevelSelect), 10 (Numbers: 2 add) = 4 ✓
- Sekcja 8 spec (animation manifest): Tasks 1, 2, 5 implementują wszystkie keyframes ✓
- Sekcja 9 spec (testy): Tasks 3, 7 + manual w Task 12 ✓
- Sekcja 10 spec (acceptance): pełne pokrycie w Task 12 ✓

**Type consistency check:**
- `IskraState`, `IskraIntensity` — reused z `IskraMascot`, importowane w `IskraHero` (Task 4) i konsumentach (Tasks 8, 9, 10, 11) ✓
- `useIskraReaction` zwraca `{state, cheer, dance}` — sygnatura ta sama w Task 6 i Task 7 ✓
- `IskraHero` props (size/state/intensity/idleVariant/oneshotKey) — konsystentne między definicją (Task 4) a użyciem ✓

**Placeholder scan:** ✓ żadnych "TBD"/"TODO"/"add appropriate".

**Parallelization readiness:**
- Faza 1: Agent A (Tasks 1-3) i Agent B (Tasks 4-7) modyfikują różne pliki (`IskraMascot.tsx` vs `IskraHero.tsx`) — zero file collision ✓
- Faza 2: Agenci C/D/E/F dotykają osobnych modułów (letters/reading/numbers/app) — zero collision ✓
- Każda faza wymaga ukończenia poprzedniej (Faza 2 importuje z plików tworzonych w Fazie 1).
