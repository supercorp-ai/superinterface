import {
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'

type Args = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export const Trigger = ({
  children,
  style = {},
}: Args) => {
  const { setIsOpen } = useThreadDialogContext()

  return (
    <Flex
      onClick={() => setIsOpen((prev) => !prev)}
      direction="column"
      flexShrink="0"
      justify="end"
      align="end"
      position="fixed"
      style={{
        bottom: '24px',
        right: '24px',
        zIndex: 9999999999,
        ...style,
      }}
    >
      {children}
    </Flex>
  )
}
