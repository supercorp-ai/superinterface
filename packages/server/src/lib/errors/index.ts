export class ValidationError extends Error {
  static defaultMessage = 'Validation failed.'

  constructor(message: string = ValidationError.defaultMessage) {
    super(message)
    this.name = this.constructor.name
  }
}

export class TaskScheduleConflictError extends ValidationError {
  static defaultMessage =
    'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.'

  constructor(message: string = TaskScheduleConflictError.defaultMessage) {
    super(message)
  }
}

export const publicErrors = [ValidationError, TaskScheduleConflictError]
