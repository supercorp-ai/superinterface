import { Avatar } from '@radix-ui/themes'
import { Size, ImageAvatar as ImageAvatarType, StyleProps } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { optimizedSrc } from './lib/optimizedSrc'

export const ImageAvatar = ({
  imageAvatar,
  size,
  className,
  style,
}: {
  imageAvatar: ImageAvatarType
  size: Size
} & StyleProps) => {
  const superinterfaceContext = useSuperinterfaceContext()

  return (
    <Avatar
      className={className}
      style={style}
      fallback=""
      src={optimizedSrc({ imageAvatar, size, superinterfaceContext })}
      size={size}
    />
  )
}
