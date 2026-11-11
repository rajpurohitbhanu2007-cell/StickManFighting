/* ============================================================
   STICK CLASH : STAT OVERLOAD - MAIN ENGINE (FULLSCREEN & SCENES)
   Manages Title Menu, Roster Selection, In-Game Combat,
   Fullscreen API, Dynamic Camera, and Practice Dummy Mode.
   ============================================================ */

const PRESET_ARCHETYPES = {
    balanced: {
        id: 'balanced',
        name: 'The Balanced',
        tag: 'ALL-ROUNDER MARTIAL ARTIST',
        desc: 'Adaptable fighter with reliable combos, swift recovery, and well-rounded defense.',
        specialName: 'DRAGON FLURRY',
        specialDesc: 'Chains rapid punches into a soaring dragon uppercut.',
        str: 5, spd: 5, def: 5,
        palette: { primary: '#38bdf8', accent: '#0284c7', eye: '#ffffff' }
    },
    titan: {
        id: 'titan',
        name: 'The Titan',
        tag: 'PURE STRENGTH GLASS CANNON',
        desc: 'Crushes opponents in 2-3 hits. Massive wall-splat knockback and bone-breaking smashes.',
        specialName: 'CRATER SMASH',
        specialDesc: 'Leaps into the air and hammers the ground, creating a shockwave crater.',
        str: 10, spd: 3, def: 2,
        palette: { primary: '#ef4444', accent: '#b91c1c', eye: '#fef08a' }
    },
    phantom: {
        id: 'phantom',
        name: 'The Phantom',
        tag: 'SPEED DEMON ASSASSIN',
        desc: 'Leaves afterimages with every step. Unstoppable 10-hit flurries and instant phase dashes.',
        specialName: 'PHANTOM CUTTER',
        specialDesc: 'Phases behind the opponent and unleashes a cross-slash in frozen time.',
        str: 2, spd: 10, def: 3,
        palette: { primary: '#d946ef', accent: '#9333ea', eye: '#fdf4ff' }
    },
    fortress: {
        id: 'fortress',
        name: 'The Fortress',
        tag: 'UNSTOPPABLE IRON WALL',
        desc: 'Massive health pool. Shrugs off light attacks with golden Super Armor without flinching.',
        specialName: 'AEGIS BASTION',
        specialDesc: 'Unlocks impenetrable hyper-armor and counters with a shield-crushing blow.',
        str: 2, spd: 3, def: 10,
        palette: { primary: '#eab308', accent: '#ca8a04', eye: '#fde047' }
    },
    berserker: {
        id: 'berserker',
        name: 'The Berserker',
        tag: 'HIGH STR + SPD RUSHDOWN',
        desc: 'Lethal glass rushdown. Closes distance instantly and annihilates defenses.',
        specialName: 'BLOOD STORM',
        specialDesc: 'Spins in a violent whirlwind of high-speed heavy kicks.',
        str: 7, spd: 7, def: 1,
        palette: { primary: '#f97316', accent: '#c2410c', eye: '#ffedd5' }
    },
    juggernaut: {
        id: 'juggernaut',
        name: 'The Juggernaut',
        tag: 'HIGH STR + DEF BRUISER',
        desc: 'Trades blows and wins every exchange. High damage paired with heavy armor plates.',
        specialName: 'METEOR TACKLE',
        specialDesc: 'Charges forward absorbing hits and drives the opponent through the wall.',
        str: 7, spd: 2, def: 6,
        palette: { primary: '#a855f7', accent: '#7e22ce', eye: '#f3e8ff' }
    },
    duelist: {
        id: 'duelist',
        name: 'The Duelist',
        tag: 'HIGH SPD + DEF TACTICIAN',
        desc: 'Master of spacing, Third Strike parries, and lethal counter-poking with high stamina.',
        specialName: 'PERFECT RIPOSTE',
        specialDesc: 'Enter a parry stance that triggers an instant-kill counter upon being struck.',
        str: 2, spd: 7, def: 6,
        palette: { primary: '#10b981', accent: '#047857', eye: '#a7f3d0' }
    }
};

window.PRESET_ARCHETYPES = PRESET_ARCHETYPES;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Virtual Pixel Resolution (Retro 16:9)
        this.vWidth = 960;
        this.vHeight = 540;
        this.canvas.width = this.vWidth;
        this.canvas.height = this.vHeight;

        // Camera Engine
        this.camera = {
            x: this.vWidth / 2,
            y: this.vHeight / 2,
            zoom: 1.0,
            targetZoom: 1.0,
            targetX: this.vWidth / 2,
            targetY: this.vHeight / 2
        };

        // Game State: 'TITLE', 'SELECT', 'COUNTDOWN', 'FIGHTING', 'ROUND_OVER'
        this.gameState = 'TITLE';
        this.gameMode = 'DUMMY'; // 'DUMMY' (Practice Sandbag), 'PVE' (VS AI)
        this.aiDifficulty = 'MEDIUM';
        this.currentStage = 'citadel'; // 'citadel' or any of the 12 fantasy stages

        // P1 & P2 Build Configurations
        this.p1Build = { ...PRESET_ARCHETYPES.balanced };
        this.p2Build = { ...PRESET_ARCHETYPES.fortress };

        // Fighter Instances
        this.p1 = null;
        this.p2 = null;
        this.aiController = null;

        // Preview dummy for Roster Select screen
        this.previewFighter = new window.Fighter({
            id: 'preview',
            name: this.p1Build.name,
            x: 230,
            y: 350,
            facing: 1,
            str: this.p1Build.str,
            spd: this.p1Build.spd,
            def: this.p1Build.def,
            palette: this.p1Build.palette
        });

        // Match Flow
        this.roundTimer = 99;
        this.roundTimerFrames = 0;
        this.countdownFrames = 0;
        this.winner = null;
        this.slowMoCounter = 0;

        // Input Trackers
        this.keys = {};
        this.prevKeys = {};
        this.virtualInputs = { left: false, right: false, down: false };
        this.initInputListeners();

        // Start Loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    initInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            window.soundSystem.init();

            // 'F' key toggles fullscreen
            if (e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                // Only if not typing in an input
                if (document.activeElement.tagName !== 'INPUT') {
                    this.toggleFullscreen();
                }
            }

            // 'Tab' key toggles combat HUD overlay
            if (e.code === 'Tab') {
                e.preventDefault();
                if (typeof window.toggleCombatHud === 'function') {
                    window.toggleCombatHud();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Ensure canvas stays focused
        window.addEventListener('click', () => {
            this.canvas.focus();
        });
    }

    toggleFullscreen() {
        // Native desktop app bridge (pywebview)
        if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
            window.pywebview.api.toggle_fullscreen();
            return;
        }

        // Web browser fullscreen API
        const root = document.getElementById('game-root');
        if (!document.fullscreenElement) {
            if (root.requestFullscreen) {
                root.requestFullscreen();
            } else if (root.webkitRequestFullscreen) {
                root.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    startMatch() {
        // Instantiate P1
        this.p1 = new window.Fighter({
            id: 'p1',
            name: 'PLAYER 1',
            x: 280,
            y: 460,
            facing: 1,
            str: this.p1Build.str,
            spd: this.p1Build.spd,
            def: this.p1Build.def,
            palette: this.p1Build.palette
        });
        this.p1.archetypeTitle = this.p1Build.name;

        // Instantiate P2 (CPU or Practice Dummy)
        const isDummy = (this.gameMode === 'DUMMY');
        this.p2 = new window.Fighter({
            id: 'p2',
            name: isDummy ? 'PRACTICE DUMMY' : 'CPU OPPONENT',
            x: 680,
            y: 460,
            facing: -1,
            str: this.p2Build.str,
            spd: this.p2Build.spd,
            def: this.p2Build.def,
            palette: isDummy ? { primary: '#94a3b8', accent: '#64748b', eye: '#e2e8f0' } : this.p2Build.palette,
            isAI: !isDummy
        });
        this.p2.archetypeTitle = this.p2Build.name;
        this.p2.archetypeId = this.p2Build.id;

        this.p1.opponent = this.p2;
        this.p2.opponent = this.p1;

        if (!isDummy) {
            this.aiController = new window.CombatAI(this.p2, this.p1, this.aiDifficulty);
        } else {
            this.aiController = null;
        }

        this.roundTimer = 99;
        this.roundTimerFrames = 0;
        this.countdownFrames = 80;
        this.winner = null;
        this.gameState = 'COUNTDOWN';
        this.slowMoCounter = 0;

        window.soundSystem.playSelect();
        window.soundSystem.startBGM();
        window.particleSystem.triggerFlash('#ffffff', 0.6);
    }

    isDown(code) {
        return !!this.keys[code];
    }

    justPressed(code) {
        return !!this.keys[code] && !this.prevKeys[code];
    }

    pollInputs() {
        // Punches (Numpad or Tenkeyless top row: U, I, O, or number row 7, 8, 9)
        const lp = this.justPressed('Numpad7') || this.justPressed('KeyU') || this.justPressed('Digit7');
        const mp = this.justPressed('Numpad8') || this.justPressed('KeyI') || this.justPressed('Digit8');
        const hp = this.justPressed('Numpad9') || this.justPressed('KeyO') || this.justPressed('Digit9');

        // Kicks (Numpad or Tenkeyless home row: J, K, L, or number row 4, 5, 6)
        const lk = this.justPressed('Numpad4') || this.justPressed('KeyJ') || this.justPressed('Digit4');
        const mk = this.justPressed('Numpad5') || this.justPressed('KeyK') || this.justPressed('Digit5');
        const hk = this.justPressed('Numpad6') || this.justPressed('KeyL') || this.justPressed('Digit6');

        // Macros & Extras
        // THROW (Key H on compact keyboard, or Left Shift, or Key T, or simultaneous LP+LK)
        const throwAction = this.justPressed('KeyH') || this.justPressed('ShiftLeft') || this.justPressed('KeyT') || this.justPressed('KeyV') || (lp && lk) || this.virtualInputs.throw;
        // PARRY (Key P on compact keyboard, or Numpad +, or Equal =, or simultaneous MP+MK)
        const parryAction = this.justPressed('KeyP') || this.justPressed('NumpadAdd') || this.justPressed('Equal') || (mp && mk) || this.virtualInputs.parry;
        // DRIVE IMPACT (Numpad 0 or Key Y or Digit 0 or simultaneous HP+HK)
        const driveImpactAction = this.justPressed('Numpad0') || this.justPressed('KeyY') || this.justPressed('Digit0') || (hp && hk);
        // OVERDRIVE SUPER (Numpad 1 or Key G or Key B or Digit 1)
        const superAction = this.justPressed('Numpad1') || this.justPressed('KeyG') || this.justPressed('KeyB') || this.justPressed('Digit1');
        // DASH (Numpad 2 or Key N or Key M or Digit 2)
        const dashAction = this.justPressed('Numpad2') || this.justPressed('KeyN') || this.justPressed('KeyM') || this.justPressed('Digit2');

        // P1: Hitbox A/S/D + Spacebar for Jump + Virtual Buttons
        const p1Input = {
            left: this.isDown('KeyA') || (this.gameMode !== 'PVP' && this.isDown('ArrowLeft')) || this.virtualInputs.left,
            right: this.isDown('KeyD') || (this.gameMode !== 'PVP' && this.isDown('ArrowRight')) || this.virtualInputs.right,
            down: this.isDown('KeyS') || (this.gameMode !== 'PVP' && this.isDown('ArrowDown')) || this.virtualInputs.down,
            jump: this.justPressed('Space') || (this.gameMode !== 'PVP' && this.justPressed('KeyW')),
            lp, mp, hp,
            lk, mk, hk,
            throw: throwAction,
            parry: parryAction,
            driveImpact: driveImpactAction,
            super: superAction,
            dash: dashAction
        };

        // P2: Driven by AI in PVE mode, or completely idle in DUMMY mode
        let p2Input;
        if (this.gameMode === 'PVE' && this.aiController) {
            p2Input = this.aiController.update();
        } else {
            p2Input = {};
        }

        return { p1Input, p2Input };
    }

    update() {
        if (window.particleSystem) window.particleSystem.update();

        // Update preview fighter in Roster Select
        if (this.gameState === 'SELECT' && this.previewFighter) {
            this.previewFighter.update();
            return;
        }

        if (this.gameState === 'TITLE') {
            return;
        }

        // Countdown State ("READY... FIGHT!")
        if (this.gameState === 'COUNTDOWN') {
            this.countdownFrames--;
            if (this.countdownFrames <= 0) {
                this.gameState = 'FIGHTING';
                window.particleSystem.addFloatingText('FIGHT!', this.vWidth / 2, 220, '#fbbf24', 36, true);
                window.soundSystem.playHeavyHit(8);
            }
            return;
        }

        // Round Timer
        if (this.gameState === 'FIGHTING') {
            this.roundTimerFrames++;
            if (this.roundTimerFrames >= 60) {
                this.roundTimerFrames = 0;
                if (this.gameMode !== 'DUMMY') {
                    this.roundTimer--;
                    if (this.roundTimer <= 0) {
                        this.finishRoundByTimeout();
                    }
                }
            }
        }

        // Hitstop pauses characters
        if (window.particleSystem.hitstopFrames > 0) {
            return;
        }

        // Slow motion update after KO
        if (this.gameState === 'ROUND_OVER') {
            this.slowMoCounter++;
            if (this.slowMoCounter % 3 !== 0) return;
        }

        const { p1Input, p2Input } = this.pollInputs();

        this.p1.handleInput(p1Input);
        this.p2.handleInput(p2Input);

        this.p1.update();
        this.p2.update();

        window.physicsEngine.resolveFighterPush(this.p1, this.p2);

        this.checkCombatHits(this.p1, this.p2);
        this.checkCombatHits(this.p2, this.p1);

        // Check for KO or Dummy Regen
        if (this.gameState === 'FIGHTING') {
            if (this.gameMode === 'DUMMY') {
                if (this.p2.currentHp < this.p2.maxHp) {
                    this.p2.currentHp = Math.min(this.p2.maxHp, this.p2.currentHp + 0.6);
                }
                if (this.p1.currentHp < this.p1.maxHp) {
                    this.p1.currentHp = this.p1.maxHp;
                }
            } else if (this.p1.currentHp <= 0 || this.p2.currentHp <= 0) {
                this.finishRoundByKO();
            }
        }

        this.updateCamera();

        // Edge-trigger tracking
        this.prevKeys = { ...this.keys };
    }

    checkCombatHits(attacker, defender) {
        if (!attacker.isAttacking || !attacker.activeHitbox || attacker.attackHasHit) {
            return;
        }

        const hitbox = attacker.activeHitbox;
        const hurtbox = defender.getHurtbox();

        if (window.PhysicsEngine.checkOverlap(hitbox, hurtbox)) {
            attacker.attackHasHit = true;
            defender.takeHit(hitbox.data, attacker);
        }
    }

    finishRoundByKO() {
        this.gameState = 'ROUND_OVER';
        window.particleSystem.triggerFlash('#ffffff', 0.9);
        window.particleSystem.triggerHitstop(25);
        window.soundSystem.playSuperExplosion();

        if (this.p1.currentHp <= 0 && this.p2.currentHp <= 0) {
            this.winner = 'DRAW';
            window.particleSystem.addFloatingText('DOUBLE K.O.!', this.vWidth / 2, 200, '#ef4444', 38, true);
        } else if (this.p1.currentHp <= 0) {
            this.winner = this.p2.name;
            window.particleSystem.addFloatingText('K.O.!', this.vWidth / 2, 200, '#ef4444', 42, true);
        } else {
            this.winner = this.p1.name;
            window.particleSystem.addFloatingText('K.O.!', this.vWidth / 2, 200, '#fbbf24', 42, true);
        }
    }

    finishRoundByTimeout() {
        this.gameState = 'ROUND_OVER';
        if (this.p1.currentHp > this.p2.currentHp) {
            this.winner = this.p1.name;
        } else if (this.p2.currentHp > this.p1.currentHp) {
            this.winner = this.p2.name;
        } else {
            this.winner = 'DRAW';
        }
        window.particleSystem.addFloatingText('TIME OVER!', this.vWidth / 2, 200, '#f97316', 36, true);
    }

    updateCamera() {
        if (!this.p1 || !this.p2) return;

        const midX = (this.p1.x + this.p2.x) / 2;
        const midY = (this.p1.y + this.p2.y) / 2 - 25;
        const dist = Math.abs(this.p1.x - this.p2.x);

        let targetZoom = 1.15 - (dist / 960) * 0.45;
        if (this.gameState === 'ROUND_OVER') targetZoom = 1.35;
        targetZoom = Math.min(1.4, Math.max(0.85, targetZoom));

        this.camera.targetZoom = targetZoom;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;

        this.camera.targetX = midX;
        this.camera.targetY = midY;
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;
    }

    render() {
        if (!window.stickRenderer) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.vWidth, this.vHeight);

        // In Title or Select mode: render atmospheric pixel background
        if (this.gameState === 'TITLE' || this.gameState === 'SELECT') {
            window.stickRenderer.renderArena(ctx, Date.now() * 0.002, this.currentStage);
            if (window.particleSystem) window.particleSystem.render(ctx);

            if (this.gameState === 'SELECT' && this.previewFighter) {
                // Draw illuminated platform under preview fighter
                ctx.save();
                ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
                ctx.beginPath();
                ctx.ellipse(230, 352, 60, 14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                window.stickRenderer.render(ctx, this.previewFighter);
            }
            return;
        }

        ctx.save();

        // 1. Screenshake & Camera Transform
        const shakeX = window.particleSystem ? window.particleSystem.shakeX : 0;
        const shakeY = window.particleSystem ? window.particleSystem.shakeY : 0;

        ctx.translate(this.vWidth / 2 + shakeX, this.vHeight / 2 + shakeY);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // 2. Render Arena (Castle or Selected Fantasy Stage)
        window.stickRenderer.renderArena(ctx, Date.now() * 0.002, this.currentStage);

        // 3. Render Particles & Afterimages
        if (window.particleSystem) window.particleSystem.render(ctx);

        // 4. Render Stickmen
        if (this.p1) window.stickRenderer.render(ctx, this.p1);
        if (this.p2) window.stickRenderer.render(ctx, this.p2);

        ctx.restore();

        // 5. Render Screen Flash
        if (window.particleSystem) window.particleSystem.renderScreenFlash(ctx, this.vWidth, this.vHeight);

        // 6. Render In-Game Battle HUD & On-Screen Key Legends
        window.stickRenderer.renderBattleHUD(ctx, this.p1, this.p2, this.roundTimer, this.gameMode);

        // 7. Render Overlays (Ready / Winner)
        this.renderOverlays(ctx);
    }

    renderOverlays(ctx) {
        if (this.gameState === 'COUNTDOWN') {
            ctx.save();
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 44px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 10;
            ctx.fillText('READY...', this.vWidth / 2, this.vHeight / 2 - 20);
            ctx.restore();
        } else if (this.gameState === 'ROUND_OVER') {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(0, this.vHeight / 2 - 70, this.vWidth, 140);

            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 46px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.winner === 'DRAW' ? 'DRAW GAME!' : `${this.winner} WINS!`, this.vWidth / 2, this.vHeight / 2);

            ctx.font = 'bold 15px "Courier New", monospace';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText('PRESS [SPACE] TO REMATCH OR CLICK BUILDS FOR NEW ROSTER', this.vWidth / 2, this.vHeight / 2 + 45);
            ctx.restore();

            if (this.keys['Space'] && this.slowMoCounter > 60) {
                this.startMatch();
            }
        }
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

window.GameEngine = Game;
