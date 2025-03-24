// @ts-ignore
class RecorderProcessor extends AudioWorkletProcessor {
  // @ts-ignore
  process(inputList, _outputList, _parameters) {
    if (inputList[0].length < 1) {
      return true;
    }

    const float32Data = inputList[0][0];
    const int16Data = new Int16Array(float32Data.length);

    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // @ts-ignore
    this.port.postMessage(int16Data);

    return true;
  }
}

// @ts-ignore
registerProcessor("recorder.worklet", RecorderProcessor);
