import { useMemo } from 'react'
import { IconAvatar as IconAvatarType } from '@/types'
import { Avatar } from '@radix-ui/themes'
import { iconAvatarComponents } from '@/lib/iconAvatars/iconAvatarComponents'

export const IconAvatar = ({
  iconAvatar,
  size,
}: {
  iconAvatar: IconAvatarType
  size: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
}) => {
  const Component = useMemo(() => (
    iconAvatarComponents[iconAvatar.name]
  ), [iconAvatar])

  return (
    <Avatar
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
