import { describe, it, expect } from 'vitest'
import { promptAudioKeys } from './promptAudio'
import type { Question } from '../types'

const q = (exerciseType: Question['exerciseType'], args: number[], op?: '+' | '-'): Question =>
  ({
    factId: 'f',
    conceptId: 'iskierka-adding-concrete',
    exerciseType,
    payload: op ? { args, op } : { args },
  }) as Question

describe('promptAudioKeys', () => {
  it('concrete-add', () =>
    expect(promptAudioKeys(q('concrete-add', [3, 4]))).toEqual([
      'number-3',
      'op-plus',
      'number-4',
      'ask-howmany-total',
    ]))
  it('concrete-add-subtract z minusem', () =>
    expect(promptAudioKeys(q('concrete-add-subtract', [9, 4], '-'))).toEqual([
      'number-9',
      'op-minus',
      'number-4',
      'ask-howmany-left',
    ]))
  it('equal-groups → op-times', () =>
    expect(promptAudioKeys(q('equal-groups', [3, 5]))).toEqual([
      'number-3',
      'op-times',
      'number-5',
      'ask-howmany-total',
    ]))
  it('jedna liczba + pytanie', () => {
    expect(promptAudioKeys(q('ten-frame-fill', [7]))).toEqual(['number-7', 'ask-howmany-missing'])
    expect(promptAudioKeys(q('number-bond-builder', [10]))).toEqual(['number-10', 'ask-build-bond'])
  })
  it('subitize-flash bez liczb (są celem pytania)', () =>
    expect(promptAudioKeys(q('subitize-flash', [4]))).toEqual(['ask-howmany']))
  it('argument poza 0-20 → sam klucz generyczny', () =>
    expect(promptAudioKeys(q('concrete-add', [30, 4]))).toEqual(['ask-howmany-total']))
  it('null → pusta lista', () => expect(promptAudioKeys(null)).toEqual([]))
})
