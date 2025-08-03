import { AvatarType as AvatarTypeEnum } from '@/enums'
import { Avatar as AvatarType, StyleProps } from '@/types'
import { Avatar as RadixAvatar } from '@radix-ui/themes'
import { ImageAvatar } from '@/components/imageAvatars/ImageAvatar'
import { IconAvatar } from '@/components/iconAvatars/IconAvatar'

export const Avatar = ({
  avatar,
  size = '1',
  className,
  style,
}: {
  avatar: AvatarType
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
} & StyleProps) => {
  if (avatar) {
    if (avatar.type === AvatarTypeEnum.IMAGE && avatar.imageAvatar) {
      return (
        <ImageAvatar
          imageAvatar={avatar.imageAvatar}
          size={size}
          className={className}
          style={style}
        />
      )
    }

    if (avatar.type === AvatarTypeEnum.ICON && avatar.iconAvatar) {
      return (
        <IconAvatar
          iconAvatar={avatar.iconAvatar}
          size={size}
          className={className}
          style={style}
        />
      )
    }
  }

  return (
    <RadixAvatar
      fallback=""
      size={size}
      className={className}
      style={style}
    />
  )
}
