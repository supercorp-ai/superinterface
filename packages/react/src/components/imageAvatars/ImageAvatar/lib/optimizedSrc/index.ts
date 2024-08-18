import { Size, ImageAvatar } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { path } from './path'
import { host } from './host'

export const optimizedSrc = ({
  imageAvatar,
  size,
  superinterfaceContext,
}: {
  imageAvatar: ImageAvatar
  size: Size
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (!imageAvatar.url) return ''
  if (imageAvatar.url.endsWith('.svg')) return imageAvatar.url

  return `${host({ superinterfaceContext })}${path({ imageAvatar, size })}`
}
