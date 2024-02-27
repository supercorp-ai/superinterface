import {
  Flex,
  Text,
} from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

export const Name = ({
  children,
}: Args) => (
  <Flex
    align="center"
    height="var(--space-5)"
  >
    <Text
      size="2"
      weight="bold"
    >
      {children}
    </Text>
  </Flex>
)
