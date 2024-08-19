import { Size, ImageAvatar } from '@/types'

const width = ({
  size,
}: {
  size: Size
}) => {
  if (size === '1') {
    return 48
  } else if (size === '2') {
    return 64
  } else if (size === '3') {
    return 96
  } else if (size === '4') {
    return 96
  } else if (size === '5') {
    return 128
  } else if (size === '6') {
    return 256
  } else if (size === '7') {
    return 256
  } else if (size === '8') {
    return 256
  } else if (size === '9') {
    return 384
  }

  return 384
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
