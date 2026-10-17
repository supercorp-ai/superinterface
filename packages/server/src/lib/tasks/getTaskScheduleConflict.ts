import { findConflictingTask } from './findConflictingTask'

export { FIFTEEN_MINUTES_IN_MS } from './scheduleConflictWindow'

export enum TaskScheduleConflictStatus {
  NONE = 'none',
  CONFLICT = 'conflict',
}

// Reports whether another task with the same thread and key runs within
// fifteen minutes of the schedule.
export const getTaskScheduleConflict = async (
  args: Parameters<typeof findConflictingTask>[0],
) => {
  const conflictingTask = await findConflictingTask(args)

  if (!conflictingTask) {
    return { status: TaskScheduleConflictStatus.NONE as const }
  }

  return {
    status: TaskScheduleConflictStatus.CONFLICT as const,
    conflictingTaskId: conflictingTask.id,
  }
}
