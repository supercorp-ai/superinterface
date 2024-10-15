import videoExtensions from 'video-extensions'

const isVideo = (src: string) => (
  videoExtensions.includes(src.split('.').pop() || '')
)

const isAudio = (src: string) => (
  src.endsWith('.mp3') || src.endsWith('.wav')
)

export const Img = ({
  src,
}: {
  src: string
}) => {
  if (isVideo(src)) {
    return (
      <video
        src={src}
        controls
        style={{
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />
    )
  } else if (isAudio(src)) {
    return (
      <audio
        src={src}
        controls
      />
    )
  }

  return (
    <img src={src} />
  )
}
