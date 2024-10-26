import {
  useState,
  useEffect,
  useMemo,
} from 'react'
import {
  useMediaState,
  useMediaRemote,
} from '@vidstack/react'
import {
  Slider,
} from '@radix-ui/themes'

export const Time = () => {
  const time = useMediaState('currentTime')
  const duration = useMediaState('duration')
  const seeking = useMediaState('seeking')
  const canSeek = useMediaState('canSeek')
  const remote = useMediaRemote()

  const [value, setValue] = useState(0)

  useEffect(() => {
    if (seeking) return;
    setValue((time / duration) * 100);
  }, [time, duration, seeking])

  const step = useMemo(() => (
    (1 / duration) * 100
  ), [duration])

  return (
    <Slider
      size="1"
      variant="soft"
      value={[value]}
      disabled={!canSeek}
      step={Number.isFinite(step) ? step : 1}
      onValueChange={([value]) => {
        setValue(value)
        remote.seeking((value / 100) * duration)
      }}
      onValueCommit={([value]) => {
        remote.seek((value / 100) * duration)
      }}
    />
  )
}
