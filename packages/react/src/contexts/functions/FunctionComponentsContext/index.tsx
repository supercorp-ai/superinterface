'use client'
import { createContext } from 'react'

type FunctionComponents = {
  [key: string]: React.ReactNode
}

export const FunctionComponentsContext = createContext({} as FunctionComponents)
