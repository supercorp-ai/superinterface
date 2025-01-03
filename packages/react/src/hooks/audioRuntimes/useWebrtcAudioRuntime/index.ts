import { useEffect, useMemo, useRef, useState } from 'react'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { threadCreated } from '@/hooks/messages/useCreateMessage/lib/mutationOptions/mutationFn/handleResponse/handlers/threadCreated'
import { threadRunRequiresAction } from '@/hooks/messages/useCreateMessage/lib/mutationOptions/mutationFn/handleResponse/handlers/threadRunRequiresAction'
import { variableParams } from '@/lib/threads/queryOptions/variableParams'

const sentTypes = [
  'session.created',
  'response.done',
  'conversation.item.input_audio_transcription.completed',
]

const handleThreadEvent = ({
  event,
  superinterfaceContext,
}: {
  event: Event
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (event.data.event === 'thread.created') {
    threadCreated({
      value: event.data,
      superinterfaceContext,
    })
  } else if (event.data.event === 'thread.run.requires_action') {
    threadRunRequiresAction({
      value: event.data,
      superinterfaceContext,
    })
  }
}

type Event = {
  type: 'openaiEvent' | 'threadEvent'
  data: any
}

const handleOpenaiEvent = ({
  event,
  openaiEventsDataChannel,
}: {
  event: Event
  openaiEventsDataChannel: RTCDataChannel
}) => {
  openaiEventsDataChannel.send(JSON.stringify(event.data))
}

const handleEvent = ({
  event,
  superinterfaceContext,
  openaiEventsDataChannel,
}: {
  event: Event
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
  openaiEventsDataChannel: RTCDataChannel
}) => {
  if (event.type === 'openaiEvent') {
    return handleOpenaiEvent({
      event,
      openaiEventsDataChannel,
    })
  } else if (event.type === 'threadEvent') {
    return handleThreadEvent({
      event,
      superinterfaceContext,
    })
  }
}

export const useWebrtcAudioRuntime = () => {
  const [recorderStatus, setRecorderStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const superinterfaceContext = useSuperinterfaceContext()

  const [userIsPending, setUserIsPending] = useState(false)

  const [assistantPlaying, setAssistantPlaying] = useState(false)
  const [assistantPaused, setAssistantPaused] = useState(false)
  const [assistantIsPending, setAssistantIsPending] = useState(true)
  const [assistantIsReady, setAssistantIsReady] = useState(false)
  const [assistantAudioPlayed, setAssistantAudioPlayed] = useState(false)

  const sessionStartedRef = useRef(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)

  const userAnalyserRef = useRef<AnalyserNode | null>(null)
  const assistantAnalyserRef = useRef<AnalyserNode | null>(null)
  const assistantAudioElRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
      if (assistantAudioElRef.current) {
        assistantAudioElRef.current.srcObject = null
      }
    }
  }, [])

  async function startSessionIfNeeded() {
    if (sessionStartedRef.current) return
    sessionStartedRef.current = true
    await initRealtimeSession()
  }

  async function initRealtimeSession() {
    try {
      setUserIsPending(true)

      const peerConn = new RTCPeerConnection()
      pcRef.current = peerConn

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      assistantAudioElRef.current = audioEl

      peerConn.ontrack = (evt) => {
        remoteStreamRef.current = evt.streams[0]
        audioEl.srcObject = evt.streams[0]

        setAssistantIsPending(false)
        setAssistantPlaying(true)
        setAssistantPaused(false)
        setAssistantAudioPlayed(true)
      }

      const openaiEventsDataChannel = peerConn.createDataChannel('oai-events')
      openaiEventsDataChannel.addEventListener('message', async (e) => {
        const parsedData = JSON.parse(e.data)

        if (!sentTypes.includes(parsedData.type)) return;

        const searchParams = new URLSearchParams(variableParams({
          variables: superinterfaceContext.variables,
          superinterfaceContext,
        }))

        const eventsResponse = await fetch(`${superinterfaceContext.baseUrl}/audio-runtimes/webrtc/events?${searchParams}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: e.data,
        })

        if (!eventsResponse.body) {
          throw new Error('No body in events response')
        }

        const reader = eventsResponse.body.getReader()

        const decoder = new TextDecoder('utf-8')
        let { value, done } = await reader.read()
        let buffer = ''

        while (!done) {
          // Decode the current chunk and add it to the buffer
          buffer += decoder.decode(value, { stream: true })

          // Split the buffer by newline to get complete JSON objects
          const lines = buffer.split('\n')

          // Keep the last partial line in the buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) {
              try {
                const event = JSON.parse(line)

                handleEvent({
                  event,
                  superinterfaceContext,
                  openaiEventsDataChannel,
                })
              } catch (error) {
                console.error('JSON parse error:', error, 'Line:', line);
              }
            }
          }

          // Read the next chunk
          ({ value, done } = await reader.read())
        }
      })

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = ms
      ms.getTracks().forEach((t) => {
        peerConn.addTrack(t, ms)
      })

      setRecorderStatus('idle')

      const offer = await peerConn.createOffer()
      await peerConn.setLocalDescription(offer)

      const searchParams = new URLSearchParams(variableParams({
        variables: superinterfaceContext.variables,
        superinterfaceContext,
      }))

      const sdpResponse = await fetch(`${superinterfaceContext.baseUrl}/audio-runtimes/webrtc?${searchParams}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Content-Type': 'application/sdp',
        },
      })

      if (!sdpResponse.ok) {
        throw new Error(`Server responded with status ${sdpResponse.status}`)
      }

      const answerSdp = await sdpResponse.text()

      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: answerSdp,
      }
      await peerConn.setRemoteDescription(answer)

      buildAnalyzers(ms, audioEl)

      setUserIsPending(false)
      setAssistantIsPending(false)
      setAssistantIsReady(true)
      setAssistantPlaying(true)
    } catch (err) {
      console.error('Error initRealtimeSession:', err)
      setUserIsPending(false)
      setRecorderStatus('stopped')
      setAssistantPlaying(false)
      setAssistantPaused(false)
      setAssistantIsPending(false)
      setAssistantIsReady(false)
      setAssistantAudioPlayed(false)
    }
  }

  function buildAnalyzers(localStream: MediaStream, audioEl: HTMLAudioElement) {
    try {
      const audioCtx1 = new AudioContext()
      const micSource = audioCtx1.createMediaStreamSource(localStream)
      const micAnalyser = audioCtx1.createAnalyser()
      micSource.connect(micAnalyser)
      userAnalyserRef.current = micAnalyser

      audioEl.addEventListener('canplay', () => {
        const audioCtx2 = new AudioContext()
        const remoteSource = audioCtx2.createMediaElementSource(audioEl)
        const remoteAnalyser = audioCtx2.createAnalyser()
        remoteSource.connect(remoteAnalyser)
        remoteSource.connect(audioCtx2.destination)
        assistantAnalyserRef.current = remoteAnalyser
      })
    } catch (err) {
      console.warn('Could not build analyzers:', err)
    }
  }

  return useMemo(() => ({
    webrtcAudioRuntime: {
      user: {
        start: async () => {
          await startSessionIfNeeded()
          setRecorderStatus('recording')
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true))
          }
        },
        pause: async () => {
          if (!sessionStartedRef.current) return
          setRecorderStatus('paused')
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false))
          }
        },
        resume: async () => {
          if (!sessionStartedRef.current) return
          setRecorderStatus('recording')
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true))
          }
        },
        stop: async () => {
          if (!sessionStartedRef.current) return
          setRecorderStatus('stopped')
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
          }
        },
        isPending: userIsPending,
        visualizationAnalyser: userAnalyserRef.current,
        rawStatus: recorderStatus,
      },
      assistant: {
        play: async () => {
          await startSessionIfNeeded()
          setAssistantPaused(false)
          setAssistantPlaying(true)
          if (assistantAudioElRef.current) {
            assistantAudioElRef.current.play().catch((err) => {
              console.error('Assistant play error:', err)
            })
          }
        },
        pause: async () => {
          if (!sessionStartedRef.current) return
          setAssistantPaused(true)
          setAssistantPlaying(false)
          if (assistantAudioElRef.current) {
            assistantAudioElRef.current.pause()
          }
        },
        stop: async () => {
          if (!sessionStartedRef.current) return
          setAssistantPaused(false)
          setAssistantPlaying(false)
          if (assistantAudioElRef.current) {
            assistantAudioElRef.current.pause()
            assistantAudioElRef.current.currentTime = 0
          }
        },
        visualizationAnalyser: assistantAnalyserRef.current,
        playing: assistantPlaying,
        paused: assistantPaused,
        isPending: assistantIsPending,
        isReady: assistantIsReady,
        isAudioPlayed: assistantAudioPlayed,
        rawStatus: undefined,
      },
    },
  }), [
    recorderStatus,
    userIsPending,
    assistantPlaying,
    assistantPaused,
    assistantIsPending,
    assistantIsReady,
    assistantAudioPlayed,
  ])
}
