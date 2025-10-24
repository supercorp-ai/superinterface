import { ImageAvatar } from '@prisma/client'

export const serializeImageAvatar = ({
  imageAvatar,
}: {
  imageAvatar: ImageAvatar
}) => ({
  url: imageAvatar.url,
})
