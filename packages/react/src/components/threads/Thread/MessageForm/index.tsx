import {
  Flex,
  Text,
} from '@radix-ui/themes'
import { Submit } from './Submit'
import { Root } from './Root'
import { Field } from './Field'

export const MessageForm = () => (
  <Root>
    <Field.Root>
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
          <Field.Control />
        </Flex>
      </Text>

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
