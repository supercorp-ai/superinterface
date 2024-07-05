import {
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'
import { Button } from './Button'

type Args = {
  children: React.ReactNode
  style?: React.CSSProperties
}

const Root = ({
  children,
  style = {},
}: Args) => {
  const { setIsOpen, isOpen } = useThreadDialogContext()

  return (
    <Flex
      display={{
        initial: isOpen ? 'none' : 'flex',
        sm: 'flex',
      }}
      onClick={() => setIsOpen((prev) => !prev)}
      direction="column"
      flexShrink="0"
      justify="end"
      align="end"
      position="fixed"
      bottom="24px"
      right='24px'
      style={{
        zIndex: 9999999999,
        ...style,
      }}
    >
      {children}
    </Flex>
  )
}

export const Trigger = (args: Omit<Args, 'children'>) => (
  <Root {...args}>
    <Button />
  </Root>
)

Trigger.Root = Root
Trigger.Button = Button
