// A stand-in for the user's microphone behind navigator.mediaDevices and
// navigator.permissions. Tests decide whether access is granted and how loud
// the user is (`level`, 0-255, which analysers read as frequency data), and
// what the microphone records (`audio`, the bytes MediaRecorder hands back).
// A background `hum` (in dB, or null for none) is heard only by analysers
// whose minDecibels is below it.

export class FakeMediaStreamTrack extends EventTarget {
  kind = 'audio'
  enabled = true
  readyState: 'live' | 'ended' = 'live'

  stop() {
    this.readyState = 'ended'
  }
}

export class FakeMediaStream {
  id = crypto.randomUUID()
  private tracks: FakeMediaStreamTrack[]
  private source: { level: number; hum?: number | null }

  constructor({ source }: { source: { level: number; hum?: number | null } }) {
    this.source = source
    this.tracks = [new FakeMediaStreamTrack()]
  }

  // What an analyser fed by this stream hears: nothing once every track is
  // disabled or stopped.
  get level() {
    return this.isAudible() ? this.source.level : 0
  }

  // The background hum it carries, in dB (null for none).
  get hum() {
    return this.isAudible() ? (this.source.hum ?? null) : null
  }

  private isAudible() {
    return this.tracks.some(
      (track) => track.enabled && track.readyState === 'live',
    )
  }

  getTracks() {
    return this.tracks
  }

  getAudioTracks() {
    return this.tracks
  }
}

class FakePermissionStatus extends EventTarget {
  name: string
  state: PermissionState

  constructor({ name, state }: { name: string; state: PermissionState }) {
    super()
    this.name = name
    this.state = state
  }

  change({ state }: { state: PermissionState }) {
    if (this.state === state) return
    this.state = state
    this.dispatchEvent(new Event('change'))
  }
}

export const createFakeMicrophone = () => {
  const permissionStatus = new FakePermissionStatus({
    name: 'microphone',
    state: 'prompt',
  })

  const microphone = {
    // Whether the user allows microphone access when asked.
    allow: true,
    // Off, the Permissions API does not know 'microphone' (as in Firefox).
    canQueryPermission: true,
    permissionQueries: 0,
    level: 0,
    hum: null as number | null,
    audio: 'fake-webm-audio',
    permissionStatus,
    streams: [] as FakeMediaStream[],
    getUserMediaCalls: [] as MediaStreamConstraints[],

    reset() {
      microphone.allow = true
      microphone.canQueryPermission = true
      microphone.permissionQueries = 0
      microphone.level = 0
      microphone.hum = null
      microphone.audio = 'fake-webm-audio'
      microphone.streams = []
      microphone.getUserMediaCalls = []
      permissionStatus.state = 'prompt'
    },

    speak() {
      microphone.level = 128
    },

    silence() {
      microphone.level = 0
    },

    mediaDevices: {
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        microphone.getUserMediaCalls.push(constraints)

        if (!microphone.allow) {
          permissionStatus.change({ state: 'denied' })
          throw new DOMException('Permission denied', 'NotAllowedError')
        }

        permissionStatus.change({ state: 'granted' })
        const stream = new FakeMediaStream({ source: microphone })
        microphone.streams.push(stream)
        return stream
      },
    },

    permissions: {
      query: async ({ name }: { name: string }) => {
        microphone.permissionQueries += 1

        if (name !== 'microphone' || !microphone.canQueryPermission) {
          throw new TypeError(
            `'${name}' (value of 'name' member of PermissionDescriptor) is not a valid value for enumeration PermissionName.`,
          )
        }

        return permissionStatus
      },
    },
  }

  return microphone
}

export type FakeMicrophone = ReturnType<typeof createFakeMicrophone>
