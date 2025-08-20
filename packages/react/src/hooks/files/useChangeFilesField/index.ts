import type OpenAI from 'openai'
import { useCallback } from 'react'
import { omit } from 'radash'
import dayjs from 'dayjs'
import { optimisticId } from '@/lib/optimistic/optimisticId'
import { useToasts } from '@/hooks/toasts/useToasts'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { useCreateFile } from '@/hooks/files/useCreateFile'

const purpose = ({ fileObject }: { fileObject: File }) => {
  if (fileObject.type.startsWith('image/')) {
    return 'vision' as 'vision'
  }

  return 'assistants' as 'assistants'
}

export const useChangeFilesField = () => {
  const { setFiles } = useMessageFormContext()
  const { createFile } = useCreateFile()
  const { addToast } = useToasts()

  const changeFilesField = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileObjects = event.target.files
      if (!fileObjects) return

      const newFiles = Array.from(fileObjects).map((fileObject) => {
        return {
          id: optimisticId(),
          filename: fileObject.name,
          object: 'file' as const,
          purpose: purpose({ fileObject }),
          created_at: dayjs().unix(),
          bytes: fileObject.size,
          status: 'processed' as const,
          fileObject,
        }
      })

      setFiles((prev: OpenAI.Files.FileObject[]) => [
        ...prev,
        ...newFiles.map((file) => omit(file, ['fileObject'])),
      ])

      for await (const newFile of newFiles) {
        await createFile(
          {
            file: newFile.fileObject,
            purpose: newFile.purpose,
          },
          {
            onSuccess: ({ file }: { file: OpenAI.Files.FileObject }) =>
              setFiles((prev) => [
                ...prev.filter((prevFile) => prevFile.id !== newFile.id),
                file,
              ]),
            onError: () => {
              addToast({
                type: 'error',
                message: 'Could not upload file. Please try again.',
              })
              setFiles((prev) =>
                prev.filter((prevFile) => prevFile.id !== newFile.id),
              )
            },
          },
        )
      }
    },
    [addToast, createFile, setFiles],
  )

  return {
    changeFilesField,
  }
}
