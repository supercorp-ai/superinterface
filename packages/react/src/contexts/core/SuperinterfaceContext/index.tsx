'use client'

import { createContext } from 'react'
import { baseUrl } from '@/lib/superinterfaceCloud/baseUrl'
import { cookieOptions } from '@/lib/threadIdStorage/cookieOptions'
import { localStorageOptions } from '@/lib/threadIdStorage/localStorageOptions'
import { isIframe } from '@/lib/iframes/isIframe'
import type  { ThreadStorageOptions } from '@/types'

export const SuperinterfaceContext = createContext<{
  baseUrl: string | null
  variables: Record<string, any>
  defaultOptions: {
    queries: Record<string, any>
    mutations: Record<string, any>
  }
  threadIdStorageOptions: ThreadStorageOptions | null
  createMessageAbortControllerRef: React.MutableRefObject<AbortController | null>
}>({
  baseUrl,
  variables: {},
  defaultOptions: {
    queries: {},
    mutations: {},
  },
  threadIdStorageOptions: isIframe() ? localStorageOptions : cookieOptions,
  createMessageAbortControllerRef: { current: null },
})
