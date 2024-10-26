export const isAudioSrc = ({
  src,
}: {
  src: string
}) => (
  src.endsWith('.mp3') || src.endsWith('.wav')
)
