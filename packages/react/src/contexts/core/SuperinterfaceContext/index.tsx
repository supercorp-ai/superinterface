'use client'
import { createContext } from 'react'

export const SuperinterfaceContext = createContext<{
  baseUrl: string | null
  variables: Record<string, any>
  defaultOptions: {
    queries: Record<string, any>
    mutations: Record<string, any>
  }
  publicApiKey?: string
}>({
  baseUrl: 'https://superinterface.ai/api/cloud',
  variables: {},
  defaultOptions: {
    queries: {},
    mutations: {},
  },
})
