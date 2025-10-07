export class ValidationError extends Error {
  static defaultMessage = 'Validation failed.'

  constructor(message: string = ValidationError.defaultMessage) {
    super(message)
    this.name = this.constructor.name
  }
}

export const publicErrors = [ValidationError]
