import { FakeMediaStream } from './fakeMicrophone'

// The loudness analysers report for an <audio> element while it plays.
export const PLAYBACK_LEVEL = 200

class FakeAudioParam {
  value: number

  constructor({ value }: { value: number }) {
    this.value = value
  }

  setValueAtTime(value: number) {
    this.value = value
    return this
  }
}

class FakeAudioNode {
  context: FakeAudioContext
  inputs: FakeAudioNode[] = []
  outputs: FakeAudioNode[] = []

  constructor({ context }: { context: FakeAudioContext }) {
    this.context = context
  }

  connect(destination: FakeAudioNode) {
    this.outputs.push(destination)
    destination.inputs.push(this)
    return destination
  }

  disconnect() {
    this.outputs.forEach((output) => {
      output.inputs = output.inputs.filter((input) => input !== this)
    })
    this.outputs = []
  }

  level(): number {
    return Math.max(0, ...this.inputs.map((input) => input.level()))
  }

  // The loudest background hum reaching this node, in dB (null for none).
  hum(): number | null {
    const hums = this.inputs
      .map((input) => input.hum())
      .filter((hum): hum is number => hum !== null)
    return hums.length ? Math.max(...hums) : null
  }
}

class FakeMediaStreamAudioSourceNode extends FakeAudioNode {
  mediaStream: FakeMediaStream

  constructor({
    context,
    mediaStream,
  }: {
    context: FakeAudioContext
    mediaStream: FakeMediaStream
  }) {
    super({ context })
    this.mediaStream = mediaStream
  }

  level() {
    return this.mediaStream.level
  }

  hum() {
    return this.mediaStream.hum
  }
}

class FakeMediaElementAudioSourceNode extends FakeAudioNode {
  mediaElement: HTMLMediaElement

  constructor({
    context,
    mediaElement,
  }: {
    context: FakeAudioContext
    mediaElement: HTMLMediaElement
  }) {
    super({ context })
    this.mediaElement = mediaElement
  }

  level() {
    return this.mediaElement.paused ? 0 : PLAYBACK_LEVEL
  }
}

class FakeAnalyserNode extends FakeAudioNode {
  fftSize = 2048
  frequencyBinCount = 1024
  minDecibels = -100
  maxDecibels = -30
  smoothingTimeConstant = 0.8

  // A hum is scaled into this analyser's decibel range, as browsers do, and
  // is not heard at all below its minDecibels.
  humLevel() {
    const hum = this.hum()
    if (hum === null || hum < this.minDecibels) return 0

    return Math.round(
      ((Math.min(hum, this.maxDecibels) - this.minDecibels) /
        (this.maxDecibels - this.minDecibels)) *
        255,
    )
  }

  getByteFrequencyData(array: Uint8Array) {
    array.fill(Math.max(this.level(), this.humLevel()))
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam({ value: 1 })
}

class FakeAudioBuffer {
  duration: number
  sampleRate = 44100
  numberOfChannels = 1

  constructor({ duration }: { duration: number }) {
    this.duration = duration
  }

  get length() {
    return Math.ceil(this.duration * this.sampleRate)
  }
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null
  loop = false
  loopStart = 0
  loopEnd = 0
  playbackRate = new FakeAudioParam({ value: 1 })
  onended: (() => void) | null = null
  private endTimer: ReturnType<typeof setTimeout> | null = null

  start() {
    const duration = this.buffer?.duration ?? 0
    this.endTimer = setTimeout(() => this.onended?.(), duration * 1000)
  }

  stop() {
    if (this.endTimer) clearTimeout(this.endTimer)
    setTimeout(() => this.onended?.(), 0)
  }
}

// Just enough of the Web Audio API for the recorder, the visualizers and
// howler: sources from microphone streams and <audio> elements feed
// analysers, and decoded audio lasts `decodedDuration` seconds.
export class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static decodedDuration = 0.05

  state: AudioContextState = 'running'
  sampleRate = 44100
  currentTime = 0
  destination: FakeAudioNode
  onstatechange: (() => void) | null = null

  constructor() {
    this.destination = new FakeAudioNode({ context: this })
    FakeAudioContext.instances.push(this)
  }

  createAnalyser() {
    return new FakeAnalyserNode({ context: this })
  }

  createGain() {
    return new FakeGainNode({ context: this })
  }

  createBuffer(_channels: number, length: number, sampleRate: number) {
    return new FakeAudioBuffer({ duration: length / sampleRate })
  }

  createBufferSource() {
    return new FakeAudioBufferSourceNode({ context: this })
  }

  createMediaStreamSource(mediaStream: MediaStream) {
    if (!(mediaStream instanceof FakeMediaStream)) {
      throw new TypeError(
        "Failed to execute 'createMediaStreamSource' on 'AudioContext': parameter 1 is not of type 'MediaStream'.",
      )
    }

    return new FakeMediaStreamAudioSourceNode({ context: this, mediaStream })
  }

  createMediaElementSource(mediaElement: HTMLMediaElement) {
    return new FakeMediaElementAudioSourceNode({ context: this, mediaElement })
  }

  decodeAudioData(
    _audioData: ArrayBuffer,
    onSuccess?: (buffer: FakeAudioBuffer) => void,
  ) {
    const buffer = new FakeAudioBuffer({
      duration: FakeAudioContext.decodedDuration,
    })
    setTimeout(() => onSuccess?.(buffer), 0)
    return Promise.resolve(buffer)
  }

  private setState(state: AudioContextState) {
    this.state = state
    this.onstatechange?.()
  }

  async resume() {
    this.setState('running')
  }

  async suspend() {
    this.setState('suspended')
  }

  async close() {
    this.setState('closed')
  }
}
