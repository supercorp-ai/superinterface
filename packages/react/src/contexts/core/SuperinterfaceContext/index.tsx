'use client'
import { createContext } from 'react'
import { queryOptions as messages } from '@/hooks/messages/useMessages/lib/queryOptions'
import { queryOptions as runs } from '@/hooks/runs/useRuns/lib/queryOptions'
import { mutationOptions as createMessage } from '@/hooks/messages/useCreateMessage/lib/mutationOptions'
import { mutationOptions as createRun } from '@/hooks/runs/useCreateRun/lib/mutationOptions'
import { mutationOptions as handleAction } from '@/hooks/actions/useHandleAction/lib/mutationOptions'

export const SuperinterfaceContext = createContext({
  queryOptions: {
    messages,
    runs,
  },
  mutationOptions: {
    createMessage,
    createRun,
    handleAction,
  },
})
