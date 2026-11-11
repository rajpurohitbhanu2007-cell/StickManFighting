/* ============================================================
   SMART COMBAT AI CONTROLLER (FTGAIC / FightingICE ARCHITECTURE)
   Features:
   - Archetype-specific combat profiles (Rushdown, Zoning, Turtle, Tactician)
   - Frame-advantage whiff punisher & anti-air HK launchers
   - Guard-breaking throws against turtling & parry stances
   - Vampire Savior / CPS-2 Magic Series cancel combos
   - Hitbox locomotion & dynamic spacing
   ============================================================ */

class CombatAI {
    constructor(fighter, opponent, difficulty = 'MEDIUM') {
        this.fighter = fighter;
        this.opponent = opponent;
        this.difficulty = difficulty;

        this.decisionTimer = 0;
        this.reactionDelay = this.getReactionFrames();
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        this.reactionDelay = this.getReactionFrames();
    }

    getReactionFrames() {
        switch (this.difficulty) {
            case 'EASY': return 14;
            case 'MEDIUM': return 8;
            case 'HARD': return 4;
            case 'BOSS': return 2;
            default: return 8;
        }
    }

    update() {
        const f = this.fighter;
        const target = this.opponent;
        if (!target) return {};

        this.decisionTimer++;

        const dx = target.x - f.x;
        const dist = Math.abs(dx);
        const dirToTarget = dx > 0 ? 1 : -1;
        const targetIsAttacking = target.isAttacking && target.activeHitbox;
        const targetInAir = !target.isGrounded;
        const targetInRecovery = target.isAttacking && !target.activeHitbox && target.stateTime > 8;
        const targetIsTurtling = target.state === 'PARRY_STANCE' || target.state === 'CROUCH';

        const archId = f.archetypeId || 'balanced';

        const inputs = {
            left: false,
            right: false,
            down: false,
            jump: false,
            lp: false, mp: false, hp: false,
            lk: false, mk: false, hk: false,
            throw: false,
            parry: false,
            driveImpact: false,
            super: false,
            dash: false
        };

        // 1. Overdrive Super Execution (When full and in range)
        if (f.superMeter >= 100 && dist < 230 && Math.random() < 0.10) {
            inputs.super = true;
            return inputs;
        }

        // 2. Anti-Air Reaction (FTGAIC Anti-Air Zoning)
        if (targetInAir && dist < 85 && f.isGrounded && !f.isAttacking) {
            if (Math.random() < 0.65) {
                inputs.hk = true; // HK Launcher anti-air
                return inputs;
            }
        }

        // 3. Guard-Break Throw (Throws punish Parry & Turtle Crouch!)
        if (targetIsTurtling && dist < 42 && f.isGrounded && !f.isAttacking) {
            inputs.throw = true;
            return inputs;
        }

        // 4. Guaranteed Whiff Punish (AI-FrameCoach principle)
        if (targetInRecovery && dist < 75 && f.isGrounded && !f.isAttacking) {
            if (f.stats.str >= 7) inputs.hp = true;
            else inputs.lp = true; // Fast 3-frame punish
            return inputs;
        }

        // 5. Defensive Reactions (Third Strike Parry / Armor / Dash Back)
        if (targetIsAttacking && dist < 75) {
            let parryChance = this.difficulty === 'BOSS' ? 0.45 : (this.difficulty === 'HARD' ? 0.30 : 0.10);
            if (archId === 'fortress' || archId === 'duelist') parryChance += 0.15;

            if (Math.random() < parryChance) {
                inputs.parry = true;
                return inputs;
            } else if ((archId === 'phantom' || f.stats.spd >= 7) && Math.random() < 0.35) {
                // Phase Dash backwards
                inputs.dash = true;
                if (dirToTarget > 0) inputs.left = true;
                else inputs.right = true;
                return inputs;
            } else if ((archId === 'titan' || archId === 'berserker') && Math.random() < 0.12 && f.isGrounded) {
                inputs.driveImpact = true; // Armored push through!
                return inputs;
            }
        }

        // 6. Drive Impact Pressure
        if (dist < 110 && Math.random() < 0.04 && f.isGrounded && !f.isAttacking) {
            inputs.driveImpact = true;
            return inputs;
        }

        // 7. Movement & Spacing (Archetype-specific locomotion)
        if (archId === 'phantom') {
            // Phantom hit-and-run spacing (hovers between 70-130px)
            if (dist > 120) {
                if (dirToTarget > 0) inputs.right = true;
                else inputs.left = true;
                if (dist > 180 && Math.random() < 0.12) inputs.dash = true;
            } else if (dist < 50 && Math.random() < 0.25) {
                // Back-dash away to reset neutral
                inputs.dash = true;
                if (dirToTarget > 0) inputs.left = true;
                else inputs.right = true;
            }
        } else if (archId === 'berserker' || archId === 'titan') {
            // Relentless rushdown advance
            if (dist > 65) {
                if (dirToTarget > 0) inputs.right = true;
                else inputs.left = true;
                if (dist > 140 && Math.random() < 0.15) inputs.dash = true;
            }
        } else {
            // Standard spacing
            if (dist > 90) {
                if (dirToTarget > 0) inputs.right = true;
                else inputs.left = true;
                if (dist > 160 && Math.random() < 0.06) inputs.dash = true;
                if (Math.random() < 0.02 && f.isGrounded) inputs.jump = true;
            }
        }

        // 8. Close-Range Throw
        if (dist < 32 && Math.random() < 0.22 && f.isGrounded && !f.isAttacking) {
            inputs.throw = true;
            return inputs;
        }

        // 9. Attack Choices
        f.facing = dirToTarget;

        if (!f.isAttacking) {
            const roll = Math.random();

            if (!f.isGrounded) {
                if (f.stats.str >= 6) inputs.hp = true; // Meteor down-smash
                else inputs.mp = true;
                return inputs;
            }

            if (dist < 85) {
                if (archId === 'titan' || f.stats.str >= 8) {
                    if (roll < 0.40) inputs.hp = true;
                    else if (roll < 0.65) inputs.hk = true;
                    else if (roll < 0.85) inputs.mp = true;
                    else inputs.lp = true;
                } else if (archId === 'phantom' || f.stats.spd >= 8) {
                    if (roll < 0.45) inputs.lp = true;
                    else if (roll < 0.75) inputs.lk = true;
                    else if (roll < 0.90) inputs.hk = true;
                    else inputs.mp = true;
                } else if (archId === 'fortress') {
                    if (roll < 0.30) inputs.lp = true;
                    else if (roll < 0.55) inputs.mk = true;
                    else if (roll < 0.80) inputs.hp = true;
                    else inputs.parry = true;
                } else {
                    if (roll < 0.35) inputs.lp = true;
                    else if (roll < 0.60) inputs.mk = true;
                    else if (roll < 0.85) inputs.hp = true;
                    else inputs.parry = true;
                }
            }
        } else {
            // Magic Series Cancels (LP ➔ MP ➔ HP or HK ➔ Super Jump)
            if (f.canCancel) {
                if (f.currentAttack && f.currentAttack.name === 'HK') {
                    inputs.jump = true; // MvC Aerial follow-up
                } else if (f.currentAttack && f.currentAttack.tier === 1) {
                    inputs.mp = true; // Cancel LP ➔ MP
                } else if (f.currentAttack && f.currentAttack.tier === 2) {
                    inputs.hp = true; // Cancel MP ➔ HP
                }
            }
        }

        return inputs;
    }
}

window.CombatAI = CombatAI;
