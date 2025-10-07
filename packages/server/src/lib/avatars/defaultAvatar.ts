import { Prisma } from '@prisma/client'
import { AvatarType, IconAvatarName } from '@prisma/client'

export const defaultAvatar = {
  type: AvatarType.ICON,
  iconAvatar: {
    name: IconAvatarName.LIGHTNING_BOLT,
  },
  imageAvatar: null,
} as Prisma.AvatarGetPayload<{
  include: {
    imageAvatar: true
    iconAvatar: true
  }
}>
