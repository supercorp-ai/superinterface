import dayjs, { Dayjs } from 'dayjs'
import { useAudioCapture, UseAudioCaptureProps } from 'use-audio-capture'
import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useAudioPlayer } from 'react-use-audio-player'
import { useInterval } from '@/hooks/misc/useInterval'
import { AudioEngine } from '@/types'

type Args = UseAudioCaptureProps & {
  isStopOnSilence: boolean
}

export const useRecorder = ({
  isStopOnSilence,
  onStart,
  onStop,
}: Args) => {
  const [silenceStart, setSilenceStart] = useState<Dayjs | null>(null)
  const [noiseStart, setNoiseStart] = useState<Dayjs | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopped' | 'paused'>('idle')
  const startAudioPlayer = useAudioPlayer()
  const endAudioPlayer = useAudioPlayer()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    setIsLoaded(true)

    // startAudioPlayer.load('/sounds/warning.wav', {
    //   html5: true,
    // })
    // endAudioPlayer.load('/sounds/success.wav', {
    //   html5: true,
    // })
  }, [isLoaded, startAudioPlayer, endAudioPlayer])

  const audioCaptureProps = useAudioCapture({
    onStart: (event, opts) => {
      // startAudioPlayer.play()
      setStatus('recording')
      setMediaStream(opts.mediaStream)
      isInited.current = false
      if (onStart) onStart(event, opts)

      setSilenceStart(null)
      setNoiseStart(null)
    },
    onStop: async (...args) => {
      // endAudioPlayer.play()
      setStatus('stopped')
      if (onStop) await onStop(...args)
      setSilenceStart(null)
      setNoiseStart(null)
    },
    onPause: () => {
      setStatus('paused')

      setSilenceStart(null)
      setNoiseStart(null)
    },
    onResume: () => {
      setStatus('recording')

      setSilenceStart(null)
      setNoiseStart(null)
    },
  })

  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null)

  const isInited = useRef(false)

  useEffect(() => {
    if (!mediaStream) return
    if (isInited.current) return
    isInited.current = true

    const audioContext = new AudioContext()

    setAudioEngine({
      source: audioContext.createMediaStreamSource(mediaStream),
      audioContext,
    })
  }, [isInited, mediaStream])

  const visualizationAnalyser = useMemo(() => {
    if (!audioEngine) return null

    const result = audioEngine.audioContext.createAnalyser()

    audioEngine.source.connect(result)
    return result
  }, [audioEngine])

  const silenceAnalyser = useMemo(() => {
    if (!audioEngine) return null

    const result = audioEngine.audioContext.createAnalyser()
    result.minDecibels = -60

    audioEngine.source.connect(result)
    return result
  }, [audioEngine])

  const handleSilence = useCallback(() => {
    if (!silenceAnalyser) return

    const frequencyData = new Uint8Array(silenceAnalyser.frequencyBinCount)
    silenceAnalyser.getByteFrequencyData(frequencyData)

    const isSilent = frequencyData.every((f) => f === 0)

    setSilenceStart((silenceStart: Dayjs | null) => {
      if (isSilent) return silenceStart || dayjs()

      return null
    })

    setNoiseStart((noiseStart: Dayjs | null) => {
      if (isSilent) return noiseStart

      return noiseStart || dayjs()
    })

    requestAnimationFrame(() => handleSilence())
  }, [silenceAnalyser, setNoiseStart, setSilenceStart])

  useEffect(() => {
    if (!isStopOnSilence) return

    requestAnimationFrame(() => handleSilence())
  }, [handleSilence, isStopOnSilence])

  useInterval(() => {
    if (!isStopOnSilence) return
    if (status !== 'recording') return
    if (!silenceStart) return
    if (!noiseStart) return
    if (!silenceStart.isBefore(dayjs().subtract(1.5, 'second'))) return

    audioCaptureProps.stop()
  }, 300)

  return {
    ...audioCaptureProps,
    status,
    visualizationAnalyser,
  }
}
