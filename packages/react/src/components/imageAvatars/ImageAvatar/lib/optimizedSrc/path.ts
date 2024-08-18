import { Size, ImageAvatar } from '@/types'

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

export const path = ({
  imageAvatar,
  size,
}: {
  imageAvatar: ImageAvatar
  size: Size
}) => (
  `/_next/image?url=${encodeURIComponent(imageAvatar.url)}&w=${width({ size })}&q=95`
)
