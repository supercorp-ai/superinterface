'use client'
import { createContext } from 'react'
import { baseUrl } from '@/lib/superinterfaceCloud/baseUrl'
import { options } from '@/lib/threadIdCookies/options'

export const SuperinterfaceContext = createContext<{
  baseUrl: string | null
  variables: Record<string, any>
  defaultOptions: {
    queries: Record<string, any>
    mutations: Record<string, any>
  }
  threadIdCookieOptions: typeof options | null
  createMessageAbortControllerRef: React.MutableRefObject<AbortController | null>
}>({
  baseUrl,
  variables: {},
  defaultOptions: {
    queries: {},
    mutations: {},
  },
  threadIdCookieOptions: options,
  createMessageAbortControllerRef: { current: null },
})
