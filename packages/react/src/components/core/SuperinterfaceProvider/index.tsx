'use client'
import { useRef } from 'react'
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
  variables,
  defaultOptions,
  threadIdCookieOptions,
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const createMessageAbortControllerRef = useRef<AbortController | null>(null)

  const value = merge(
    superinterfaceContext,
    {
      ...(baseUrl ? { baseUrl } : {}),
      ...(variables ? { variables } : {}),
      ...(defaultOptions ? { defaultOptions } : {}),
      ...(threadIdCookieOptions ? { threadIdCookieOptions } : {}),
      createMessageAbortControllerRef,
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
