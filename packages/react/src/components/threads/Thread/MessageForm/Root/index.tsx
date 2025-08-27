'use client'
import OpenAI from 'openai'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm, SubmitHandler, FormProvider, UseFormReset } from 'react-hook-form'
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
import { createMessageDefaultOnError } from '@/lib/errors/createMessageDefaultOnError'
import type { StyleProps, UseCreateMessageVariables } from '@/types'

type Inputs = {
  content: string
  attachments?: OpenAI.Files.FileObject[]
}

type OnSubmitArgs = {
  reset: UseFormReset<Inputs>
  createMessage: (variables: UseCreateMessageVariables) => Promise<any>
  setFiles: (files: OpenAI.Files.FileObject[]) => void
}

export const Root = ({
  children,
  onSubmit: onSubmitArg,
  isDisabled: isDisabledArg,
  style,
  className,
}: {
  children: React.ReactNode
  onSubmit?: SubmitHandler<Inputs & OnSubmitArgs>
  isDisabled?: boolean
} & StyleProps) => {
  'use no memo'
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
    onError: createMessageDefaultOnError({
      queryClient,
      addToast,
      threadContext,
    }),
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
    !!latestMessage?.metadata?.isBlocking || !!isDisabledArg
  ), [latestMessage, isDisabledArg])


  const onSubmit: SubmitHandler<Inputs> = onSubmitArg ? partob(onSubmitArg, { reset, createMessage, attachments:files, setFiles }) : async (data) => {
    if (isFileLoading) return
    if (isLoading) return
    if (isDisabled) return

    reset()
    setFiles([])

    const attachments = files.filter((file) => (
      file.purpose === 'assistants'
    )).map((file) => ({
      file_id: file.id,
      tools: [
        {
          type: 'file_search',
        },
      ],
    }))

    const imageFileContentParts = files.filter((file) => (
      file.purpose === 'vision'
    )).map((file) => ({
      type: 'image_file' as 'image_file',
      image_file: {
        file_id: file.id,
      },
    }))

    const content = [
      ...imageFileContentParts,
      {
        type: 'text' as 'text',
        text: data.content,
      },
    ]

    await createMessage({
      content,
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
          style={style}
          className={className}
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
