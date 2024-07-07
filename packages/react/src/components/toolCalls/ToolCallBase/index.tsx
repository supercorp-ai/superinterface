import {
  Flex,
  Button,
} from '@radix-ui/themes'

export const ToolCallBase = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Flex
    py="1"
    ml="-2"
  >
    <Button
      size="1"
      color="gold"
      variant="outline"
      style={{
        boxShadow: 'none',
      }}
    >
      {children}
    </Button>
  </Flex>
)
