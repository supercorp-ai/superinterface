import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const host = ({
  superinterfaceContext,
}: {
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (!superinterfaceContext.baseUrl) return ''
  if (!/^https?:\/\//i.test(superinterfaceContext.baseUrl)) return ''

  return new URL(superinterfaceContext.baseUrl).origin
}
