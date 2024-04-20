import {
  Flex,
  Text,
} from '@radix-ui/themes'

export const StatusMessage = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Flex
    justify="center"
    pb="9"
  >
    <Text
      size="2"
      weight="regular"
      color="gray"
    >
      {children}
    </Text>
  </Flex>
)
