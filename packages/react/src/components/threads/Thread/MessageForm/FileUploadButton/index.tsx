'use client'

import { useCallback } from 'react'
import {
  FilePlusIcon,
} from '@radix-ui/react-icons'
import {
  IconButton,
  Flex,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'

export const FileUploadButton = () => {
  const { isDisabled, isLoading } = useMessageFormContext()

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    console.log(files)
  }, [])


  return (
    <Flex
      pt="2"
      pr="2"
    >
      <IconButton
        type="button"
        variant="ghost"
        disabled={isDisabled || isLoading}
        style={{
          position: 'relative',
        }}
      >
        <FilePlusIcon />
        <input
          type="file"
          onChange={onChange}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
          }}
        />
      </IconButton>
    </Flex>
  )
}
