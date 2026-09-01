import assert from 'node:assert/strict'
import test from 'node:test'
import { LIVE_TAIL_BUFFER_CHARS, appendLiveTail, beginLiveThinking, finishLiveTail, lastDisplayTokens } from '../src/liveTail.js'

test('shows truthful thinking before text, then generating, then idle', () => {
  const thinking = beginLiveThinking(undefined)
  assert.equal(thinking.phase, 'thinking')
  assert.equal(thinking.active, true)
  const generating = appendLiveTail(thinking, 'real output', 1)
  assert.equal(generating.phase, 'generating')
  assert.equal(generating.tail, 'real output')
  const done = finishLiveTail(generating)
  assert.equal(done.phase, 'idle')
  assert.equal(done.active, false)
})

test('a repeated running snapshot never overwrites generated text', () => {
  const generating = appendLiveTail(beginLiveThinking(undefined), 'one two three', 1)
  assert.equal(beginLiveThinking(generating), generating)
})

test('an explicit new-turn status resets a stale active tail', () => {
  const stale = appendLiveTail(undefined, 'previous turn output', 4)
  const thinking = beginLiveThinking(stale, true)
  assert.equal(thinking.phase, 'thinking')
  assert.equal(thinking.tail, '')
  assert.equal(thinking.seq, 0)
})

test('reconstructs a word split across real stream chunks', () => {
  let state = appendLiveTail(undefined, 'under the', 1)
  state = appendLiveTail(state, ' bud', 2)
  state = appendLiveTail(state, 'get', 3)
  assert.equal(state.tail, 'under the budget')
})

test('keeps exactly three readable word/punctuation display tokens', () => {
  assert.equal(lastDisplayTokens('the build is done.'), 'is done.')
  assert.equal(lastDisplayTokens('calling tool_name now'), 'calling tool_name now')
})

test('ignores duplicate or out-of-order chunks while active', () => {
  const first = appendLiveTail(undefined, 'one two', 2)
  assert.equal(appendLiveTail(first, ' duplicate', 2), first)
  assert.equal(appendLiveTail(first, ' old', 1), first)
})

test('TurnEnd stops generation and the next turn starts a clean tail', () => {
  const done = finishLiveTail(appendLiveTail(undefined, 'old response tail', 3))
  assert.equal(done.active, false)
  const next = appendLiveTail(done, 'new turn', 1)
  assert.equal(next.tail, 'new turn')
  assert.equal(next.buffer, 'new turn')
})

test('retains only a bounded presentation suffix', () => {
  const state = appendLiveTail(undefined, `${'x'.repeat(LIVE_TAIL_BUFFER_CHARS)} final words here`, 1)
  assert.equal(state.buffer.length, LIVE_TAIL_BUFFER_CHARS)
  assert.equal(state.tail, 'final words here')
})
