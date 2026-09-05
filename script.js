class BinauralBeatsGenerator {
    constructor() {
        this.audio = document.createElement('audio');
        this.audio.loop = true;
        this.audio.preload = 'auto';
        document.body.appendChild(this.audio);
        this.toneKey = null;
        this.toneUrl = null;
        this.playRequest = 0;
        this.elapsedSeconds = 0;
        this.isPlaying = false;
        this.startTime = null;
        this.timerInterval = null;
        this.backgroundMode = true;
        
        // Frequency bands
        this.bands = {
            delta: { min: 1, max: 4, default: 2 },
            theta: { min: 4, max: 8, default: 6 },
            alpha: { min: 8, max: 13, default: 10 },
            beta: { min: 12, max: 30, default: 20 },
            gamma: { min: 30, max: 100, default: 40 }
        };
        
        // Presets
        this.presets = {
            meditation: { carrier: 400, beat: 6, volume: 40 },
            focus: { carrier: 400, beat: 10, volume: 50 },
            sleep: { carrier: 300, beat: 2, volume: 30 },
            creativity: { carrier: 500, beat: 25, volume: 60 }
        };
        
        this.init();
        this.registerServiceWorker();
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available
                            console.log('New service worker available');
                        }
                    });
                });
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
    
    async init() {
        try {
            this.setupEventListeners();
            this.setupVisualization();
            this.setupMobileOptimizations();
            this.setupMediaPlayback();
        } catch (error) {
            console.error('Error initializing:', error);
            this.showError('Failed to initialize audio system. Please refresh the page.');
        }
    }
    
    setupMobileOptimizations() {
        const toggle = document.getElementById('background-mode');
        this.backgroundMode = toggle.checked;
        toggle.addEventListener('change', () => {
            this.backgroundMode = toggle.checked;
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.backgroundMode) this.pause();
        });
    }

    setupMediaPlayback() {
        this.audio.addEventListener('playing', () => this.setPlaybackState(true));
        this.audio.addEventListener('pause', () => {
            if (this.audio.paused) this.setPlaybackState(false);
        });
        this.audio.addEventListener('error', () => {
            this.setPlaybackState(false);
            this.showError('Audio could not load. Tap Start to try again.');
        });
        // Optional enhancements must never prevent ordinary audio playback.
        try {
            if (navigator.audioSession) navigator.audioSession.type = 'playback';
        } catch (error) {
            console.log('Audio session preference unavailable:', error);
        }
        if (navigator.mediaSession) {
            for (const [action, handler] of Object.entries({
                play: () => this.play(),
                pause: () => this.pause(),
                stop: () => this.stop()
            })) {
                try { navigator.mediaSession.setActionHandler(action, handler); }
                catch (error) { console.log('Media action unavailable:', action); }
            }
        }
    }

    setPlaybackState(playing) {
        if (playing && !this.isPlaying) {
            this.startTime = Date.now();
            this.startTimer();
        } else if (!playing && this.isPlaying) {
            this.elapsedSeconds += (Date.now() - this.startTime) / 1000;
            this.startTime = null;
            this.stopTimer();
        }
        this.isPlaying = playing;
        const button = document.getElementById('play-pause');
        button.textContent = playing ? '⏸️ Pause' : '▶️ Start';
        button.classList.toggle('playing', playing);
        try {
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
            }
        } catch (error) { console.log('Media state unavailable:', error); }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: bold;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    setupEventListeners() {
        // Main play button
        document.getElementById('play-pause').addEventListener('click', () => {
            this.togglePlayback();
        });
        
        // Quick preset buttons
        document.querySelectorAll('.quick-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.dataset.preset;
                this.loadPreset(preset);
                // Auto-play after selecting preset
                if (!this.isPlaying) {
                    this.togglePlayback();
                }
            });
        });
        
        // Band buttons
        document.querySelectorAll('.band-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const band = e.currentTarget.dataset.band;
                this.setFrequencyBand(band);
            });
        });
        
        // Manual controls
        const carrierSlider = document.getElementById('carrier-freq');
        const beatSlider = document.getElementById('beat-freq');
        const volumeSlider = document.getElementById('volume');
        
        carrierSlider.addEventListener('input', (e) => {
            this.updateCarrierFrequency(parseFloat(e.target.value));
        });
        
        beatSlider.addEventListener('input', (e) => {
            this.updateBeatFrequency(parseFloat(e.target.value));
        });
        
        volumeSlider.addEventListener('input', (e) => {
            this.updateVolume(parseFloat(e.target.value));
        });
        
        // Apply the new tone when the user releases a slider.
        [carrierSlider, beatSlider, volumeSlider].forEach(slider => {
            slider.addEventListener('change', () => this.refreshTone());
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.dataset.preset;
                this.loadPreset(preset);
            });
        });
        
        // Stop button
        document.getElementById('stop').addEventListener('click', () => {
            this.stop();
        });
        
        // Update display values
        this.updateDisplay();
    }
    
    setFrequencyBand(band) {
        const bandData = this.bands[band];
        const beatFreq = bandData.default;
        const carrierFreq = 400; // Default carrier frequency
        
        document.getElementById('beat-freq').value = beatFreq;
        document.getElementById('carrier-freq').value = carrierFreq;
        
        this.updateBeatFrequency(beatFreq);
        this.updateCarrierFrequency(carrierFreq);
        this.updateDisplay();
        
        this.refreshTone();

        // Update active band button
        document.querySelectorAll('.band-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-band="${band}"]`).classList.add('active');
    }
    
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;
        
        document.getElementById('carrier-freq').value = preset.carrier;
        document.getElementById('beat-freq').value = preset.beat;
        document.getElementById('volume').value = preset.volume;
        
        this.updateCarrierFrequency(preset.carrier);
        this.updateBeatFrequency(preset.beat);
        this.updateVolume(preset.volume);
        this.updateDisplay();
        this.refreshTone();
    }
    
    updateCarrierFrequency() {
        this.updateDisplay();
    }

    updateBeatFrequency() {
        this.updateDisplay();
    }

    updateVolume() {
        this.updateDisplay();
    }

    refreshTone() {
        if (this.isPlaying || !this.audio.paused) this.play();
    }

    updateDisplay() {
        const carrierFreq = parseFloat(document.getElementById('carrier-freq').value);
        const beatFreq = parseFloat(document.getElementById('beat-freq').value);
        const volume = parseFloat(document.getElementById('volume').value);
        
        const leftFreq = carrierFreq - beatFreq / 2;
        const rightFreq = carrierFreq + beatFreq / 2;
        
        document.getElementById('carrier-value').textContent = `${carrierFreq} Hz`;
        document.getElementById('beat-value').textContent = `${beatFreq} Hz`;
        document.getElementById('volume-value').textContent = `${volume}%`;
        
        document.getElementById('left-freq').textContent = `${leftFreq.toFixed(1)} Hz`;
        document.getElementById('right-freq').textContent = `${rightFreq.toFixed(1)} Hz`;
        document.getElementById('beat-display').textContent = `${beatFreq} Hz`;
    }
    
    async togglePlayback() {
        if (this.isPlaying || !this.audio.paused) {
            this.pause();
        } else {
            await this.play();
        }
    }
    
    async play() {
        const request = ++this.playRequest;
        try {
            const carrier = Number(document.getElementById('carrier-freq').value);
            const beat = Number(document.getElementById('beat-freq').value);
            const volume = Number(document.getElementById('volume').value);
            const key = `${carrier}:${beat}:${volume}`;
            if (key !== this.toneKey || this.audio.error) {
                const url = URL.createObjectURL(createToneWav(carrier, beat, volume));
                const previousUrl = this.toneUrl;
                this.audio.src = url;
                this.toneUrl = url;
                this.toneKey = key;
                if (previousUrl) URL.revokeObjectURL(previousUrl);
            }
            // Call synchronously from the click/change handler to retain user activation.
            await this.audio.play();
            if (request !== this.playRequest) return;
            this.setPlaybackState(!this.audio.paused);
            try {
                if (navigator.mediaSession && window.MediaMetadata) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: `${beat} Hz Binaural Beats`,
                        artist: 'Bee Neural Beats',
                        album: `${carrier} Hz carrier`,
                        artwork: [{ src: new URL('bee-logo.png', location.href).href, type: 'image/png' }]
                    });
                }
            } catch (error) { console.log('Media metadata unavailable:', error); }
        } catch (error) {
            if (request !== this.playRequest) return;
            console.error('Error playing audio:', error);
            this.setPlaybackState(false);
            this.showError('Could not start audio. Tap Start to try again.');
        }
    }

    pause() {
        ++this.playRequest;
        this.audio.pause();
        this.setPlaybackState(false);
    }

    stop() {
        this.pause();
        this.startTime = null;
        this.elapsedSeconds = 0;
        this.audio.currentTime = 0;
        document.getElementById('timer').textContent = '00:00';
    }
    
    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = this.elapsedSeconds + (Date.now() - this.startTime) / 1000;
                const minutes = Math.floor(elapsed / 60);
                const seconds = Math.floor(elapsed % 60);
                document.getElementById('timer').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    setupVisualization() {
        this.setupWaveformVisualization();
        this.setupSpectrumAnalyzer();
        this.setupBeatVisualizer();
    }
    
    setupWaveformVisualization() {
        const canvas = document.getElementById('waveform');
        const ctx = canvas.getContext('2d');
        const statusElement = document.getElementById('waveform-status');
        
        let animationTime = 0;
        
        const drawWaveform = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (this.isPlaying) {
                const carrierFreq = parseFloat(document.getElementById('carrier-freq').value);
                const beatFreq = parseFloat(document.getElementById('beat-freq').value);
                const volume = parseFloat(document.getElementById('volume').value);
                
                // Update status
                statusElement.textContent = 'Playing';
                statusElement.style.color = '#00FF00';
                
                // Create gradient for waveform
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0, '#FFD700');
                gradient.addColorStop(0.5, '#FFA500');
                gradient.addColorStop(1, '#FFD700');
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                
                // Draw left channel waveform
                ctx.beginPath();
                ctx.strokeStyle = '#00BFFF';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#00BFFF';
                
                for (let x = 0; x < canvas.width; x++) {
                    const time = (x / canvas.width * 0.1) + animationTime;
                    const leftFreq = carrierFreq - beatFreq / 2;
                    const leftWave = Math.sin(2 * Math.PI * leftFreq * time) * (volume / 100);
                    const y = canvas.height / 2 + leftWave * 60;
                    
                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                
                // Draw right channel waveform
                ctx.beginPath();
                ctx.strokeStyle = '#FF6B6B';
                ctx.shadowColor = '#FF6B6B';
                
                for (let x = 0; x < canvas.width; x++) {
                    const time = (x / canvas.width * 0.1) + animationTime;
                    const rightFreq = carrierFreq + beatFreq / 2;
                    const rightWave = Math.sin(2 * Math.PI * rightFreq * time) * (volume / 100);
                    const y = canvas.height / 2 + rightWave * 60;
                    
                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                
                // Draw combined waveform
                ctx.beginPath();
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FFD700';
                
                for (let x = 0; x < canvas.width; x++) {
                    const time = (x / canvas.width * 0.1) + animationTime;
                    const leftFreq = carrierFreq - beatFreq / 2;
                    const rightFreq = carrierFreq + beatFreq / 2;
                    
                    const leftWave = Math.sin(2 * Math.PI * leftFreq * time) * (volume / 100);
                    const rightWave = Math.sin(2 * Math.PI * rightFreq * time) * (volume / 100);
                    const combinedWave = (leftWave + rightWave) / 2;
                    
                    const y = canvas.height / 2 + combinedWave * 40;
                    
                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                
                // Draw frequency indicators
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(`Beat: ${beatFreq} Hz`, 10, 25);
                ctx.fillText(`Carrier: ${carrierFreq} Hz`, 10, 45);
                ctx.fillText(`Volume: ${volume}%`, 10, 65);
                
                animationTime += 0.02;
            } else {
                statusElement.textContent = 'Stopped';
                statusElement.style.color = '#FF6B6B';
                
                // Draw idle state
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
                
                ctx.fillStyle = '#666666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Audio Stopped', canvas.width / 2, canvas.height / 2);
                ctx.textAlign = 'left';
            }
            
            requestAnimationFrame(drawWaveform);
        };
        
        drawWaveform();
    }
    
    setupSpectrumAnalyzer() {
        const canvas = document.getElementById('spectrum');
        const ctx = canvas.getContext('2d');
        
        const drawSpectrum = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (this.isPlaying) {
                const carrierFreq = parseFloat(document.getElementById('carrier-freq').value);
                const beatFreq = parseFloat(document.getElementById('beat-freq').value);
                const volume = parseFloat(document.getElementById('volume').value);
                
                const leftFreq = carrierFreq - beatFreq / 2;
                const rightFreq = carrierFreq + beatFreq / 2;
                
                // Draw frequency bars
                const barWidth = canvas.width / 64;
                const maxHeight = canvas.height - 20;
                
                for (let i = 0; i < 64; i++) {
                    const freq = (i / 64) * 1000; // 0-1000 Hz range
                    let height = 0;
                    let color = '#333333';
                    
                    // Calculate bar height based on frequency content
                    if (Math.abs(freq - leftFreq) < 10) {
                        height = maxHeight * 0.8 * (volume / 100);
                        color = '#00BFFF';
                    } else if (Math.abs(freq - rightFreq) < 10) {
                        height = maxHeight * 0.8 * (volume / 100);
                        color = '#FF6B6B';
                    } else if (Math.abs(freq - carrierFreq) < 20) {
                        height = maxHeight * 0.4 * (volume / 100);
                        color = '#FFD700';
                    }
                    
                    // Add some randomness for visual appeal
                    height += Math.random() * 10;
                    
                    const x = i * barWidth;
                    const y = canvas.height - height;
                    
                    // Create gradient for bars
                    const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
                    gradient.addColorStop(0, color);
                    gradient.addColorStop(1, '#000000');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, y, barWidth - 1, height);
                    
                    // Add glow effect
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 5;
                    ctx.fillRect(x, y, barWidth - 1, height);
                    ctx.shadowBlur = 0;
                }
                
                // Draw frequency labels
                ctx.fillStyle = '#FFD700';
                ctx.font = '10px Arial';
                ctx.fillText('0 Hz', 5, canvas.height - 5);
                ctx.fillText('500 Hz', canvas.width / 2 - 20, canvas.height - 5);
                ctx.fillText('1000 Hz', canvas.width - 30, canvas.height - 5);
            }
            
            requestAnimationFrame(drawSpectrum);
        };
        
        drawSpectrum();
    }
    
    setupBeatVisualizer() {
        const beatCircle = document.getElementById('beat-circle');
        const beatPulse = document.getElementById('beat-pulse');
        const beatFrequency = document.getElementById('beat-frequency');
        
        let beatAnimation = null;
        
        const animateBeat = () => {
            if (this.isPlaying) {
                const beatFreq = parseFloat(document.getElementById('beat-freq').value);
                const beatInterval = 1000 / beatFreq; // Convert Hz to milliseconds
                
                beatFrequency.textContent = `${beatFreq} Hz`;
                
                // Animate the pulse
                beatPulse.style.animationDuration = `${beatInterval}ms`;
                
                // Change circle color based on frequency band
                if (beatFreq >= 1 && beatFreq <= 4) {
                    beatCircle.style.borderColor = '#8A2BE2'; // Delta - Purple
                } else if (beatFreq >= 4 && beatFreq <= 8) {
                    beatCircle.style.borderColor = '#4169E1'; // Theta - Blue
                } else if (beatFreq >= 8 && beatFreq <= 13) {
                    beatCircle.style.borderColor = '#00BFFF'; // Alpha - Light Blue
                } else if (beatFreq >= 12 && beatFreq <= 30) {
                    beatCircle.style.borderColor = '#FFD700'; // Beta - Gold
                } else if (beatFreq >= 30 && beatFreq <= 100) {
                    beatCircle.style.borderColor = '#FF4500'; // Gamma - Red Orange
                }
                
                beatAnimation = requestAnimationFrame(animateBeat);
            } else {
                beatFrequency.textContent = '0 Hz';
                beatCircle.style.borderColor = '#FFD700';
                beatPulse.style.animationDuration = '1s';
            }
        };
        
        animateBeat();
    }
}

// Initialize the generator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BinauralBeatsGenerator();
});
