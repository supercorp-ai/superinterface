import {
  Flex,
  Text,
} from '@radix-ui/themes'
import { Submit } from './Submit'
import { Root } from './Root'
import { Field } from './Field'
import { FileUploadButton } from './FileUploadButton'

export const MessageForm = () => (
  <Root>
    <Field.Root>
      <Flex
        flexGrow="1"
      >
        <FileUploadButton />

        <Flex
          flexGrow="1"
        >
          <Text
            size="2"
            style={{
              flexGrow: 1,
            }}
          >
            <Field.Control />
          </Text>
        </Flex>
      </Flex>

      <Flex
        flexShrink="0"
        align="end"
      >
        <Submit />
      </Flex>
    </Field.Root>
  </Root>
)

MessageForm.Root = Root
MessageForm.Field = Field
MessageForm.Submit = Submit
