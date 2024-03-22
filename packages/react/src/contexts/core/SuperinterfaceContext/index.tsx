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
  publicApiKey?: string
  threadIdCookieOptions: typeof options | null
}>({
  baseUrl,
  variables: {},
  defaultOptions: {
    queries: {},
    mutations: {},
  },
  threadIdCookieOptions: options,
})
