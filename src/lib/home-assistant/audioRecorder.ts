export class AudioRecorder {
  private _active = false;

  private _callback: (data: Int16Array) => void;

  private _context: AudioContext | undefined;

  private _stream: MediaStream | undefined;

  private _source: MediaStreamAudioSourceNode | undefined;

  private _recorder: AudioWorkletNode | undefined;

  constructor(callback: (data: Int16Array) => void) {
    this._callback = callback;
  }

  public get active() {
    return this._active;
  }

  public get sampleRate() {
    return this._context?.sampleRate;
  }

  public static get isSupported() {
    return (
      window.isSecureContext &&
      // @ts-expect-error-next-line
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  public async start() {
    if (!this._context || !this._stream || !this._source || !this._recorder) {
      try {
        await this._createContext();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(`Error creating context: ${err}`);
        this._active = false;
      }
    } else {
      // @ts-expect-error-next-line
      this._stream.getTracks()[0].enabled = true;
      await this._context.resume();
      this._active = true;
    }
  }

  public async stop() {
    this._active = false;
    if (this._stream) {
      // @ts-expect-error-next-line
      this._stream.getTracks()[0].enabled = false;
    }
    await this._context?.suspend();
  }

  public close() {
    this._active = false;
    // @ts-expect-error-next-line
    this._stream?.getTracks()[0].stop();
    if (this._recorder) {
      this._recorder.port.onmessage = null;
    }
    this._source?.disconnect();
    void this._context?.close();
    this._stream = undefined;
    this._source = undefined;
    this._recorder = undefined;
    this._context = undefined;
  }

  private async _createContext() {
    // @ts-expect-error-next-line
    this._context = new (window.AudioContext || window.webkitAudioContext)();
    console.log("Created audio context");
    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Created stream");

    console.log(`url: ${import.meta.url}`);
    await this._context.audioWorklet.addModule(
      new URL("./recorder.worklet.js", import.meta.url),
    );
    console.log("Added worklet");

    this._source = this._context.createMediaStreamSource(this._stream);
    console.log("Created source");
    this._recorder = new AudioWorkletNode(this._context, "recorder.worklet");
    console.log("Created recorder");

    this._recorder.port.onmessage = (e) => {
      if (!this._active) {
        return;
      }
      this._callback(e.data as Int16Array);
    };
    this._active = true;
    this._source.connect(this._recorder);
    console.log("Connected source to recorder");
  }
}
