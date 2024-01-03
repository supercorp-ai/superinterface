import {
  Text,
} from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

export const ToolCallTitle = ({
  children,
}: Args) => (
  <Text
    weight="regular"
  >
    {children}
  </Text>
)
