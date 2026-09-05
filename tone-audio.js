// A complete stereo WAV lets the browser's media player own background playback.
// Twenty seconds contains whole cycles for the controls' 0.1 Hz beat steps.
function createToneWav(carrier, beat, volume) {
    const sampleRate = 44100;
    const frames = sampleRate * 20;
    const buffer = new ArrayBuffer(44 + frames * 4);
    const view = new DataView(buffer);
    const text = (offset, value) => {
        for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    text(0, 'RIFF');
    view.setUint32(4, buffer.byteLength - 8, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 2, true); // Separate left and right channels
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, frames * 4, true);
    // Bake volume into the samples: iOS may ignore HTMLMediaElement.volume.
    const amplitude = 32767 * Math.max(0, Math.min(100, volume)) / 100;
    const left = 2 * Math.PI * (carrier - beat / 2) / sampleRate;
    const right = 2 * Math.PI * (carrier + beat / 2) / sampleRate;
    for (let i = 0; i < frames; i++) {
        view.setInt16(44 + i * 4, Math.round(amplitude * Math.sin(left * i)), true);
        view.setInt16(46 + i * 4, Math.round(amplitude * Math.sin(right * i)), true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
}
