'use client'

import type OpenAI from 'openai'
import { useCallback } from 'react'
import { omit } from 'radash'
import dayjs from 'dayjs'
import { optimisticId } from '@/lib/optimistic/optimisticId'
import {
  FilePlusIcon,
} from '@radix-ui/react-icons'
import {
  IconButton,
  Flex,
} from '@radix-ui/themes'
import { useToasts } from '@/hooks/toasts/useToasts'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { useCreateFile } from '@/hooks/files/useCreateFile'

const accept = `.c,text/x-c,
.cs,text/x-csharp,
.cpp,text/x-c++,
.doc,application/msword,
.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,
.html,text/html,
.java,text/x-java,
.json,application/json,
.md,text/markdown,
.pdf,application/pdf,
.php,text/x-php,
.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,
.py,text/x-python,
.py,text/x-script.python,
.rb,text/x-ruby,
.tex,text/x-tex,
.txt,text/plain,
.css,text/css,
.js,text/javascript,
.sh,application/x-sh,
.ts,application/typescript`

export const Control = () => {
  const { isDisabled, isLoading, setFiles } = useMessageFormContext()
  const { createFile } = useCreateFile()
  const { addToast } = useToasts()

  const onChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObjects = event.target.files
    if (!fileObjects) return

    const newFiles = Array.from(fileObjects).map((fileObject) => ({
      id: optimisticId(),
      filename: fileObject.name,
      object: 'file' as 'file',
      purpose: 'assistants' as 'assistants',
      created_at: dayjs().unix(),
      bytes: fileObject.size,
      status: 'processed' as 'processed',
      fileObject,
    }))

    setFiles((prev: OpenAI.Files.FileObject[]) => [
      ...prev,
      ...newFiles.map((file) => omit(file, ['fileObject'])),
    ])

    for await (const newFile of newFiles) {
      await createFile({
        file: newFile.fileObject,
      },
      {
        onSuccess: ({
          file,
        }: {
          file: OpenAI.Files.FileObject
        }) => (
          setFiles((prev) => ([
            ...prev.filter((prevFile) => prevFile.id !== newFile.id),
            file,
          ]))
        ),
        onError: () => {
          addToast({ type: 'error', message: 'Could not upload file. Please try again.' })
          setFiles((prev) => (
            prev.filter((prevFile) => prevFile.id !== newFile.id)
          ))
        },
      })
    }
  }, [addToast, createFile, setFiles])

  return (
    <Flex
      pt="2"
      pr="2"
      flexGrow="0"
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
          accept={accept}
          onChange={onChange}
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
