# Bee Neural Beats 🐝🧠

A sophisticated binaural beats generator for meditation, focus, and consciousness exploration. Harness the power of brainwave entrainment through carefully crafted audio frequencies.

## Features

- **Frequency Band Selection**: Choose from Delta, Theta, Alpha, Beta, and Gamma brainwave frequencies
- **Manual Controls**: Fine-tune carrier frequency, beat frequency, and volume
- **Preset Modes**: Quick access to meditation, focus, sleep aid, and creativity boost settings
- **Real-time Visualization**: Live waveform display showing audio patterns
- **Responsive Design**: Beautiful golden-themed interface optimized for all devices

## Frequency Bands

- **Delta (1-4 Hz)**: Deep restorative state, borderline sleep — useful for regeneration, shielding, subconscious imprinting
- **Theta (4-8 Hz)**: Deep meditative/liminal states, between waking and sleep: perfect for Hermetic/Chaos rituals, connecting with deeper self
- **Alpha (8-13 Hz)**: Relaxed focus, visualization, manifestation work from a calm yet alert mind
- **Beta (12-30 Hz)**: Alert, cognitive, creative peaks — useful when coding, engineering, high flow state
- **Gamma (30-100 Hz)**: Peak consciousness, spiritual awareness, enhanced perception

## Usage

1. Select a frequency band or use manual controls
2. Adjust volume to comfortable levels
3. Click Play to start the binaural beats
4. Use headphones for optimal stereo effect

## Technology

- **Stereo PCM audio**: Generated tones played through a looping HTML audio element
- **Canvas API**: Real-time waveform visualization
- **Modern CSS**: Responsive grid layout with golden theme
- **Vanilla JavaScript**: No frameworks, pure performance

## Deployment

This project is optimized for Vercel deployment with:
- Static file serving
- Proper caching headers
- SPA routing support

## Live Demo

🌐 [bee-neural-beats.vercel.app](https://bee-neural-beats.vercel.app)

## License

MIT License - feel free to use and modify for your own consciousness exploration journey.

## Background playback

Tap Start with Background Play enabled, then switch apps or lock the screen while keeping the tab open. Supported browsers expose play/pause controls on the lock screen. Calls, competing audio, browser shutdown, and phone power-management policies may interrupt playback; real-device testing is required.

The app generates a 20-second stereo WAV locally and loops it through an HTML audio element without routing through an AudioContext. Frequency and volume changes apply when you release a slider. Volume is encoded into the samples for phones that ignore programmatic media volume. Each channel contains whole cycles at the supported frequency steps; browsers may still introduce a brief gap at loop boundaries.

Run regression tests with `node --test tests/*.test.cjs`. Before releasing to mobile users, check Start, app switching, screen lock for several minutes, lock-screen pause/resume, slider changes, and Stop on an iPhone and Android phone.
