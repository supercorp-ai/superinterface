import { Avatar } from '@radix-ui/themes'
import { ImageAvatar as ImageAvatarType } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

type Size = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

const width = ({
  size,
}: {
  size: Size
}) => {
  if (size === '1') {
    return 48
  } else if (size === '3') {
    return 96
  }

  return 96
}

const optimizedSrc = ({
  imageAvatar,
  size,
  superinterfaceContext,
}: {
  imageAvatar: ImageAvatarType
  size: Size
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (!imageAvatar.url) return ''
  if (imageAvatar.url.endsWith('.svg')) return imageAvatar.url

  if (!superinterfaceContext.baseUrl) return imageAvatar.url

  const baseUrl = new URL(superinterfaceContext.baseUrl)

  return new URL(
    `/_next/image?url=${encodeURIComponent(imageAvatar.url)}&w=${width({ size })}&q=95`,
    `${baseUrl.origin}`,
  ).toString()
}

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
