import { useEffect, useMemo, useRef, useState } from 'react'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { threadCreated } from '@/hooks/messages/useCreateMessage/lib/mutationOptions/mutationFn/handleResponse/handlers/threadCreated'
import { threadRunRequiresAction } from '@/hooks/messages/useCreateMessage/lib/mutationOptions/mutationFn/handleResponse/handlers/threadRunRequiresAction'
import { variableParams } from '@/lib/threads/queryOptions/variableParams'

export const useRealtimeWebRTCAudioRuntime = () => {
  // =============================
  //    INTERNAL STATE
  // =============================
  const [recorderStatus, setRecorderStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const superinterfaceContext = useSuperinterfaceContext()

  const [userIsPending, setUserIsPending] = useState(false)

  const [assistantPlaying, setAssistantPlaying] = useState(false)
  const [assistantPaused, setAssistantPaused] = useState(false)
  const [assistantIsPending, setAssistantIsPending] = useState(true)
  const [assistantIsReady, setAssistantIsReady] = useState(false)
  const [assistantAudioPlayed, setAssistantAudioPlayed] = useState(false)

  // Keep track if we have already started the session
  const sessionStartedRef = useRef(false)

  // RTC references
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)

  // For analyzing local microphone audio
  const userAnalyserRef = useRef<AnalyserNode | null>(null)
  // For analyzing remote assistant audio
  const assistantAnalyserRef = useRef<AnalyserNode | null>(null)
  // For automatically playing the remote audio
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
    // Avoid multiple inits
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
        // Possibly multiple tracks, but we only expect one for audio
        remoteStreamRef.current = evt.streams[0]
        audioEl.srcObject = evt.streams[0]

        // Update assistant side states
        setAssistantIsPending(false)
        setAssistantPlaying(true)
        setAssistantPaused(false)
        setAssistantAudioPlayed(true)
      }

      // TODO: This is a hack to get the data channel to work
      peerConn.createDataChannel('unused-negotiation-only')

      peerConn.addEventListener('datachannel', (event) => {
        const channel = event.channel

        if (channel.label === 'thread-events') {
          channel.onmessage = ({ data }) => {
            console.log('Data channel message:', data)
            const parsedData = JSON.parse(data)

            if (parsedData.event === 'thread.created') {
              threadCreated({
                value: parsedData,
                superinterfaceContext,
              })
            } else if (parsedData.event === 'thread.run.requires_action') {
              threadRunRequiresAction({
                value: parsedData,
                superinterfaceContext,
              })
            }
          }
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

  // =============================
  //    BUILD ANALYZERS
  // =============================
  function buildAnalyzers(localStream: MediaStream, audioEl: HTMLAudioElement) {
    try {
      // 1. local (user) mic
      const audioCtx1 = new AudioContext()
      const micSource = audioCtx1.createMediaStreamSource(localStream)
      const micAnalyser = audioCtx1.createAnalyser()
      micSource.connect(micAnalyser)
      userAnalyserRef.current = micAnalyser

      // 2. remote (assistant) - wait for "canplay" to ensure audioEl has data
      audioEl.addEventListener('canplay', () => {
        const audioCtx2 = new AudioContext()
        const remoteSource = audioCtx2.createMediaElementSource(audioEl)
        const remoteAnalyser = audioCtx2.createAnalyser()
        remoteSource.connect(remoteAnalyser)
        // Also connect to speaker
        remoteSource.connect(audioCtx2.destination)
        assistantAnalyserRef.current = remoteAnalyser
      })
    } catch (err) {
      console.warn('Could not build analyzers:', err)
    }
  }

  const runtime = useMemo(() => ({
    realtimeWebRTCAudioRuntime: {
      user: {
        start: async () => {
          // 1. If we haven't started the session, do so
          await startSessionIfNeeded()
          // 2. Now mark user as "recording"
          setRecorderStatus('recording')
          // Possibly unmute local track
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true))
          }
        },
        pause: async () => {
          // If not started yet, no need
          if (!sessionStartedRef.current) return
          setRecorderStatus('paused')
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false))
          }
        },
        resume: async () => {
          // If not started yet, no need
          if (!sessionStartedRef.current) return
          setRecorderStatus('recording')
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true))
          }
        },
        stop: async () => {
          // If not started yet, no need
          if (!sessionStartedRef.current) return
          setRecorderStatus('stopped')
          // Possibly close local track
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
          // If not started, do so
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

  return runtime
}
