import Link from 'next/link'
import { Flex, Text, Card } from '@radix-ui/themes'
import { assistants } from '@/lib/assistants'

const Item = ({
  assistant,
}: {
  assistant: {
    id: string
    name: string
  }
}) => (
  <Card
    asChild
    mx="2"
  >
    <Link
      href={`/assistants/${assistant.id}`}
      scroll={false}
    >
      <Flex
        direction="column"
        justify="center"
      >
        <Text
          size="2"
          highContrast
          color="mint"
        >
          {assistant.name}
        </Text>
      </Flex>
    </Link>
  </Card>
)

export const Menu = () => (
  <Flex
    direction="column"
    py="4"
    gap="4"
    flexShrink="0"
    width="320px"
    height="100vh"
    style={{
      borderRight: '1px solid var(--mint-5)',
      backgroundColor: 'var(--mint-2)',
    }}
  >
    {assistants.map((assistant) => (
      <Item
        key={assistant.id}
        assistant={assistant}
      />
    ))}
  </Flex>
)
