import {
  Flex,
} from '@radix-ui/themes'
import { useFormContext } from 'react-hook-form'
import { usePrevious } from '@/hooks/misc/usePrevious'
import { useContext, useMemo, useRef, useEffect } from 'react'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { TextareaBase } from '@/components/textareas/TextareaBase'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'

const Root = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Flex
    flexGrow="1"
    pt="4px"
  >
    {children}
  </Flex>
)

const Input = () => {
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

export const Control = () => (
  <Root>
    <Input />
  </Root>
)

Control.Root = Root
Control.Input = Input
