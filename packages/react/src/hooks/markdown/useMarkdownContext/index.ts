import { useContext } from 'react'
import { MarkdownContext } from '@/contexts/markdown/MarkdownContext'

export const useMarkdownContext = () => (
  useContext(MarkdownContext)
)
