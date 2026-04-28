import { useEffect, useMemo, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { NumberBondShape } from '../representations/NumberBondShape'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_ID_A = 'bond-slot-a'
const DROP_ID_B = 'bond-slot-b'

export function NumberBondBuilder({ audioBus, payload, onAnswer }: Props) {
  const whole = clamp(payload.args[0] ?? 5, 2, 10)
  const correctA = clamp(payload.args[1] ?? 1, 1, whole - 1)
  const correctB = clamp(payload.args[2] ?? whole - correctA, 1, whole - 1)

  const [partA, setPartA] = useState<number | null>(null)
  const [partB, setPartB] = useState<number | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-build-bond')
  }, [audioBus])

  const choices = useMemo(
    () => buildBondChoices(correctA, correctB, whole),
    [correctA, correctB, whole],
  )

  useEffect(() => {
    if (resolved) return
    if (partA === null || partB === null) return
    setResolved(true)
    if (partA + partB === whole) {
      void audioBus.play('praise-precision')
      onAnswer('correct')
    } else {
      void audioBus.play('try-again')
      onAnswer('wrong')
    }
  }, [partA, partB, whole, resolved, audioBus, onAnswer])

  const handleDragEnd = (event: DragEndEvent) => {
    if (resolved) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    const targetId = event.over?.id
    if (targetId === DROP_ID_A && partA === null) {
      setPartA(dropped)
    } else if (targetId === DROP_ID_B && partB === null) {
      setPartB(dropped)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-number-bond-builder"
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
        <NumberBondShape
          whole={whole}
          partA={partA}
          partB={partB}
          dropIdA={DROP_ID_A}
          dropIdB={DROP_ID_B}
        />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {choices.map((c) => (
            <DigitTile
              key={c.id}
              variant="drag"
              digit={c.digit}
              dragId={c.id}
              size="md"
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)))
}

type BondChoice = { id: string; digit: number }

function buildBondChoices(a: number, b: number, whole: number): BondChoice[] {
  const set = new Set<number>([a, b])
  const pool: number[] = []
  for (let n = 1; n <= whole - 1; n++) {
    if (!set.has(n)) pool.push(n)
  }
  const shuffled = pool.sort(() => Math.random() - 0.5)
  const distractorCount = Math.min(3, shuffled.length)
  const distractors = shuffled.slice(0, distractorCount)
  const digits = a === b ? [a, a, ...distractors] : [a, b, ...distractors]
  const choices: BondChoice[] = digits.map((d, idx) => ({
    id: `bond-digit-${idx}-${d}`,
    digit: d,
  }))
  return choices.sort(() => Math.random() - 0.5)
}
