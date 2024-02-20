import { merge } from '@/lib/misc/merge'
import { SuperinterfaceContext } from '@/contexts/core/SuperinterfaceContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

type Args = {
  children: React.ReactNode
  baseUrl?: string
  publicApiKey?: string
}

export const SuperinterfaceProvider = ({
  children,
  baseUrl = 'http://localhost:3000/api/cloud',
  publicApiKey
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const value = merge(
    superinterfaceContext,
    {
      baseUrl,
      publicApiKey
    }
  )

  return (
    <SuperinterfaceContext.Provider
      value={value}
    >
      {children}
    </SuperinterfaceContext.Provider>
  )
}
