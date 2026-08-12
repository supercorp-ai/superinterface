import { Image } from '@/components/images/Image'
import { isVideoSrc } from './lib/isVideoSrc'
import { isAudioSrc } from './lib/isAudioSrc'
import { Video } from './Video'
import { Audio } from './Audio'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

type ImgProps = JSX.IntrinsicElements['img'] & {
  'data-file-annotation'?: string
}

type FilePathAnnotation = {
  file_path: { file_id: string; container_id?: string }
}

export const Img = (props: ImgProps) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const serializedAnnotation = props['data-file-annotation']

  let src = props.src
  if (serializedAnnotation) {
    try {
      const annotation = JSON.parse(serializedAnnotation) as FilePathAnnotation
      const searchParams = new URLSearchParams(superinterfaceContext.variables)
      if (annotation.file_path.container_id) {
        searchParams.set('containerId', annotation.file_path.container_id)
      }
      src = `${superinterfaceContext.baseUrl}/files/${annotation.file_path.file_id}/contents?${searchParams}`
    } catch {}
  }

  if (!src) {
    return (
      <Image
        {...props}
      />
    )
  } else if (isVideoSrc({ src: props.src ?? src })) {
    return (
      <Video
        src={src}
      />
    )
  } else if (isAudioSrc({ src: props.src ?? src })) {
    return (
      <Audio
        src={src}
      />
    )
  } else {
    return (
      <Image
        {...props}
        data-file-annotation={undefined}
        src={src}
      />
    )
  }
}
