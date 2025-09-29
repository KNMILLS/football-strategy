// Provide minimal WebAudio stubs so main.js SFX code can run in jsdom

class FakeAudioParam {
  value = 0;
  setValueAtTime(_v: number, _t: number) {}
  linearRampToValueAtTime(_v: number, _t: number) {}
  exponentialRampToValueAtTime(_v: number, _t: number) {}
}

class FakeNode {
  connect() { return this; }
  disconnect() {}
}

class FakeOscillatorNode extends FakeNode {
  type = 'sine';
  frequency = new FakeAudioParam();
  start() {}
  stop() {}
}

class FakeGainNode extends FakeNode {
  gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeNode {
  type = 'lowpass';
  frequency = new FakeAudioParam();
}

class FakeDelayNode extends FakeNode {
  delayTime = new FakeAudioParam();
}

class FakeAudioBuffer {}

class FakeAudioBufferSourceNode extends FakeNode {
  buffer: FakeAudioBuffer | null = null;
  start() {}
  stop() {}
}

class FakeAudioContext {
  currentTime = 0;
  destination = new FakeNode();
  sampleRate = 44100;
  createGain() { return new FakeGainNode(); }
  createOscillator() { return new FakeOscillatorNode(); }
  createBiquadFilter() { return new FakeBiquadFilterNode(); }
  createDelay() { return new FakeDelayNode(); }
  createConvolver() { return new FakeNode(); }
  createDynamicsCompressor() { return new FakeNode(); }
  createBuffer(_c: number, _l: number, _sr: number) { return new FakeAudioBuffer(); }
  createBufferSource() { return new FakeAudioBufferSourceNode(); }
}

// Attach to globalThis for Vitest and jsdom
// @ts-expect-error jsdom environment
globalThis.AudioContext = FakeAudioContext;
// @ts-expect-error jsdom environment
globalThis.webkitAudioContext = FakeAudioContext;


