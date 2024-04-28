import { useContext } from 'react'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'

export const useComponents = () => (
  useContext(ComponentsContext)
)
