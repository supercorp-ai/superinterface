import {
  Cross1Icon,
} from '@radix-ui/react-icons'
import {
  IconButton,
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'

export const Close = () => {
  const { setIsOpen, isOpen } = useThreadDialogContext()

  return (
    <Flex
      display={{
        initial: isOpen ? 'flex' : 'none',
        sm: 'none',
      }}
      onClick={() => setIsOpen((prev) => !prev)}
      direction="column"
      flexShrink="0"
      justify="end"
      align="end"
      position="absolute"
      top="24px"
      right='24px'
      style={{
        zIndex: 9999999999,
      }}
    >
      <IconButton
        size="2"
        variant="soft"
      >
        <Cross1Icon />
      </IconButton>
    </Flex>
  )
}
