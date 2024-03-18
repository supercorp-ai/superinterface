'use client'
import { useMemo } from 'react'
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { formOptions } from './lib/formOptions'
import { MessageFormContext } from '@/contexts/messages/MessageFormContext'
import { useToasts } from '@/hooks/toasts/useToasts'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'

type Inputs = {
  content: string
}

export const Root = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const formProps = useForm<Inputs>(formOptions)

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = formProps

  const { addToast } = useToasts()

  const { createMessage } = useCreateMessage({
    onError: (error: any) => (
      addToast({ type: 'error', message: error.message })
    ),
  })

  const isMutatingMessage = useIsMutatingMessage()

  const isLoading = useMemo(() => (
    isMutatingMessage || isSubmitting
  ), [
    isMutatingMessage,
    isSubmitting,
  ])

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    reset()
    // @ts-ignore-next-line
    await createMessage({ content: data.content })
  }

  const { latestMessage } = useLatestMessage()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessage?.metadata?.isBlocking
  ), [latestMessage, isLoading])

  return (
    <MessageFormContext.Provider value={{ isDisabled, isLoading }}>
      <FormProvider {...formProps}>
        <form
          onSubmit={handleSubmit(onSubmit)}
        >
          {children}
        </form>
      </FormProvider>
    </MessageFormContext.Provider>
  )
}
