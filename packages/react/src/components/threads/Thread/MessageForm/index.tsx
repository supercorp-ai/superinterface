import { Submit } from './Submit'
import { Root } from './Root'
import { Field } from './Field'
import { FileUpload } from './FileUpload'

export const MessageForm = () => (
  <Root>
    <Field.Root>
      <FileUpload.Preview />
      <FileUpload.Button />
      <Field.Control />
      <Submit />
    </Field.Root>
  </Root>
)

MessageForm.Root = Root
MessageForm.Field = Field
MessageForm.Submit = Submit
MessageForm.FileUpload = FileUpload
