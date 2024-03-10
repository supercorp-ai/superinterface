'use client'
import { usePrevious } from 'react-use'
import { useContext, useMemo, useRef, useEffect } from 'react'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { TextareaBase } from '@/components/textareas/TextareaBase'
import { useFormContext } from 'react-hook-form'
import {
  Container,
  Flex,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'

const Root = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const {
    formState: {
      errors,
    },
  } = useFormContext()

  return (
    <Container
      size="2"
      flexGrow="0"
    >
      <Flex
        direction="column"
        flexShrink="0"
      >
        <Flex
          direction="column"
          flexShrink="0"
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
            {children}
          </Flex>
        </Flex>
      </Flex>
    </Container>
  )
}

const Control = () => {
  const assistantNameContext = useContext(AssistantNameContext)
  const {
    register,
  } = useFormContext()

  const { isDisabled, isLoading } = useMessageFormContext()

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

  return (
    <TextareaBase
      minRows={1}
      placeholder={`Message ${assistantNameContext}...`}
      disabled={isDisabled}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()

          if (isSubmitDisabled) return
          e.currentTarget.form?.requestSubmit()
        }
      }}
      {...textareaProps}
      ref={(e: any) => {
        textareaProps.ref(e)
        // @ts-ignore-next-line
        textareaRef.current = e
      }}
    />
  )
}

export const Field = {
  Root,
  Control,
}
