import { useMemo } from 'react'
import { IconAvatar as IconAvatarType, StyleProps } from '@/types'
import { Avatar } from '@radix-ui/themes'
import { iconAvatarComponents } from '@/lib/iconAvatars/iconAvatarComponents'

export const IconAvatar = ({
  iconAvatar,
  size,
  className,
  style,
}: {
  iconAvatar: IconAvatarType
  size: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
} & StyleProps) => {
  const Component = useMemo(() => (
    iconAvatarComponents[iconAvatar.name]
  ), [iconAvatar])

  return (
    <Avatar
      className={className}
      style={style}
      size={size}
      fallback={(
        Component ? (
          <Component />
        ) : (
          ''
        )
      )}
    />
  )
}
