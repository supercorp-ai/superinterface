import {
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'
import { Button } from './Button'
import type { StyleProps } from '@/types'

type Args = {
  children: React.ReactNode
} & StyleProps

const Root = ({
  children,
  style,
  className,
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
      right="24px"
      className={className}
      style={{
        zIndex: 9999999999,
        ...(style ?? {}),
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
