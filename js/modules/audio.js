/**
 * Audio Module for Neon Drift Protocol
 * 
 * Handles all audio aspects including:
 * - Background music
 * - Sound effects
 * - Dynamic audio based on gameplay state
 */

//To do: totally rethink this.
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.backgroundMusic = null;
        this.lastKickTime = 0;
    }
    
    /**
     * Initialize the audio system
     */
    init() {
        if (this.initialized) return true;
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            return true;
        } catch (e) {
            console.error("AudioSystem: Failed to initialize audio context", e);
            return false;
        }
    }
    
    /**
     * Resume audio context (must be called after user interaction)
     */
    resume() {
        if (!this.initialized) return Promise.reject("Audio system not initialized");
        
        return this.audioContext.resume();
    }
    
    /**
     * Play startup sound when game begins
     */
    playStartupSound() {
        if (!this.initialized) return;
        
        // Create oscillator for startup sound effect
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    /**
     * Start background music
     */
    startBackgroundMusic() {
        if (!this.initialized) return;
        
        // Create synth audio procedurally
        this.createSynthAudio();
    }
    
    /**
     * Create procedural synth music with vaporwave aesthetics
     */
    createSynthAudio() {
        if (!this.initialized) return;
        
        // Set up oscillator for ambient bass pad - constant without arpeggiation
        const bassOsc = this.audioContext.createOscillator();
        bassOsc.type = 'sine'; // Change from sawtooth to sine for smoother sound
        bassOsc.frequency.setValueAtTime(55, this.audioContext.currentTime); // A1 note - constant
        bassOsc.detune.setValueAtTime(-10, this.audioContext.currentTime); // Lower detune for warmer feel
        
        // Main melody oscillator with pure tone
        const melodyOsc = this.audioContext.createOscillator();
        melodyOsc.type = 'sine';
        melodyOsc.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 note - clear, centered pitch
        
        // Second melody oscillator for shimmer - softer triangle at octave up
        const melodyOsc2 = this.audioContext.createOscillator();
        melodyOsc2.type = 'triangle';
        melodyOsc2.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5 note - octave up for shimmer
        melodyOsc2.detune.setValueAtTime(-8, this.audioContext.currentTime); // Slight flat detune for lush 80s feel
        
        // Third melody oscillator for rich sub-harmonics
        const melodyOsc3 = this.audioContext.createOscillator();
        melodyOsc3.type = 'sine';
        melodyOsc3.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3 note - octave down for fullness
        
        // Add echo/delay for that classic vaporwave reverb trail
        const melodyDelay = this.audioContext.createDelay();
        melodyDelay.delayTime.setValueAtTime(0.37, this.audioContext.currentTime); // Tempo-synced delay
        
        const delayFeedback = this.audioContext.createGain();
        delayFeedback.gain.setValueAtTime(0.3, this.audioContext.currentTime); // Echo feedback
        
        // Add chorus for beautiful shimmer (80s roland juno effect)
        const melodyChorus = this.audioContext.createDelay();
        melodyChorus.delayTime.setValueAtTime(0.025, this.audioContext.currentTime); // Classic chorus timing
        
        const chorusGain = this.audioContext.createGain();
        chorusGain.gain.setValueAtTime(0.4, this.audioContext.currentTime); // Balanced chorus mix
        
        // LFO for chorus modulation
        const chorusLFO = this.audioContext.createOscillator();
        chorusLFO.type = 'sine';
        chorusLFO.frequency.setValueAtTime(0.5, this.audioContext.currentTime); // Slow LFO
        
        const chorusDepth = this.audioContext.createGain();
        chorusDepth.gain.setValueAtTime(0.002, this.audioContext.currentTime); // Small amount of chorus depth
        
        // Set up oscillator for pads - wider and dreamier
        const padOsc = this.audioContext.createOscillator();
        padOsc.type = 'triangle';
        padOsc.frequency.setValueAtTime(110, this.audioContext.currentTime); // A2 note
        padOsc.detune.setValueAtTime(-10, this.audioContext.currentTime); // Detune for thicker sound
        
        // Add second pad oscillator for shimmer effect
        const padOsc2 = this.audioContext.createOscillator();
        padOsc2.type = 'sine';
        padOsc2.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3 note - one octave up
        
        // Optimized gain nodes for cleaner mix
        const bassGain = this.audioContext.createGain();
        bassGain.gain.setValueAtTime(0.2, this.audioContext.currentTime); // Reduced for clearer melody
        
        // Main melody with strong presence
        const melodyGain = this.audioContext.createGain();
        melodyGain.gain.setValueAtTime(0.5, this.audioContext.currentTime); // Main melody increased
        
        // Octave up layer with softer presence
        const melodyGain2 = this.audioContext.createGain();
        melodyGain2.gain.setValueAtTime(0.2, this.audioContext.currentTime); // Subtle shimmer
        
        // Octave down layer for richness but not dominating
        const melodyGain3 = this.audioContext.createGain();
        melodyGain3.gain.setValueAtTime(0.3, this.audioContext.currentTime); // Balanced low end support
        
        // Delayed signal gain
        const delayGain = this.audioContext.createGain();
        delayGain.gain.setValueAtTime(0.25, this.audioContext.currentTime); // Echo blend
        
        // Pads stay in the background
        const padGain = this.audioContext.createGain();
        padGain.gain.setValueAtTime(0.08, this.audioContext.currentTime); // Further reduced
        
        const padGain2 = this.audioContext.createGain();
        padGain2.gain.setValueAtTime(0.05, this.audioContext.currentTime); // Further reduced
        
        // Cleaner, smoother reverb for beautiful ambience
        const convolver = this.audioContext.createConvolver();
        const impulseLength = this.audioContext.sampleRate * 3; // 3 seconds reverb - cleaner tail
        const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // Create a smoother, plate-style reverb (80s production sound)
        for (let i = 0; i < impulseLength; i++) {
            // Cleaner early reflections followed by smooth decay
            const phase = i / impulseLength;
            if (phase < 0.1) {
                // Early reflections - more defined
                impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - phase * 5, 0.8) * 0.7;
                impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - phase * 5, 0.8) * 0.7;
            } else {
                // Smooth decay - less noisy
                impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - phase, 2.2) * 0.3;
                impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - phase, 2.2) * 0.3;
            }
        }
        
        convolver.buffer = impulse;
        
        // Create a more musical filter chain
        // High shelf boost for clarity
        const highShelf = this.audioContext.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.setValueAtTime(6000, this.audioContext.currentTime);
        highShelf.gain.setValueAtTime(3, this.audioContext.currentTime); // Slight high boost for sparkle
        
        // Low-pass filter with more musical settings
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(4500, this.audioContext.currentTime); // Higher cutoff for clarity
        lowpass.Q.setValueAtTime(0.7, this.audioContext.currentTime); // Less resonance for smoother sound
        
        // Very subtle bitcrusher for vintage character without harshness
        const bitCrusher = this.audioContext.createWaveShaper();
        const bits = 12; // Higher bit-depth (less crushing, more natural)
        const normalizationFactor = Math.pow(2, bits - 1) - 1;
        const curve = new Float32Array(65536);
        for (let i = 0; i < 65536; i++) {
            const x = (i - 32768) / 32768;
            // Smoother curve with less harsh distortion
            curve[i] = Math.tanh(x) * 0.95 + Math.round(x * normalizationFactor) / normalizationFactor * 0.05;
        }
        bitCrusher.curve = curve;
        
        // Connect the nodes - optimized for clarity and beauty
        // Bass stays in background
        bassOsc.connect(bassGain);
        bassGain.connect(lowpass);
        
        // Set up the chorus LFO
        chorusLFO.connect(chorusDepth);
        chorusLFO.start();
        
        // Modulate chorus delay time with LFO for shimmer
        chorusDepth.connect(melodyChorus.delayTime);
        
        // Enhanced melody layer - primary notes
        melodyOsc.connect(melodyGain);
        
        // Octave layering for depth
        melodyOsc2.connect(melodyGain2);
        melodyOsc3.connect(melodyGain3);
        
        // Apply chorus to main melody for classic 80s shine
        melodyOsc.connect(melodyChorus);
        melodyChorus.connect(chorusGain);
        chorusGain.connect(melodyGain);
        
        // Setup tempo-synced echo with feedback loop
        melodyGain.connect(melodyDelay);
        melodyDelay.connect(delayFeedback);
        delayFeedback.connect(melodyDelay); // Feedback loop
        melodyDelay.connect(delayGain);
        
        // Delay to bit of subtle vintage character
        delayGain.connect(bitCrusher);
        
        // Octave layers to reverb for spaciousness
        melodyGain2.connect(convolver);
        melodyGain3.connect(convolver);
        
        // Pads for background ambience
        padOsc.connect(padGain);
        padOsc2.connect(padGain2);
        padGain.connect(convolver);
        padGain2.connect(convolver);
        
        // Apply EQ and filters for professional sound
        convolver.connect(lowpass);
        lowpass.connect(highShelf);
        
        // Final mix routing for clarity
        // Main melody directly to output for prominence
        melodyGain.connect(this.audioContext.destination);
        
        // Supporting elements through processing chain
        highShelf.connect(this.audioContext.destination);
        bitCrusher.connect(this.audioContext.destination);
        
        // Secondary melody layer with subtle direct connection
        melodyGain2.connect(this.audioContext.destination);
        
        // Create expanded vaporwave chord progression with jazz influence
        // Minor 7th, major 7th and 9th chords
        const notes = [
            55, 82.41, 110, 164.81, 207.65, 233.08, // Am9 chord
            49, 73.42, 98, 146.83, 196, 220,        // Dm9 chord
            41.2, 61.74, 82.41, 123.47, 164.81, 185.0, // G9 chord
            44, 65.41, 87.31, 130.81, 174.61, 196.0  // Cmaj9 chord
        ];
        
        // Create a more focused, beautiful vaporwave melody
        // Iconic Diana Ross - It's Your Move / Macintosh Plus style
        const melodyNotes = [
            // Clean pentatonic patterns for clear, pleasing melody
            440, 523.25, 659.25, 880, 659.25, // A4, C5, E5, A5, E5 - rising and falling
            587.33, 523.25, 440, 392, 329.63, // D5, C5, A4, G4, E4 - descending motif
            
            // Signature vaporwave intervals - spaced for clarity
            440, 659.25, 783.99, 880, 783.99, // A4, E5, G5, A5, G5 - suspended feel
            659.25, 587.33, 523.25, 440, 392, // E5, D5, C5, A4, G4 - resolve
            
            // Emotional high point 
            523.25, 587.33, 659.25, 783.99, 880, // C5, D5, E5, G5, A5 - rising emotion
            783.99, 659.25, 587.33, 523.25, 440, // G5, E5, D5, C5, A4 - falling
            
            // Resolving phrase - classic vaporwave cadence
            392, 440, 523.25, 587.33, 523.25, // G4, A4, C5, D5, C5 - tension
            440, 392, 329.63, 261.63, 329.63  // A4, G4, E4, C4, E4 - resolution
        ];
        
        let noteIndex = 0;
        let melodyIndex = 0;
        
        // Create slow drum beat typical of vaporwave
        const kickInterval = 650; // ms between beats (slower tempo ~90 BPM)
        this.lastKickTime = this.audioContext.currentTime;
        
        // Start all oscillators
        bassOsc.start();
        melodyOsc.start();
        melodyOsc2.start();
        melodyOsc3.start();
        padOsc.start();
        padOsc2.start();
        
        // Save references to be able to stop them
        this.backgroundMusic = {
            bassOsc,
            melodyOsc,
            melodyOsc2,
            melodyOsc3,
            padOsc,
            padOsc2,
            notes,
            started: true
        };
        
        // Set up loop for beautiful vaporwave melody pattern
        // Initial tempo pause to let first note ring
        setTimeout(() => {
            // Start with main melody note clearly established
            melodyOsc.frequency.setValueAtTime(melodyNotes[0], this.audioContext.currentTime);
            melodyOsc2.frequency.setValueAtTime(melodyNotes[0] * 2, this.audioContext.currentTime);
            melodyOsc3.frequency.setValueAtTime(melodyNotes[0] * 0.5, this.audioContext.currentTime);
            
            // Main melody pattern loop with classic vaporwave timing
            const melodyInterval = setInterval(() => {
                if (!this.backgroundMusic || !this.backgroundMusic.started) {
                    clearInterval(melodyInterval);
                    return;
                }
                
                // Determine which phrase we're in (0-3)
                const phraseIndex = Math.floor(melodyIndex / 10) % 4;
                
                // Get current note within phrase
                const noteInPhrase = melodyIndex % 10;
                
                // Calculate actual note index
                const currentNoteIndex = phraseIndex * 10 + noteInPhrase;
                
                // Calculate transition time - slower on phrase endings for emotion
                const transitionTime = (noteInPhrase === 9) ? 0.45 : 0.2;
                
                // Update the main melody with clear, focused notes
                melodyOsc.frequency.exponentialRampToValueAtTime(
                    melodyNotes[currentNoteIndex % melodyNotes.length], 
                    this.audioContext.currentTime + transitionTime * 0.8
                );
                
                // Second oscillator creates harmonies rather than just doubling
                const harmonicOffset = (phraseIndex === 2) ? 3 : 5; // Different harmonies for emotional section
                melodyOsc2.frequency.exponentialRampToValueAtTime(
                    melodyNotes[(currentNoteIndex + harmonicOffset) % melodyNotes.length], 
                    this.audioContext.currentTime + transitionTime
                );
                
                // Bass follows root notes for foundation
                melodyOsc3.frequency.exponentialRampToValueAtTime(
                    melodyNotes[currentNoteIndex % melodyNotes.length] * 0.5, 
                    this.audioContext.currentTime + transitionTime * 1.2
                );
                
                // Increment melody counter
                melodyIndex++;
                noteIndex++;
                
                // Update chord progression - 10 melody notes per chord
                if (noteIndex % 10 === 0) {
                    // Calculate which chord we're on (0-3)
                    const chordIndex = Math.floor((noteIndex / 10) % 4) * 6; // 6 notes per chord
                    
                    // Update pad sounds with smooth transitions for background
                    padOsc.frequency.exponentialRampToValueAtTime(
                        notes[chordIndex], 
                        this.audioContext.currentTime + 2.5
                    );
                    
                    padOsc2.frequency.exponentialRampToValueAtTime(
                        notes[chordIndex + 2], 
                        this.audioContext.currentTime + 2.5
                    );
                    
                    // Subtle filter modulation synchronized with chord changes
                    lowpass.frequency.exponentialRampToValueAtTime(
                        3000 + Math.sin(noteIndex * 0.05) * 1500, // Musical filter sweep
                        this.audioContext.currentTime + 2.5
                    );
                    
                    // Subtle delay time modulation for added movement
                    melodyDelay.delayTime.exponentialRampToValueAtTime(
                        0.37 + Math.sin(noteIndex * 0.1) * 0.05, // Small delay time variations
                        this.audioContext.currentTime + 5
                    );
                }
            }, 375); // Slightly slower - more emotional and clear
        }, 500); // Initial pause for first note
    }
    
    /**
     * Update beat based on player speed - only at very high speeds
     */
    updateBeat(playerSpeed, maxSpeed) {
        if (!this.initialized || !this.backgroundMusic || !this.backgroundMusic.started) return;
        
        // Completely disable if the player isn't going extremely fast
        if (playerSpeed < maxSpeed * 0.8) {
            // No beat sounds at all until player is at 80% of max speed
            return;
        }
        
        const kickInterval = 2000; // Extremely slow beat (30 BPM)
        
        // Fixed interval - minimal speed adjustment
        const beatInterval = kickInterval * 0.9;
        
        const currentTime = this.audioContext.currentTime;
        if (currentTime - this.lastKickTime >= beatInterval / 1000) {
            // Only 10% chance of playing a kick to make it extremely rare
            if (Math.random() < 0.1) {
                this.playKick();
            }
            this.lastKickTime = currentTime;
        }
    }
    
    /**
     * Play a kick drum sound with vaporwave aesthetics
     */
    playKick() {
        if (!this.initialized) return;
        
        // Main kick oscillator - deeper and more analog
        const kickOsc = this.audioContext.createOscillator();
        const kickGain = this.audioContext.createGain();
        
        // Add a second oscillator for layered sound
        const kickOsc2 = this.audioContext.createOscillator();
        const kickGain2 = this.audioContext.createGain();
        
        // Add a click for more presence
        const clickOsc = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();
        
        // Create mild compression for balanced kick
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, this.audioContext.currentTime); // Higher threshold
        compressor.knee.setValueAtTime(6, this.audioContext.currentTime); // Gentler knee
        compressor.ratio.setValueAtTime(4, this.audioContext.currentTime); // Much lower ratio
        compressor.attack.setValueAtTime(0.005, this.audioContext.currentTime); // Slower attack
        compressor.release.setValueAtTime(0.2, this.audioContext.currentTime); // Faster release
        
        // Low-pass filter for more analog sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        
        // Main kick - extremely quiet
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(120, this.audioContext.currentTime);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.7);
        
        kickGain.gain.setValueAtTime(0.08, this.audioContext.currentTime); // Drastically reduced from 0.3 to 0.08
        kickGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.7);
        
        // Second layer - barely audible
        kickOsc2.type = 'triangle';
        kickOsc2.frequency.setValueAtTime(80, this.audioContext.currentTime);
        kickOsc2.frequency.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        kickGain2.gain.setValueAtTime(0.04, this.audioContext.currentTime); // Drastically reduced from 0.15 to 0.04
        kickGain2.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);
        
        // Click for attack - extremely subtle
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(1500, this.audioContext.currentTime);
        clickOsc.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.03);
        
        clickGain.gain.setValueAtTime(0.025, this.audioContext.currentTime); // Drastically reduced from 0.1 to 0.025
        clickGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.03);
        
        // Connect everything
        kickOsc.connect(kickGain);
        kickOsc2.connect(kickGain2);
        clickOsc.connect(clickGain);
        
        kickGain.connect(filter);
        kickGain2.connect(filter);
        clickGain.connect(compressor);
        filter.connect(compressor);
        
        compressor.connect(this.audioContext.destination);
        
        // Start and stop all oscillators
        kickOsc.start();
        kickOsc2.start();
        clickOsc.start();
        
        kickOsc.stop(this.audioContext.currentTime + 0.7);
        kickOsc2.stop(this.audioContext.currentTime + 0.6);
        clickOsc.stop(this.audioContext.currentTime + 0.03);
    }
    
    /**
     * Play error sound effect when colliding with obstacle
     */
    playErrorSound() {
        if (!this.initialized) return;
        
        // Create oscillator for error sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(40, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    /**
     * Play sound effect when hitting the wall/off-road
     */
    playHitWallSound() {
        if (!this.initialized) return;
        
        const oscillator = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const distortion = this.audioContext.createWaveShaper();
        
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            return curve;
        }
        
        distortion.curve = makeDistortionCurve(400);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.3);
        
        oscillator2.type = 'square';
        oscillator2.frequency.setValueAtTime(80, this.audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        // Connect everything
        oscillator.connect(distortion);
        oscillator2.connect(distortion);
        distortion.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Play the sounds
        oscillator.start();
        oscillator2.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
        oscillator2.stop(this.audioContext.currentTime + 0.5);
    }
    
    /**
     * Play collectible sound effect with vaporwave aesthetics
     */
    playCollectSound() {
        if (!this.initialized) return;
        
        // Create main oscillator for collect sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Add a second oscillator for synth chime sound
        const chimeOsc = this.audioContext.createOscillator();
        const chimeGain = this.audioContext.createGain();
        
        // Add a third oscillator for more harmonics
        const harmOsc = this.audioContext.createOscillator();
        const harmGain = this.audioContext.createGain();
        
        // Create reverb for dreamy effect
        const convolver = this.audioContext.createConvolver();
        const impulseLength = this.audioContext.sampleRate * 1.5; // 1.5 seconds
        const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        for (let i = 0; i < impulseLength; i++) {
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 1.5);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 1.5);
        }
        
        convolver.buffer = impulse;
        
        // Main tone - slower rise for vaporwave feel
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
        
        // Chime - higher pitched tone
        chimeOsc.type = 'triangle';
        chimeOsc.frequency.setValueAtTime(880, this.audioContext.currentTime);
        chimeOsc.frequency.linearRampToValueAtTime(1760, this.audioContext.currentTime + 0.4);
        
        chimeGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        chimeGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.4);
        
        // Harmonic - for richer sound
        harmOsc.type = 'sine';
        harmOsc.frequency.setValueAtTime(220, this.audioContext.currentTime);
        harmOsc.frequency.linearRampToValueAtTime(440, this.audioContext.currentTime + 0.25);
        
        harmGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        harmGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.25);
        
        // Connect nodes with reverb
        oscillator.connect(gainNode);
        chimeOsc.connect(chimeGain);
        harmOsc.connect(harmGain);
        
        gainNode.connect(convolver);
        chimeGain.connect(convolver);
        harmGain.connect(convolver);
        
        // Direct output for clarity plus reverb for atmosphere
        gainNode.connect(this.audioContext.destination);
        convolver.connect(this.audioContext.destination);
        
        // Start and stop all oscillators
        oscillator.start();
        chimeOsc.start();
        harmOsc.start();
        
        oscillator.stop(this.audioContext.currentTime + 0.3);
        chimeOsc.stop(this.audioContext.currentTime + 0.4);
        harmOsc.stop(this.audioContext.currentTime + 0.25);
    }
    
    /**
     * Stop all audio
     */
    stopAll() {
        if (!this.initialized) return;
        
        // Stop background music
        if (this.backgroundMusic) {
            try {
                // Stop all oscillators cleanly
                this.backgroundMusic.bassOsc.stop();
                this.backgroundMusic.melodyOsc.stop();
                
                // Stop additional melody oscillators
                if (this.backgroundMusic.melodyOsc2) {
                    this.backgroundMusic.melodyOsc2.stop();
                }
                if (this.backgroundMusic.melodyOsc3) {
                    this.backgroundMusic.melodyOsc3.stop();
                }
                
                // Stop pad oscillators
                this.backgroundMusic.padOsc.stop();
                if (this.backgroundMusic.padOsc2) {
                    this.backgroundMusic.padOsc2.stop();
                }
                
                // Stop modulation LFO if it exists
                if (this.chorusLFO) {
                    this.chorusLFO.stop();
                }
                
                // Mark as stopped to ensure intervals don't continue
                this.backgroundMusic.started = false;
                
                // Clear any audio intervals
                if (this.melodyInterval) {
                    clearInterval(this.melodyInterval);
                }
            } catch (e) {
                console.error("Error stopping background music", e);
            }
        }
    }
}

// Export the audio class
export { AudioSystem };