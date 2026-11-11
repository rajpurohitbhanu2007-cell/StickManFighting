/* ============================================================
   PIXEL STICKMAN PROCEDURAL RENDERER & ARENA ENGINE
   Inspired by:
   - Arco (Atmospheric pixel art landscapes)
   - Tiny Fight (On-screen floating combat key legends)
   - Anakin vs Obi-Wan (Beveled framed portrait battle HUD)
   - Chunky bold-outline pixel fighter sprites
   ============================================================ */

const STAGE_PRESETS = [
    { id: 'citadel', name: 'MOONLIT CITADEL', file: null, floorColor: '#1e293b', accent: '#38bdf8' },
    { id: 'lava_throne', name: 'LAVA THRONE', file: 'assets/stages/01_lava_throne.png', floorColor: '#450a0a', accent: '#ef4444' },
    { id: 'mountain_balcony', name: 'MOUNTAIN BALCONY', file: 'assets/stages/02_mountain_balcony.png', floorColor: '#0f172a', accent: '#38bdf8' },
    { id: 'arcane_grimoire', name: 'ARCANE GRIMOIRE', file: 'assets/stages/03_arcane_grimoire.png', floorColor: '#3b0764', accent: '#a855f7' },
    { id: 'crystal_cavern', name: 'CRYSTAL CAVERN', file: 'assets/stages/04_crystal_cavern.png', floorColor: '#082f49', accent: '#06b6d4' },
    { id: 'inferno_cave', name: 'INFERNO CAVE', file: 'assets/stages/05_inferno_cave.png', floorColor: '#7c2d12', accent: '#f97316' },
    { id: 'dark_pentagram', name: 'DARK SANCTUM', file: 'assets/stages/06_dark_pentagram.png', floorColor: '#1c1917', accent: '#dc2626' },
    { id: 'astral_portal', name: 'ASTRAL PORTAL', file: 'assets/stages/07_astral_portal.png', floorColor: '#022c22', accent: '#38bdf8' },
    { id: 'crimson_crystal', name: 'CRIMSON CRYSTAL', file: 'assets/stages/08_crimson_crystal.png', floorColor: '#4c0519', accent: '#f43f5e' },
    { id: 'dusk_pillars', name: 'DUSK PILLARS', file: 'assets/stages/09_dusk_pillars.png', floorColor: '#18181b', accent: '#eab308' },
    { id: 'enchanted_forest', name: 'ENCHANTED FOREST', file: 'assets/stages/10_enchanted_forest.png', floorColor: '#064e3b', accent: '#10b981' },
    { id: 'ritual_circle', name: 'RITUAL CIRCLE', file: 'assets/stages/11_ritual_circle.png', floorColor: '#292524', accent: '#f59e0b' },
    { id: 'magma_chasm', name: 'MAGMA CHASM', file: 'assets/stages/12_magma_chasm.png', floorColor: '#451a03', accent: '#ea580c' }
];

window.STAGE_PRESETS = STAGE_PRESETS;

class StickRenderer {
    constructor() {
        this.stars = [];
        for (let i = 0; i < 45; i++) {
            this.stars.push({
                x: Math.random() * 960,
                y: Math.random() * 260,
                size: Math.random() > 0.7 ? 3 : 2,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        // Preload Stage Images
        this.stageImages = {};
        STAGE_PRESETS.forEach(stg => {
            if (stg.file) {
                const img = new Image();
                img.src = stg.file;
                this.stageImages[stg.id] = img;
            }
        });
    }

    // Helper: Chunky outlined pixel line
    drawOutlinedLine(ctx, x1, y1, x2, y2, width, color, outlineColor = '#000000') {
        const rx1 = Math.round(x1);
        const ry1 = Math.round(y1);
        const rx2 = Math.round(x2);
        const ry2 = Math.round(y2);

        // 1. Black Outline Pass (Chunky border)
        ctx.save();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = Math.round(width) + 3;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();

        // 2. Core Color Fill Pass
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, Math.round(width));
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.stroke();
        ctx.restore();
    }

    // Helper: Chunky outlined pixel circle
    drawOutlinedCircle(ctx, cx, cy, radius, color, outlineColor = '#000000') {
        const rcx = Math.round(cx);
        const rcy = Math.round(cy);
        const r = Math.round(radius);

        ctx.save();
        // Outline
        ctx.fillStyle = outlineColor;
        ctx.beginPath();
        ctx.arc(rcx, rcy, r + 2, 0, Math.PI * 2);
        ctx.fill();

        // Fill
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(rcx, rcy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Renders multi-layer fantasy arena (Reference: HowGameArtShouldFolllowForReference.webp or Selectable Stages)
    renderArena(ctx, time = 0, currentStage = 'citadel') {
        const stageData = STAGE_PRESETS.find(s => s.id === currentStage) || STAGE_PRESETS[0];
        const img = this.stageImages[currentStage];

        if (currentStage !== 'citadel' && img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;

            // Pixel art stage backdrop
            ctx.drawImage(img, -100, -30, 1160, 495);

            // Ambient lighting tint matching stage atmosphere
            ctx.fillStyle = stageData.floorColor + '55';
            ctx.fillRect(-100, -30, 1160, 495);

            // Dynamic Arena Floor (Themed Stone slabs)
            this.renderCustomFloor(ctx, stageData, time);
            ctx.restore();
            return;
        }

        // Default Stage: Procedural Moonlit Citadel
        // 1. Deep Celestial Gradient Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 460);
        skyGrad.addColorStop(0, '#060a17');
        skyGrad.addColorStop(0.55, '#0d1933');
        skyGrad.addColorStop(1, '#1b2a4a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(-200, -100, 1400, 700);

        // 2. Twinkling Pixel Stars
        ctx.save();
        for (const s of this.stars) {
            const alpha = 0.4 + Math.sin(time * 0.05 + s.twinkle) * 0.4;
            ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
            ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
        }
        ctx.restore();

        // 3. Glowing Pixel Moon with Craters
        ctx.save();
        const moonX = 520;
        const moonY = 130;
        // Moon Glow halo
        ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 110, 0, Math.PI * 2);
        ctx.fill();

        // Outer rim
        this.drawOutlinedCircle(ctx, moonX, moonY, 54, '#fef08a', '#000000');

        // Moon Surface Craters
        ctx.fillStyle = '#fde047';
        ctx.fillRect(moonX - 22, moonY - 14, 16, 12);
        ctx.fillRect(moonX + 10, moonY + 8, 20, 14);
        ctx.fillRect(moonX - 8, moonY + 18, 12, 10);
        ctx.restore();

        // 4. Parallax Midground: Majestic Fantasy Castle Spires
        ctx.save();
        ctx.fillStyle = '#0a1020';
        // Castle Silhouette 1 (Left)
        ctx.fillRect(80, 220, 110, 240);
        ctx.fillRect(110, 150, 50, 70);
        // Tower Spire Roofs
        ctx.beginPath();
        ctx.moveTo(80, 220);
        ctx.lineTo(135, 90);
        ctx.lineTo(190, 220);
        ctx.fill();

        // Castle Windows (Glowing Gold)
        ctx.fillStyle = '#facc15';
        ctx.fillRect(128, 175, 6, 10);
        ctx.fillRect(142, 175, 6, 10);
        ctx.fillRect(100, 260, 8, 14);
        ctx.fillRect(130, 260, 8, 14);
        ctx.fillRect(160, 260, 8, 14);

        // Castle Silhouette 2 (Right Spires)
        ctx.fillStyle = '#080d1a';
        ctx.fillRect(720, 240, 140, 220);
        ctx.fillRect(760, 170, 60, 70);
        ctx.beginPath();
        ctx.moveTo(760, 170);
        ctx.lineTo(790, 100);
        ctx.lineTo(820, 170);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(780, 195, 6, 10);
        ctx.fillRect(795, 195, 6, 10);
        ctx.restore();

        // 5. Arena Ground (Textured Stone Battlement with Grass & Flowers)
        const floorY = 460;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-100, floorY, 1200, 120);

        // Stone Pavers with Outlines
        for (let bx = -40; bx < 1000; bx += 50) {
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, floorY, 48, 22);
            ctx.fillStyle = (bx % 100 === 0) ? '#1e293b' : '#334155';
            ctx.fillRect(bx, floorY, 48, 22);

            // Sub-layer brick
            ctx.strokeRect(bx + 24, floorY + 22, 48, 20);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bx + 24, floorY + 22, 48, 20);
        }

        // Grass Tufts & Flowers along the fighting floor
        ctx.fillStyle = '#22c55e';
        for (let gx = 0; gx < 960; gx += 32) {
            ctx.fillRect(gx, floorY - 3, 8, 3);
            ctx.fillRect(gx + 2, floorY - 6, 4, 3);
            if (gx % 96 === 0) {
                // Little red/gold pixel flowers
                ctx.fillStyle = (gx % 192 === 0) ? '#ef4444' : '#facc15';
                ctx.fillRect(gx + 2, floorY - 8, 4, 4);
                ctx.fillStyle = '#22c55e';
            }
        }

        // Glowing Arena Edge Lanterns
        this.renderLantern(ctx, 60, floorY - 45);
        this.renderLantern(ctx, 900, floorY - 45);
    }

    renderLantern(ctx, x, y, glowColor = '#f59e0b') {
        ctx.save();
        // Post
        ctx.fillStyle = '#020617';
        ctx.fillRect(x - 2, y, 6, 45);
        // Lantern Head
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 8, y - 16, 18, 16);
        // Fire Glow
        ctx.fillStyle = glowColor;
        ctx.fillRect(x - 4, y - 12, 10, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x - 2, y - 10, 6, 6);
        ctx.restore();
    }

    renderCustomFloor(ctx, stageData, time) {
        const floorY = 460;
        ctx.fillStyle = '#05070d';
        ctx.fillRect(-100, floorY, 1200, 120);

        const accent = stageData.accent || '#38bdf8';
        const floorBase = stageData.floorColor || '#1e293b';

        // Themed Stone Pavers with Outlines
        for (let bx = -40; bx < 1000; bx += 50) {
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, floorY, 48, 22);
            ctx.fillStyle = (bx % 100 === 0) ? floorBase : '#1e293b';
            ctx.fillRect(bx, floorY, 48, 22);

            // Sub-layer brick
            ctx.strokeRect(bx + 24, floorY + 22, 48, 20);
            ctx.fillStyle = '#0a0e1a';
            ctx.fillRect(bx + 24, floorY + 22, 48, 20);
        }

        // Floor Rim Accent Line with Dynamic Pulse
        ctx.save();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-100, floorY);
        ctx.lineTo(1100, floorY);
        ctx.stroke();
        ctx.restore();

        // Edge Braziers / Lanterns
        this.renderLantern(ctx, 60, floorY - 45, accent);
        this.renderLantern(ctx, 900, floorY - 45, accent);
    }

    // Render Chunky Pixel Stickman with Bold Outlines (Reference: CharactorArtSuggestion.webp)
    render(ctx, fighter) {
        ctx.save();

        const x = fighter.x;
        const y = fighter.y;
        const facing = fighter.facing;
        const stats = fighter.stats;
        const color = fighter.palette.primary;
        const accent = fighter.palette.accent;
        const eyeColor = fighter.palette.eye;

        // Squash & Stretch anchored at feet
        ctx.translate(x, y);
        ctx.scale(fighter.scaleX, fighter.scaleY);
        ctx.translate(-x, -y);

        // Chunky limb dimensions with bold black borders
        const limbWidth = Math.max(3.8, 3.8 + (stats.def - 5) * 0.45);
        const headRadius = 8.5 + (stats.def > 6 ? 1 : 0);

        // 1. Passive Auras
        if (stats.str >= 7) {
            ctx.save();
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + Math.sin(Date.now() * 0.012) * 0.15})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 24, y - 66, 48, 68);
            ctx.restore();
        }
        if (stats.def >= 7) {
            ctx.save();
            ctx.strokeStyle = `rgba(234, 179, 8, ${0.3 + Math.cos(Date.now() * 0.009) * 0.12})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(x, y - 32, 36, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        if (stats.spd >= 7 && (fighter.state === 'RUN' || fighter.state === 'DASH' || fighter.state === 'SUPER_JUMP')) {
            ctx.save();
            ctx.fillStyle = '#38bdf8';
            for (let i = 0; i < 3; i++) {
                const rx = x - facing * (16 + Math.random() * 24);
                const ry = y - 10 - Math.random() * 45;
                ctx.fillRect(Math.round(rx), Math.round(ry), 3, 3);
            }
            ctx.restore();
        }

        // 2. Flowing Scarf / Headband
        this.renderScarf(ctx, fighter);

        // 3. Joint calculations
        const joints = fighter.getJointPositions();

        // 4. Back Limbs
        // Back Leg
        this.drawOutlinedLine(ctx, joints.hip.x, joints.hip.y, joints.kneeBack.x, joints.kneeBack.y, limbWidth * 0.88, '#475569');
        this.drawOutlinedLine(ctx, joints.kneeBack.x, joints.kneeBack.y, joints.footBack.x, joints.footBack.y, limbWidth * 0.88, '#334155');
        // Back Arm
        this.drawOutlinedLine(ctx, joints.chest.x, joints.chest.y, joints.elbowBack.x, joints.elbowBack.y, limbWidth * 0.85, '#475569');
        this.drawOutlinedLine(ctx, joints.elbowBack.x, joints.elbowBack.y, joints.handBack.x, joints.handBack.y, limbWidth * 0.85, '#334155');

        // 5. Torso / Spine
        this.drawOutlinedLine(ctx, joints.hip.x, joints.hip.y, joints.chest.x, joints.chest.y, limbWidth * 1.4, color);

        // Armor Plate (Reference: CharactorArtSuggestion.webp)
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(Math.round(joints.chest.x - 7), Math.round(joints.chest.y + 2), 14, 12);
        ctx.fillStyle = accent;
        ctx.fillRect(Math.round(joints.chest.x - 5), Math.round(joints.chest.y + 4), 10, 8);
        ctx.restore();

        // 6. Front Limbs
        // Front Leg
        this.drawOutlinedLine(ctx, joints.hip.x, joints.hip.y, joints.kneeFront.x, joints.kneeFront.y, limbWidth, color);
        this.drawOutlinedLine(ctx, joints.kneeFront.x, joints.kneeFront.y, joints.footFront.x, joints.footFront.y, limbWidth, color);

        // Front Knee Guard & Boot (Chunky pixel armor)
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(Math.round(joints.kneeFront.x - 4), Math.round(joints.kneeFront.y - 4), 8, 8);
        ctx.fillStyle = accent;
        ctx.fillRect(Math.round(joints.kneeFront.x - 3), Math.round(joints.kneeFront.y - 3), 6, 6);
        // Boot
        ctx.fillStyle = '#000000';
        ctx.fillRect(Math.round(joints.footFront.x - (facing > 0 ? 3 : 6)), Math.round(joints.footFront.y - 3), 9, 6);
        ctx.fillStyle = accent;
        ctx.fillRect(Math.round(joints.footFront.x - (facing > 0 ? 2 : 5)), Math.round(joints.footFront.y - 2), 7, 4);
        ctx.restore();

        // Front Arm
        this.drawOutlinedLine(ctx, joints.chest.x, joints.chest.y, joints.elbowFront.x, joints.elbowFront.y, limbWidth, color);
        this.drawOutlinedLine(ctx, joints.elbowFront.x, joints.elbowFront.y, joints.handFront.x, joints.handFront.y, limbWidth, color);

        // Shoulder Guard Armor
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(Math.round(joints.chest.x + facing * 4 - 5), Math.round(joints.chest.y - 4), 10, 8);
        ctx.fillStyle = accent;
        ctx.fillRect(Math.round(joints.chest.x + facing * 4 - 4), Math.round(joints.chest.y - 3), 8, 6);
        ctx.restore();

        // Heavy Punch Gauntlets for high Strength
        if (stats.str >= 6) {
            this.drawOutlinedCircle(ctx, joints.handFront.x, joints.handFront.y, 4.5, '#ef4444');
            this.drawOutlinedCircle(ctx, joints.handBack.x, joints.handBack.y, 3.5, '#dc2626');
        }

        // 7. Head & Glowing Visor
        this.drawOutlinedCircle(ctx, joints.head.x, joints.head.y, headRadius, color);

        // Headband knot
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(Math.round(joints.head.x - (facing > 0 ? 6 : 2)), Math.round(joints.head.y - headRadius - 1), 9, 5);
        ctx.fillStyle = accent;
        ctx.fillRect(Math.round(joints.head.x - (facing > 0 ? 5 : 1)), Math.round(joints.head.y - headRadius), 7, 3);

        // Glowing Eye Visor
        const eyeX = joints.head.x + facing * 4;
        const eyeY = joints.head.y - 1;
        ctx.fillStyle = eyeColor;
        ctx.fillRect(Math.round(eyeX), Math.round(eyeY), 4, 3);
        ctx.restore();

        // 8. Attack Smears & Trails
        if (fighter.isAttacking && fighter.attackTrail && fighter.attackTrail.length >= 2) {
            this.renderAttackTrail(ctx, fighter);
        }

        ctx.restore();
    }

    renderScarf(ctx, fighter) {
        if (!fighter.scarfPoints || fighter.scarfPoints.length < 2) return;
        ctx.save();
        // Outline Pass
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Math.round(fighter.scarfPoints[0].x), Math.round(fighter.scarfPoints[0].y));
        for (let i = 1; i < fighter.scarfPoints.length; i++) {
            ctx.lineTo(Math.round(fighter.scarfPoints[i].x), Math.round(fighter.scarfPoints[i].y));
        }
        ctx.stroke();

        // Color Pass
        ctx.strokeStyle = fighter.palette.accent;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(fighter.scarfPoints[0].x), Math.round(fighter.scarfPoints[0].y));
        for (let i = 1; i < fighter.scarfPoints.length; i++) {
            ctx.lineTo(Math.round(fighter.scarfPoints[i].x), Math.round(fighter.scarfPoints[i].y));
        }
        ctx.stroke();
        ctx.restore();
    }

    renderAttackTrail(ctx, fighter) {
        const trail = fighter.attackTrail;
        const isHeavy = fighter.currentAttack && (fighter.currentAttack.tier >= 3 || fighter.currentAttack.name === 'DRIVE_IMPACT');

        ctx.save();
        ctx.strokeStyle = isHeavy ? '#f43f5e' : fighter.palette.primary;
        ctx.lineWidth = isHeavy ? 8 : 4;
        ctx.globalAlpha = 0.75;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Math.round(trail[0].x), Math.round(trail[0].y));
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(Math.round(trail[i].x), Math.round(trail[i].y));
        }
        ctx.stroke();
        ctx.restore();
    }

    // ============================================================
    // IN-GAME BATTLE HUD (Reference: SuggestionForHowCharectorNameArtWillShow.jpg)
    // ============================================================
    renderBattleHUD(ctx, p1, p2, roundTimer, gameMode) {
        if (!p1 || !p2) return;

        // 1. P1 Framed Portrait & Nameplate (Top-Left)
        this.renderFighterHeader(ctx, 36, 24, p1, false);

        // 2. P2 / Dummy Framed Portrait & Nameplate (Top-Right)
        this.renderFighterHeader(ctx, 924, 24, p2, true, gameMode === 'DUMMY');

        // 3. Center Round Timer Emblem
        ctx.save();
        const emblemX = 480;
        const emblemY = 46;
        // Outer beveled ring
        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(emblemX, emblemY, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = (roundTimer <= 10 && gameMode !== 'DUMMY') ? '#ef4444' : '#facc15';
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gameMode === 'DUMMY' ? '∞' : `${roundTimer}`, emblemX, emblemY + 1);
        ctx.restore();

        // 4. Clean bottom arena view (All meters now unified in Fighter Headers)
    }

    renderFighterHeader(ctx, anchorX, y, fighter, isFlipped, isDummy = false) {
        ctx.save();
        const boxW = 380;
        const portraitSize = 44;

        const portX = isFlipped ? anchorX - portraitSize : anchorX;
        const barX = isFlipped ? anchorX - boxW : anchorX + portraitSize + 8;
        const barW = boxW - portraitSize - 8;

        // Framed Beveled Portrait Box
        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.fillRect(portX, y, portraitSize, portraitSize);
        ctx.strokeRect(portX, y, portraitSize, portraitSize);

        // Mini Pixel Face inside Portrait
        const faceColor = fighter.palette.primary;
        this.drawOutlinedCircle(ctx, portX + portraitSize / 2, y + portraitSize / 2 - 2, 12, faceColor);
        ctx.fillStyle = fighter.palette.eye;
        ctx.fillRect(portX + portraitSize / 2 + (isFlipped ? -5 : 2), y + portraitSize / 2 - 3, 3, 2);

        // Character Nameplate Text with Archetype Build Tag
        const roleName = isDummy ? 'PRACTICE DUMMY' : (fighter.name || 'PLAYER 1');
        const buildName = fighter.archetypeTitle ? fighter.archetypeTitle.toUpperCase() : 'THE BALANCED';
        const strVal = fighter.stats ? fighter.stats.str : 5;
        const spdVal = fighter.stats ? fighter.stats.spd : 5;
        const defVal = fighter.stats ? fighter.stats.def : 5;
        const accentCol = fighter.palette ? fighter.palette.primary : '#38bdf8';

        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = isFlipped ? 'right' : 'left';
        ctx.fillText(roleName, isFlipped ? barX + barW : barX, y + 11);

        // Build Title & Stats Tag
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.fillStyle = accentCol;
        const buildTag = `• ${buildName} [${strVal}/${spdVal}/${defVal}]`;
        if (isFlipped) {
            ctx.textAlign = 'left';
            ctx.fillText(buildTag, barX, y + 11);
        } else {
            ctx.fillText(buildTag, barX + Math.round(roleName.length * 7.5 + 8), y + 11);
        }

        // Chunky Health Bar
        const barH = 18;
        const barY = y + 16;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(barX, barY, barW, barH);

        const ratio = Math.max(0, Math.min(1, fighter.currentHp / fighter.maxHp));
        const fillW = Math.round(barW * ratio);

        // Green/Cyan to Red Gradient HP Fill
        ctx.fillStyle = isDummy ? '#38bdf8' : (ratio > 0.35 ? '#22c55e' : '#ef4444');
        if (isFlipped) {
            ctx.fillRect(barX + (barW - fillW), barY, fillW, barH);
        } else {
            ctx.fillRect(barX, barY, fillW, barH);
        }

        // Chunky Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Unified Super / Overdrive Meter directly under Health Bar!
        const superY = barY + barH + 3;
        const superH = 6;
        ctx.fillStyle = '#020617';
        ctx.fillRect(barX, superY, barW, superH);

        const superRatio = Math.min(1.0, (fighter.superMeter || 0) / 100);
        const superFillW = Math.round(barW * superRatio);
        const isSuperFull = fighter.superMeter >= 100;
        ctx.fillStyle = isSuperFull ? (Math.sin(Date.now() * 0.01) > 0 ? '#facc15' : '#f59e0b') : '#38bdf8';
        if (isFlipped) {
            ctx.fillRect(barX + (barW - superFillW), superY, superFillW, superH);
        } else {
            ctx.fillRect(barX, superY, superFillW, superH);
        }

        ctx.strokeStyle = isSuperFull ? '#facc15' : '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, superY, barW, superH);

        // Flash badge when Overdrive is charged
        if (isSuperFull) {
            ctx.font = 'bold 9px "Courier New", monospace';
            ctx.fillStyle = '#facc15';
            ctx.textAlign = isFlipped ? 'right' : 'left';
            ctx.fillText(isFlipped ? '★ OVERDRIVE READY' : '★ OVERDRIVE READY [1 / G]', isFlipped ? barX + barW : barX, superY + superH + 10);
        }

        ctx.restore();
    }

    // ============================================================
}

window.stickRenderer = new StickRenderer();
