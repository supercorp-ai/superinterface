import { createFakeMicrophone } from './fakeMicrophone'
import { createFakeMediaRecorder } from './FakeMediaRecorder'
import { FakeAudioContext } from './FakeAudioContext'
import { createFakeAudioPlayback } from './fakeAudioPlayback'
import { FakeRTCPeerConnection } from './FakeRTCPeerConnection'

// Gives jsdom the browser audio APIs that the audio threads use - microphone
// access and permissions, MediaRecorder, Web Audio, <audio> playback and
// RTCPeerConnection - as small fakes the tests control. Install it before the
// first sound is created (e.g. in beforeAll); call `reset()` between tests.
export const installFakeAudioBrowser = () => {
  const microphone = createFakeMicrophone()
  const MediaRecorder = createFakeMediaRecorder({ microphone })
  const { playback, install: installPlayback } = createFakeAudioPlayback()

  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: microphone.mediaDevices,
  })
  Object.defineProperty(window.navigator, 'permissions', {
    configurable: true,
    value: microphone.permissions,
  })
  Object.assign(globalThis, {
    MediaRecorder,
    AudioContext: FakeAudioContext,
    RTCPeerConnection: FakeRTCPeerConnection,
  })
  installPlayback()

  return {
    microphone,
    playback,
    MediaRecorder,
    AudioContext: FakeAudioContext,
    RTCPeerConnection: FakeRTCPeerConnection,
    reset: () => {
      microphone.reset()
      playback.reset()
      MediaRecorder.instances = []
      FakeAudioContext.instances = []
      FakeAudioContext.decodedDuration = 0.05
      FakeRTCPeerConnection.instances = []
      FakeRTCPeerConnection.remoteVoice.level = 0
    },
  }
}

export type FakeAudioBrowser = ReturnType<typeof installFakeAudioBrowser>
