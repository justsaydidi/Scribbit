/**
 * Ambient Sound Module for Scribbit
 * Generates ambient sounds programmatically using Web Audio API
 * No external audio files needed - completely self-contained
 */

class AmbientSoundManager {
    constructor() {
        this.audioContext = null;
        this.currentSource = null;
        this.gainNode = null;
        this.currentSound = 'silence';
        this.volume = 0.5;
        this.isPlaying = false;
    }

    /**
     * Initialize or resume the audio context
     */
    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        return this.audioContext;
    }

    /**
     * Create a noise buffer of specified duration and type
     */
    createNoiseBuffer(duration, type = 'white') {
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = duration * sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            let value;

            switch (type) {
                case 'white':
                    value = Math.random() * 2 - 1;
                    break;
                case 'pink':
                    // Pink noise approximation
                    value = (Math.random() * 2 - 1 +
                        Math.random() * 2 - 1 +
                        Math.random() * 2 - 1 +
                        Math.random() * 2 - 1) / 4;
                    break;
                case 'brown':
                    // Brown noise
                    let lastOut = 0;
                    const white = Math.random() * 2 - 1;
                    lastOut = (lastOut + (0.02 * white)) / 1.02;
                    value = lastOut * 3.5;
                    break;
                default:
                    value = Math.random() * 2 - 1;
            }

            data[i] = value;
        }

        return buffer;
    }

    /**
     * Create rain sound - filtered pink noise
     */
    createRainSound() {
        const duration = 5; // 5 second loop
        const buffer = this.createNoiseBuffer(duration, 'pink');

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Filter to make it sound like rain
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;

        // Add some variation
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        source.connect(filter);

        // Store reference to stop later
        this.lfo = lfo;

        return { source, filter };
    }

    /**
     * Create coffee shop sound - brown noise with modulation and "cup chinks"
     */
    createCoffeeShopSound() {
        const duration = 8;
        const buffer = this.createNoiseBuffer(duration, 'brown');

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.3;

        // Add subtle volume modulation for "room presence"
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05;
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 0.1;

        const coffeeGain = this.audioContext.createGain();
        coffeeGain.gain.value = 0.8;
        lfo.connect(lfoGain);
        lfoGain.connect(coffeeGain.gain);
        lfo.start();

        source.connect(filter);
        filter.connect(coffeeGain);

        // --- Cup Chinks (Random Impulses) ---
        // We simulate these by creating a small noise burst every few seconds
        const chinkGain = this.audioContext.createGain();
        chinkGain.gain.value = 0;

        const chinkFilter = this.audioContext.createBiquadFilter();
        chinkFilter.type = 'bandpass';
        chinkFilter.frequency.value = 3000;
        chinkFilter.Q.value = 10;

        source.connect(chinkFilter);
        chinkFilter.connect(chinkGain);

        // Schedule random chinks
        const scheduleChink = () => {
            if (!this.isPlaying || this.currentSound !== 'coffee-shop') return;
            const now = this.audioContext.currentTime;
            chinkGain.gain.setValueAtTime(0, now);
            chinkGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
            chinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            setTimeout(scheduleChink, Math.random() * 5000 + 2000);
        };
        setTimeout(scheduleChink, 3000);

        const merger = this.audioContext.createGain();
        coffeeGain.connect(merger);
        chinkGain.connect(merger);

        return { source, output: merger, lfo };
    }

    /**
     * Create library sound - deep silence, page turns, and faint resonance
     */
    createLibrarySound() {
        const duration = 10;
        const buffer = this.createNoiseBuffer(duration, 'brown');

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Very low pass for deep room hum
        const humFilter = this.audioContext.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.value = 150;

        const mainGain = this.audioContext.createGain();
        mainGain.gain.value = 0.4;

        source.connect(humFilter);
        humFilter.connect(mainGain);

        // Faint "page turn" sound (filtered noise burst)
        const pageGain = this.audioContext.createGain();
        pageGain.gain.value = 0;

        const pageFilter = this.audioContext.createBiquadFilter();
        pageFilter.type = 'lowpass';
        pageFilter.frequency.value = 1000;

        source.connect(pageFilter);
        pageFilter.connect(pageGain);

        const schedulePage = () => {
            if (!this.isPlaying || this.currentSound !== 'library') return;
            const now = this.audioContext.currentTime;
            pageGain.gain.setValueAtTime(0, now);
            pageGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
            pageGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            setTimeout(schedulePage, Math.random() * 15000 + 8000);
        };
        setTimeout(schedulePage, 5000);

        const merger = this.audioContext.createGain();
        mainGain.connect(merger);
        pageGain.connect(merger);

        return { source, output: merger };
    }

    /**
     * Create white noise sound
     */
    createWhiteNoiseSound() {
        const duration = 3; // 3 second loop
        const buffer = this.createNoiseBuffer(duration, 'white');

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Low pass filter to make it less harsh
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.5;

        source.connect(filter);

        return { source, filter };
    }

    /**
     * Start playing the selected ambient sound
     */
    async play(soundType, volume = 0.5) {
        // Stop any currently playing sound
        this.stop();

        // If silence, just return
        if (soundType === 'silence') {
            this.currentSound = 'silence';
            this.isPlaying = false;
            return;
        }

        await this.init();

        this.currentSound = soundType;
        this.volume = volume;

        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = volume;

        let soundChain;

        switch (soundType) {
            case 'rain':
                soundChain = this.createRainSound();
                break;
            case 'coffee-shop':
                soundChain = this.createCoffeeShopSound();
                break;
            case 'library':
                soundChain = this.createLibrarySound();
                break;
            case 'white-noise':
                soundChain = this.createWhiteNoiseSound();
                break;
            default:
                return;
        }

        // Connect to gain node and destination
        if (soundChain.output) {
            soundChain.output.connect(this.gainNode);
        } else if (soundChain.filter) {
            soundChain.filter.connect(this.gainNode);
        }

        this.gainNode.connect(this.audioContext.destination);

        // Start playback
        this.currentSource = soundChain.source;
        this.currentSource.start();
        this.isPlaying = true;

        console.log(`[AmbientSound] Playing ${soundType} at volume ${volume}`);
    }

    /**
     * Stop the current sound
     */
    stop() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // Source might already be stopped
            }
            this.currentSource = null;
        }

        if (this.lfo) {
            try {
                this.lfo.stop();
            } catch (e) { }
            this.lfo = null;
        }

        this.gainNode = null;
        this.isPlaying = false;

        console.log('[AmbientSound] Stopped');
    }

    /**
     * Update the volume while playing
     */
    setVolume(volume) {
        this.volume = volume;

        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            currentSound: this.currentSound,
            volume: this.volume,
            isPlaying: this.isPlaying
        };
    }
}

// Create global instance
window.scribbitAmbientSound = new AmbientSoundManager();
