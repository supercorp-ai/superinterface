import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const variableParams = ({
  variables,
  superinterfaceContext,
}: {
  variables: {
    [key: string]: any
  }
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (variables.threadId) return variables
  if (!variables.assistantId) return variables
  if (!superinterfaceContext.threadIdCookieOptions?.get) return variables

  const threadId = superinterfaceContext.threadIdCookieOptions.get({ assistantId: variables.assistantId })
  if (!threadId) return variables

  return {
    ...variables,
    threadId,
  }
}
