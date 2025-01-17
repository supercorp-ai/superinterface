import { SerializedMessage } from '@/types'
import { ContentPart } from './ContentPart'

export const MessageContent = ({
  message,
}: {
  message: SerializedMessage
}) => (
  <>
    {message.content.map((content, index) => (
      <ContentPart
        key={index}
        content={content}
      />
    ))}
  </>
)
