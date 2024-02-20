'use client'
import { createContext } from 'react'

export const ThreadContext = createContext({
  variables: {},
  defaultOptions: {
    queries: {},
    mutations: {},
  },
})
