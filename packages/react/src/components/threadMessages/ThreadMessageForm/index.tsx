import {
  Container,
  Flex,
  Text,
} from '@radix-ui/themes'
import { useRef, useEffect, useMemo, useContext } from 'react'
import { useForm, SubmitHandler, UseFormProps } from 'react-hook-form'
import { usePrevious } from 'react-use'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { TextareaBase } from '@/components/textareas/TextareaBase'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { useCreateThreadMessage } from '@/hooks/threadMessages/useCreateThreadMessage'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { Submit } from './Submit'
import { useFormProps as defaultUseFormProps } from './lib/useFormProps'

type Inputs = {
  content: string
}

type Args = {
  [key: string]: any
} | {
  children?: React.ReactNode
  useFormProps: UseFormProps
}

export const ThreadMessageForm = ({
  children,
  useFormProps = defaultUseFormProps,
  ...args
}: Args = {}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Inputs>(useFormProps)

  const { isRunActive } = useIsRunActive(args)

  const isLoading = useMemo(() => (
    isRunActive || isSubmitting
  ), [
    isRunActive,
    isSubmitting,
  ])

  const {
    createThreadMessage,
    // @ts-ignore-next-line
  } = useCreateThreadMessage(args)

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    reset()
    // @ts-ignore-next-line
    await createThreadMessage({
      content: data.content,
      ...args,
    })
  }

  const { latestThreadMessage } = useLatestThreadMessage(args)

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestThreadMessage?.metadata?.isBlocking
  ), [latestThreadMessage, isLoading])

  const isSubmitDisabled = useMemo(() => (
    isDisabled || isLoading
  ), [isDisabled, isLoading])

  const isDisabledPrevious = usePrevious(isDisabled)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaProps = register('content')

  useEffect(() => {
    if (isDisabled) return
    if (!isDisabledPrevious) return
    if (!textareaRef.current) return

    textareaRef.current.focus()
  }, [isDisabled, isDisabledPrevious, textareaProps])

  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <Container
      size="2"
      px="2"
      grow="0"
    >
      {children}

      <Flex
        direction="column"
        shrink="0"
      >
        <Flex
          direction="column"
          shrink="0"
          pb="4"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
          >
            <Flex
              style={{
                borderRadius: 'var(--radius-3)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: errors.content ? 'var(--red-9)' : 'var(--gray-5)',
                ...(errors.content ? { backgroundColor: 'var(--red-2)' } : {}),
              }}
              p="2"
              pl="4"
            >
              <Text
                size="2"
                style={{
                  flexGrow: 1,
                }}
              >
                <Flex
                  grow="1"
                  direction="column"
                >
                  <TextareaBase
                    minRows={1}
                    placeholder={`Message ${assistantNameContext}...`}
                    disabled={isDisabled}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()

                        if (isSubmitDisabled) return
                        handleSubmit(onSubmit)()
                      }
                    }}
                    autoFocus
                    {...textareaProps}
                    ref={(e: any) => {
                      textareaProps.ref(e)
                      // @ts-ignore-next-line
                      textareaRef.current = e
                    }}
                  />
                </Flex>
              </Text>

              <Flex
                shrink="0"
                align="end"
              >
                <Submit
                  isLoading={isLoading}
                  isDisabled={isSubmitDisabled}
                />
              </Flex>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Container>
  )
}