import { NextResponse } from 'next/server'

export const TASK_EXECUTION_RETRY_AFTER_SECONDS = 30

// Asks QStash to redeliver later while another delivery runs the task.
export const executionInProgressResponse = () => {
  const headers = {
    'Retry-After': String(TASK_EXECUTION_RETRY_AFTER_SECONDS),
  }

  return NextResponse.json(
    { error: 'Task execution already in progress' },
    { status: 503, headers },
  )
}
