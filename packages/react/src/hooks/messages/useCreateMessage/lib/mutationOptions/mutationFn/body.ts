import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const body = ({
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
  if (!superinterfaceContext.threadIdStorageOptions?.get) return variables

  const threadId = superinterfaceContext.threadIdStorageOptions.get({ assistantId: variables.assistantId })
  if (!threadId) return variables

  return {
    ...variables,
    threadId,
  }
}
