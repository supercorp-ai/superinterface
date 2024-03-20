import { useMemo, useRef, useState, useEffect } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { AudioEngine } from '@/types'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

type MessageSentence = {
  messageId: string
  sentence: string
}


const SPLIT_SENTENCE_REGEX = /[^\.\?!]+[\.\?!]/g
const FULL_SENTENCE_REGEX = /^\s*[A-Z].*[.?!]$/

const getMessageSentences = ({
  messageId,
  input,
}: {
  messageId: string
  input: string
}) => {
  const sentences = input.match(SPLIT_SENTENCE_REGEX) || []

  return sentences.map((sentence) => ({
    messageId,
    sentence,
  }))
}

export const useMessageAudio = ({
  onEnd,
}: {
  onEnd: () => void
}) => {
  const { audioStreamEvents, setAudioStreamEvents } = useAudioThreadContext()

  const [playedMessageSentences, setPlayedMessageSentences] = useState<MessageSentence[]>([])
  const audioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFirstMessageDone, setIsFirstMessageDone] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    console.log({ isStreaming, isPlaying: audioPlayer.playing, first: audioStreamEvents[0] })
    if (isStreaming) return
    if (audioPlayer.playing) return
    const firstAudioStreamEvent = audioStreamEvents[0]

    console.log('firstAudioStreamEvent', firstAudioStreamEvent)
    if (!firstAudioStreamEvent) return
    setIsStreaming(true)

    // @ts-ignore-next-line

    // const binaryChunk = Uint8Array.from(atob(firstAudioStreamEvent.data), c => c.charCodeAt(0))
    // const audioBlob = new Blob([new Uint8Array(binaryChunk)], { type: 'audio/mp3' })
    // const audioUrl = URL.createObjectURL(audioBlob)

    const sound = new Howl({
      src: [`data:audio/mp3;base64,${firstAudioStreamEvent.data}`],
      onend: () => {
        console.log('ended')
        setAudioStreamEvents((prev) => prev.slice(1))
        setIsStreaming(false)
      },
    })

    sound.play()

    console.log('playing')
  }, [isStreaming, audioStreamEvents, setAudioStreamEvents])

  //
  const latestMessageProps = useLatestMessage()

  useEffect(() => {
    if (isFirstMessageDone) return
    if (isPlaying) return
    if (audioPlayer.playing) return
    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'assistant') return

    const input = getInput({
      message: latestMessageProps.latestMessage,
    })

    if (!input) return

    const messageSentences = getMessageSentences({
      messageId: latestMessageProps.latestMessage.id,
      input,
    })

    const unplayedMessageSentences = messageSentences.filter((ms) => (
      !playedMessageSentences.find((pms) => pms.messageId === ms.messageId && pms.sentence === ms.sentence)
    ))

    const firstUnplayedMessageSentence = unplayedMessageSentences[0]
    if (!firstUnplayedMessageSentence) {
      return
    }

    const isFullSentence = FULL_SENTENCE_REGEX.test(firstUnplayedMessageSentence.sentence)

    if (!isFullSentence) return
    setIsPlaying(true)

    setPlayedMessageSentences((prev) => [...prev, firstUnplayedMessageSentence])

    const searchParams = new URLSearchParams({
      input: firstUnplayedMessageSentence.sentence,
      ...(isHtmlAudioSupported && superinterfaceContext.publicApiKey ? {
        publicApiKey: superinterfaceContext.publicApiKey,
      } : {})
    })

    audioPlayer.load(`${superinterfaceContext.baseUrl}/tts?${searchParams}`, {
      format: 'mp3',
      autoplay: true,
      html5: isHtmlAudioSupported,
      onend: () => {
        setIsPlaying(false)

        if (unplayedMessageSentences.length === 1 && latestMessageProps.latestMessage.status !== 'in_progress') {
          setIsFirstMessageDone(true)
          onEnd()
        }
      },
      ...(isHtmlAudioSupported ? {} : {
        xhr: {
          ...(superinterfaceContext.publicApiKey ? {
            headers: {
              Authorization: `Bearer ${superinterfaceContext.publicApiKey}`,
            },
          } : {}),
          withCredentials: true,
        },
      }),
    })
  }, [
    isFirstMessageDone,
    isPlaying,
    superinterfaceContext,
    latestMessageProps,
    audioPlayer,
    playedMessageSentences,
    onEnd,
  ])

  const isInited = useRef(false)
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null)

  useEffect(() => {
    if (!audioPlayer.playing) return
    if (isInited.current) return
    isInited.current = true

    if (isHtmlAudioSupported) {
      const audioContext = new AudioContext()
      Howler._howls[0]._sounds[0]._node.crossOrigin = "anonymous"
      setAudioEngine({
        // @ts-ignore-next-line
        source: audioContext.createMediaElementSource(Howler._howls[0]._sounds[0]._node),
        audioContext,
      })
    } else {
      setAudioEngine({
        source: Howler.masterGain,
        audioContext: Howler.ctx,
      })
    }
  }, [audioPlayer, isInited])

  const visualizationAnalyser = useMemo(() => {
    if (!audioEngine) return null

    const result = audioEngine.audioContext.createAnalyser()

    audioEngine.source.connect(audioEngine.audioContext.destination)
    audioEngine.source.connect(result)
    return result
  }, [audioEngine])

  return {
    ...audioPlayer,
    visualizationAnalyser,
  }
}
    // const binaryChunk = Uint8Array.from(atob(value.value.data), c => c.charCodeAt(0))
    // // const audioBlob = new Blob([new Uint8Array(binaryChunk)], { type: 'audio/mp3' })
    // // const audioUrl = URL.createObjectURL(audioBlob)
    // // const audio = new Audio(audioUrl);
    // // audio.play()
    // //   .catch(e => console.error('Error playing audio:', e));
    // // console.log('played')
    // binaryData = binaryData.concat(Array.from(binaryChunk))
    // return
    // const audioBlob = new Blob([new Uint8Array(binaryData)], { type: 'audio/mp3' })
    // const audioUrl = URL.createObjectURL(audioBlob)
    // const audio = new Audio(audioUrl);
    // audio.play()
    //   .catch(e => console.error('Error playing audio:', e));
    // console.log('played')
    //  binaryData = [];
    // return
