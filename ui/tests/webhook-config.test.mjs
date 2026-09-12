import test from 'node:test'
import assert from 'node:assert/strict'

import { repositoriesFromText } from '../src/webhookConfig.js'

test('webhook repository text normalizes separators, invalid entries, and case duplicates', () => {
  assert.deepEqual(
    repositoriesFromText('owner/Repo\nOWNER/repo, second/project\nnot a repo\nowner/Repo/extra'),
    ['owner/Repo', 'second/project'],
  )
})

test('webhook repository text accepts only owner/name tokens', () => {
  assert.deepEqual(repositoriesFromText('bad repo/name\nowner/good\nowner/space here\n'), ['owner/good'])
  assert.deepEqual(repositoriesFromText(''), [])
})
