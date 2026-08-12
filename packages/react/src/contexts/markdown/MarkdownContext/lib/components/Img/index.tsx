import { Image } from '@/components/images/Image'
import { isVideoSrc } from './lib/isVideoSrc'
import { isAudioSrc } from './lib/isAudioSrc'
import { Video } from './Video'
import { Audio } from './Audio'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import {
  fileContentUrl,
  fileReferenceFromAnnotation,
} from '@/lib/files/fileContentUrl'

type ImgProps = JSX.IntrinsicElements['img'] & {
  'data-file-annotation'?: string
}

export const Img = (props: ImgProps) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { 'data-file-annotation': serializedAnnotation, ...imageProps } = props

  let reference = null
  if (serializedAnnotation) {
    try {
      reference = fileReferenceFromAnnotation(JSON.parse(serializedAnnotation))
    } catch {}
  }

  const src = reference
    ? fileContentUrl({
        baseUrl: superinterfaceContext.baseUrl,
        variables: superinterfaceContext.variables,
        reference,
      })
    : imageProps.src

  if (!src) {
    return <Image {...imageProps} />
  } else if (isVideoSrc({ src: imageProps.src ?? src })) {
    return <Video src={src} />
  } else if (isAudioSrc({ src: imageProps.src ?? src })) {
    return <Audio src={src} />
  } else {
    return (
      <Image
        {...imageProps}
        src={src}
      />
    )
  }
}
