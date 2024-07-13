'use client'
import { createContext } from 'react'
import { components } from './lib/components'
import { getRemarkPlugins } from './lib/getRemarkPlugins'

export const MarkdownContext = createContext({
  components,
  getRemarkPlugins,
})
