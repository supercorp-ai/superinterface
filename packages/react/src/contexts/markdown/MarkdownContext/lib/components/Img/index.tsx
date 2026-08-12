import { Image } from '@/components/images/Image'
import { isVideoSrc } from './lib/isVideoSrc'
import { isAudioSrc } from './lib/isAudioSrc'
import { Video } from './Video'
import { Audio } from './Audio'

export const Img = (props: JSX.IntrinsicElements['img']) => {
  if (!props.src) {
    return (
      <Image
        {...props}
      />
    )
  } else if (isVideoSrc({ src: props.src })) {
    return (
      <Video
        src={props.src!}
      />
    )
  } else if (isAudioSrc({ src: props.src })) {
    return (
      <Audio
        src={props.src!}
      />
    )
  } else {
    return (
      <Image
        {...props}
      />
    )
  }
}
