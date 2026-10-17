import { FakeMediaStream } from './fakeMicrophone'

// The far end of a data channel (OpenAI Realtime): tests `receive` events
// from it and read what the browser `sent`.
export class FakeRTCDataChannel extends EventTarget {
  label: string
  readyState: RTCDataChannelState = 'open'
  sent: string[] = []

  constructor({ label }: { label: string }) {
    super()
    this.label = label
  }

  send(data: string) {
    this.sent.push(data)
  }

  receive(data: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(data) }),
    )
  }

  close() {
    this.readyState = 'closed'
  }
}

// A peer connection to a remote that answers with audio: once the answer is
// applied, an `m=audio` section delivers the remote track (the assistant's
// voice, as loud as `remoteVoice.level`) through `ontrack`, as browsers do
// before setRemoteDescription resolves.
export class FakeRTCPeerConnection {
  static instances: FakeRTCPeerConnection[] = []
  static remoteVoice = { level: 0 }

  configuration: RTCConfiguration
  dataChannels: FakeRTCDataChannel[] = []
  senders: { track: MediaStreamTrack; stream: MediaStream }[] = []
  localDescription: RTCSessionDescriptionInit | null = null
  remoteDescription: RTCSessionDescriptionInit | null = null
  remoteStream: FakeMediaStream | null = null
  connectionState: RTCPeerConnectionState = 'new'
  ontrack: ((event: RTCTrackEvent) => void) | null = null

  constructor(configuration: RTCConfiguration) {
    this.configuration = configuration
    FakeRTCPeerConnection.instances.push(this)
  }

  createDataChannel(label: string) {
    const dataChannel = new FakeRTCDataChannel({ label })
    this.dataChannels.push(dataChannel)
    return dataChannel
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    this.senders.push({ track, stream })
  }

  async createOffer() {
    return {
      type: 'offer' as RTCSdpType,
      sdp: `v=0\r\no=- ${this.senders.length} 2 IN IP4 127.0.0.1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n`,
    }
  }

  async setLocalDescription(description: RTCSessionDescriptionInit) {
    this.localDescription = description
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    this.remoteDescription = description
    this.connectionState = 'connected'

    if (!description.sdp?.includes('m=audio')) return

    this.remoteStream = new FakeMediaStream({
      source: FakeRTCPeerConnection.remoteVoice,
    })
    this.ontrack?.({
      track: this.remoteStream.getTracks()[0],
      streams: [this.remoteStream],
    } as unknown as RTCTrackEvent)
  }

  close() {
    this.connectionState = 'closed'
    this.dataChannels.forEach((dataChannel) => dataChannel.close())
  }
}
