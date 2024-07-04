import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { formData } from './formData'

export const body = ({
  variables,
  superinterfaceContext,
}: {
  variables: {
    [key: string]: any
  }
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (variables.threadId) return formData(variables)
  if (!variables.assistantId) return formData(variables)
  if (!superinterfaceContext.threadIdCookieOptions?.get) return formData(variables)

  const threadId = superinterfaceContext.threadIdCookieOptions.get({ assistantId: variables.assistantId })
  if (!threadId) return formData(variables)

  return formData({
    ...variables,
    threadId,
  })
}
