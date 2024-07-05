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

export const Preview = () => {
  const { files, setFiles } = useMessageFormContext()

  if (!files.length) {
    return null
  }

  return (
    <Flex
      flexBasis="100%"
      direction="column"
      pb="2"
      gap="1"
    >
      {files.map((file) => (
        <Card
          key={file.id}
          variant="ghost"
        >
          <Flex
            align="center"
            justify="between"
            gap="1"
          >
            <Flex
              align="center"
              gap="1"
              flexShrink="1"
              minWidth="0"
              maxWidth="250px"
            >
              <Flex
                flexShrink="0"
              >
                <Spinner
                  loading={isOptimistic({ id: file.id })}
                >
                  <FileIcon />
                </Spinner>
              </Flex>

              <Text
                size="2"
                truncate
                wrap="nowrap"
              >
                {file.filename}
              </Text>
            </Flex>

            <Flex
              flexShrink="0"
            >
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
          </Flex>
        </Card>
      ))}
    </Flex>
  )
}
