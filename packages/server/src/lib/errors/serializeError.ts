const causeMessage = ({ error }: { error: Error }) => {
  if (error.cause instanceof Error) return ` ${error.cause.message}`
  if (error.cause) return ` ${error.cause}`
  return ''
}

export const serializeError = ({ error }: { error: unknown }): string => {
  if (!(error instanceof Error)) return String(error)

  return `${error.message}${causeMessage({ error })}`
}
