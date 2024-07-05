import {
  Flex,
  Text,
} from '@radix-ui/themes'
import { Submit } from './Submit'
import { Root } from './Root'
import { Field } from './Field'
import { FileUploadButton } from './FileUploadButton'
import { FilesPreview } from './FilesPreview'

export const MessageForm = () => (
  <Root>
    <Field.Root>
      <FilesPreview />

      <Flex
        flexGrow="1"
      >
        <FileUploadButton />

        <Flex
          flexGrow="1"
          pt="4px"
        >
          <Field.Control />
        </Flex>

        <Flex
          flexShrink="0"
          align="end"
        >
          <Submit />
        </Flex>
      </Flex>
    </Field.Root>
  </Root>
)

MessageForm.Root = Root
MessageForm.Field = Field
MessageForm.Submit = Submit
