'use client'
import { createContext } from 'react'
import { components } from './lib/components'

export const MarkdownContext = createContext({
  remarkPlugins: [] as any[],
  rehypeReactOptions: {
    components,
  }
})
