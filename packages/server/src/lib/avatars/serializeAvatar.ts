import { Prisma } from '@prisma/client'
import { serializeImageAvatar } from '@/lib/imageAvatars/serializeImageAvatar'
import { serializeIconAvatar } from '@/lib/iconAvatars/serializeIconAvatar'

export const serializeAvatar = ({
  avatar,
}: {
  avatar: Prisma.AvatarGetPayload<{
    include: {
      imageAvatar: true
      iconAvatar: true
    }
  }>
}) => ({
  type: avatar.type,
  imageAvatar: avatar.imageAvatar
    ? serializeImageAvatar({
        imageAvatar: avatar.imageAvatar,
      })
    : null,
  iconAvatar: avatar.iconAvatar
    ? serializeIconAvatar({
        iconAvatar: avatar.iconAvatar,
      })
    : null,
})
