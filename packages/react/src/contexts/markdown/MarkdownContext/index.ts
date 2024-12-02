'use client'
import { createContext } from 'react'
import { components } from './lib/components'
import { getRemarkPlugins } from './lib/getRemarkPlugins'

export type MarkdownContextType = {
  components: typeof components,
  getRemarkPlugins: typeof getRemarkPlugins,
}

export const MarkdownContext = createContext<MarkdownContextType>({
  components,
  getRemarkPlugins,
})
