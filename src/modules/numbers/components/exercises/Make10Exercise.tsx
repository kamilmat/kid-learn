import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { TenFrame } from '../representations/TenFrame'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'
import { buildChoices, NEAR_MISS_OFFSETS } from '../../utils/buildChoices'
import { DropTarget } from './shared/DropTarget'
import { clamp } from '../../utils/clamp'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
}

const DROP_TARGET_ID = 'answer-target'
const DOT_COLOR = '#dc2626'
const TRANSFER_COLOR = '#16a34a'
const ANIMATION_MS = 2500

export function Make10Exercise({ audioBus, payload, promptKeys, onAnswer, restrictChoicesTo }: Props) {
  const a = clamp(payload.args[0] ?? 8, 1, 9)
  // a+b > 10, a+b ≤ 18
  const b = clamp(payload.args[1] ?? 5, Math.max(1, 11 - a), 18 - a)
  const correct = a + b
  const transferred = 10 - a // ile kropek "wystrzelić" do uzupełnienia 10
  const leftover = b - transferred // ile zostaje obok (= a+b-10)

  const [phase, setPhase] = useState<'animate' | 'answer'>('animate')

  useEffect(() => {
    void audioBus.play('correct-make10-prefix')
    const t = setTimeout(() => {
      setPhase('answer')
      for (const key of promptKeys) void audioBus.play(key)
    }, ANIMATION_MS)
    return () => clearTimeout(t)
  }, [audioBus, promptKeys])

  const choices = useMemo(
    () =>
      buildChoices(correct, { restrictChoicesTo, min: 1, max: 20, offsets: NEAR_MISS_OFFSETS }),
    [correct, restrictChoicesTo],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong', dropped)
  }

  // Faza animacji: pokazujemy oryginalne TenFrame(a) i TenFrame(b), z animacją CSS
  // "wystrzeliwującą" kropki transfer w kolorze TRANSFER_COLOR.
  // Faza odpowiedzi: pełny TenFrame(10) + leftover TenFrame jako static state.
  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-make10"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: 24,
          gap: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {phase === 'animate' ? (
            <>
              <TenFrame count={a} dotColor={DOT_COLOR} size={44} />
              <MathSymbol>+</MathSymbol>
              {/* TenFrame(b) z highlight na transferowanych kropkach (pierwsze `transferred`) */}
              <div
                data-testid="make10-transfer-source"
                style={{
                  animation: `make10-shrink ${ANIMATION_MS}ms ease-in-out forwards`,
                }}
              >
                <TenFrame
                  count={b}
                  dotColor={DOT_COLOR}
                  highlightColor={TRANSFER_COLOR}
                  highlightAfter={transferred}
                  size={44}
                />
              </div>
            </>
          ) : (
            <>
              <TenFrame count={10} dotColor={DOT_COLOR} size={44} />
              <MathSymbol>+</MathSymbol>
              {leftover > 0 ? (
                <TenFrame count={leftover} dotColor={TRANSFER_COLOR} size={44} />
              ) : null}
              <MathSymbol>=</MathSymbol>
              <DropTarget droppableId={DROP_TARGET_ID}>
                <span style={{ fontSize: 96, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
              </DropTarget>
            </>
          )}
        </div>
        {phase === 'answer' && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {choices.map((d) => (
              <DigitTile key={d} variant="drag" digit={d} dragId={`digit-${d}`} size="md" />
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes make10-shrink {
          0% { transform: translateX(0); opacity: 1; }
          70% { transform: translateX(-12px); opacity: 0.85; }
          100% { transform: translateX(-24px); opacity: 0.7; }
        }
      `}</style>
    </DndContext>
  )
}

function MathSymbol({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-block)',
        fontSize: 80,
        fontWeight: 700,
        color: colors.text,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}
