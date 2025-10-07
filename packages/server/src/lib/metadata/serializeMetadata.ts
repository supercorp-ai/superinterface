import { LogRequestMethod, LogRequestRoute, LogLevel } from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

export const serializeMetadata = ({
  variables,
  workspaceId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: Record<string, any>
  workspaceId: string
}): Record<string, string> => {
  const metadata: Record<string, string> = {}

  for (const [key, value] of Object.entries(variables)) {
    try {
      metadata[key] = String(value)
    } catch (error) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 500,
          message: `Failed to serialize key "${key}": ${
            error instanceof Error ? error.message : String(error)
          }`,
          workspaceId,
        },
      })
    }
  }

  return metadata
}
