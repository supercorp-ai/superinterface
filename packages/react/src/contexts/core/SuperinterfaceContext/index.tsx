'use client'
import { createContext } from 'react'
import { queryOptions as threadMessages } from '@/hooks/threadMessages/useThreadMessages/lib/queryOptions'
import { queryOptions as runs } from '@/hooks/runs/useRuns/lib/queryOptions'
import { mutationOptions as createThreadMessage } from '@/hooks/threadMessages/useCreateThreadMessage/lib/mutationOptions'
import { mutationOptions as createRun } from '@/hooks/runs/useCreateRun/lib/mutationOptions'
import { mutationOptions as handleAction } from '@/hooks/actions/useHandleAction/lib/mutationOptions'

export const SuperinterfaceContext = createContext({
  queryOptions: {
    threadMessages,
    runs,
  },
  mutationOptions: {
    createThreadMessage,
    createRun,
    handleAction,
  },
})
