class BinauralBeatsGenerator {
    constructor() {
        this.audioContext = null;
        this.leftOscillator = null;
        this.rightOscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.startTime = null;
        this.timerInterval = null;
        this.wakeLock = null;
        this.backgroundMode = true;
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
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
    }
    
    async init() {
        try {
            this.setupEventListeners();
            this.setupVisualization();
            this.setupMobileOptimizations();
            this.showUserInteractionPrompt();
        } catch (error) {
            console.error('Error initializing:', error);
            this.showError('Failed to initialize audio system. Please refresh the page.');
        }
    }
    
    setupMobileOptimizations() {
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Handle page visibility changes for background audio
        document.addEventListener('visibilitychange', () => {
            if (this.backgroundMode && this.isPlaying) {
                if (document.hidden) {
                    console.log('Page hidden - audio continues in background');
                } else {
                    console.log('Page visible - audio continues');
                }
            }
        });
        
        // Handle Safari-specific events
        if (this.isSafari || this.isIOS) {
            document.addEventListener('pagehide', () => {
                if (this.backgroundMode && this.isPlaying) {
                    console.log('Safari page hide - maintaining audio');
                }
            });
        }
        
        // Setup background mode toggle
        const backgroundToggle = document.getElementById('background-mode');
        if (backgroundToggle) {
            backgroundToggle.addEventListener('change', (e) => {
                this.backgroundMode = e.target.checked;
                console.log('Background mode:', this.backgroundMode ? 'enabled' : 'disabled');
            });
        }
    }
    
    showUserInteractionPrompt() {
        // Create a prompt for user interaction
        const prompt = document.createElement('div');
        prompt.id = 'audio-prompt';
        prompt.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #FFD700;
            border-radius: 15px;
            padding: 30px;
            color: #FFD700;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
        `;
        prompt.innerHTML = `
            <h3>🎵 Audio System Ready</h3>
            <p>Click anywhere to enable audio for the binaural beats generator.</p>
            <p><small>Modern browsers require user interaction to start audio.</small></p>
            <button id="enable-audio" style="
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: #000000;
                border: none;
                border-radius: 8px;
                padding: 12px 24px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 15px;
            ">Enable Audio</button>
        `;
        document.body.appendChild(prompt);
        
        // Handle user interaction
        const enableAudio = () => {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                document.body.removeChild(prompt);
                console.log('Audio context initialized successfully');
            } catch (error) {
                console.error('Error creating audio context:', error);
                this.showError('Failed to create audio context. Please try again.');
            }
        };
        
        document.getElementById('enable-audio').addEventListener('click', enableAudio);
        document.addEventListener('click', enableAudio, { once: true });
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
                    setTimeout(() => this.togglePlayback(), 100);
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
    }
    
    updateCarrierFrequency(frequency) {
        if (this.isPlaying) {
            const beatFreq = parseFloat(document.getElementById('beat-freq').value);
            const leftFreq = frequency - beatFreq / 2;
            const rightFreq = frequency + beatFreq / 2;
            
            if (this.leftOscillator) this.leftOscillator.frequency.setValueAtTime(leftFreq, this.audioContext.currentTime);
            if (this.rightOscillator) this.rightOscillator.frequency.setValueAtTime(rightFreq, this.audioContext.currentTime);
        }
        this.updateDisplay();
    }
    
    updateBeatFrequency(frequency) {
        if (this.isPlaying) {
            const carrierFreq = parseFloat(document.getElementById('carrier-freq').value);
            const leftFreq = carrierFreq - frequency / 2;
            const rightFreq = carrierFreq + frequency / 2;
            
            if (this.leftOscillator) this.leftOscillator.frequency.setValueAtTime(leftFreq, this.audioContext.currentTime);
            if (this.rightOscillator) this.rightOscillator.frequency.setValueAtTime(rightFreq, this.audioContext.currentTime);
        }
        this.updateDisplay();
    }
    
    updateVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(volume / 100, this.audioContext.currentTime);
        }
        this.updateDisplay();
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
        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }
    
    async play() {
        try {
            // Check if audio context exists
            if (!this.audioContext) {
                this.showError('Audio system not initialized. Please click to enable audio first.');
                return;
            }
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const carrierFreq = parseFloat(document.getElementById('carrier-freq').value);
            const beatFreq = parseFloat(document.getElementById('beat-freq').value);
            const volume = parseFloat(document.getElementById('volume').value);
            
            const leftFreq = carrierFreq - beatFreq / 2;
            const rightFreq = carrierFreq + beatFreq / 2;
            
            // Create oscillators
            this.leftOscillator = this.audioContext.createOscillator();
            this.rightOscillator = this.audioContext.createOscillator();
            
            // Create gain nodes for stereo
            const leftGain = this.audioContext.createGain();
            const rightGain = this.audioContext.createGain();
            this.gainNode = this.audioContext.createGain();
            
            // Set frequencies
            this.leftOscillator.frequency.setValueAtTime(leftFreq, this.audioContext.currentTime);
            this.rightOscillator.frequency.setValueAtTime(rightFreq, this.audioContext.currentTime);
            
            // Set volume
            this.gainNode.gain.setValueAtTime(volume / 100, this.audioContext.currentTime);
            
            // Connect audio graph
            this.leftOscillator.connect(leftGain);
            this.rightOscillator.connect(rightGain);
            
            leftGain.connect(this.gainNode);
            rightGain.connect(this.gainNode);
            
            // Create stereo panner
            const leftPanner = this.audioContext.createStereoPanner();
            const rightPanner = this.audioContext.createStereoPanner();
            
            leftPanner.pan.setValueAtTime(-1, this.audioContext.currentTime);
            rightPanner.pan.setValueAtTime(1, this.audioContext.currentTime);
            
            leftGain.connect(leftPanner);
            rightGain.connect(rightPanner);
            
            leftPanner.connect(this.audioContext.destination);
            rightPanner.connect(this.audioContext.destination);
            
            // Start oscillators
            this.leftOscillator.start();
            this.rightOscillator.start();
            
            this.isPlaying = true;
            this.startTime = this.audioContext.currentTime;
            
            // Update UI
            document.getElementById('play-pause').textContent = '⏸️ Pause';
            document.getElementById('play-pause').classList.add('playing');
            
            // Start timer
            this.startTimer();
            
            // Request wake lock to keep screen on (mobile)
            this.requestWakeLock();
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.showError('Failed to play audio. Please check your browser audio settings.');
        }
    }
    
    pause() {
        if (this.leftOscillator) {
            this.leftOscillator.stop();
            this.leftOscillator = null;
        }
        if (this.rightOscillator) {
            this.rightOscillator.stop();
            this.rightOscillator = null;
        }
        
        this.isPlaying = false;
        this.stopTimer();
        this.releaseWakeLock();
        
        // Update UI
        document.getElementById('play-pause').textContent = '▶️ Start';
        document.getElementById('play-pause').classList.remove('playing');
    }
    
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock acquired');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake lock released');
                });
            }
        } catch (err) {
            console.log('Wake lock failed:', err);
        }
    }
    
    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }
    
    stop() {
        this.pause();
        this.startTime = null;
        document.getElementById('timer').textContent = '00:00';
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = this.audioContext.currentTime - this.startTime;
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
        const canvas = document.getElementById('waveform');
        const ctx = canvas.getContext('2d');
        
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (this.isPlaying) {
                const carrierFreq = parseFloat(document.getElementById('carrier-freq').value);
                const beatFreq = parseFloat(document.getElementById('beat-freq').value);
                
                // Draw waveform
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                for (let x = 0; x < canvas.width; x++) {
                    const time = x / canvas.width * 0.1;
                    const leftFreq = carrierFreq - beatFreq / 2;
                    const rightFreq = carrierFreq + beatFreq / 2;
                    
                    const leftWave = Math.sin(2 * Math.PI * leftFreq * time);
                    const rightWave = Math.sin(2 * Math.PI * rightFreq * time);
                    const combinedWave = (leftWave + rightWave) / 2;
                    
                    const y = canvas.height / 2 + combinedWave * 50;
                    
                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                
                ctx.stroke();
                
                // Draw frequency indicators
                ctx.fillStyle = '#FFD700';
                ctx.font = '12px Arial';
                ctx.fillText(`Beat: ${beatFreq} Hz`, 10, 20);
                ctx.fillText(`Carrier: ${carrierFreq} Hz`, 10, 35);
            }
            
            requestAnimationFrame(draw);
        };
        
        draw();
    }
}

// Initialize the generator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BinauralBeatsGenerator();
});
