import {
  Flex,
  Card,
  Spinner,
  Text,
  IconButton,
} from '@radix-ui/themes'
import {
  FileIcon,
  Cross2Icon,
} from '@radix-ui/react-icons'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

export const FilesPreview = () => {
  const { isDisabled, isLoading, files, setFiles } = useMessageFormContext()
  console.log({ files })

  if (!files.length) {
    return null
  }

  return (
    <Flex
      direction="column"
      pb="2"
      gap="1"
    >
      {files.map((file) => (
        <Card
          key={file.id}
        >
          <Flex
            align="center"
            justify="between"
            gap="1"
          >
            <Flex
              align="center"
              gap="1"
            >
              {isOptimistic({ id: file.id }) ? (
                <Spinner />
              ) : (
                <FileIcon />
              )}

              <Text
                size="2"
              >
                {file.filename}
              </Text>
            </Flex>

            <IconButton
              onClick={() => (
                setFiles((prev) => (
                  prev.filter((prevFile) => prevFile.id !== file.id)
                ))
              )}
              color="gray"
              variant="ghost"
              size="1"
            >
              <Cross2Icon />
            </IconButton>
          </Flex>
        </Card>
      ))}
    </Flex>
  )
}
