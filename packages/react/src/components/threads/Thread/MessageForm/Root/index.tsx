import { useMemo } from 'react'
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { formOptions } from './lib/formOptions'
import { MessageFormContext } from '@/contexts/messages/MessageFormContext'

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

  const { isRunActive } = useIsRunActive()

  const isLoading = useMemo(() => (
    isRunActive || isSubmitting
  ), [
    isRunActive,
    isSubmitting,
  ])

  const { createMessage } = useCreateMessage()

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
    <MessageFormContext.Provider value={{ isDisabled, isLoading, submit: handleSubmit(onSubmit) }}>
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
