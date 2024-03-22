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
  console.log({ variables, superinterfaceContext })
  if (variables.threadId) return variables
  if (!variables.assistantId) return variables
  if (!superinterfaceContext.threadIdCookieOptions?.get) return variables

  console.log('using')
  const threadId = superinterfaceContext.threadIdCookieOptions.get({ assistantId: variables.assistantId })
  if (!threadId) return variables
  console.log({threadId})

  return {
    ...variables,
    threadId,
  }
}
