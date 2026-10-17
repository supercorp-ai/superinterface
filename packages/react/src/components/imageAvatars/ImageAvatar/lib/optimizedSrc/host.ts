import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const host = ({
  superinterfaceContext,
}: {
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  const { baseUrl } = superinterfaceContext

  // SuperinterfaceProvider ignores an empty baseUrl, so there always is one,
  // and a missing one would not be an http(s) url either.
  if (!/^https?:\/\//i.test(String(baseUrl))) return ''

  return new URL(baseUrl!).origin
}
