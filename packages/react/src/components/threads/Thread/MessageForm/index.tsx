import { Submit } from './Submit'
import { Root } from './Root'
import { Field } from './Field'

export const MessageForm = () => (
  <Root>
    <Field.Root>
      <Field.Control />
      <Submit />
    </Field.Root>
  </Root>
)

MessageForm.Root = Root
MessageForm.Field = Field
MessageForm.Submit = Submit
