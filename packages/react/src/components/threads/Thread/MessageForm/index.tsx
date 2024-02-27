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
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { Submit } from './Submit'
import { useFormProps as defaultUseFormProps } from './lib/useFormProps'

type Inputs = {
  content: string
}

type Args = {
  children?: React.ReactNode
  useFormProps?: UseFormProps<Inputs>
  style?: React.CSSProperties
}

export const MessageForm = ({
  children,
  useFormProps = defaultUseFormProps,
  style = {},
}: Args = {}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Inputs>(useFormProps)

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
    await createMessage({ content: data.content })
  }

  const { latestMessage } = useLatestMessage()

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessage?.metadata?.isBlocking
  ), [latestMessage, isLoading])

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
      flexGrow="0"
      style={style}
    >
      {children}

      <Flex
        direction="column"
        flexShrink="0"
      >
        <Flex
          direction="column"
          flexShrink="0"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
          >
            <Flex
              style={{
                borderRadius: 'var(--radius-2)',
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
                  flexGrow="1"
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
                flexShrink="0"
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
