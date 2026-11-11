/* ============================================================
   RETRO PIXEL AUDIO SYNTHESIZER (CPS-2 ARCADE FLAVOR)
   Crunchy 16-bit arcade audio synthesized in Web Audio API.
   Includes: Hit Cancels, Super Jumps, Skids, Parries, Smashes.
   ============================================================ */

class SoundController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicEnabled = true;
        this.masterVolume = 0.40;
        this.sfxVolume = 0.85;
        this.musicVolume = 0.35;

        // Sample audio buffers cache
        this.samples = {};
        this.sampleLoading = {};
        this.samplePaths = {
            punchLight: 'assets/sfx/combat-impact-sfx-lite-12/wav/punch/sfx_punch_01_jab.wav',
            punchHeavy: 'assets/sfx/combat-impact-sfx-lite-12/wav/punch/sfx_punch_12_critical_punch.wav',
            parry: 'assets/sfx/combat-impact-sfx-lite-12/wav/parry/sfx_parry_01_perfect_parry.wav',
            parryFlurry: 'assets/sfx/combat-impact-sfx-lite-12/wav/parry/sfx_parry_10_parry_flurry.wav',
            block: 'assets/sfx/combat-impact-sfx-lite-12/wav/block/sfx_block_01_shield_wood.wav',
            armorHit: 'assets/sfx/combat-impact-sfx-lite-12/wav/armor/sfx_armor_10_gauntlet_punch.wav',
            boneCrunch: 'assets/sfx/combat-impact-sfx-lite-12/wav/crush/sfx_crush_01_bone_crunch.wav',
            finisherSlam: 'assets/sfx/combat-impact-sfx-lite-12/wav/crush/sfx_crush_10_finisher_slam.wav',
            slash: 'assets/sfx/combat-impact-sfx-lite-12/wav/slash/sfx_slash_01_sword_swipe.wav'
        };

        // BGM audio element
        this.bgm = null;
        this.bgmPlaying = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.preloadSamples();
        this.initBGM();
    }

    async loadSample(key, url) {
        if (!this.ctx || this.samples[key] || this.sampleLoading[key]) return;
        this.sampleLoading[key] = true;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return;
            const arrayBuf = await resp.arrayBuffer();
            this.ctx.decodeAudioData(arrayBuf, (decoded) => {
                this.samples[key] = decoded;
            }, () => {});
        } catch (e) {
            // Fallback to synth silently
        }
    }

    preloadSamples() {
        if (!this.ctx) return;
        for (const [key, url] of Object.entries(this.samplePaths)) {
            this.loadSample(key, url);
        }
    }

    playSample(key, volumeScale = 1.0) {
        if (!this.enabled || !this.ctx) return false;
        const buf = this.samples[key];
        if (!buf) return false;

        try {
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            const gain = this.ctx.createGain();
            gain.gain.value = this.masterVolume * this.sfxVolume * volumeScale;
            src.connect(gain);
            gain.connect(this.ctx.destination);
            src.start(0);
            return true;
        } catch (e) {
            return false;
        }
    }

    initBGM() {
        if (!this.bgm) {
            try {
                this.bgm = new Audio('assets/music/Fightwave.wav');
                this.bgm.loop = true;
                this.bgm.volume = this.musicVolume;
            } catch (e) {}
        }
    }

    startBGM() {
        if (!this.musicEnabled) return;
        this.initBGM();
        if (this.bgm && this.bgm.paused) {
            this.bgm.volume = this.musicVolume;
            const playPromise = this.bgm.play();
            if (playPromise) playPromise.catch(() => {});
            this.bgmPlaying = true;
        }
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
            this.bgmPlaying = false;
        }
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startBGM();
        } else {
            if (this.bgm) this.bgm.pause();
            this.bgmPlaying = false;
        }
        return this.musicEnabled;
    }

    createNoiseBuffer(duration = 0.2) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Street Fighter Alpha Turnaround Skid (shoe screech)
    playSkid() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

        gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Marvel vs Capcom Super Jump rocket whoosh
    playSuperJump() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.18);

        gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Vampire Savior Magic Series Hit-Cancel audio feedback
    playCancelChime() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987, now);
        osc.frequency.exponentialRampToValueAtTime(1318, now + 0.06);

        gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Light attack whoosh / swing
    playSwing() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

        gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    // Light punch / kick impact
    playLightHit() {
        if (!this.enabled) return;
        if (this.playSample('punchLight', 1.0)) return;
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

        gain.gain.setValueAtTime(this.masterVolume * 0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.05);
        if (noise.buffer) {
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(this.masterVolume * 0.45, now);
            nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            noise.connect(nGain);
            nGain.connect(this.ctx.destination);
            noise.start(now);
        }
    }

    // Heavy smash hit / ground bounce
    playHeavyHit(strength = 5) {
        if (!this.enabled) return;
        if (this.playSample('punchHeavy', 1.15)) {
            if (strength >= 7) this.playSample('boneCrunch', 0.95);
            return;
        }
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const intensity = Math.min(1.5, 0.7 + (strength / 10) * 0.8);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.25);

        gain.gain.setValueAtTime(this.masterVolume * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.16);
        if (noise.buffer) {
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(this.masterVolume * intensity * 0.85, now);
            nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
            noise.connect(nGain);
            nGain.connect(this.ctx.destination);
            noise.start(now);
        }
    }

    // Dash / Flicker step
    playDash() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

        gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Block / Metallic Armor Clank
    playBlock(isArmor = false) {
        if (!this.enabled) return;
        if (this.playSample(isArmor ? 'armorHit' : 'block', 1.05)) return;
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isArmor ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(isArmor ? 650 : 800, now);
        osc.frequency.exponentialRampToValueAtTime(isArmor ? 200 : 350, now + 0.12);

        gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Perfect Parry chime
    playParry() {
        if (!this.enabled) return;
        if (this.playSample('parry', 1.25)) return;
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [880, 1320, 1760].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.02);

            gain.gain.setValueAtTime(this.masterVolume * 0.5, now + i * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.02);
            osc.stop(now + 0.35);
        });
    }

    // Super / Overdrive Activation
    playSuperCharge() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.38);

        gain.gain.setValueAtTime(this.masterVolume * 0.7, now);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.9, now + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
    }

    // Super Final Explosion
    playSuperExplosion() {
        if (!this.enabled) return;
        this.playSample('finisherSlam', 1.3);
        this.playSample('boneCrunch', 1.0);
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);

        gain.gain.setValueAtTime(this.masterVolume * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.5);
        if (noise.buffer) {
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(this.masterVolume * 1.0, now);
            nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            noise.connect(nGain);
            nGain.connect(this.ctx.destination);
            noise.start(now);
        }
    }

    // Jump sound with liftoff snap
    playJump() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.09);

        gain.gain.setValueAtTime(this.masterVolume * 0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playSelect() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.setValueAtTime(820, now + 0.04);
        gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }
}

window.soundSystem = new SoundController();
