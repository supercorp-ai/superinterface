import { useState } from 'react'
import {
  Flex,
  DialogRoot,
  DialogTrigger,
  DialogContent,
  IconButton,
} from '@radix-ui/themes'
import {
  ChatBubbleIcon,
} from '@radix-ui/react-icons'

type Args = {
  children: React.ReactNode
}

export const Dialog = ({
  children,
}: Args) => {
  const [isOpen, setIsOpen] = useState(false)

  const onOpenChange = (open: boolean) => {
    if (!open) return

    setIsOpen(true)
  }

  return (
    <Flex
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
      }}
    >
      <DialogRoot
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        <DialogTrigger>
          <IconButton
            // highContrast
            size="4"
            radius="full"
          >
            <ChatBubbleIcon />
          </IconButton>
        </DialogTrigger>
        <DialogContent
          className="superinterface"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
          onInteractOutside={() => setIsOpen(false)}
          onWheel={(e) => {
            e.stopPropagation()
            const isScrollingDown = e.deltaY > 0

            if (isScrollingDown) {
              e.currentTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
            } else {
              e.currentTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
            }
          }}
        >
          <Flex
            direction="column"
            grow="1"
          >
            {children}
          </Flex>
        </DialogContent>
      </DialogRoot>
    </Flex>
  )
}
