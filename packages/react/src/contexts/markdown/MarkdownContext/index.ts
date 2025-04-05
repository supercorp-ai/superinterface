'use client'
import { createContext } from 'react'
import { components, type MarkDownComponentsType } from './lib/components'
import { getRemarkPlugins } from './lib/getRemarkPlugins'

export type MarkdownContextType = {
  components: MarkDownComponentsType
  getRemarkPlugins: typeof getRemarkPlugins
}

export const MarkdownContext = createContext<MarkdownContextType>({
  components,
  getRemarkPlugins,
})
