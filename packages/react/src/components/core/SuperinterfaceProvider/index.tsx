'use client'
import { useRef, useMemo } from 'react'
import { MessagesPage } from '@/types'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { merge } from '@/lib/misc/merge'
import { SuperinterfaceContext } from '@/contexts/core/SuperinterfaceContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import type { ThreadStorageOptions } from '@/types'

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
  threadIdStorageOptions?: ThreadStorageOptions | null
}

export const SuperinterfaceProvider = ({
  children,
  baseUrl,
  variables,
  defaultOptions,
  threadIdStorageOptions,
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const createMessageAbortControllerRef = useRef<AbortController | null>(null)

  // Memoize the merged value to keep it stable across renders
  const value = useMemo(
    () =>
      merge(superinterfaceContext, {
        ...(baseUrl ? { baseUrl } : {}),
        ...(variables ? { variables } : {}),
        ...(defaultOptions ? { defaultOptions } : {}),
        ...(threadIdStorageOptions ? { threadIdStorageOptions } : {}),
        createMessageAbortControllerRef,
      }),
    [
      superinterfaceContext,
      baseUrl,
      variables,
      defaultOptions,
      threadIdStorageOptions,
      createMessageAbortControllerRef,
    ],
  )

  return (
    <SuperinterfaceContext.Provider value={value}>
      {children}
    </SuperinterfaceContext.Provider>
  )
}
