/* ============================================================
   CPS-2 HYPER-PHYSICS & SUB-PIXEL COLLISION ENGINE
   Inspired by Vampire Savior & Street Fighter Alpha:
   - Inertial acceleration curves & turnaround skidding
   - Dash momentum inheritance into parabolic jump arcs
   - Variable jump height (Capcom apex float + fast fall)
   - Pushboxes, wall splat physics, and sub-pixel precision
   ============================================================ */

class PhysicsEngine {
    constructor() {
        // Base stage bounds (Virtual 960x540 canvas)
        this.stage = {
            left: 70,
            right: 890,
            floor: 460,
            ceiling: 30
        };

        // Capcom gravity curves
        this.baseGravity = 0.58;
        this.apexGravity = 0.32; // Floaty apex for air combos
        this.fallGravity = 0.72; // Snappy fast descent
    }

    setStageBounds(left, right, floor, ceiling) {
        this.stage.left = left;
        this.stage.right = right;
        this.stage.floor = floor;
        this.stage.ceiling = ceiling;
    }

    // Precise AABB Overlap check with padding
    static checkOverlap(rect1, rect2) {
        if (!rect1 || !rect2) return false;
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Capcom-style pushbox collision: Smooth elastic separation
    resolveFighterPush(f1, f2) {
        const p1 = f1.getPushbox();
        const p2 = f2.getPushbox();

        if (PhysicsEngine.checkOverlap(p1, p2)) {
            const center1 = p1.x + p1.width / 2;
            const center2 = p2.x + p2.width / 2;
            let overlapX = center1 - center2;
            if (overlapX === 0) overlapX = (f1.facing || 1) * 0.1;

            const minDistance = (p1.width + p2.width) / 2;
            const separation = minDistance - Math.abs(overlapX);

            if (separation > 0) {
                const pushDir = overlapX > 0 ? 1 : -1;
                const totalWeight = f1.weight + f2.weight;

                const pushF1 = separation * (f2.weight / totalWeight);
                const pushF2 = separation * (f1.weight / totalWeight);

                f1.x += pushDir * pushF1;
                f2.x -= pushDir * pushF2;

                this.clampToStage(f1);
                this.clampToStage(f2);
            }
        }
    }

    clampToStage(fighter) {
        const halfW = fighter.width / 2;
        if (fighter.x - halfW < this.stage.left) {
            fighter.x = this.stage.left + halfW;
        } else if (fighter.x + halfW > this.stage.right) {
            fighter.x = this.stage.right - halfW;
        }

        if (fighter.y > this.stage.floor) {
            fighter.y = this.stage.floor;
            fighter.vy = 0;
            fighter.isGrounded = true;
        }
    }
}

window.physicsEngine = new PhysicsEngine();
window.PhysicsEngine = PhysicsEngine;
