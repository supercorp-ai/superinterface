'use client'
import { useContext } from 'react'
import { SuperinterfaceContext } from '@/contexts/core/SuperinterfaceContext'

export const useSuperinterfaceContext = () => (
  useContext(SuperinterfaceContext)
)
