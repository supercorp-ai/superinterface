'use client'
import { Flex } from '@radix-ui/themes'
import { useFormContext } from 'react-hook-form'
import { usePrevious } from '@/hooks/misc/usePrevious'
import { useContext, useMemo, useRef, useEffect } from 'react'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { TextareaBase } from '@/components/textareas/TextareaBase'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import type { StyleProps } from '@/types'

const Root = ({
  children,
  style,
  className,
}: {
  children: React.ReactNode
} & StyleProps) => (
  <Flex
    flexGrow="1"
    pt="4px"
    style={style}
    className={className}
  >
    {children}
  </Flex>
)

const Input = (
  props: Omit<StyleProps, 'style'> & {
    style?: Omit<React.CSSProperties, 'minHeight' | 'maxHeight' | 'height'>
    placeholder?: string
  },
) => {
  'use no memo'
  const assistantNameContext = useContext(AssistantNameContext)
  const { register } = useFormContext()

  const { isDisabled, isLoading } = useMessageFormContext()

  const isSubmitDisabled = useMemo(
    () => isDisabled || isLoading,
    [isDisabled, isLoading],
  )

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
      placeholder={props.placeholder ?? `Message ${assistantNameContext}...`}
      disabled={isDisabled}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()

          if (isSubmitDisabled) return
          e.currentTarget.form?.requestSubmit()
        }
      }}
      {...textareaProps}
      {...props}
      ref={(e: any) => {
        textareaProps.ref(e)
        // @ts-ignore-next-line
        textareaRef.current = e
      }}
    />
  )
}

export const Control = (props: StyleProps) => (
  <Root {...props}>
    <Input />
  </Root>
)

Control.Root = Root
Control.Input = Input
