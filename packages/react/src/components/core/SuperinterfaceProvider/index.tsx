'use client'
import { MessagesPage } from '@/types'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { merge } from '@/lib/misc/merge'
import { SuperinterfaceContext } from '@/contexts/core/SuperinterfaceContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { options } from '@/lib/threadIdCookies/options'

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
  threadIdCookieOptions?: typeof options | null
}

export const SuperinterfaceProvider = ({
  children,
  baseUrl,
  publicApiKey,
  variables,
  defaultOptions,
  threadIdCookieOptions,
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const value = merge(
    superinterfaceContext,
    {
      ...(baseUrl ? { baseUrl } : {}),
      ...(publicApiKey ? { publicApiKey } : {}),
      ...(variables ? { variables } : {}),
      ...(defaultOptions ? { defaultOptions } : {}),
      ...(threadIdCookieOptions ? { threadIdCookieOptions } : {}),
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
