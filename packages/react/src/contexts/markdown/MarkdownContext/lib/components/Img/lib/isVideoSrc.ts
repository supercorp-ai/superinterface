import videoExtensions from 'video-extensions'

export const isVideoSrc = ({
  src,
}: {
  src: string
}) => (
  videoExtensions.includes(src.split('.').pop() || '')
)
