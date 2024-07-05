'use client'
import { useFormContext } from 'react-hook-form'
import {
  Container as RadixContainer,
  Flex,
} from '@radix-ui/themes'
import { Control } from './Control'
import { Files } from './Files'

const Root = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const {
    formState: {
      errors,
    },
  } = useFormContext()

  return (
    <RadixContainer
      size="2"
      flexGrow="0"
    >
      <Flex
        direction="column"
        flexShrink="0"
      >
        <Flex
          direction="column"
          flexShrink="0"
        >
          <Flex
            style={{
              borderRadius: 'var(--radius-2)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: errors.content ? 'var(--red-9)' : 'var(--gray-5)',
              ...(errors.content ? { backgroundColor: 'var(--red-2)' } : {}),
            }}
            p="2"
            pl="3"
            wrap="wrap"
          >
            {children}
          </Flex>
        </Flex>
      </Flex>
    </RadixContainer>
  )
}

export const Field = {
  Root,
  Control,
  Files,
}
