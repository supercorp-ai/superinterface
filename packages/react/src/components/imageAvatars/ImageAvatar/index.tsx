import { Avatar } from '@radix-ui/themes'
import { Size, ImageAvatar as ImageAvatarType } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { optimizedSrc } from './lib/optimizedSrc'

export const ImageAvatar = ({
  imageAvatar,
  size,
}: {
  imageAvatar: ImageAvatarType
  size: Size
}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  return (
    <Avatar
      fallback=""
      src={optimizedSrc({ imageAvatar, size, superinterfaceContext })}
      size={size}
    />
  )
}
