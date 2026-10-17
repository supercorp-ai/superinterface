import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  publicErrors,
  TaskScheduleConflictError,
  ValidationError,
} from '@/lib/errors'

describe('public errors', () => {
  it('sets the name of each error to its constructor name', () => {
    const validationError = new ValidationError('Bad input')
    const conflictError = new TaskScheduleConflictError()

    assert.strictEqual(validationError.name, 'ValidationError')
    assert.strictEqual(validationError.message, 'Bad input')
    assert.strictEqual(conflictError.name, 'TaskScheduleConflictError')
    assert.strictEqual(
      conflictError.message,
      'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.',
    )
    assert.ok(conflictError instanceof ValidationError)
    assert.strictEqual(
      String(conflictError),
      'TaskScheduleConflictError: Tasks sharing a key and thread must be scheduled at least 15 minutes apart.',
    )
  })

  it('lists the errors whose messages are safe to show', () => {
    assert.deepStrictEqual(publicErrors, [
      ValidationError,
      TaskScheduleConflictError,
    ])
  })
})
