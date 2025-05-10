import { SerializedMessage } from '@/types'
import { useComponents } from '@/hooks/components/useComponents'

export const Attachments = ({
  message,
}: {
  message: SerializedMessage
}) => {
  const {
    components: {
      MessageAttachments,
    },
  } = useComponents()

  return (
    <MessageAttachments
      message={message}
    />
  )
}
