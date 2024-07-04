'use client'

import type OpenAI from 'openai'
import { useCallback } from 'react'
import dayjs from 'dayjs'
import { optimisticId } from '@/lib/optimistic/optimisticId'
import {
  FilePlusIcon,
} from '@radix-ui/react-icons'
import {
  IconButton,
  Flex,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { useCreateFile } from '@/hooks/files/useCreateFile'

export const FileUploadButton = () => {
  const { isDisabled, isLoading, setFiles } = useMessageFormContext()
  const { createFile } = useCreateFile()

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles = Array.from(files).map((file) => {
      const id = optimisticId()

      createFile({
        file,
      }, {
        onSuccess: ({
          file,
        }: {
          file: OpenAI.Files.FileObject
        }) => {
          setFiles((prev) => ([
            ...prev.filter((prevFile) => prevFile.id !== id),
            file,
          ]))
        },
        onError: () => {
          console.log('error')
        },
      })

      return {
        id,
        filename: file.name,
        object: 'file',
        purpose: 'assistants',
        created_at: dayjs().unix(),
        bytes: file.size,
      }
    })

    // @ts-ignore-next-line
    setFiles((prev) => [
      ...prev,
      ...newFiles,
    ])

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
