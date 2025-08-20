'use client'

import { FilePlusIcon } from '@radix-ui/react-icons'
import { IconButton, Flex } from '@radix-ui/themes'
import type { StyleProps } from '@/types'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { useChangeFilesField } from '@/hooks/files/useChangeFilesField'
import { filesFieldAccept } from '@/lib/files/filesFieldAccept'

export const Control = (props: StyleProps) => {
  const { isDisabled, isLoading } = useMessageFormContext()
  const { changeFilesField } = useChangeFilesField()

  return (
    <Flex
      pt="2"
      pr="2"
      flexGrow="0"
      {...props}
    >
      <IconButton
        type="button"
        variant="ghost"
        color="gray"
        disabled={isDisabled || isLoading}
        style={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <FilePlusIcon />
        <input
          type="file"
          multiple
          accept={filesFieldAccept}
          onChange={changeFilesField}
          style={{
            cursor: 'pointer',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0,
          }}
        />
      </IconButton>
    </Flex>
  )
}
