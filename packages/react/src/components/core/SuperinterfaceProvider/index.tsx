import { MessagesPage } from '@/types'
import { Toaster, toast } from 'sonner'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { merge } from '@/lib/misc/merge'
import { SuperinterfaceContext } from '@/contexts/core/SuperinterfaceContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export type Args = {
  children: React.ReactNode
  baseUrl?: string
  publicApiKey?: string
  variables?: {
    [key: string]: any
  }
  defaultOptions?: {
    queries?: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
    mutations?: UseMutationOptions
  }
}

export const SuperinterfaceProvider = ({
  children,
  baseUrl,
  publicApiKey,
  variables,
  defaultOptions,
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const value = merge(
    superinterfaceContext,
    {
      ...(baseUrl ? { baseUrl } : {}),
      ...(publicApiKey ? { publicApiKey } : {}),
      ...(variables ? { variables } : {}),
      ...(merge({
        defaultOptions: {
          mutations: {
            onError: (error: any) => (
              toast.error(error.message)
            ),
          },
        },
      }, defaultOptions ?? { defaultOptions })),
      isToasterRendered: true,
    }
  )

  return (
    <SuperinterfaceContext.Provider
      value={value}
    >
      {children}

      {!superinterfaceContext.isToasterRendered && <Toaster />}
    </SuperinterfaceContext.Provider>
  )
}
