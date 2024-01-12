import {
  Flex,
  Button,
  PopoverTrigger
} from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

export const ToolCallBase = ({
  children,
}: Args) => (
  <Flex
    py="1"
    ml="-2"
  >
    <PopoverTrigger>
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
    </PopoverTrigger>
  </Flex>
)
