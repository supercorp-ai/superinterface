import { useState } from 'react'
import {
  Flex,
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

  return (
    <Flex
      direction="column"
      justify="end"
      align="end"
      position="fixed"
      style={{
        bottom: '24px',
        right: '24px',
        top: '24px',
        zIndex: 9999999999,
      }}
    >
      {isOpen && (
        <Flex
          direction="column"
          position="relative"
          grow="1"
          // boxShadow='light'
          mb="2"
          style={{
            boxShadow: 'var(--shadow-6)',
            borderRadius: 'var(--radius-5)',
            width: '100vw',
            maxWidth: '400px',
            maxHeight: '720px',
          }}
          // borderRadius={{ xs: undefined, sm: 'rounded' }}
          // width={{ xs: '100vw', sm: 'calc(100vw - 32px)' }}
          // maxWidth={{ xs: undefined, sm: 47 }}
          // maxHeight={{ xs: undefined, sm: 90 }}
          // marginBottom={{ xs: 0, sm: 2 }}
        >
          {children}
        </Flex>
      )}
      <IconButton
        onClick={() => setIsOpen((prev) => !prev)}
        size="4"
        radius="full"
      >
        <ChatBubbleIcon />
      </IconButton>
    </Flex>
  )
}
