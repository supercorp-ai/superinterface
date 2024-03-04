import { useContext } from 'react'
import { PollingContext } from '@/contexts/runs/PollingContext'

export const usePollingContext = () => (
  useContext(PollingContext)
)
