import { IconAvatar } from '@prisma/client'

export const serializeIconAvatar = ({
  iconAvatar,
}: {
  iconAvatar: IconAvatar
}) => ({
  name: iconAvatar.name,
})
