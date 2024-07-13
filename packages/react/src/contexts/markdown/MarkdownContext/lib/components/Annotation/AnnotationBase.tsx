import {
  IconButton,
  Popover,
  Flex,
  Text,
} from '@radix-ui/themes'

export const AnnotationBase = ({
  icon,
  content,
}: {
  icon: React.ReactNode,
  content: string
}) => (
  <Popover.Root>
    <Popover.Trigger>
      <IconButton
        variant="soft"
        color="gray"
        size="1"
      >
        {icon}
      </IconButton>
    </Popover.Trigger>
    <Popover.Content
      size="1"
    >
      <Flex
        direction="column"
      >
        <Text
          size="1"
          color="gray"
        >
          {content}
        </Text>
      </Flex>
    </Popover.Content>
  </Popover.Root>
)
