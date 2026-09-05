// A complete stereo WAV lets the browser's media player own background playback.
// Twenty seconds contains whole cycles for the controls' 0.1 Hz beat steps.
function createToneWav(carrier, beat, volume) {
    const sampleRate = 44100;
    const frames = sampleRate * 20;
    const buffer = new ArrayBuffer(44 + frames * 6);
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
    view.setUint32(28, sampleRate * 6, true);
    view.setUint16(32, 6, true);
    view.setUint16(34, 24, true);
    text(36, 'data');
    view.setUint32(40, frames * 6, true);
    // Bake volume into the samples: iOS may ignore HTMLMediaElement.volume.
    // 24-bit PCM preserves quiet tones; 6 dB headroom avoids full-scale output.
    const amplitude = 8388607 * 0.5 * Math.max(0, Math.min(100, volume)) / 100;
    const left = 2 * Math.PI * (carrier - beat / 2) / sampleRate;
    const right = 2 * Math.PI * (carrier + beat / 2) / sampleRate;
    for (let i = 0; i < frames; i++) {
        // Short raised-cosine edges soften browser loop boundaries and initial starts.
        const edge = Math.min(1, i / (sampleRate * 0.008), (frames - 1 - i) / (sampleRate * 0.008));
        const envelope = (1 - Math.cos(Math.PI * edge)) / 2;
        const samples = [Math.round(amplitude * envelope * Math.sin(left * i)),
            Math.round(amplitude * envelope * Math.sin(right * i))];
        for (let channel = 0; channel < 2; channel++) {
            const offset = 44 + i * 6 + channel * 3;
            view.setUint8(offset, samples[channel] & 255);
            view.setUint8(offset + 1, (samples[channel] >> 8) & 255);
            view.setUint8(offset + 2, (samples[channel] >> 16) & 255);
        }
    }
    return new Blob([buffer], { type: 'audio/wav' });
}
