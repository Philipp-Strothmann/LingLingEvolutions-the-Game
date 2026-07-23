import { Weapon } from './weapon.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 4;
        this.color = '#00ffcc';
        
        this.monstersKilledTotal = 0;
        this.monstersKilledThisWave = 0;
        this.pendingUpgrades = 0;

        this.weapons = [];
        this.weapons.push(new Weapon('Belt', 'melee', 20, 400)); // 400ms cooldown for smooth hits

        this.activeEffects = [];

        this.health = 100;
        this.maxHealth = 100;
        this.shield = 0;
        this.name = '';
        this.isOliver = false;
    }

// In src/player.js die update-Methode ersetzen:
update(keys, map) {
    let moveX = 0;
    let moveY = 0;

    if (keys['w'] || keys['arrowup'] || keys['ArrowUp']) moveY -= 1;
    if (keys['s'] || keys['arrowdown'] || keys['ArrowDown']) moveY += 1;
    if (keys['a'] || keys['arrowleft'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['d'] || keys['arrowright'] || keys['ArrowRight']) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }

    const nextX = this.x + moveX * this.speed;
    const nextY = this.y + moveY * this.speed;

    // Wand-Kollision gegen die Häuserschluchten prüfen
    if (!map.checkCollision(this, nextX, this.y)) {
        this.x = nextX;
    }
    if (!map.checkCollision(this, this.x, nextY)) {
        this.y = nextY;
    }

    this.activeEffects = this.activeEffects.filter(eff => {
        eff.duration--;
        return eff.duration > 0;
    });
}

// In src/player.js die draw-Methode ersetzen:
draw(ctx) {
    // 1. Draw the active attack effects (Belt slash)
    this.activeEffects.forEach(eff => {
        if (eff.type === 'belt_slash') {
            ctx.save();
            ctx.translate(eff.x, eff.y);
            
            // Draw a rotating leather belt
            let alpha = eff.duration / eff.maxDuration;
            
            // Belt strap (Brown leather)
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139, 69, 19, ${alpha})`; // Saddle brown
            ctx.lineWidth = 8;
            ctx.arc(0, 0, eff.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();

            // Belt seam (Dark brown/Black for texture)
            ctx.beginPath();
            ctx.strokeStyle = `rgba(80, 40, 10, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.arc(0, 0, eff.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
            ctx.setLineDash([]); // Reset Line-Dash

            // Golden belt buckle at the end of the radius
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // Gold
            ctx.strokeStyle = `rgba(200, 150, 0, ${alpha})`;
            ctx.lineWidth = 2;
            // Position buckle at a fixed position on the circle
            const buckleX = Math.cos(0) * eff.radius;
            const buckleY = Math.sin(0) * eff.radius;
            ctx.rect(buckleX - 6, buckleY - 8, 12, 16);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();

            // Buckle prong
            ctx.beginPath();
            ctx.strokeStyle = `rgba(50, 50, 50, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.moveTo(buckleX - 4, buckleY);
            ctx.lineTo(buckleX + 4, buckleY);
            ctx.stroke();
            ctx.closePath();

            ctx.restore();
        }
    });

    // 2. Das gelbe Pokémon-Wesen (LingLing) zeichnen
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isOliver) {
        // Goldene Krone zeichnen
        ctx.fillStyle = '#ffd700'; // Gold
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, -25);
        ctx.lineTo(10, -25);
        ctx.lineTo(13, -37);
        ctx.lineTo(6, -30);
        ctx.lineTo(0, -41);
        ctx.lineTo(-6, -30);
        ctx.lineTo(-13, -37);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rote Kronjuwelen
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(0, -41, 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#3399ff';
        ctx.beginPath();
        ctx.arc(-13, -37, 1.2, 0, Math.PI * 2);
        ctx.arc(13, -37, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Linkes spitze Ohr
    ctx.beginPath();
    ctx.fillStyle = this.isOliver ? '#ffd700' : '#ffe033'; // Pokémon Gelb / Gold
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.moveTo(-15, -10);
    ctx.quadraticCurveTo(-25, -35, -20, -40); // Ohrenspitze links
    ctx.quadraticCurveTo(-10, -30, -5, -18);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // Schwarze Ohrenspitze links
    ctx.beginPath();
    ctx.fillStyle = '#111';
    ctx.moveTo(-22, -31);
    ctx.quadraticCurveTo(-25, -35, -20, -40);
    ctx.quadraticCurveTo(-15, -35, -16, -28);
    ctx.fill();
    ctx.closePath();

    // Rechtes spitze Ohr
    ctx.beginPath();
    ctx.fillStyle = this.isOliver ? '#ffd700' : '#ffe033'; // Pokémon Gelb / Gold
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.moveTo(5, -18);
    ctx.quadraticCurveTo(10, -30, 20, -40); // Ohrenspitze rechts
    ctx.quadraticCurveTo(25, -35, 15, -10);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // Schwarze Ohrenspitze rechts
    ctx.beginPath();
    ctx.fillStyle = '#111';
    ctx.moveTo(16, -28);
    ctx.quadraticCurveTo(20, -40, 25, -35);
    ctx.quadraticCurveTo(22, -31, 13, -24);
    ctx.fill();
    ctx.closePath();

    // Runder, gelber/goldener Hauptkörper
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    if (this.isOliver) {
        ctx.fillStyle = '#ffd700'; // Gold
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd700';
    } else {
        ctx.fillStyle = '#ffe033'; // Pokémon Gelb
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffe033';
    }
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // Große, niedliche Anime-Augen
    ctx.fillStyle = '#111';
    // Linkes Auge
    ctx.beginPath();
    ctx.arc(-7, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    // Rechtes Auge
    ctx.beginPath();
    ctx.arc(7, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    // Weiße Pupillen-Lichtpunkte (für den niedlichen Blick)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-8, -5, 1.5, 0, Math.PI * 2);
    ctx.arc(6, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    // Niedliche rote Bäckchen (Pikachu-Vibe)
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.arc(-13, 4, 4, 0, Math.PI * 2); // Wange links
    ctx.arc(13, 4, 4, 0, Math.PI * 2);  // Wange rechts
    ctx.fill();
    ctx.closePath();

    // Kleiner lachender Mund
    ctx.beginPath();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.arc(0, 3, 3, 0, Math.PI); // Kleines W-Förmiges Lächeln
    ctx.stroke();
    ctx.closePath();

    ctx.restore();

    // 3. Floating health and shield bar above the player
    const barWidth = 40;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const hpBarY = this.y - this.radius - 20; 
    const shieldBarY = hpBarY - 7; 

    // Display player name above the bar
    if (this.name) {
        ctx.save();
        ctx.fillStyle = this.isOliver ? '#ffd700' : '#ffffff';
        ctx.font = 'bold 10px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.name, this.x, shieldBarY - 6);
        ctx.restore();
    }

    // Shield bar (top)
    // Background (gray)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX, shieldBarY, barWidth, barHeight);
    // Foreground (blue, scaled by shield percentage)
    const shieldPercent = Math.max(0, Math.min(100, this.shield || 0)) / 100;
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(barX, shieldBarY, barWidth * shieldPercent, barHeight);

    // Health bar (bottom)
    // Background (gray)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX, hpBarY, barWidth, barHeight);
    // Foreground (red, scaled by HP percentage)
    const hpPercent = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = '#ff3333'; // Red
    ctx.fillRect(barX, hpBarY, barWidth * hpPercent, barHeight);
}

    takeDamage(amount) {
        // Shield absorbs/reduces damage
        const mitigation = (this.shield || 0) / 100;
        const reducedDamage = amount * (1 - mitigation);
        
        this.health -= reducedDamage;
        if (this.health < 0) this.health = 0;
        
        // Every time the player takes damage, the shield is consumed by 10% (one potion charge)
        if (this.shield > 0) {
            this.shield = Math.max(0, this.shield - 10);
        }
    }

resetHealth() {
    this.health = this.maxHealth;
}}
