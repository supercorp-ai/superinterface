export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class TaskScheduleConflictError extends ValidationError {
  static defaultMessage =
    'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.'

  constructor() {
    super(TaskScheduleConflictError.defaultMessage)
  }
}

export const publicErrors = [ValidationError, TaskScheduleConflictError]
