'use client'
import OpenAI from 'openai'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

type Inputs = {
  content: string
  attachments?: OpenAI.Beta.Threads.Message.Attachment[]
}

export const Root = ({
  children,
  onSubmit: onSubmitArg,
  isDisabled: isDisabledArg,
}: {
  children: React.ReactNode
  onSubmit?: SubmitHandler<Inputs & { reset: any, createMessage: any }>
  isDisabled?: boolean
}) => {
  const [files, setFiles] = useState<OpenAI.Files.FileObject[]>([])
  const formProps = useForm<Inputs>(formOptions)

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
    watch,
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

  const isFileLoading = useMemo(() => (
    files.some((file) => isOptimistic({ id: file.id }))
  ), [files])

  const isLoading = useMemo(() => (
    isMutatingMessage || isSubmitting
  ), [
    isMutatingMessage,
    isSubmitting,
  ])

  const { latestMessage } = useLatestMessage()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessage?.metadata?.isBlocking || isDisabledArg
  ), [latestMessage, isDisabledArg])

  const onSubmit: SubmitHandler<Inputs> = onSubmitArg ? partob(onSubmitArg, { reset, createMessage }) : async (data) => {
    if (isFileLoading) return
    if (isLoading) return
    if (isDisabled) return

    reset()
    setFiles([])

    const attachments = files.map((file) => ({
      file_id: file.id,
      tools: [
        {
          type: 'file_search',
        },
      ],
    }))

    await createMessage({
      // @ts-ignore-next-line
      content: data.content,
      ...(attachments.length ? { attachments } : {}),
    })
  }

  const content = watch('content')

  return (
    <MessageFormContext.Provider
      value={{
        isDisabled,
        isLoading,
        files,
        setFiles,
        isFileLoading,
        content,
      }}
    >
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
