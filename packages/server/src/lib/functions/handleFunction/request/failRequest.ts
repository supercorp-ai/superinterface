import {
  failToolCall,
  type ToolCallLogScope,
} from '@/lib/toolCalls/failToolCall'
import type { PrismaClient } from '@prisma/client'
import type { RequestFailure } from './types'

// Logs the failed request handler call and returns the error as JSON output.
export const failRequest = ({
  toolCall,
  scope,
  failure: { reason, errorMessage },
  prisma,
}: {
  toolCall: { id: string }
  scope: ToolCallLogScope
  failure: RequestFailure
  prisma: PrismaClient
}) =>
  failToolCall({
    toolCall,
    scope,
    message: `${reason}: ${errorMessage}`,
    output: JSON.stringify({ error: errorMessage }),
    prisma,
  })
