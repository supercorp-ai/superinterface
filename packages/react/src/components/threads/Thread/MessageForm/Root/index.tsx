'use client'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form'
import { Box } from '@radix-ui/themes'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { formOptions } from './lib/formOptions'
import { MessageFormContext } from '@/contexts/messages/MessageFormContext'
import { useToasts } from '@/hooks/toasts/useToasts'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'
import { partob } from 'radash'

type Inputs = {
  content: string
}

export const Root = ({
  children,
  onSubmit: onSubmitArg,
}: {
  children: React.ReactNode
  onSubmit?: SubmitHandler<Inputs | { reset: any }>
}) => {
  const formProps = useForm<Inputs>(formOptions)

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = formProps

  const { addToast } = useToasts()
  const queryClient = useQueryClient()
  const threadContext = useThreadContext()

  const { createMessage } = useCreateMessage({
    onError: (error: any) => {
      if (error.name === 'AbortError') {
        queryClient.invalidateQueries({ queryKey: ['messages', threadContext.variables] })
        queryClient.invalidateQueries({ queryKey: ['runs', threadContext.variables] })
        return
      }

      addToast({ type: 'error', message: error.message })
    },
  })

  const isMutatingMessage = useIsMutatingMessage()

  const isLoading = useMemo(() => (
    isMutatingMessage || isSubmitting
  ), [
    isMutatingMessage,
    isSubmitting,
  ])

  const onSubmit: SubmitHandler<Inputs> = onSubmitArg ? partob(onSubmitArg, { reset }) : async (data) => {
    reset()

    await createMessage({
      // @ts-ignore-next-line
      content: data.content,
    })
  }

  const { latestMessage } = useLatestMessage()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessage?.metadata?.isBlocking
  ), [latestMessage, isLoading])

  return (
    <MessageFormContext.Provider value={{ isDisabled, isLoading }}>
      <FormProvider {...formProps}>
        <Box
          asChild
          flexShrink="0"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
          >
            {children}
          </form>
        </Box>
      </FormProvider>
    </MessageFormContext.Provider>
  )
}
