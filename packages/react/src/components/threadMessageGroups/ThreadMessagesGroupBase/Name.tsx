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
    height="5"
    align="center"
  >
    <Text
      size="2"
      weight="bold"
    >
      {children}
    </Text>
  </Flex>
)
