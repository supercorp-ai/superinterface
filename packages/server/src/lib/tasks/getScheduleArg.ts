// The schedule argument of a task tool call, or undefined when the parsed
// arguments are not an object or have none.
export const getScheduleArg = ({ args }: { args: unknown }): unknown => {
  if (!args || typeof args !== 'object') return undefined

  return (args as { schedule?: unknown }).schedule
}
