import { AvatarType as AvatarTypeEnum } from '@/lib/enums'
import { Avatar as AvatarType } from '@/types'
import { Avatar as RadixAvatar } from '@radix-ui/themes'
import { ImageAvatar } from '@/components/imageAvatars/ImageAvatar'
import { IconAvatar } from '@/components/iconAvatars/IconAvatar'

export const Avatar = ({
  avatar,
  size = '1',
}: {
  avatar: AvatarType
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
}) => {
  if (avatar) {
    if (avatar.type === AvatarTypeEnum.IMAGE && avatar.imageAvatar) {
      return (
        <ImageAvatar
          imageAvatar={avatar.imageAvatar}
          size={size}
        />
      )
    }

    if (avatar.type === AvatarTypeEnum.ICON && avatar.iconAvatar) {
      return (
        <IconAvatar
          iconAvatar={avatar.iconAvatar}
          size={size}
        />
      )
    }
  }

  return (
    <RadixAvatar
      fallback=""
      size={size}
    />
  )
}
