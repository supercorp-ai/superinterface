import { queryOptions as tanstackQueryOptions } from '@tanstack/react-query'
import {
  useSuperinterfaceContext,
} from '@superinterface/react'
import { queryFn } from './queryFn'

type Args = {
  assistantId: string
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}

export const queryOptions = ({
  assistantId,
  superinterfaceContext,
}: Args) => (
  tanstackQueryOptions({
    queryKey: ['assistants', { assistantId }],
    queryFn: queryFn({ superinterfaceContext }),
  })
)
