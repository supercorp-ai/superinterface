import type { FakeMicrophone } from './fakeMicrophone'

type Handler = ((event: Event) => void) | null

// A MediaRecorder that records whatever the fake microphone `audio` is. Like
// the real one, it fires its events asynchronously and hands over the
// recording as a `dataavailable` chunk right before `stop`.
export const createFakeMediaRecorder = ({
  microphone,
}: {
  microphone: FakeMicrophone
}) =>
  class FakeMediaRecorder {
    static instances: FakeMediaRecorder[] = []

    stream: MediaStream
    mimeType = 'audio/webm;codecs=opus'
    state: RecordingState = 'inactive'
    timeslice: number | undefined
    onstart: Handler = null
    onstop: Handler = null
    onpause: Handler = null
    onresume: Handler = null
    onerror: Handler = null
    ondataavailable: ((event: BlobEvent) => void) | null = null

    constructor(stream: MediaStream) {
      this.stream = stream
      FakeMediaRecorder.instances.push(this)
    }

    private fire(name: 'start' | 'stop' | 'pause' | 'resume') {
      setTimeout(() => this[`on${name}`]?.(new Event(name)), 0)
    }

    start(timeslice?: number) {
      if (this.state !== 'inactive') {
        throw new DOMException('Recorder already started', 'InvalidStateError')
      }

      this.timeslice = timeslice
      this.state = 'recording'
      this.fire('start')
    }

    stop() {
      if (this.state === 'inactive') return

      this.state = 'inactive'
      const data = new Blob([microphone.audio], { type: this.mimeType })
      setTimeout(() => {
        this.ondataavailable?.({ data } as BlobEvent)
        this.onstop?.(new Event('stop'))
      }, 0)
    }

    pause() {
      if (this.state !== 'recording') return

      this.state = 'paused'
      this.fire('pause')
    }

    resume() {
      if (this.state !== 'paused') return

      this.state = 'recording'
      this.fire('resume')
    }
  }
