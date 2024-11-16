import type { StyleProps } from '@/types'
import { Submit } from './Submit'
import { Root } from './Root'
import { Field } from './Field'

export const MessageForm = (props: StyleProps) => (
  <Root {...props}>
    <Field.Root>
      <Field.Control />
      <Submit />
    </Field.Root>
  </Root>
)

MessageForm.Root = Root
MessageForm.Field = Field
MessageForm.Submit = Submit
