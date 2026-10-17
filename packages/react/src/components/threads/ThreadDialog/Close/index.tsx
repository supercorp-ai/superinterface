import { Cross1Icon } from '@radix-ui/react-icons'
import { IconButton, Flex } from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'

export const Close = () => {
  const { setIsOpen } = useThreadDialogContext()

  return (
    <Flex
      display={{
        // Only rendered by Content.Root, which renders nothing while closed.
        initial: 'flex',
        sm: 'none',
      }}
      onClick={() => setIsOpen((prev) => !prev)}
      direction="column"
      flexShrink="0"
      justify="end"
      align="end"
      position="absolute"
      top="24px"
      right="24px"
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
