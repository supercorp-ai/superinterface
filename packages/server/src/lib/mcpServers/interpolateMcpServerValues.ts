import type { Assistant, PrismaClient, Thread } from '@prisma/client'
import { interpolateFunctionValue } from '@/lib/functions/interpolateFunctionValue'
import { failMissingMcpServerVariables } from './failMissingMcpServerVariables'

// Fills the {{variable}} templates in MCP server settings from the thread's
// metadata, failing when any variable can't be filled.
export const interpolateMcpServerValues = ({
  values,
  thread,
  assistant,
  prisma,
}: {
  values: Record<string, string>
  thread: Thread
  assistant: Assistant
  prisma: PrismaClient
}) => {
  const metadata = thread.metadata ?? {}
  const result: Record<string, string> = {}
  const missing: string[] = []

  for (const [key, template] of Object.entries(values)) {
    const filled = interpolateFunctionValue({
      value: template,
      args: metadata,
      thread,
      assistant,
    })
    result[key] = filled.value
    missing.push(...filled.missing)
  }

  if (missing.length) {
    failMissingMcpServerVariables({ missing, thread, assistant, prisma })
  }

  return result
}
