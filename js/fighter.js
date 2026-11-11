/* ============================================================
   FIGHTER CLASS & COMBAT ENGINE (6-BUTTON CAPCOM SUITE)
   Implements full Street Fighter / Vampire Savior 6-button suite:
   - Hitbox Layout: A (Left), S (Crouch), D (Right), Space (Jump)
   - Punches: LP (Numpad 7 / U), MP (Numpad 8 / I), HP (Numpad 9 / O)
   - Kicks:   LK (Numpad 4 / J), MK (Numpad 5 / K), HK (Numpad 6 / L)
   - Extras:  Throw, Parry (V-Skill), Drive Impact, Overdrive (PPP), Dash (KKK)
   - Magic Series: LP ➔ MP ➔ HP or LK ➔ MK ➔ HK cancels on hit!
   ============================================================ */

class Fighter {
    constructor(config) {
        this.id = config.id || 'p1';
        this.name = config.name || 'Fighter';
        this.isAI = config.isAI || false;

        // Position & Sub-pixel Velocity
        this.x = config.x || 200;
        this.y = config.y || 460;
        this.vx = 0;
        this.vy = 0;
        this.facing = config.facing || 1;
        this.isGrounded = true;

        // Visual Squash and Stretch
        this.scaleX = 1.0;
        this.scaleY = 1.0;

        // Dimensions
        this.width = 28;
        this.height = 62;

        // Colors
        this.palette = config.palette || {
            primary: '#38bdf8',
            accent: '#0284c7',
            eye: '#ffffff'
        };

        // Stats
        this.stats = {
            str: config.str || 5,
            spd: config.spd || 5,
            def: config.def || 5
        };

        this.applyStats();

        // Health & Super Bar
        this.currentHp = this.maxHp;
        this.superMeter = 0;
        this.maxSuper = 100;

        // States
        this.state = 'IDLE'; // IDLE, CROUCH, RUN, SKID, PRE_JUMP, JUMP, FALL, LAND_SQUASH, DASH, SUPER_JUMP, THROW_TECH, etc.
        this.stateTime = 0;

        // Combat Flags
        this.isAttacking = false;
        this.currentAttack = null;
        this.attackHasHit = false;
        this.canCancel = false;
        this.hitStunTimer = 0;
        this.blockStun = 0;
        this.dashCooldown = 0;
        this.invincibleFrames = 0;
        this.parryWindow = 0;
        this.poiseActive = false;
        this.driveArmorHits = 0; // Drive Impact can absorb 2 hits

        // Input Buffer Queue (8 frames memory)
        this.inputBuffer = [];

        // Scarf simulation
        this.scarfPoints = [];
        for (let i = 0; i < 6; i++) {
            this.scarfPoints.push({ x: this.x - this.facing * i * 4, y: this.y - 48, oldX: this.x, oldY: this.y - 48 });
        }

        this.activeHitbox = null;
        this.attackTrail = [];
    }

    applyStats() {
        const { str, spd, def } = this.stats;

        // DEF
        this.maxHp = Math.round(90 + (def - 1) * 14);
        this.weight = 1.0 + (def / 10) * 0.9;
        this.damageReduction = Math.min(0.42, (def / 10) * 0.38);

        // STR
        this.damageMultiplier = 0.55 + (str / 10) * 1.45;
        this.knockbackMultiplier = 0.65 + (str / 10) * 1.35;
        this.hitstopBonus = Math.floor(str * 1.1);

        // SPD
        this.maxRunSpeed = 4.4 + (spd / 10) * 4.4;
        this.runAccel = 0.85 + (spd / 10) * 0.65;
        this.groundFriction = 0.78;
        this.airFriction = 0.96;
        this.dashSpeed = 9.5 + (spd / 10) * 5.0;
        this.jumpPower = -12.4 - (spd / 10) * 1.6;
        this.maxDashCooldown = Math.max(10, Math.round(34 - spd * 2.2));
        this.speedFrameFactor = Math.max(0.65, 1.25 - (spd / 10) * 0.55);
    }

    bufferInput(action) {
        this.inputBuffer.push({ action, age: 0 });
    }

    consumeBuffer(action) {
        const idx = this.inputBuffer.findIndex(i => i.action === action);
        if (idx !== -1) {
            this.inputBuffer.splice(idx, 1);
            return true;
        }
        return false;
    }

    handleInput(rawInput) {
        if (this.state === 'HIT_STUN' || this.state === 'KNOCKDOWN' || this.state === 'SUPER_CINEMATIC') {
            return;
        }

        // Buffer Discrete Actions
        if (rawInput.lp) this.bufferInput('LP');
        if (rawInput.mp) this.bufferInput('MP');
        if (rawInput.hp) this.bufferInput('HP');
        if (rawInput.lk) this.bufferInput('LK');
        if (rawInput.mk) this.bufferInput('MK');
        if (rawInput.hk) this.bufferInput('HK');
        if (rawInput.throw) this.bufferInput('THROW');
        if (rawInput.parry) this.bufferInput('PARRY');
        if (rawInput.driveImpact) this.bufferInput('DRIVE_IMPACT');
        if (rawInput.super) this.bufferInput('SUPER');
        if (rawInput.dash) this.bufferInput('DASH');
        if (rawInput.jump) this.bufferInput('JUMP');

        // 1. Super / Overdrive (PPP macro or Numpad 1 / G / B)
        if (this.consumeBuffer('SUPER') && this.superMeter >= 100 && (!this.isAttacking || this.canCancel) && this.isGrounded) {
            this.triggerSuper();
            return;
        }

        // 2. Drive Impact (HP + HK macro or Numpad 0 / Y)
        if (this.consumeBuffer('DRIVE_IMPACT') && (!this.isAttacking || this.canCancel) && this.isGrounded) {
            this.startAttack('DRIVE_IMPACT');
            return;
        }

        // 3. Parry / V-Skill (MP + MK macro or Numpad + / H)
        if (this.consumeBuffer('PARRY') && (!this.isAttacking || this.canCancel) && this.isGrounded) {
            this.triggerParryStance();
            return;
        }

        // 4. Throw (LP + LK macro or Left Shift / H)
        if (this.consumeBuffer('THROW') && (!this.isAttacking || this.canCancel) && this.isGrounded) {
            this.triggerThrow();
            return;
        }

        // 5. Dash (KKK macro or Numpad 2 / N / M)
        if (this.consumeBuffer('DASH') && this.dashCooldown <= 0 && (!this.isAttacking || this.canCancel)) {
            this.triggerDash(rawInput.left ? -1 : (rawInput.right ? 1 : this.facing));
            return;
        }

        // 6. Super Jump Cancel (Marvel vs Capcom follow-up on HK Launcher)
        if (this.isAttacking && this.canCancel && this.currentAttack && this.currentAttack.name === 'HK') {
            if (rawInput.jump || this.consumeBuffer('JUMP')) {
                this.triggerSuperJump();
                return;
            }
        }

        // 7. Vampire Savior "Magic Series" Hit-Cancels (LP ➔ MP ➔ HP or LK ➔ MK ➔ HK)
        if (this.isAttacking && this.canCancel) {
            const currentTier = this.currentAttack ? this.currentAttack.tier : 0;
            // Higher tier punch cancel
            if (this.consumeBuffer('HP') && currentTier < 3) {
                window.soundSystem.playCancelChime();
                this.startAttack('HP');
                return;
            } else if (this.consumeBuffer('MP') && currentTier < 2) {
                window.soundSystem.playCancelChime();
                this.startAttack('MP');
                return;
            } else if (this.consumeBuffer('HK') && currentTier < 3) {
                window.soundSystem.playCancelChime();
                this.startAttack('HK');
                return;
            } else if (this.consumeBuffer('MK') && currentTier < 2) {
                window.soundSystem.playCancelChime();
                this.startAttack('MK');
                return;
            }
        }

        // 8. Standard Attack Execution (6-Button Suite)
        if (!this.isAttacking && this.state !== 'PRE_JUMP' && this.state !== 'PARRY_STANCE') {
            if (this.consumeBuffer('LP')) return this.startAttack('LP');
            if (this.consumeBuffer('MP')) return this.startAttack('MP');
            if (this.consumeBuffer('HP')) return this.startAttack('HP');
            if (this.consumeBuffer('LK')) return this.startAttack('LK');
            if (this.consumeBuffer('MK')) return this.startAttack('MK');
            if (this.consumeBuffer('HK')) return this.startAttack('HK');
        }

        // 9. Locomotion & Crouch (Hitbox style: Space = Jump, S = Crouch)
        if (!this.isAttacking && this.state !== 'PARRY_STANCE') {
            // Jump (Spacebar)
            if ((rawInput.jump || this.consumeBuffer('JUMP')) && this.isGrounded && this.state !== 'PRE_JUMP') {
                this.state = 'PRE_JUMP';
                this.stateTime = 0;
                this.scaleX = 1.25;
                this.scaleY = 0.75;
                return;
            }

            // Crouch (S key)
            if (rawInput.down && this.isGrounded) {
                this.state = 'CROUCH';
                this.vx *= 0.65;
                return;
            } else if (this.state === 'CROUCH' && !rawInput.down) {
                this.state = 'IDLE';
            }

            // Left / Right Movement
            if (rawInput.left) {
                if (this.facing === 1 && this.vx > 2.5 && this.isGrounded) {
                    this.state = 'SKID';
                    this.stateTime = 0;
                    window.soundSystem.playSkid();
                    window.particleSystem.burstSkidDust(this.x, this.y, 1);
                } else {
                    this.vx = Math.max(-this.maxRunSpeed, this.vx - this.runAccel);
                    this.facing = -1;
                    if (this.isGrounded && this.state !== 'SKID') this.state = 'RUN';
                }
            } else if (rawInput.right) {
                if (this.facing === -1 && this.vx < -2.5 && this.isGrounded) {
                    this.state = 'SKID';
                    this.stateTime = 0;
                    window.soundSystem.playSkid();
                    window.particleSystem.burstSkidDust(this.x, this.y, -1);
                } else {
                    this.vx = Math.min(this.maxRunSpeed, this.vx + this.runAccel);
                    this.facing = 1;
                    if (this.isGrounded && this.state !== 'SKID') this.state = 'RUN';
                }
            } else {
                this.vx *= this.isGrounded ? this.groundFriction : this.airFriction;
                if (Math.abs(this.vx) < 0.2) this.vx = 0;
                if (this.isGrounded && this.state !== 'SKID' && this.state !== 'LAND_SQUASH' && this.state !== 'CROUCH') {
                    this.state = 'IDLE';
                }
            }
        }
    }

    startAttack(name) {
        this.isAttacking = true;
        this.attackHasHit = false;
        this.canCancel = false;
        this.stateTime = 0;
        this.attackTrail = [];
        this.currentAttack = this.createAttackData(name);
        this.state = 'ATTACK_' + name;

        // Drive Impact grants 2 hits of Super Armor!
        if (name === 'DRIVE_IMPACT') {
            this.driveArmorHits = 2;
            this.poiseActive = true;
            window.soundSystem.playSuperCharge();
            window.particleSystem.burstSparks(this.x, this.y - 30, '#ec4899', 15, 4);
            window.particleSystem.addFloatingText('DRIVE IMPACT!', this.x, this.y - 65, '#ec4899', 16, true);
        } else {
            this.driveArmorHits = 0;
            this.poiseActive = (this.stats.def >= 7 && (name === 'HP' || name === 'HK'));
            window.soundSystem.playSwing();
        }
    }

    createAttackData(name) {
        const factor = this.speedFrameFactor;
        const dmgMult = this.damageMultiplier;
        const kbMult = this.knockbackMultiplier;
        const inAir = !this.isGrounded;

        switch (name) {
            case 'LP': // Light Punch: Fast 3-frame jab
                return {
                    name, tier: 1, type: 'LIGHT',
                    startup: Math.round(3 * factor), active: Math.round(4 * factor), recovery: Math.round(5 * factor),
                    damage: Math.round(5 * dmgMult), knockbackX: 2.8 * kbMult, knockbackY: -1.0,
                    hitstop: 4 + this.hitstopBonus,
                    hitbox: { offsetX: 16, offsetY: inAir ? -30 : -40, width: 24, height: 16 }
                };

            case 'MP': // Medium Punch: Solid straight cross
                return {
                    name, tier: 2, type: 'MEDIUM',
                    startup: Math.round(5 * factor), active: Math.round(6 * factor), recovery: Math.round(7 * factor),
                    damage: Math.round(11 * dmgMult), knockbackX: 5.5 * kbMult, knockbackY: -2.0,
                    hitstop: 6 + this.hitstopBonus,
                    hitbox: { offsetX: 18, offsetY: inAir ? -28 : -38, width: 28, height: 20 }
                };

            case 'HP': // Heavy Punch: Guard-breaking haymaker smash
                return {
                    name, tier: 3, type: inAir ? 'METEOR' : 'HEAVY',
                    startup: Math.round(9 * factor), active: Math.round(8 * factor), recovery: Math.round(13 * factor),
                    damage: Math.round(22 * dmgMult), knockbackX: 13.0 * kbMult, knockbackY: inAir ? 12.0 : -4.5,
                    hitstop: 11 + this.hitstopBonus,
                    hitbox: { offsetX: 20, offsetY: inAir ? -20 : -44, width: 34, height: 30 }
                };

            case 'LK': // Light Kick: Snappy low poke
                return {
                    name, tier: 1, type: 'LIGHT',
                    startup: Math.round(4 * factor), active: Math.round(5 * factor), recovery: Math.round(6 * factor),
                    damage: Math.round(6 * dmgMult), knockbackX: 3.5 * kbMult, knockbackY: -1.0,
                    hitstop: 4 + this.hitstopBonus,
                    hitbox: { offsetX: 18, offsetY: inAir ? -25 : -14, width: 26, height: 16 }
                };

            case 'MK': // Medium Kick: Step-in roundhouse
                return {
                    name, tier: 2, type: 'MEDIUM',
                    startup: Math.round(6 * factor), active: Math.round(6 * factor), recovery: Math.round(8 * factor),
                    damage: Math.round(12 * dmgMult), knockbackX: 6.8 * kbMult, knockbackY: -2.5,
                    hitstop: 7 + this.hitstopBonus,
                    hitbox: { offsetX: 20, offsetY: -32, width: 30, height: 22 }
                };

            case 'HK': // Heavy Kick: High Launching Backflip!
                return {
                    name, tier: 3, type: 'LAUNCHER',
                    startup: Math.round(7 * factor), active: Math.round(7 * factor), recovery: Math.round(13 * factor),
                    damage: Math.round(18 * dmgMult), knockbackX: 2.2 * kbMult, knockbackY: -14.0, // High launch!
                    hitstop: 9 + this.hitstopBonus,
                    hitbox: { offsetX: 16, offsetY: -55, width: 30, height: 38 }
                };

            case 'DRIVE_IMPACT': // Street Fighter 6 Drive Impact
                return {
                    name, tier: 4, type: 'DRIVE_IMPACT',
                    startup: Math.round(14 * factor), active: Math.round(9 * factor), recovery: Math.round(16 * factor),
                    damage: Math.round(26 * dmgMult), knockbackX: 16.0 * kbMult, knockbackY: -5.0,
                    hitstop: 14 + this.hitstopBonus,
                    hitbox: { offsetX: 22, offsetY: -42, width: 38, height: 34 }
                };

            default:
                return null;
        }
    }

    triggerThrow() {
        if (!this.opponent) return;
        const dist = Math.abs(this.opponent.x - this.x);
        if (dist < 42 && this.opponent.isGrounded && this.opponent.state !== 'KNOCKDOWN') {
            // Throw connected!
            this.state = 'THROW_EXECUTE';
            this.stateTime = 0;
            this.isAttacking = true;

            // Opponent thrown
            this.opponent.takeHit({
                damage: Math.round(25 * this.damageMultiplier),
                knockbackX: 12.0 * this.knockbackMultiplier,
                knockbackY: -8.0,
                hitstop: 12,
                type: 'THROW'
            }, this);

            window.soundSystem.playHeavyHit(8);
            window.particleSystem.triggerShake(10, 10);
            window.particleSystem.addFloatingText('PUNISH THROW!', this.x, this.y - 55, '#facc15', 18, true);
        } else {
            // Throw whiff
            this.state = 'THROW_WHIFF';
            this.stateTime = 0;
            this.isAttacking = true;
            window.soundSystem.playSwing();
        }
    }

    triggerParryStance() {
        this.state = 'PARRY_STANCE';
        this.stateTime = 0;
        this.parryWindow = 12; // 12-frame Street Fighter III parry window!
        window.particleSystem.createShockwave(this.x, this.y - 30, 35, '#38bdf8', 2);
    }

    triggerDash(dir) {
        this.state = 'DASH';
        this.stateTime = 0;
        this.facing = dir;
        this.vx = dir * this.dashSpeed;
        this.dashCooldown = this.maxDashCooldown;
        this.invincibleFrames = 8;
        this.isAttacking = false;
        this.canCancel = false;

        this.scaleX = 1.3;
        this.scaleY = 0.85;

        window.soundSystem.playDash();
        window.particleSystem.burstJumpPuff(this.x, this.y, 6);
        window.particleSystem.triggerAnimatedEffect('thrust', this.x - dir * 20, this.y - 25, dir < 0);
    }

    triggerSuperJump() {
        this.state = 'SUPER_JUMP';
        this.stateTime = 0;
        this.isGrounded = false;
        this.isAttacking = false;
        this.canCancel = false;

        this.vy = this.jumpPower * 1.35;
        this.vx = this.facing * 3.5;

        this.scaleX = 0.78;
        this.scaleY = 1.32;

        window.soundSystem.playSuperJump();
        window.particleSystem.burstSpeedLines(this.x, this.y, 14);
        window.particleSystem.createShockwave(this.x, this.y, 65, '#38bdf8', 4);
        window.particleSystem.addFloatingText('SUPER JUMP!', this.x, this.y - 50, '#38bdf8', 16, true);
    }

    triggerSuper() {
        this.state = 'SUPER_CINEMATIC';
        this.stateTime = 0;
        this.superMeter = 0;
        this.isAttacking = true;
        this.canCancel = false;
        this.vx = 0;
        this.vy = 0;

        window.soundSystem.playSuperCharge();
        window.particleSystem.triggerFlash('#ffffff', 0.85);
        window.particleSystem.triggerHitstop(22);
        window.particleSystem.addFloatingText('OVERDRIVE BARRAGE!', this.x, this.y - 70, '#f43f5e', 20, true);
    }

    update() {
        this.stateTime++;

        // Age input buffer items
        for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
            this.inputBuffer[i].age++;
            if (this.inputBuffer[i].age > 8) this.inputBuffer.splice(i, 1);
        }

        // Timers
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.invincibleFrames > 0) this.invincibleFrames--;
        if (this.parryWindow > 0) this.parryWindow--;

        // Ease squash & stretch back to 1.0
        this.scaleX += (1.0 - this.scaleX) * 0.18;
        this.scaleY += (1.0 - this.scaleY) * 0.18;

        // Super Cinematic Sequence
        if (this.state === 'SUPER_CINEMATIC') {
            this.updateSuperSequence();
            return;
        }

        // Pre-jump crouch anticipation
        if (this.state === 'PRE_JUMP') {
            this.vx *= 0.5;
            if (this.stateTime >= 3) {
                this.vy = this.jumpPower;
                this.isGrounded = false;
                this.state = 'JUMP';
                this.stateTime = 0;
                this.scaleX = 0.84;
                this.scaleY = 1.24;
                window.soundSystem.playJump();
                window.particleSystem.burstJumpPuff(this.x, this.y, 8);
            }
            return;
        }

        // Apply Capcom gravity curve
        if (!this.isGrounded) {
            let grav = window.physicsEngine.baseGravity;
            if (Math.abs(this.vy) < 2.2) {
                grav = window.physicsEngine.apexGravity;
            } else if (this.vy > 0) {
                grav = window.physicsEngine.fallGravity;
            }
            this.vy += grav;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Ground landing
        if (this.y >= window.physicsEngine.stage.floor) {
            const wasInAir = !this.isGrounded;
            this.y = window.physicsEngine.stage.floor;
            this.vy = 0;
            this.isGrounded = true;

            if (wasInAir) {
                this.scaleX = 1.22;
                this.scaleY = 0.82;
                this.state = 'LAND_SQUASH';
                this.stateTime = 0;
                window.particleSystem.burstJumpPuff(this.x, this.y, 5);
            }
        } else {
            this.isGrounded = false;
        }

        // Wall collisions
        const halfW = this.width / 2;
        if (this.x - halfW < window.physicsEngine.stage.left) {
            this.x = window.physicsEngine.stage.left + halfW;
            if (this.state === 'KNOCKDOWN' && Math.abs(this.vx) > 5) {
                this.triggerWallBounce(1);
            }
        } else if (this.x + halfW > window.physicsEngine.stage.right) {
            this.x = window.physicsEngine.stage.right - halfW;
            if (this.state === 'KNOCKDOWN' && Math.abs(this.vx) > 5) {
                this.triggerWallBounce(-1);
            }
        }

        // State Machine Handling
        switch (this.state) {
            case 'LAND_SQUASH':
                if (this.stateTime >= 3) this.state = 'IDLE';
                break;

            case 'SKID':
                this.vx *= 0.72;
                if (this.stateTime >= 5) this.state = 'IDLE';
                break;

            case 'PARRY_STANCE':
                this.vx *= 0.5;
                if (this.stateTime > 14) this.state = 'IDLE';
                break;

            case 'THROW_WHIFF':
            case 'THROW_EXECUTE':
                this.vx *= 0.5;
                if (this.stateTime > 18) {
                    this.state = 'IDLE';
                    this.isAttacking = false;
                }
                break;

            case 'DASH':
            case 'SUPER_JUMP':
                if (this.stateTime % 2 === 0) {
                    window.particleSystem.addAfterimage(this.getJointPositions(), this.palette.primary, 0.6);
                }
                if (this.state === 'DASH' && this.stateTime > 12) {
                    this.state = this.isGrounded ? 'IDLE' : 'FALL';
                }
                break;

            case 'HIT_STUN':
                this.vx *= 0.88;
                if (this.stateTime > this.hitStunTimer) {
                    this.state = 'IDLE';
                    this.hitStunTimer = 0;
                }
                break;

            case 'KNOCKDOWN':
                this.vx *= 0.94;
                if (this.isGrounded && this.stateTime > 25) this.state = 'IDLE';
                break;

            default:
                if (this.isAttacking) {
                    this.updateAttack();
                } else if (!this.isGrounded) {
                    this.state = this.vy < 0 ? 'JUMP' : 'FALL';
                }
                break;
        }

        this.updateScarf();
    }

    updateAttack() {
        const atk = this.currentAttack;
        if (!atk) {
            this.isAttacking = false;
            return;
        }

        const t = this.stateTime;
        const totalDuration = atk.startup + atk.active + atk.recovery;

        if (t <= atk.startup) {
            this.activeHitbox = null;
        } else if (t > atk.startup && t <= atk.startup + atk.active) {
            this.activeHitbox = {
                x: this.facing > 0 ? this.x + atk.hitbox.offsetX : this.x - atk.hitbox.offsetX - atk.hitbox.width,
                y: this.y + atk.hitbox.offsetY,
                width: atk.hitbox.width,
                height: atk.hitbox.height,
                data: atk
            };

            const joints = this.getJointPositions();
            this.attackTrail.push({ x: joints.handFront.x, y: joints.handFront.y });
            if (this.attackTrail.length > 5) this.attackTrail.shift();
        } else if (t > atk.startup + atk.active && t < totalDuration) {
            this.activeHitbox = null;
        } else {
            this.activeHitbox = null;
            this.isAttacking = false;
            this.canCancel = false;
            this.poiseActive = false;
            this.driveArmorHits = 0;
            this.state = this.isGrounded ? 'IDLE' : 'FALL';
        }
    }

    updateSuperSequence() {
        const t = this.stateTime;
        if (t === 20) {
            this.facing *= -1;
            this.x += this.facing * 180;
            window.soundSystem.playSwing();
            window.particleSystem.triggerShake(9, 8);
            window.particleSystem.burstSparks(this.x - this.facing * 90, this.y - 30, '#f43f5e', 22, 7);
        } else if (t === 28) {
            this.facing *= -1;
            this.x += this.facing * 200;
            window.soundSystem.playSwing();
            window.particleSystem.triggerShake(11, 8);
            window.particleSystem.burstSparks(this.x - this.facing * 100, this.y - 30, '#38bdf8', 24, 7);
        } else if (t === 38) {
            this.y = window.physicsEngine.stage.floor;
            window.soundSystem.playSuperExplosion();
            window.particleSystem.triggerShake(18, 20);
            window.particleSystem.triggerFlash('#ffffff', 0.9);
            window.particleSystem.createShockwave(this.x, this.y, 115, '#f43f5e', 6);
            window.particleSystem.createCrack(this.x, this.y, 'horizontal', 75);
            window.particleSystem.burstSparks(this.x, this.y - 20, '#facc15', 38, 9);

            if (this.opponent) {
                this.opponent.takeHit({
                    damage: Math.round(45 * this.damageMultiplier),
                    knockbackX: 14 * this.knockbackMultiplier,
                    knockbackY: -9,
                    hitstop: 16,
                    type: 'SUPER'
                }, this);
            }
        } else if (t > 58) {
            this.state = 'IDLE';
            this.isAttacking = false;
        }
    }

    takeHit(attackData, attacker) {
        if (this.invincibleFrames > 0) return;

        // Attacker unlocks Hit-Cancel window!
        attacker.canCancel = true;

        // Check Street Fighter III / SF6 Parry
        if (this.state === 'PARRY_STANCE' || this.parryWindow > 0) {
            window.soundSystem.playParry();
            window.particleSystem.triggerHitstop(14);
            window.particleSystem.triggerFlash('#38bdf8', 0.6);
            window.particleSystem.triggerAnimatedEffect('parry', this.x, this.y - 35);
            window.particleSystem.addFloatingText('THIRD STRIKE PARRY!', this.x, this.y - 55, '#38bdf8', 17, true);

            this.superMeter = Math.min(100, this.superMeter + 35);
            attacker.state = 'HIT_STUN';
            attacker.hitStunTimer = 24;
            attacker.vx = -attacker.facing * 6;
            attacker.canCancel = false;
            return;
        }

        // Check Drive Impact Armor Absorption (can absorb up to 2 hits!)
        if (this.driveArmorHits > 0 && attackData.type !== 'SUPER' && attackData.type !== 'THROW') {
            this.driveArmorHits--;
            const absorbedDmg = Math.round(attackData.damage * 0.4);
            this.currentHp = Math.max(1, this.currentHp - absorbedDmg);

            window.soundSystem.playBlock(true);
            window.particleSystem.triggerHitstop(6);
            window.particleSystem.triggerAnimatedEffect('block', this.x, this.y - 30);
            window.particleSystem.burstSparks(this.x, this.y - 30, '#ec4899', 16, 4);
            window.particleSystem.addFloatingText('DRIVE ARMOR ABSORB!', this.x, this.y - 50, '#ec4899', 15, true);
            return; // Doesn't interrupt attack!
        }

        // Super Armor (DEF >= 7)
        if (this.poiseActive && attackData.type !== 'SUPER' && attackData.type !== 'THROW') {
            const reducedDmg = Math.round(attackData.damage * (1.0 - this.damageReduction));
            this.currentHp = Math.max(0, this.currentHp - reducedDmg);
            this.superMeter = Math.min(100, this.superMeter + 8);

            window.soundSystem.playBlock(true);
            window.particleSystem.triggerAnimatedEffect('block', this.x, this.y - 35);
            window.particleSystem.burstSparks(this.x, this.y - 35, '#eab308', 12, 4);
            window.particleSystem.addFloatingText('SUPER ARMOR!', this.x, this.y - 55, '#eab308', 14, true);
            return;
        }

        // Clean Hit Connected
        const rawDmg = attackData.damage * (1.0 - this.damageReduction);
        const finalDmg = Math.max(1, Math.round(rawDmg));
        this.currentHp = Math.max(0, this.currentHp - finalDmg);

        attacker.superMeter = Math.min(100, attacker.superMeter + 10);
        this.superMeter = Math.min(100, this.superMeter + 6);

        this.scaleX = 1.25;
        this.scaleY = 0.8;

        const isHeavy = attackData.type === 'HEAVY' || attackData.type === 'METEOR' || attackData.type === 'SUPER' || attackData.type === 'DRIVE_IMPACT';
        if (attackData.type === 'SUPER') {
            window.soundSystem.playHeavyHit(attacker.stats.str);
            window.particleSystem.triggerShake(12, 14);
            window.particleSystem.triggerAnimatedEffect('overdrive', this.x, this.y - 35, attacker.facing < 0);
            window.particleSystem.burstSparks(this.x, this.y - 35, '#f43f5e', 24, 7);
        } else if (isHeavy) {
            window.soundSystem.playHeavyHit(attacker.stats.str);
            window.particleSystem.triggerShake(7 + attacker.stats.str * 0.9, 10);
            window.particleSystem.triggerAnimatedEffect('heavy', this.x, this.y - 35, attacker.facing < 0);
            window.particleSystem.burstSparks(this.x, this.y - 35, '#ef4444', 18, 6);
            window.particleSystem.createShockwave(this.x, this.y - 35, 48, '#ef4444');
        } else if (attackData.tier === 2 || attackData.type === 'MEDIUM') {
            window.soundSystem.playLightHit();
            window.particleSystem.triggerShake(4, 6);
            window.particleSystem.triggerAnimatedEffect('medium', this.x, this.y - 35, attacker.facing < 0);
            window.particleSystem.burstSparks(this.x, this.y - 35, '#38bdf8', 12, 4);
        } else {
            window.soundSystem.playLightHit();
            window.particleSystem.triggerShake(3, 5);
            window.particleSystem.triggerAnimatedEffect('light', this.x, this.y - 35, attacker.facing < 0);
            window.particleSystem.burstSparks(this.x, this.y - 35, '#facc15', 8, 3);
        }

        window.particleSystem.triggerHitstop(attackData.hitstop);
        window.particleSystem.addFloatingText(`${finalDmg}`, this.x, this.y - 45, isHeavy ? '#ef4444' : '#ffffff', isHeavy ? 17 : 13, isHeavy);

        this.vx = (attackData.knockbackX * attacker.facing) / this.weight;
        this.vy = attackData.knockbackY / this.weight;

        if (Math.abs(this.vx) > 6 || Math.abs(this.vy) > 5 || attackData.type === 'LAUNCHER') {
            this.state = 'KNOCKDOWN';
            this.isGrounded = false;
        } else {
            this.state = 'HIT_STUN';
            this.hitStunTimer = Math.round(14 + attackData.damage * 0.4);
        }

        this.isAttacking = false;
        this.activeHitbox = null;
    }

    triggerWallBounce(bounceDir) {
        this.vx = bounceDir * 5.5;
        this.vy = -5.5;
        window.soundSystem.playHeavyHit(6);
        window.particleSystem.triggerShake(9, 10);
        window.particleSystem.createCrack(this.x, this.y - 25, 'vertical', 42);
        window.particleSystem.addFloatingText('WALL SPLAT!', this.x, this.y - 45, '#fb923c', 16, true);
    }

    updateScarf() {
        const neckX = this.x - this.facing * 2;
        const neckY = this.y - (this.state === 'CROUCH' ? 32 : 46);

        this.scarfPoints[0].x = neckX;
        this.scarfPoints[0].y = neckY;

        for (let i = 1; i < this.scarfPoints.length; i++) {
            const p = this.scarfPoints[i];
            const vx = (p.x - p.oldX) * 0.85 - this.facing * 0.45 - this.vx * 0.35;
            const vy = (p.y - p.oldY) * 0.85 + 0.35;

            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy;

            const prev = this.scarfPoints[i - 1];
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const dist = Math.hypot(dx, dy);
            const targetDist = 7;
            if (dist > targetDist) {
                const ratio = (dist - targetDist) / dist;
                p.x -= dx * ratio;
                p.y -= dy * ratio;
            }
        }
    }

    getHurtbox() {
        // Crouch lowers hurtbox height by 40%!
        const isCrouching = this.state === 'CROUCH';
        const h = isCrouching ? this.height * 0.6 : this.height;
        return {
            x: this.x - this.width / 2,
            y: this.y - h,
            width: this.width,
            height: h
        };
    }

    getPushbox() {
        return {
            x: this.x - (this.width * 0.6) / 2,
            y: this.y - this.height * 0.8,
            width: this.width * 0.6,
            height: this.height * 0.8
        };
    }

    // Dynamic Joint Calculation for full 6-button suite
    getJointPositions() {
        const x = this.x;
        const y = this.y;
        const f = this.facing;
        const t = this.stateTime;
        const lean = Math.max(-10, Math.min(10, this.vx * 1.2));

        let head = { x: x + lean * 1.3, y: y - 52 };
        let chest = { x: x + lean, y: y - 36 };
        let hip = { x: x + lean * 0.4, y: y - 22 };

        let kneeFront = { x: x + f * 5, y: y - 11 };
        let footFront = { x: x + f * 9, y: y };
        let kneeBack = { x: x - f * 5, y: y - 11 };
        let footBack = { x: x - f * 8, y: y };

        let elbowFront = { x: x + f * 7 + lean, y: y - 32 };
        let handFront = { x: x + f * 12 + lean, y: y - 30 };
        let elbowBack = { x: x - f * 6 + lean, y: y - 32 };
        let handBack = { x: x - f * 10 + lean, y: y - 28 };

        switch (this.state) {
            case 'IDLE': {
                const breathe = Math.sin(t * 0.08) * 1.5;
                head.y += breathe;
                chest.y += breathe;
                elbowFront.y += breathe;
                handFront.y += breathe;
                break;
            }

            case 'CROUCH': {
                // Real crouching duck stance
                head.y = y - 34;
                chest.y = y - 24;
                hip.y = y - 14;
                kneeFront = { x: x + f * 14, y: y - 8 };
                footFront = { x: x + f * 12, y: y };
                kneeBack = { x: x - f * 12, y: y - 8 };
                footBack = { x: x - f * 10, y: y };
                elbowFront = { x: x + f * 10, y: y - 22 };
                handFront = { x: x + f * 14, y: y - 16 };
                break;
            }

            case 'PRE_JUMP':
            case 'LAND_SQUASH': {
                head.y += 8;
                chest.y += 10;
                hip.y += 10;
                kneeFront = { x: x + f * 12, y: y - 6 };
                footFront = { x: x + f * 10, y: y };
                kneeBack = { x: x - f * 10, y: y - 6 };
                footBack = { x: x - f * 8, y: y };
                break;
            }

            case 'SKID': {
                head.x -= f * 8;
                chest.x -= f * 6;
                kneeFront = { x: x + f * 14, y: y - 6 };
                footFront = { x: x + f * 20, y: y };
                kneeBack = { x: x - f * 10, y: y - 10 };
                footBack = { x: x - f * 14, y: y };
                break;
            }

            case 'RUN': {
                const cycle = Math.sin(t * 0.3);
                const bob = Math.abs(cycle) * 3;
                head.y += bob;
                chest.y += bob;
                kneeFront = { x: x + f * cycle * 14, y: y - 12 - Math.max(0, -cycle) * 6 };
                footFront = { x: x + f * cycle * 20, y: y - Math.max(0, -cycle) * 8 };
                kneeBack = { x: x - f * cycle * 14, y: y - 12 - Math.max(0, cycle) * 6 };
                footBack = { x: x - f * cycle * 20, y: y - Math.max(0, cycle) * 8 };
                elbowFront = { x: x - f * cycle * 10 + lean, y: y - 34 };
                handFront = { x: x - f * cycle * 16 + lean, y: y - 28 };
                break;
            }

            case 'DASH':
            case 'SUPER_JUMP': {
                head.x += f * 18;
                chest.x += f * 14;
                kneeFront = { x: x + f * 14, y: y - 8 };
                footFront = { x: x + f * 22, y: y - 2 };
                handFront = { x: x + f * 24, y: y - 30 };
                break;
            }

            // --- 6-BUTTON ATTACKS ---
            case 'ATTACK_LP': { // Snappy Light Jab
                elbowFront = { x: x + f * 18, y: y - 38 };
                handFront = { x: x + f * 28, y: y - 38 };
                break;
            }
            case 'ATTACK_MP': { // Medium Punch Cross
                head.x += f * 5;
                chest.x += f * 7;
                elbowFront = { x: x + f * 20, y: y - 36 };
                handFront = { x: x + f * 32, y: y - 36 };
                break;
            }
            case 'ATTACK_HP': { // Heavy Punch Overhead Haymaker
                head.x += f * 10;
                chest.x += f * 12;
                elbowFront = { x: x + f * 22, y: y - 24 };
                handFront = { x: x + f * 34, y: y - 18 };
                kneeFront = { x: x + f * 16, y: y - 8 };
                footFront = { x: x + f * 20, y: y };
                break;
            }
            case 'ATTACK_LK': { // Low Light Kick
                kneeFront = { x: x + f * 12, y: y - 10 };
                footFront = { x: x + f * 26, y: y - 8 };
                break;
            }
            case 'ATTACK_MK': { // Medium Kick Roundhouse
                head.x -= f * 4;
                kneeFront = { x: x + f * 16, y: y - 26 };
                footFront = { x: x + f * 30, y: y - 32 };
                break;
            }
            case 'ATTACK_HK': { // Heavy Kick Backflip Launcher!
                head.y = y - 40;
                chest.y = y - 32;
                kneeFront = { x: x + f * 14, y: y - 48 };
                footFront = { x: x + f * 20, y: y - 64 };
                handFront = { x: x - f * 10, y: y - 14 };
                break;
            }
            case 'ATTACK_DRIVE_IMPACT': { // SF6 Drive Impact Smashing Charge
                head.x += f * 14;
                chest.x += f * 18;
                elbowFront = { x: x + f * 26, y: y - 32 };
                handFront = { x: x + f * 38, y: y - 32 };
                break;
            }
            case 'PARRY_STANCE': { // SF3 Parry flash stance
                elbowFront = { x: x + f * 12, y: y - 42 };
                handFront = { x: x + f * 16, y: y - 48 };
                kneeFront = { x: x + f * 8, y: y - 10 };
                break;
            }
            case 'THROW_EXECUTE': { // Throw toss
                elbowFront = { x: x + f * 18, y: y - 38 };
                handFront = { x: x + f * 26, y: y - 46 };
                break;
            }

            case 'HIT_STUN': {
                head.x -= f * 9;
                chest.x -= f * 7;
                elbowFront = { x: x - f * 4, y: y - 30 };
                handFront = { x: x - f * 8, y: y - 22 };
                break;
            }

            case 'KNOCKDOWN': {
                head.y = y - 14;
                chest.y = y - 10;
                hip.y = y - 8;
                kneeFront = { x: x + f * 10, y: y - 6 };
                footFront = { x: x + f * 18, y: y };
                break;
            }
        }

        return { head, chest, hip, kneeFront, footFront, kneeBack, footBack, elbowFront, handFront, elbowBack, handBack };
    }
}

window.Fighter = Fighter;
