import {
  Flex,
  Card,
  Inset,
} from '@radix-ui/themes'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const Content = ({
  fileId,
}: {
  fileId: string
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const nextSearchParams = new URLSearchParams(superinterfaceContext.variables)

  return (
    <Flex
      direction="column"
      flexGrow="1"
      gap="3"
    >
      <Card
        style={{
          display: 'flex',
          flexGrow: '1',
        }}
      >
        <Inset
          clip="padding-box"
          style={{
            display: 'flex',
            flexGrow: '1',
          }}
        >
          <Flex
            flexGrow="1"
          >
            <embed
              src={`${superinterfaceContext.baseUrl}/files/${fileId}/contents?${nextSearchParams}`}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </Flex>
        </Inset>
      </Card>
    </Flex>
  )
}
