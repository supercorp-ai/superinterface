'use client'
import { createContext } from 'react'

export const SuperinterfaceContext = createContext({
  baseUrl: 'https://superinterface.ai/api/cloud',
  variables: {},
  defaultOptions: {
    queries: {},
    mutations: {},
  },
})
