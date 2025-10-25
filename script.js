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
        
        // iOS-specific audio handling
        if (this.isIOS) {
            this.setupIOSAudioHandling();
        }
        
        // Handle page visibility changes for background audio
        document.addEventListener('visibilitychange', () => {
            if (this.backgroundMode && this.isPlaying) {
                if (document.hidden) {
                    console.log('Page hidden - attempting to maintain audio');
                    this.handleBackgroundTransition();
                } else {
                    console.log('Page visible - resuming audio if needed');
                    this.handleForegroundTransition();
                }
            }
        });
        
        // Handle Safari-specific events
        if (this.isSafari || this.isIOS) {
            document.addEventListener('pagehide', () => {
                if (this.backgroundMode && this.isPlaying) {
                    console.log('Safari page hide - attempting to maintain audio');
                    this.handleBackgroundTransition();
                }
            });
            
            document.addEventListener('pageshow', () => {
                if (this.backgroundMode && this.isPlaying) {
                    console.log('Safari page show - checking audio state');
                    this.handleForegroundTransition();
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
    
    setupIOSAudioHandling() {
        // iOS requires special handling for background audio
        document.addEventListener('touchstart', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        });
        
        // Handle iOS audio session interruptions
        if (this.audioContext) {
            this.audioContext.addEventListener('statechange', () => {
                console.log('iOS Audio Context state:', this.audioContext.state);
                if (this.audioContext.state === 'suspended' && this.isPlaying) {
                    console.log('Audio context suspended - attempting to resume');
                    setTimeout(() => {
                        if (this.audioContext.state === 'suspended') {
                            this.audioContext.resume();
                        }
                    }, 100);
                }
            });
        }
    }
    
    handleBackgroundTransition() {
        // iOS limitations: We can't actually maintain audio in background
        // But we can prepare for quick resume
        if (this.isIOS) {
            console.log('iOS background transition - audio will pause');
            this.showIOSBackgroundWarning();
        }
    }
    
    handleForegroundTransition() {
        // Resume audio if it was suspended
        if (this.audioContext && this.audioContext.state === 'suspended' && this.isPlaying) {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed after foreground transition');
            });
        }
    }
    
    showIOSBackgroundWarning() {
        const warning = document.createElement('div');
        warning.id = 'ios-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 165, 0, 0.9);
            color: #000000;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: bold;
            text-align: center;
            max-width: 90%;
        `;
        warning.innerHTML = `
            <div>📱 iOS Limitation</div>
            <div style="font-size: 0.9rem; margin-top: 5px;">
                Audio pauses when switching apps. Tap "Start" to resume.
            </div>
        `;
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (document.body.contains(warning)) {
                document.body.removeChild(warning);
            }
        }, 5000);
    }
    
    showIOSInstructions() {
        const iosInstructions = document.getElementById('ios-instructions');
        if (iosInstructions) {
            iosInstructions.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                iosInstructions.style.display = 'none';
            }, 10000);
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
                
                // Show iOS instructions if on iOS
                if (this.isIOS) {
                    this.showIOSInstructions();
                }
                
                // Setup iOS audio handling after context creation
                if (this.isIOS) {
                    this.setupIOSAudioHandling();
                }
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
