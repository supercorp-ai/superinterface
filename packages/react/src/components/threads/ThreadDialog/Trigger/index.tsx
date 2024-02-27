import {
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'

type Args = {
  children: React.ReactNode
}

export const Trigger = ({
  children,
}: Args) => {
  const { setIsOpen } = useThreadDialogContext()

  return (
    <Flex
      onClick={() => setIsOpen((prev) => !prev)}
      direction="column"
      flexShrink="0"
    >
      {children}
    </Flex>
  )
}
