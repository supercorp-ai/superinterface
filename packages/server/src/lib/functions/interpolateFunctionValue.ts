import { Assistant, Thread } from '@prisma/client'

export const interpolateFunctionValue = ({
  value,
  args,
  thread,
  assistant,
}: {
  value: string | null | undefined
  args?: Record<string, unknown> | null
  thread: Thread
  assistant: Assistant
}) => {
  const missing: string[] = []
  const result = (value || '').replace(/{{\s*([\w-]+)\s*}}/g, (_, k) => {
    if (args && k in args) return String(args[k] as unknown)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (k in (thread.metadata || {})) return String((thread.metadata as any)[k])
    if (k === 'threadId') return thread.id
    if (k === 'assistantId') return assistant.id
    missing.push(k)
    return `{{${k}}}`
  })

  return { value: result, missing }
}
