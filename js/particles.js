/* ============================================================
   PIXEL PARTICLE & COMBAT JUICE ENGINE (CPS-2 ENHANCED)
   Includes landing dust, skid dust clouds, speed lines,
   hitstop freeze frames, screen flash, and floating arcade text.
   ============================================================ */

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.afterimages = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.groundCracks = [];
        this.speedLines = [];
        this.animatedEffects = [];

        // Preload Retro Animated Effect Sheets (Hitsparks, Slashes & Thrusts)
        this.fxImages = {
            hitBurst: new Image(),
            hitSlash: new Image(),
            hitSpark: new Image(),
            hitBlock: new Image(),
            thrust: new Image(),
            sonic: new Image()
        };
        this.fxImages.hitBurst.src = 'assets/effects/hit_effects/Effect 1 - Sprite Sheet.png';
        this.fxImages.hitSlash.src = 'assets/effects/hit_effects/Effect 2 - Sprite Sheet.png';
        this.fxImages.hitSpark.src = 'assets/effects/hit_effects/Effect 3 - Sprite Sheet.png';
        this.fxImages.hitBlock.src = 'assets/effects/hit_effects/Effect 4 - Sprite Sheet.png';
        this.fxImages.thrust.src = 'assets/effects/thrust_effects/Thrusts 1 SpriteSheet.png';
        this.fxImages.sonic.src = 'assets/effects/thrust_effects/Thrust 2 SpriteSheet.png';

        // Screen effects
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // Hitstop / Freeze frames (Capcom impact pause)
        this.hitstopFrames = 0;

        // Screen Flash / Color Inversion
        this.flashColor = null;
        this.flashAlpha = 0;
    }

    triggerShake(intensity = 8, duration = 12) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTime = Math.max(this.shakeTime, duration);
    }

    triggerHitstop(frames = 6) {
        this.hitstopFrames = Math.max(this.hitstopFrames, frames);
    }

    triggerFlash(color = '#ffffff', alpha = 0.6) {
        this.flashColor = color;
        this.flashAlpha = alpha;
    }

    // Trigger Animated Pixel-Art Hitspark & Slash Effects
    triggerAnimatedEffect(type, x, y, flipX = false) {
        let conf;
        switch(type) {
            case 'light':
                conf = { img: this.fxImages.hitSpark, fw: 32, fh: 32, startRow: 0, frames: 4, scale: 2.2, dur: 2 };
                break;
            case 'medium':
            case 'slash':
                conf = { img: this.fxImages.hitSlash, fw: 64, fh: 32, startRow: 0, frames: 4, scale: 2.2, dur: 2 };
                break;
            case 'heavy':
                conf = { img: this.fxImages.hitBurst, fw: 64, fh: 32, startRow: 1, frames: 4, scale: 2.4, dur: 3 };
                break;
            case 'block':
            case 'parry':
                conf = { img: this.fxImages.hitBlock, fw: 32, fh: 32, startRow: 0, frames: 4, scale: 2.4, dur: 2, blend: 'screen' };
                break;
            case 'thrust':
            case 'dash':
                conf = { img: this.fxImages.thrust, fw: 64, fh: 32, startRow: 0, frames: 5, scale: 2.0, dur: 2 };
                break;
            case 'overdrive':
            case 'sonic':
                conf = { img: this.fxImages.sonic, fw: 64, fh: 32, startRow: 0, frames: 5, scale: 2.6, dur: 2 };
                break;
            default:
                conf = { img: this.fxImages.hitSpark, fw: 32, fh: 32, startRow: 0, frames: 4, scale: 2.0, dur: 2 };
        }

        this.animatedEffects.push({
            img: conf.img,
            x: x,
            y: y,
            fw: conf.fw,
            fh: conf.fh,
            startRow: conf.startRow,
            frames: conf.frames,
            scale: conf.scale,
            dur: conf.dur,
            blend: conf.blend || null,
            flipX: flipX,
            currentFrame: 0,
            frameTimer: 0
        });
    }

    // Burst of retro pixel sparks on hits
    burstSparks(x, y, color = '#facc15', count = 14, speed = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 0.7 + 0.3) * speed;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - Math.random() * 2,
                size: Math.random() > 0.5 ? 4 : 2,
                color: color,
                life: 1.0,
                decay: 0.035 + Math.random() * 0.04,
                gravity: 0.18
            });
        }
    }

    // Street Fighter Alpha Turnaround Skid Dust
    burstSkidDust(x, y, dir = 1) {
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y - 2,
                vx: -dir * (Math.random() * 3.5 + 1.2),
                vy: -Math.random() * 1.5 - 0.4,
                size: Math.floor(Math.random() * 4) + 3,
                color: Math.random() > 0.4 ? '#94a3b8' : '#cbd5e1',
                life: 1.0,
                decay: 0.05 + Math.random() * 0.04,
                gravity: -0.01
            });
        }
    }

    // Jump liftoff or landing puff ring
    burstJumpPuff(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const dir = (i % 2 === 0 ? 1 : -1);
            this.particles.push({
                x: x + dir * (Math.random() * 12),
                y: y - 2,
                vx: dir * (Math.random() * 3 + 1),
                vy: -Math.random() * 1.8 - 0.2,
                size: Math.floor(Math.random() * 4) + 3,
                color: '#94a3b8',
                life: 1.0,
                decay: 0.06 + Math.random() * 0.03,
                gravity: -0.02
            });
        }
    }

    // Ring shockwave
    createShockwave(x, y, maxRadius = 55, color = '#38bdf8', width = 3) {
        this.shockwaves.push({
            x: x,
            y: y,
            radius: 4,
            maxRadius: maxRadius,
            growth: maxRadius / 9,
            color: color,
            width: width,
            life: 1.0,
            decay: 0.09
        });
    }

    // Capcom / MvC vertical speed lines on Super Jump
    burstSpeedLines(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            this.speedLines.push({
                x: x + (Math.random() - 0.5) * 60,
                y: y + Math.random() * 150,
                length: Math.random() * 50 + 30,
                vy: -Math.random() * 12 - 10,
                color: '#38bdf8',
                life: 1.0,
                decay: 0.08
            });
        }
    }

    // Jagged ground/wall crack on heavy impact
    createCrack(x, y, orientation = 'horizontal', size = 35) {
        const segments = [];
        let curX = x - size / 2;
        let curY = y;
        const count = 5;
        const step = size / count;

        for (let i = 0; i <= count; i++) {
            segments.push({
                x: curX + (orientation === 'vertical' ? (Math.random() - 0.5) * 8 : i * step),
                y: curY + (orientation === 'horizontal' ? (Math.random() - 0.5) * 8 : i * step)
            });
        }

        this.groundCracks.push({
            segments: segments,
            life: 1.0,
            decay: 0.005,
            width: 2
        });

        if (this.groundCracks.length > 8) {
            this.groundCracks.shift();
        }
    }

    // Speed ghost / afterimage snapshot
    addAfterimage(stickmanSnapshot, color = '#06b6d4', alpha = 0.7) {
        this.afterimages.push({
            snapshot: stickmanSnapshot,
            color: color,
            alpha: alpha,
            decay: 0.09
        });
    }

    // Floating arcade damage text
    addFloatingText(text, x, y, color = '#f8fafc', size = 14, isCrit = false) {
        this.floatingTexts.push({
            text: text,
            x: x + (Math.random() - 0.5) * 12,
            y: y - 10,
            vy: -2.4,
            life: 1.0,
            decay: 0.024,
            color: color,
            size: isCrit ? size * 1.3 : size,
            isCrit: isCrit,
            scale: 1.45
        });
    }

    update() {
        // Screenshake
        if (this.shakeTime > 0) {
            this.shakeTime--;
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity *= 0.88;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }

        // Screen flash decay
        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.06;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }

        // Hitstop pauses particle physics
        if (this.hitstopFrames > 0) {
            this.hitstopFrames--;
            return;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.95;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update afterimages
        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            const a = this.afterimages[i];
            a.alpha -= a.decay;
            if (a.alpha <= 0) this.afterimages.splice(i, 1);
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.growth;
            sw.life -= sw.decay;
            if (sw.life <= 0 || sw.radius >= sw.maxRadius) this.shockwaves.splice(i, 1);
        }

        // Update speed lines
        for (let i = this.speedLines.length - 1; i >= 0; i--) {
            const sl = this.speedLines[i];
            sl.y += sl.vy;
            sl.life -= sl.decay;
            if (sl.life <= 0) this.speedLines.splice(i, 1);
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.vy *= 0.92;
            ft.life -= ft.decay;
            if (ft.scale > 1.0) ft.scale -= 0.05;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // Update cracks
        for (let i = this.groundCracks.length - 1; i >= 0; i--) {
            const c = this.groundCracks[i];
            c.life -= c.decay;
            if (c.life <= 0) this.groundCracks.splice(i, 1);
        }

        // Update animated sprite effects (Hitsparks, Slashes & Thrusts)
        for (let i = this.animatedEffects.length - 1; i >= 0; i--) {
            const fx = this.animatedEffects[i];
            fx.frameTimer++;
            if (fx.frameTimer >= fx.dur) {
                fx.frameTimer = 0;
                fx.currentFrame++;
                if (fx.currentFrame >= fx.frames) {
                    this.animatedEffects.splice(i, 1);
                }
            }
        }
    }

    render(ctx) {
        // Draw cracks
        for (const c of this.groundCracks) {
            if (c.segments.length < 2) continue;
            ctx.save();
            ctx.strokeStyle = `rgba(15, 23, 42, ${c.life * 0.8})`;
            ctx.lineWidth = c.width;
            ctx.beginPath();
            ctx.moveTo(c.segments[0].x, c.segments[0].y);
            for (let i = 1; i < c.segments.length; i++) {
                ctx.lineTo(c.segments[i].x, c.segments[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Draw Speed Lines
        for (const sl of this.speedLines) {
            ctx.save();
            ctx.strokeStyle = sl.color;
            ctx.globalAlpha = Math.max(0, sl.life * 0.7);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(Math.round(sl.x), Math.round(sl.y));
            ctx.lineTo(Math.round(sl.x), Math.round(sl.y + sl.length));
            ctx.stroke();
            ctx.restore();
        }

        // Draw shockwaves
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = Math.max(0, sw.life);
            ctx.lineWidth = sw.width;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Animated Sprite Effects (CPS-2 / NeoGeo Pixel Hitsparks & Thrusts)
        for (const fx of this.animatedEffects) {
            if (!fx.img || !fx.img.complete || fx.img.naturalWidth === 0) continue;
            ctx.save();
            ctx.translate(Math.round(fx.x), Math.round(fx.y));
            if (fx.flipX) ctx.scale(-1, 1);
            if (fx.blend) ctx.globalCompositeOperation = fx.blend;

            const sx = 0;
            const sy = (fx.startRow + fx.currentFrame) * fx.fh;
            const dw = Math.round(fx.fw * fx.scale);
            const dh = Math.round(fx.fh * fx.scale);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(fx.img, sx, sy, fx.fw, fx.fh, -Math.round(dw / 2), -Math.round(dh / 2), dw, dh);
            ctx.restore();
        }

        // Draw particles
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            ctx.restore();
        }

        // Draw floating text
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.life);
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${Math.round(ft.size * ft.scale)}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    renderScreenFlash(ctx, width, height) {
        if (this.flashAlpha > 0 && this.flashColor) {
            ctx.save();
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = Math.min(1.0, this.flashAlpha);
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }
}

window.particleSystem = new ParticleSystem();
